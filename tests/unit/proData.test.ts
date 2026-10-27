import { describe, it, expect, vi } from 'vitest';
import { fetchMixes, saveMix, deleteMix, getWeeklyEmail, setWeeklyEmail } from '../../src/app/services/proData';
import { selectForUpload } from '../../src/app/services/sync';
import { FREE_ENTITLEMENT, parseEntitlement } from '../../src/app/services/entitlements';
import type { HistoryItem } from '../../src/app/types';

const UID = '11111111-1111-4111-8111-111111111111';
const MID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** A chainable fake of the few Supabase query-builder calls we use. */
function fakeClient(result: { data?: unknown; error?: { code?: string; message?: string } | null } = { data: null, error: null }) {
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const make = (table: string) => {
    const b: any = {};
    for (const op of ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'limit', 'maybeSingle', 'single']) {
      b[op] = (...args: unknown[]) => { calls.push({ table, op, args }); return b; };
    }
    b.then = (res: (v: unknown) => unknown) => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(res);
    return b;
  };
  return { client: { from: (t: string) => make(t) } as any, calls };
}
const mix = { name: 'Rainy', layers: [{ preset: 'rain', volume: 0.5 }] };

describe('mixes', () => {
  it('loads and validates mixes from the server', async () => {
    const { client } = fakeClient({ data: [{ id: MID, name: 'A', layers: [{ preset: 'rain', volume: 0.4 }] }, { id: 'bad', name: 'x', layers: [] }] });
    expect(await fetchMixes(client)).toHaveLength(1);
  });
  it('fetchMixes returns [] on error instead of throwing', async () => {
    const { client } = fakeClient({ error: { message: 'boom' } });
    expect(await fetchMixes(client)).toEqual([]);
  });
  it('sends only validated fields when saving', async () => {
    const { client, calls } = fakeClient({ data: { id: MID, name: 'Rainy', layers: mix.layers } });
    const r = await saveMix(client, UID, { ...mix, user_id: 'someone-else', admin: true, layers: [{ preset: 'rain', volume: 0.5, evil: 1 }] });
    expect(r.ok).toBe(true);
    const insert = calls.find((c) => c.op === 'insert')!;
    expect(insert.args[0]).toEqual({ user_id: UID, name: 'Rainy', layers: [{ preset: 'rain', volume: 0.5 }] });
  });
  it('rejects bad input before any network call', async () => {
    const { client, calls } = fakeClient();
    const r = await saveMix(client, UID, { name: '', layers: [] });
    expect(r.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });
  it('explains permission and limit errors in plain language', async () => {
    const rls = await saveMix(fakeClient({ error: { code: '42501', message: 'new row violates row-level security policy' } }).client, UID, mix);
    expect(!rls.ok && rls.error).toMatch(/Pro/);
    const limit = await saveMix(fakeClient({ error: { code: '53400', message: 'mix limit reached' } }).client, UID, mix);
    expect(!limit.ok && limit.error).toMatch(/20/);
    const other = await saveMix(fakeClient({ error: { code: 'XX000', message: 'internal db detail host=10.0.0.5' } }).client, UID, mix);
    expect(!other.ok && other.error).not.toMatch(/10\.0\.0\.5|internal/);
  });
  it('updates an existing mix by id, scoped to the user', async () => {
    const { client, calls } = fakeClient({ data: { id: MID, name: 'Rainy', layers: mix.layers } });
    await saveMix(client, UID, mix, MID);
    expect(calls.some((c) => c.op === 'update')).toBe(true);
    expect(calls.filter((c) => c.op === 'eq').map((c) => c.args)).toEqual(expect.arrayContaining([['id', MID], ['user_id', UID]]));
  });
  it('refuses to delete with a malformed id', async () => {
    const { client, calls } = fakeClient();
    expect((await deleteMix(client, "x' or '1'='1")).ok).toBe(false);
    expect(calls).toHaveLength(0);
    expect((await deleteMix(client, MID)).ok).toBe(true);
  });
});

describe('weekly email preference', () => {
  it('reads the saved preference, defaulting to off', async () => {
    expect(await getWeeklyEmail(fakeClient({ data: { weekly_email: true } }).client, UID)).toBe(true);
    expect(await getWeeklyEmail(fakeClient({ data: null }).client, UID)).toBe(false);
    expect(await getWeeklyEmail(fakeClient({ error: { message: 'x' } }).client, UID)).toBe(false);
  });
  it('writes only the two allowed columns', async () => {
    const { client, calls } = fakeClient();
    await setWeeklyEmail(client, UID, true);
    expect(calls.find((c) => c.op === 'upsert')!.args[0]).toEqual({ user_id: UID, weekly_email: true });
  });
  it('maps the Pro-only refusal to a clear message', async () => {
    const r = await setWeeklyEmail(fakeClient({ error: { code: '42501', message: 'rls' } }).client, UID, true);
    expect(!r.ok && r.error).toMatch(/Pro/);
  });
});

describe('selectForUpload (what a free account sends to the cloud)', () => {
  const NOW = new Date(2026, 9, 28, 12);
  const it_ = (id: number, daysAgo: number): HistoryItem => ({ id, date: new Date(2026, 9, 28 - daysAgo, 9).toISOString(), type: 'Check', score: 70 } as any);
  const items = [it_(1, 0), it_(2, 6), it_(3, 7), it_(4, 200)];
  it('free accounts upload only the last 7 days (the server refuses older rows)', () => {
    expect(selectForUpload(items, FREE_ENTITLEMENT, NOW).map((i) => i.id)).toEqual([1, 2]);
  });
  it('Pro accounts upload everything', () => {
    expect(selectForUpload(items, parseEntitlement({ pro: true, plan: 'yearly', status: 'active' }), NOW)).toHaveLength(4);
  });
});
