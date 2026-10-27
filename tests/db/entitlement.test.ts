// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, denied, type TestDb } from './harness';

let db: TestDb;
beforeAll(async () => { db = await makeDb(); });

const event = (o: Partial<Record<string, string | boolean | null>> = {}) => ({
  provider: 'acme', eventId: `evt_${Math.random().toString(36).slice(2)}`, at: 'now()', user: '', sub: '', cust: 'cus_1',
  plan: 'monthly', status: 'active', end: "now() + interval '30 days'", cancel: false, ...o,
});
async function apply(db: TestDb, e: ReturnType<typeof event>) {
  const r = await db.as('service',
    `select public.apply_subscription_event($1,$2,(${e.at})::timestamptz,$3::uuid,$4,$5,$6,$7,(${e.end})::timestamptz,$8) as r`,
    [e.provider, e.eventId, e.user, e.sub || `sub_${e.user}`, e.cust, e.plan, e.status, e.cancel]);
  return r[0].r as string;
}
const ent = async (uid: string) => (await db.as({ uid }, 'select public.my_entitlement() as e'))[0].e;

describe('entitlement', () => {
  it('a new user is on the free plan with a 7-day history window', async () => {
    const u = await db.newUser();
    const e = await ent(u);
    expect(e.pro).toBe(false);
    expect(e.history_days).toBe(7);
    expect(e.max_mixes).toBe(0);
  });

  it('an active subscription makes the user Pro with no limits', async () => {
    const u = await db.newUser();
    expect(await apply(db, event({ user: u }))).toBe('applied');
    const e = await ent(u);
    expect(e.pro).toBe(true);
    expect(e.plan).toBe('monthly');
    expect(e.history_days).toBeNull();
    expect(e.max_mixes).toBe(20);
  });

  it.each([
    ['active, renewal not yet due', 'active', "now() + interval '5 days'", true],
    ['active, 2 days late (webhook delay)', 'active', "now() - interval '2 days'", true],
    ['active, 4 days late', 'active', "now() - interval '4 days'", false],
    ['trialing', 'trialing', "now() + interval '3 days'", true],
    ['past_due inside the 3-day grace', 'past_due', "now() - interval '1 day'", true],
    ['past_due beyond grace', 'past_due', "now() - interval '4 days'", false],
    ['canceled but paid through the period', 'canceled', "now() + interval '10 days'", true],
    ['canceled and period over', 'canceled', "now() - interval '1 minute'", false],
    ['expired', 'expired', "now() + interval '10 days'", false],
    ['paused', 'paused', "now() + interval '10 days'", false],
  ])('%s', async (_n, status, end, pro) => {
    const u = await db.newUser();
    await apply(db, event({ user: u, status: status as string, end: end as string }));
    expect((await ent(u)).pro).toBe(pro);
  });
});

describe('subscription writes are server-only', () => {
  it('a signed-in user cannot insert, update or delete a subscription, even their own', async () => {
    const u = await db.newUser();
    await denied(db.as({ uid: u }, `insert into public.subscriptions (user_id, provider, plan, status, current_period_end) values ('${u}','x','yearly','active', now() + interval '1 year')`));
    await apply(db, event({ user: u, status: 'canceled', end: "now() + interval '1 day'" }));
    await denied(db.as({ uid: u }, `update public.subscriptions set status='active', current_period_end = now() + interval '10 years' where user_id='${u}'`));
    await denied(db.as({ uid: u }, `delete from public.subscriptions where user_id='${u}'`));
    expect((await ent(u)).status).toBe('canceled');
  });

  it('a user reads only their own subscription, and not the provider ids', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await apply(db, event({ user: a, sub: 'sub_a' }));
    await apply(db, event({ user: b, sub: 'sub_b' }));
    const rows = await db.as({ uid: a }, 'select plan, status from public.subscriptions');
    expect(rows).toHaveLength(1);
    await denied(db.as({ uid: a }, 'select provider_customer_id from public.subscriptions'));
  });

  it('anonymous visitors can read nothing and call nothing', async () => {
    const u = await db.newUser();
    await apply(db, event({ user: u }));
    await denied(db.as('anon', 'select * from public.subscriptions'));
    await denied(db.as('anon', 'select public.my_entitlement()'));
    await denied(db.as('anon', 'select public.is_pro()'));
    await denied(db.as('anon', 'select * from public.webhook_events'));
  });

  it('webhook bookkeeping and the apply function are not reachable from the client roles', async () => {
    const u = await db.newUser();
    await denied(db.as({ uid: u }, 'select * from public.webhook_events'));
    await denied(db.as({ uid: u }, `insert into public.webhook_events (provider, event_id) values ('x','y')`));
    await denied(db.as({ uid: u }, `select public.apply_subscription_event('x','e1',now(),'${u}','s','c','yearly','active',now() + interval '1 year',false)`));
    await denied(db.as('anon', `select public.apply_subscription_event('x','e1',now(),'${u}','s','c','yearly','active',now() + interval '1 year',false)`));
  });
});

describe('apply_subscription_event', () => {
  it('is idempotent: replaying an event changes nothing', async () => {
    const u = await db.newUser();
    const e = event({ user: u });
    expect(await apply(db, e)).toBe('applied');
    expect(await apply(db, e)).toBe('duplicate');
  });

  it('ignores older events that arrive late (out-of-order delivery)', async () => {
    const u = await db.newUser();
    await apply(db, event({ user: u, at: "now() - interval '1 minute'", status: 'active' }));
    const r = await apply(db, event({ user: u, at: "now() - interval '1 hour'", status: 'expired' }));
    expect(r).toBe('stale');
    expect((await ent(u)).pro).toBe(true);
  });

  it('a newer cancellation downgrades once the paid period ends', async () => {
    const u = await db.newUser();
    await apply(db, event({ user: u, at: "now() - interval '1 hour'" }));
    await apply(db, event({ user: u, at: 'now()', status: 'expired', end: "now() - interval '1 second'" }));
    expect((await ent(u)).pro).toBe(false);
  });

  it('rejects events for users that do not exist', async () => {
    expect(await apply(db, event({ user: '00000000-0000-0000-0000-00000000dead' }))).toBe('unknown_user');
  });

  it('refuses to move a provider subscription to a different user', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await apply(db, event({ user: a, sub: 'sub_shared' }));
    expect(await apply(db, event({ user: b, sub: 'sub_shared' }))).toBe('conflict');
    expect((await ent(b)).pro).toBe(false);
  });

  it('rejects unknown plans and statuses', async () => {
    const u = await db.newUser();
    await denied(apply(db, event({ user: u, plan: 'lifetime-free' })));
    await denied(apply(db, event({ user: u, status: 'superuser' })));
  });
});

describe('database hygiene', () => {
  it('every public table has row level security enabled', async () => {
    const rows = await db.admin(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`);
    expect(rows).toEqual([]);
  });

  it('every SECURITY DEFINER function pins its search_path', async () => {
    const rows = await db.admin(`select proname from pg_proc where pronamespace = 'public'::regnamespace and prosecdef and not coalesce(proconfig::text, '') like '%search_path%'`);
    expect(rows).toEqual([]);
  });

  it('is_pro takes no user id, so nobody can probe another account', async () => {
    const rows = await db.admin(`select pronargs from pg_proc where proname = 'is_pro' and pronamespace = 'public'::regnamespace`);
    expect(rows.map((r) => r.pronargs)).toEqual([0]);
  });

  it('privileged functions are executable only by service_role', async () => {
    const rows = await db.admin(`
      select p.proname, r.rolname from pg_proc p cross join pg_roles r
      where p.pronamespace = 'public'::regnamespace and p.proname = 'apply_subscription_event'
        and r.rolname in ('anon','authenticated') and has_function_privilege(r.rolname, p.oid, 'execute')`);
    expect(rows).toEqual([]);
  });
});
