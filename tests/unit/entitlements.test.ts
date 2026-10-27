import { describe, it, expect, vi } from 'vitest';
import { parseEntitlement, FREE_ENTITLEMENT, fetchEntitlement, canUse, historyRangeAllowed } from '../../src/app/services/entitlements';

const proRaw = { pro: true, plan: 'yearly', status: 'active', current_period_end: '2027-01-01T00:00:00Z', cancel_at_period_end: false, history_days: null, max_mixes: 20 };

describe('parseEntitlement', () => {
  it('reads a valid Pro response', () => {
    const e = parseEntitlement(proRaw);
    expect(e).toMatchObject({ pro: true, plan: 'yearly', status: 'active', historyDays: null, maxMixes: 20, cancelAtPeriodEnd: false });
    expect(e.periodEnd?.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('reads a free response', () => {
    expect(parseEntitlement({ pro: false, plan: null, status: null, current_period_end: null, cancel_at_period_end: false, history_days: 7, max_mixes: 0 })).toMatchObject({ pro: false, historyDays: 7, maxMixes: 0 });
  });

  it.each([null, undefined, 5, 'pro', [], {}, { pro: 'true' }, { pro: 1 }, { pro: 'yes' }, { PRO: true }])('treats %p as free (fails closed)', (raw) => {
    expect(parseEntitlement(raw)).toEqual(FREE_ENTITLEMENT);
  });

  it('only a literal boolean true grants Pro', () => {
    expect(parseEntitlement({ ...proRaw, pro: 'true' }).pro).toBe(false);
    expect(parseEntitlement({ ...proRaw, pro: 1 }).pro).toBe(false);
  });

  it('ignores nonsense in the other fields', () => {
    const e = parseEntitlement({ pro: true, plan: 'lifetime', status: 'root', current_period_end: 'tomorrow', history_days: -5, max_mixes: 1e9 });
    expect(e.pro).toBe(true);
    expect(e.plan).toBeNull();
    expect(e.status).toBeNull();
    expect(e.periodEnd).toBeNull();
    expect(e.historyDays).toBeNull();
    expect(e.maxMixes).toBe(20);
  });
});

describe('fetchEntitlement', () => {
  it('returns the server’s answer', async () => {
    const client = { rpc: vi.fn(async () => ({ data: proRaw, error: null })) };
    expect((await fetchEntitlement(client as any)).pro).toBe(true);
    expect(client.rpc).toHaveBeenCalledWith('my_entitlement');
  });
  it('falls back to free on an error, never throws', async () => {
    expect(await fetchEntitlement({ rpc: async () => ({ data: null, error: { message: 'boom' } }) } as any)).toEqual(FREE_ENTITLEMENT);
    expect(await fetchEntitlement({ rpc: async () => { throw new Error('network'); } } as any)).toEqual(FREE_ENTITLEMENT);
  });
  it('is free when there is no client (guest mode)', async () => {
    expect(await fetchEntitlement(null)).toEqual(FREE_ENTITLEMENT);
  });
});

describe('feature checks', () => {
  const pro = parseEntitlement(proRaw);
  it('free can use nothing Pro-only', () => {
    for (const f of ['history-range', 'patterns', 'sound-mixes', 'weekly-report'] as const) {
      expect(canUse(FREE_ENTITLEMENT, f)).toBe(false);
      expect(canUse(pro, f)).toBe(true);
    }
  });
  it('limits the analytics range to the server’s history window', () => {
    expect(historyRangeAllowed(FREE_ENTITLEMENT, 7)).toBe(true);
    expect(historyRangeAllowed(FREE_ENTITLEMENT, 30)).toBe(false);
    expect(historyRangeAllowed(FREE_ENTITLEMENT, null)).toBe(false);
    expect(historyRangeAllowed(pro, 90)).toBe(true);
    expect(historyRangeAllowed(pro, null)).toBe(true);
  });
});
