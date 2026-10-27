// What the signed-in user may do. The ANSWER comes from the server (public.my_entitlement);
// this file only reads it safely. The UI uses it to show or hide buttons: the database is what
// actually enforces every limit, so editing this in dev tools unlocks nothing.
export type Feature = 'history-range' | 'patterns' | 'sound-mixes' | 'weekly-report';
export type Plan = 'monthly' | 'yearly';
export type SubStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled' | 'expired';

export interface Entitlement {
  pro: boolean;
  plan: Plan | null;
  status: SubStatus | null;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  /** How many days of history the account can use. null = unlimited. */
  historyDays: number | null;
  maxMixes: number;
}

export const FREE_HISTORY_DAYS = 7;
export const FREE_ENTITLEMENT: Entitlement = {
  pro: false, plan: null, status: null, periodEnd: null, cancelAtPeriodEnd: false, historyDays: FREE_HISTORY_DAYS, maxMixes: 0,
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const STATUSES: SubStatus[] = ['active', 'trialing', 'past_due', 'paused', 'canceled', 'expired'];

function parseDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t) : null;
}

export function parseEntitlement(raw: unknown): Entitlement {
  if (!isObj(raw) || typeof raw.pro !== 'boolean') return FREE_ENTITLEMENT;
  const status = typeof raw.status === 'string' && STATUSES.includes(raw.status as SubStatus) ? (raw.status as SubStatus) : null;
  const periodEnd = parseDate(raw.current_period_end);
  const cancelAtPeriodEnd = raw.cancel_at_period_end === true;
  if (!raw.pro) {
    const d = raw.history_days;
    const historyDays = typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 3650 ? d : FREE_HISTORY_DAYS;
    return { ...FREE_ENTITLEMENT, status, periodEnd, cancelAtPeriodEnd, historyDays };
  }
  const m = raw.max_mixes;
  return {
    pro: true,
    plan: raw.plan === 'monthly' || raw.plan === 'yearly' ? raw.plan : null,
    status,
    periodEnd,
    cancelAtPeriodEnd,
    historyDays: null,
    maxMixes: typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 20 ? m : 20,
  };
}

interface RpcClient { rpc: (fn: string) => PromiseLike<{ data: unknown; error: unknown }> }

/** Never throws: any failure means "free", so an outage can never grant Pro. */
export async function fetchEntitlement(client: RpcClient | null): Promise<Entitlement> {
  if (!client) return FREE_ENTITLEMENT;
  try {
    const { data, error } = await client.rpc('my_entitlement');
    return error ? FREE_ENTITLEMENT : parseEntitlement(data);
  } catch {
    return FREE_ENTITLEMENT;
  }
}

export const canUse = (e: Entitlement, _feature: Feature): boolean => e.pro;

/** days = null means "all time". */
export function historyRangeAllowed(e: Entitlement, days: number | null): boolean {
  if (e.pro) return true;
  return days !== null && days <= (e.historyDays ?? FREE_HISTORY_DAYS);
}
