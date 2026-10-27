// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { sign, verifySignature, handleWebhook, timingSafeEqualHex, parseEvent, type ApplyArgs } from '../../supabase/functions/_shared/webhook';

const SECRET = 'whsec_test_secret_value_1234567890';
const NOW = 1_800_000_000_000; // fixed clock (ms)
const UID = '11111111-1111-4111-8111-111111111111';

const goodEvent = (o: Record<string, unknown> = {}) => ({
  id: 'evt_123', type: 'subscription.updated', occurredAt: new Date(NOW - 5_000).toISOString(), userId: UID,
  subscription: { id: 'sub_9', customerId: 'cus_7', plan: 'yearly', status: 'active', currentPeriodEnd: new Date(NOW + 30 * 864e5).toISOString(), cancelAtPeriodEnd: false },
  ...o,
});

async function signedRequest(body: string, opts: { secret?: string; t?: number; method?: string; contentType?: string; header?: string | null } = {}) {
  const t = opts.t ?? Math.floor(NOW / 1000);
  const sig = await sign(opts.secret ?? SECRET, t, body);
  const header = opts.header === undefined ? `t=${t},v1=${sig}` : opts.header;
  return {
    method: opts.method ?? 'POST',
    rawBody: body,
    header: (n: string) => (n.toLowerCase() === 'x-signature' ? header : n.toLowerCase() === 'content-type' ? (opts.contentType ?? 'application/json') : null),
  };
}
const deps = (apply = vi.fn(async (_: ApplyArgs) => 'applied'), secrets = [SECRET]) => ({ secrets, nowMs: () => NOW, apply, provider: 'acme' });

describe('signature verification', () => {
  it('accepts a correctly signed body', async () => {
    const body = JSON.stringify(goodEvent());
    const res = await handleWebhook(await signedRequest(body), deps());
    expect(res.status).toBe(200);
  });

  it.each([
    ['no header', null],
    ['empty header', ''],
    ['garbage header', 'hello'],
    ['missing v1', 't=1800000000'],
    ['missing t', 'v1=abcd'],
    ['non-hex signature', `t=1800000000,v1=${'z'.repeat(64)}`],
    ['short signature', 't=1800000000,v1=abcd'],
    ['long signature', `t=1800000000,v1=${'a'.repeat(200)}`],
    ['fractional timestamp', `t=1800000000.5,v1=${'a'.repeat(64)}`],
    ['exponent timestamp', `t=1.8e9,v1=${'a'.repeat(64)}`],
    ['negative timestamp', `t=-1,v1=${'a'.repeat(64)}`],
  ])('rejects %s with 401 and never calls apply', async (_n, header) => {
    const apply = vi.fn(async () => 'applied');
    const body = JSON.stringify(goodEvent());
    const res = await handleWebhook(await signedRequest(body, { header }), deps(apply));
    expect(res.status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });

  it('rejects a wrong secret', async () => {
    const res = await handleWebhook(await signedRequest(JSON.stringify(goodEvent()), { secret: 'another-secret-entirely-abcdefg' }), deps());
    expect(res.status).toBe(401);
  });

  it('rejects a body that was changed after signing', async () => {
    const body = JSON.stringify(goodEvent());
    const req = await signedRequest(body);
    const tampered = { ...req, rawBody: body.replace('yearly', 'monthly') };
    expect((await handleWebhook(tampered, deps())).status).toBe(401);
  });

  it('signs the exact bytes: harmless re-formatting invalidates the signature', async () => {
    const body = JSON.stringify(goodEvent());
    const req = await signedRequest(body);
    const reformatted = { ...req, rawBody: JSON.stringify(JSON.parse(body), null, 2) };
    expect((await handleWebhook(reformatted, deps())).status).toBe(401);
  });

  it('rejects old timestamps (replay) and far-future timestamps', async () => {
    const body = JSON.stringify(goodEvent());
    const old = Math.floor(NOW / 1000) - 301;
    const future = Math.floor(NOW / 1000) + 61;
    expect((await handleWebhook(await signedRequest(body, { t: old }), deps())).status).toBe(401);
    expect((await handleWebhook(await signedRequest(body, { t: future }), deps())).status).toBe(401);
    expect((await handleWebhook(await signedRequest(body, { t: Math.floor(NOW / 1000) - 299 }), deps())).status).toBe(200);
  });

  it('supports secret rotation: either the old or the new secret verifies', async () => {
    const body = JSON.stringify(goodEvent());
    const d = deps(undefined, ['new-secret-aaaaaaaaaaaaaaaaaaaaaaaa', SECRET]);
    expect((await handleWebhook(await signedRequest(body), d)).status).toBe(200);
  });

  it('accepts several v1 values in the header when one matches', async () => {
    const body = JSON.stringify(goodEvent());
    const t = Math.floor(NOW / 1000);
    const good = await sign(SECRET, t, body);
    const header = `t=${t},v1=${'0'.repeat(64)},v1=${good}`;
    expect((await handleWebhook(await signedRequest(body, { header }), deps())).status).toBe(200);
  });

  it('fails closed when no secret is configured', async () => {
    for (const secrets of [[], [''], ['   ']]) {
      const res = await handleWebhook(await signedRequest(JSON.stringify(goodEvent()), { secret: 'attacker-chosen-key' }), deps(undefined, secrets));
      expect(res.status).toBe(500);
    }
  });

  it('verifySignature never throws on hostile input', async () => {
    for (const h of ['t=,v1=', ',,,', 't=1,v1=', '\u0000', 'v1=' + 'g'.repeat(1000), 't=99999999999999999999999,v1=aa']) {
      await expect(verifySignature({ secrets: [SECRET], header: h, rawBody: 'x', nowMs: NOW })).resolves.toBe(false);
    }
  });

  it('timingSafeEqualHex compares correctly and tolerates different lengths', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
    expect(timingSafeEqualHex('abcd', 'abcdef')).toBe(false);
    expect(timingSafeEqualHex('', '')).toBe(false);
  });
});

describe('request checks', () => {
  it('only accepts POST', async () => {
    const body = JSON.stringify(goodEvent());
    for (const method of ['GET', 'PUT', 'DELETE', 'PATCH']) {
      expect((await handleWebhook(await signedRequest(body, { method }), deps())).status).toBe(405);
    }
  });
  it('requires a JSON content type', async () => {
    const body = JSON.stringify(goodEvent());
    expect((await handleWebhook(await signedRequest(body, { contentType: 'text/plain' }), deps())).status).toBe(415);
  });
  it('rejects oversized bodies before doing any work', async () => {
    const apply = vi.fn(async () => 'applied');
    const body = JSON.stringify(goodEvent({ pad: 'x'.repeat(70_000) }));
    expect((await handleWebhook(await signedRequest(body), deps(apply))).status).toBe(413);
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('event validation (after the signature is verified)', () => {
  const bad = async (event: unknown) => (await handleWebhook(await signedRequest(typeof event === 'string' ? event : JSON.stringify(event)), deps())).status;

  it('maps a valid event to the database call', async () => {
    const apply = vi.fn(async (_: ApplyArgs) => 'applied');
    await handleWebhook(await signedRequest(JSON.stringify(goodEvent())), deps(apply));
    expect(apply).toHaveBeenCalledTimes(1);
    const a = apply.mock.calls[0][0];
    expect(a).toMatchObject({ provider: 'acme', eventId: 'evt_123', userId: UID, subId: 'sub_9', customerId: 'cus_7', plan: 'yearly', status: 'active', cancelAtPeriodEnd: false });
    expect(typeof a.eventTime).toBe('string');
    expect(typeof a.periodEnd).toBe('string');
  });

  it.each([
    ['not json', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['missing id', { ...goodEvent(), id: undefined }],
    ['id with odd characters', goodEvent({ id: "evt'; drop table users;--" })],
    ['id too long', goodEvent({ id: 'e'.repeat(200) })],
    ['user id not a uuid', goodEvent({ userId: 'not-a-uuid' })],
    ['user id sql injection', goodEvent({ userId: `${UID}'; select 1;--` })],
    ['unknown event type', goodEvent({ type: 'admin.grant_pro' })],
    ['unknown plan', goodEvent({ subscription: { ...goodEvent().subscription, plan: 'lifetime' } })],
    ['unknown status', goodEvent({ subscription: { ...goodEvent().subscription, status: 'root' } })],
    ['period end not a date', goodEvent({ subscription: { ...goodEvent().subscription, currentPeriodEnd: 'tomorrow' } })],
    ['period end absurdly far away', goodEvent({ subscription: { ...goodEvent().subscription, currentPeriodEnd: '2999-01-01T00:00:00Z' } })],
    ['occurredAt far in the future', goodEvent({ occurredAt: new Date(NOW + 3_600_000).toISOString() })],
    ['occurredAt not a date', goodEvent({ occurredAt: 12345 })],
    ['subscription missing', { ...goodEvent(), subscription: undefined }],
    ['cancelAtPeriodEnd not boolean', goodEvent({ subscription: { ...goodEvent().subscription, cancelAtPeriodEnd: 'yes' } })],
  ])('rejects %s with 400 and does not touch the database', async (_n, ev) => {
    const apply = vi.fn(async () => 'applied');
    const req = await signedRequest(typeof ev === 'string' ? ev : JSON.stringify(ev));
    const res = await handleWebhook(req, deps(apply));
    expect(res.status).toBe(400);
    expect(apply).not.toHaveBeenCalled();
  });

  it('ignores extra fields instead of forwarding them', async () => {
    const apply = vi.fn(async (_: ApplyArgs) => 'applied');
    await handleWebhook(await signedRequest(JSON.stringify(goodEvent({ isAdmin: true, subscription: { ...goodEvent().subscription, role: 'service_role' } }))), deps(apply));
    expect(Object.keys(apply.mock.calls[0][0]).sort()).toEqual(['cancelAtPeriodEnd', 'customerId', 'eventId', 'eventTime', 'periodEnd', 'plan', 'provider', 'status', 'subId', 'userId']);
  });

  it('does not allow prototype pollution through the JSON body', () => {
    const r = parseEvent('{"__proto__":{"polluted":true},"id":"e1"}', NOW);
    expect(r.ok).toBe(false);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('treats duplicate and stale events as success so the provider stops retrying', async () => {
    for (const result of ['duplicate', 'stale']) {
      const res = await handleWebhook(await signedRequest(JSON.stringify(goodEvent())), deps(vi.fn(async () => result)));
      expect(res.status).toBe(200);
      expect(res.body.result).toBe(result);
    }
  });

  it('flags ownership conflicts with 409 and unknown users with 200 (retrying cannot help)', async () => {
    expect((await handleWebhook(await signedRequest(JSON.stringify(goodEvent())), deps(vi.fn(async () => 'conflict')))).status).toBe(409);
    expect((await handleWebhook(await signedRequest(JSON.stringify(goodEvent())), deps(vi.fn(async () => 'unknown_user')))).status).toBe(200);
  });

  it('returns a generic 500 when the database fails, without leaking the reason', async () => {
    const apply = vi.fn(async () => { throw new Error('password authentication failed for user "postgres" at db.secret.internal'); });
    const res = await handleWebhook(await signedRequest(JSON.stringify(goodEvent())), deps(apply));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/postgres|secret|password/i);
  });

  it('never echoes the request or the secret in any response', async () => {
    const res = await handleWebhook(await signedRequest(JSON.stringify(goodEvent()), { secret: 'wrong-wrong-wrong-wrong-wrong' }), deps());
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
    expect(JSON.stringify(res.body)).not.toContain(UID);
  });
});
