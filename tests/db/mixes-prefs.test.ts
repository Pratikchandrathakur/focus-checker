// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, denied, type TestDb } from './harness';

let db: TestDb;
beforeAll(async () => { db = await makeDb(); });

const goPro = (u: string) => db.as('service',
  `select public.apply_subscription_event('acme', 'e_' || gen_random_uuid(), now(), '${u}', 'sub_' || '${u}', 'c', 'yearly', 'active', now() + interval '1 year', false)`);
const lapse = (u: string) => db.as('service', `update public.subscriptions set status='expired', current_period_end = now() - interval '1 day' where user_id='${u}'`);
const addMix = (u: string, name: unknown, layers: unknown) =>
  db.as({ uid: u }, `insert into public.sound_mixes (user_id, name, layers) values ('${u}', $1, $2::jsonb)`, [name, JSON.stringify(layers)]);
const L = (preset = 'rain', volume = 0.5) => ({ preset, volume });

describe('sound_mixes', () => {
  it('free users cannot create mixes; Pro users can', async () => {
    const f = await db.newUser(), p = await db.newUser(); await goPro(p);
    await denied(addMix(f, 'Rainy', [L()]));
    await addMix(p, 'Rainy focus', [L('rain', 0.6), L('pink', 0.3)]);
    expect(await db.as({ uid: p }, 'select name from public.sound_mixes')).toHaveLength(1);
  });

  it.each([
    ['empty name', '', [L()]],
    ['whitespace name', '   ', [L()]],
    ['name over 40 chars', 'x'.repeat(41), [L()]],
    ['no layers', 'ok', []],
    ['7 layers', 'ok', Array.from({ length: 7 }, () => L())],
    ['unknown preset', 'ok', [L('shell-command')]],
    ['volume above 1', 'ok', [L('rain', 1.5)]],
    ['negative volume', 'ok', [L('rain', -0.1)]],
    ['volume as a string', 'ok', [{ preset: 'rain', volume: '0.5' }]],
    ['extra keys smuggled in', 'ok', [{ preset: 'rain', volume: 0.5, evil: '<script>' }]],
    ['layers not an array', 'ok', { preset: 'rain', volume: 0.5 }],
  ])('rejects invalid mix: %s', async (_n, name, layers) => {
    const p = await db.newUser(); await goPro(p);
    await denied(addMix(p, name, layers));
  });

  it('caps a user at 20 mixes', async () => {
    const p = await db.newUser(); await goPro(p);
    for (let i = 0; i < 20; i++) await addMix(p, `m${i}`, [L()]);
    await denied(addMix(p, 'one too many', [L()]));
  });

  it('users only see and change their own mixes', async () => {
    const a = await db.newUser(), b = await db.newUser(); await goPro(a); await goPro(b);
    await addMix(a, 'mine', [L()]);
    expect(await db.as({ uid: b }, 'select * from public.sound_mixes')).toHaveLength(0);
    await db.as({ uid: b }, `update public.sound_mixes set name='stolen'`);
    await db.as({ uid: b }, `delete from public.sound_mixes`);
    expect((await db.as({ uid: a }, 'select name from public.sound_mixes'))[0].name).toBe('mine');
    await denied(db.as({ uid: a }, `update public.sound_mixes set user_id='${b}'`));
  });

  it('a lapsed Pro user can still view and delete mixes but not create or edit them', async () => {
    const p = await db.newUser(); await goPro(p);
    await addMix(p, 'keep', [L()]);
    await lapse(p);
    expect(await db.as({ uid: p }, 'select * from public.sound_mixes')).toHaveLength(1);
    await denied(addMix(p, 'new', [L()]));
    await denied(db.as({ uid: p }, `update public.sound_mixes set name='edit'`));
    await db.as({ uid: p }, 'delete from public.sound_mixes');
    expect(await db.as({ uid: p }, 'select * from public.sound_mixes')).toHaveLength(0);
  });

  it('anonymous visitors have no access', async () => {
    await denied(db.as('anon', 'select * from public.sound_mixes'));
  });
});

describe('report_prefs (weekly email)', () => {
  const set = (u: string, on: boolean) =>
    db.as({ uid: u }, `insert into public.report_prefs (user_id, weekly_email) values ('${u}', ${on}) on conflict (user_id) do update set weekly_email = excluded.weekly_email`);

  it('only Pro users can turn the weekly email on; anyone can turn it off', async () => {
    const f = await db.newUser(), p = await db.newUser(); await goPro(p);
    await denied(set(f, true));
    await set(f, false);
    await set(p, true);
    expect((await db.as({ uid: p }, 'select weekly_email from public.report_prefs'))[0].weekly_email).toBe(true);
    await lapse(p);
    await denied(set(p, true));
    await set(p, false);
  });

  it('users cannot write the server-managed last_sent_at column', async () => {
    const p = await db.newUser(); await goPro(p); await set(p, true);
    await denied(db.as({ uid: p }, `update public.report_prefs set last_sent_at = now() - interval '30 days'`));
    await denied(db.as({ uid: p }, `insert into public.report_prefs (user_id, weekly_email, last_sent_at) values ('${p}', true, now()) on conflict (user_id) do nothing`));
  });

  it('users cannot read or change anyone else’s preferences', async () => {
    const a = await db.newUser(), b = await db.newUser(); await goPro(a); await goPro(b);
    await set(a, true);
    expect(await db.as({ uid: b }, 'select * from public.report_prefs')).toHaveLength(0);
    await denied(db.as({ uid: b }, `insert into public.report_prefs (user_id, weekly_email) values ('${a}', false)`));
  });

  it('the recipient address is never client-controlled (no email column exists)', async () => {
    const rows = await db.admin(`select column_name from information_schema.columns where table_name='report_prefs' and table_schema='public'`);
    expect(rows.map((r) => r.column_name).sort()).toEqual(['last_sent_at', 'updated_at', 'user_id', 'weekly_email']);
  });
});

describe('report_recipients (weekly email job)', () => {
  const optIn = (u: string) => db.admin(`insert into public.report_prefs (user_id, weekly_email) values ('${u}', true)`);

  it('returns only Pro users who opted in and were not emailed in the last 6 days', async () => {
    const pro = await db.newUser('pro@example.com'); await goPro(pro); await optIn(pro);
    const free = await db.newUser('free@example.com'); await optIn(free);          // opted in but not Pro
    const off = await db.newUser('off@example.com'); await goPro(off);              // Pro but opted out
    const recent = await db.newUser('recent@example.com'); await goPro(recent); await optIn(recent);
    await db.admin(`update public.report_prefs set last_sent_at = now() - interval '2 days' where user_id='${recent}'`);
    const due = await db.newUser('due@example.com'); await goPro(due); await optIn(due);
    await db.admin(`update public.report_prefs set last_sent_at = now() - interval '7 days' where user_id='${due}'`);

    const emails = (await db.as('service', 'select email from public.report_recipients(100)')).map((r) => r.email);
    expect(emails).toContain('pro@example.com');
    expect(emails).toContain('due@example.com');
    expect(emails).not.toContain('free@example.com');
    expect(emails).not.toContain('off@example.com');
    expect(emails).not.toContain('recent@example.com');
  });

  it('marking a report sent removes the user from the next run', async () => {
    const u = await db.newUser('once@example.com'); await goPro(u); await optIn(u);
    await db.as('service', `select public.mark_report_sent('${u}')`);
    const emails = (await db.as('service', 'select email from public.report_recipients(100)')).map((r) => r.email);
    expect(emails).not.toContain('once@example.com');
  });

  it('clients can never list recipients, mark sends, or ask who is Pro', async () => {
    const u = await db.newUser();
    for (const who of [{ uid: u }, 'anon'] as const) {
      await denied(db.as(who, 'select * from public.report_recipients(10)'));
      await denied(db.as(who, `select public.mark_report_sent('${u}')`));
      await denied(db.as(who, `select public.is_pro_user('${u}')`));
    }
  });
});

describe('sound_mixes: Pro-only extra sounds are valid layers', () => {
  it('accepts brown noise and waves', async () => {
    const p = await db.newUser(); await goPro(p);
    await addMix(p, 'Deep', [{ preset: 'brown', volume: 0.4 }, { preset: 'waves', volume: 0.3 }]);
  });
});
