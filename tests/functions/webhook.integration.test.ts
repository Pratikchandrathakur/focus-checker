// @vitest-environment node
// End to end: signed webhook -> handler -> real SQL function -> entitlement the client sees.
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, type TestDb } from '../db/harness';
import { sign, handleWebhook, type ApplyArgs } from '../../supabase/functions/_shared/webhook';

const SECRET = 'integration-secret-abcdefghijklmnop';
let db: TestDb;
beforeAll(async () => { db = await makeDb(); });

const apply = (a: ApplyArgs) =>
  db.as('service',
    'select public.apply_subscription_event($1,$2,$3::timestamptz,$4::uuid,$5,$6,$7,$8,$9::timestamptz,$10) as r',
    [a.provider, a.eventId, a.eventTime, a.userId, a.subId, a.customerId, a.plan, a.status, a.periodEnd, a.cancelAtPeriodEnd]).then((r) => r[0].r as string);

async function deliver(event: object, opts: { secret?: string; t?: number } = {}) {
  const body = JSON.stringify(event);
  const t = opts.t ?? Math.floor(Date.now() / 1000);
  const sig = await sign(opts.secret ?? SECRET, t, body);
  return handleWebhook(
    { method: 'POST', rawBody: body, header: (n) => (n === 'x-signature' ? `t=${t},v1=${sig}` : n === 'content-type' ? 'application/json' : null) },
    { secrets: [SECRET], provider: 'acme', nowMs: () => Date.now(), apply },
  );
}
const ev = (userId: string, o: { id?: string; at?: Date; status?: string; end?: Date; sub?: string } = {}) => ({
  id: o.id ?? `evt_${Math.random().toString(36).slice(2)}`, type: 'subscription.updated', occurredAt: (o.at ?? new Date()).toISOString(), userId,
  subscription: { id: o.sub ?? `sub_${userId}`, customerId: 'cus_1', plan: 'monthly', status: o.status ?? 'active', currentPeriodEnd: (o.end ?? new Date(Date.now() + 30 * 864e5)).toISOString(), cancelAtPeriodEnd: false },
});
const pro = async (u: string) => (await db.as({ uid: u }, 'select public.my_entitlement() as e'))[0].e.pro as boolean;

describe('payments webhook, end to end', () => {
  it('a signed purchase event turns the user Pro', async () => {
    const u = await db.newUser();
    expect(await pro(u)).toBe(false);
    const res = await deliver(ev(u));
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('applied');
    expect(await pro(u)).toBe(true);
  });

  it('a forged event (wrong secret) does nothing', async () => {
    const u = await db.newUser();
    const res = await deliver(ev(u), { secret: 'attacker-secret-attacker-secret' });
    expect(res.status).toBe(401);
    expect(await pro(u)).toBe(false);
  });

  it('a captured real event cannot be replayed later', async () => {
    const u = await db.newUser();
    const e = ev(u);
    const old = Math.floor(Date.now() / 1000) - 3600;
    expect((await deliver(e, { t: old })).status).toBe(401);
    expect(await pro(u)).toBe(false);
  });

  it('the same event delivered twice is applied once', async () => {
    const u = await db.newUser();
    const e = ev(u);
    expect((await deliver(e)).body.result).toBe('applied');
    expect((await deliver(e)).body.result).toBe('duplicate');
  });

  it('events arriving out of order cannot undo a newer state', async () => {
    const u = await db.newUser();
    await deliver(ev(u, { at: new Date(Date.now() - 1000), status: 'active' }));
    const late = await deliver(ev(u, { at: new Date(Date.now() - 3_600_000), status: 'expired', end: new Date(Date.now() - 1000) }));
    expect(late.body.result).toBe('stale');
    expect(await pro(u)).toBe(true);
  });

  it('expiry and cancellation downgrade the account', async () => {
    const u = await db.newUser();
    await deliver(ev(u, { at: new Date(Date.now() - 5000) }));
    await deliver(ev(u, { status: 'expired', end: new Date(Date.now() - 1000) }));
    expect(await pro(u)).toBe(false);
  });

  it('cannot attach someone else’s subscription to your account', async () => {
    const a = await db.newUser(), b = await db.newUser();
    await deliver(ev(a, { sub: 'sub_shared_xyz' }));
    const res = await deliver(ev(b, { sub: 'sub_shared_xyz' }));
    expect(res.status).toBe(409);
    expect(await pro(b)).toBe(false);
  });

  it('SQL injection attempts in event fields are rejected before reaching the database', async () => {
    const u = await db.newUser();
    const res = await deliver({ ...ev(u), id: "x'); update public.subscriptions set status='active'; --" });
    expect(res.status).toBe(400);
    expect(await pro(u)).toBe(false);
  });
});
