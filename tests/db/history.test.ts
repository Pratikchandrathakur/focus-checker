// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, denied, type TestDb } from './harness';

let db: TestDb;
beforeAll(async () => { db = await makeDb(); });

const goPro = (u: string) => db.as('service',
  `select public.apply_subscription_event('acme', 'e_' || gen_random_uuid(), now(), '${u}', 'sub_' || '${u}', 'c', 'yearly', 'active', now() + interval '1 year', false)`);

const insert = (u: string, id: number, ageDays = 0, extra: { type?: string; payload?: string; user?: string } = {}) =>
  db.as({ uid: u }, `insert into public.history_items (user_id, id, type, date, payload)
    values ('${extra.user ?? u}', ${id}, '${extra.type ?? 'Session'}', now() - interval '${ageDays} days', '${extra.payload ?? '{"a":1}'}'::jsonb)`);

describe('history_items: ownership', () => {
  it('a user reads only their own rows', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await insert(a, 1); await insert(b, 2);
    expect((await db.as({ uid: a }, 'select id from public.history_items')).map((r) => Number(r.id))).toEqual([1]);
  });

  it('cannot write a row for someone else', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await denied(insert(a, 1, 0, { user: b }));
  });

  it('cannot reassign a row to another user via update', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await insert(a, 1);
    await denied(db.as({ uid: a }, `update public.history_items set user_id='${b}' where id=1`));
  });

  it('cannot update or delete another user’s rows (silently affects nothing)', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await insert(a, 1);
    await db.as({ uid: b }, `update public.history_items set payload='{"hacked":true}' where id=1`);
    await db.as({ uid: b }, `delete from public.history_items where id=1`);
    const rows = await db.as({ uid: a }, 'select payload from public.history_items where id=1');
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ a: 1 });
  });

  it('anonymous visitors have no access', async () => {
    const a = await db.newUser(); await insert(a, 1);
    await denied(db.as('anon', 'select * from public.history_items'));
  });

  it('upsert (insert … on conflict do update) works for your own row', async () => {
    const a = await db.newUser(); await insert(a, 1);
    await db.as({ uid: a }, `insert into public.history_items (user_id,id,type,date,payload) values ('${a}',1,'Session',now(),'{"a":2}') on conflict (user_id,id) do update set payload = excluded.payload`);
    expect((await db.as({ uid: a }, 'select payload from public.history_items'))[0].payload).toEqual({ a: 2 });
  });
});

describe('history_items: free vs Pro window', () => {
  it('free accounts sync the last 7 days, and cannot store or read older rows', async () => {
    const a = await db.newUser();
    await insert(a, 1, 2);
    await denied(insert(a, 2, 10));
    expect(await db.as({ uid: a }, 'select id from public.history_items')).toHaveLength(1);
  });

  it('Pro accounts store and read full history', async () => {
    const a = await db.newUser(); await goPro(a);
    await insert(a, 1, 400);
    expect(await db.as({ uid: a }, 'select id from public.history_items')).toHaveLength(1);
  });

  it('older rows are hidden on downgrade and come back on re-upgrade (nothing is deleted)', async () => {
    const a = await db.newUser(); await goPro(a);
    await insert(a, 1, 60); await insert(a, 2, 1);
    await db.as('service', `update public.subscriptions set status='expired', current_period_end = now() - interval '1 day' where user_id='${a}'`);
    expect(await db.as({ uid: a }, 'select id from public.history_items')).toHaveLength(1);
    await db.as('service', `update public.subscriptions set status='active', current_period_end = now() + interval '30 days' where user_id='${a}'`);
    expect(await db.as({ uid: a }, 'select id from public.history_items')).toHaveLength(2);
  });

  it('users can always delete their own data, even when not Pro', async () => {
    const a = await db.newUser(); await goPro(a);
    await insert(a, 1, 60);
    await db.as('service', `update public.subscriptions set status='expired', current_period_end = now() - interval '1 day' where user_id='${a}'`);
    await db.as({ uid: a }, 'delete from public.history_items');
    expect(await db.admin(`select count(*)::int as n from public.history_items where user_id='${a}'`)).toEqual([{ n: 0 }]);
  });
});

describe('history_items: input guard', () => {
  it('rejects unknown item types', async () => {
    const a = await db.newUser();
    await denied(insert(a, 1, 0, { type: 'Admin' }));
  });
  it('rejects payloads that are not objects', async () => {
    const a = await db.newUser();
    await denied(insert(a, 1, 0, { payload: '[1,2,3]' }));
    await denied(insert(a, 2, 0, { payload: '"text"' }));
  });
  it('rejects oversized payloads', async () => {
    const a = await db.newUser();
    await denied(insert(a, 1, 0, { payload: JSON.stringify({ note: 'x'.repeat(20000) }) }));
  });
  it('rejects rows dated in the far future (would always stay visible)', async () => {
    const a = await db.newUser();
    await denied(insert(a, 1, -30));
  });
  it('caps stored rows: 500 for free, far more for Pro', async () => {
    const a = await db.newUser();
    await db.as({ uid: a }, `do $$ begin for i in 1..500 loop insert into public.history_items (user_id,id,type,date,payload) values ('${a}', i, 'Session', now(), '{}'); end loop; end $$`);
    await denied(insert(a, 501));
    const p = await db.newUser(); await goPro(p);
    await db.as({ uid: p }, `do $$ begin for i in 1..501 loop insert into public.history_items (user_id,id,type,date,payload) values ('${p}', i, 'Session', now(), '{}'); end loop; end $$`);
  });
});

describe('legacy table from the original app', () => {
  it('migration replaces old permissive policies so the 7-day rule cannot be bypassed', async () => {
    const legacy = await makeDb({
      beforeMigrations: `
        create table public.history_items (user_id uuid not null, id bigint not null, type text not null, date text not null, payload jsonb not null, primary key (user_id, id));
        alter table public.history_items enable row level security;
        create policy "own rows" on public.history_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());`,
    });
    const u = await legacy.newUser();
    await legacy.admin(`insert into public.history_items values ('${u}', 1, 'Session', to_char(now() - interval '90 days', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '{}')`);
    expect(await legacy.as({ uid: u }, 'select id from public.history_items')).toHaveLength(0);
  });
});
