import type { HistoryItem } from '../types';
import type { Entitlement } from './entitlements';
import { FREE_HISTORY_DAYS } from './entitlements';
import { filterRange } from './stats';

/**
 * What this account may upload. Free accounts sync the last 7 days (the database refuses older rows,
 * so sending them would fail the whole batch); Pro accounts sync everything.
 */
export function selectForUpload(items: HistoryItem[], ent: Entitlement, now = new Date()): HistoryItem[] {
  return ent.pro ? items : filterRange(items, ent.historyDays ?? FREE_HISTORY_DAYS, now);
}
