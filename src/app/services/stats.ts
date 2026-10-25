// Real, derived statistics. Every number shown in the UI comes from here —
// when there isn't enough data we return null and the UI shows an empty state.
import { format, isSameDay, subDays, startOfDay, differenceInCalendarDays } from 'date-fns';
import type { HistoryItem, FocusSession, ReadinessCheck, StressResetSession } from '../types';

export const isFocusSession = (i: HistoryItem): i is FocusSession => i.type === 'Session';
export const isReadinessCheck = (i: HistoryItem): i is ReadinessCheck => i.type === 'Check';
export const isStressReset = (i: HistoryItem): i is StressResetSession => i.type === 'StressReset';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Minimum data points before we claim a "pattern". */
export const MIN_SESSIONS_FOR_PATTERNS = 3;

export function computeStreak(history: HistoryItem[], now = new Date()): number {
  if (!history.length) return 0;
  const days = new Set(history.map((h) => startOfDay(new Date(h.date)).getTime()));
  let cursor = startOfDay(now);
  // A streak is still alive if you were active yesterday but not yet today.
  if (!days.has(cursor.getTime())) cursor = subDays(cursor, 1);
  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function latestReadinessToday(history: HistoryItem[], now = new Date()): ReadinessCheck | null {
  const checks = history.filter(isReadinessCheck).filter((c) => isSameDay(new Date(c.date), now));
  if (!checks.length) return null;
  return checks.reduce((a, b) => (new Date(a.date) > new Date(b.date) ? a : b));
}

export function todayStats(history: HistoryItem[], now = new Date()) {
  const todays = history.filter((h) => isSameDay(new Date(h.date), now));
  const sessions = todays.filter(isFocusSession);
  return {
    sessions: sessions.length,
    focusMinutes: sessions.reduce((a, s) => a + s.durationMinutes, 0),
    resets: todays.filter(isStressReset).length,
    readiness: latestReadinessToday(history, now),
  };
}

function hourLabel(h: number) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return format(d, 'h a');
}

export function insights(history: HistoryItem[]) {
  const sessions = history.filter(isFocusSession);
  const resets = history.filter(isStressReset);
  const enough = sessions.length >= MIN_SESSIONS_FOR_PATTERNS;

  // Average attention span: when attention faded, use the fade point; otherwise the full block counts.
  const spans = sessions.map((s) => (s.attentionFaded && s.fadeAfterMinutes ? s.fadeAfterMinutes : s.durationMinutes));
  const avgAttentionSpan = sessions.length ? Math.round(avg(spans)) : null;

  // Best 2-hour window by average session score.
  let bestTimeOfDay: string | null = null;
  if (enough) {
    const buckets = new Map<number, number[]>();
    sessions.forEach((s) => {
      const b = Math.floor(new Date(s.startTime).getHours() / 2) * 2;
      buckets.set(b, [...(buckets.get(b) || []), s.score]);
    });
    let best: [number, number] | null = null;
    buckets.forEach((scores, b) => {
      const a = avg(scores);
      if (!best || a > best[1]) best = [b, a];
    });
    if (best) bestTimeOfDay = `${hourLabel(best[0])} – ${hourLabel((best[0] + 2) % 24)}`;
  }

  // Suggested break interval: a little before attention usually fades.
  const fades = sessions.filter((s) => s.attentionFaded && s.fadeAfterMinutes).map((s) => s.fadeAfterMinutes!);
  const suggestedBreakInterval = fades.length >= 2 ? Math.max(10, Math.floor(avg(fades) / 5) * 5) : null;

  // Self-reported stress change across breathing sessions.
  const rated = resets.filter((r) => r.stressBefore > 0);
  const stressReductionPct = rated.length
    ? Math.round(avg(rated.map((r) => ((r.stressBefore - r.stressAfter) / r.stressBefore) * 100)))
    : null;

  return { avgAttentionSpan, bestTimeOfDay, suggestedBreakInterval, stressReductionPct, enough };
}

export function overallScore(history: HistoryItem[]): number | null {
  const scored = history.filter((h) => h.score > 0);
  return scored.length ? Math.round(avg(scored.map((h) => h.score))) : null;
}

/** Last 7 days. Days with no activity are null so charts show gaps, not invented values. */
export function weeklySeries(history: HistoryItem[], now = new Date()) {
  return Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(now, 6 - i);
    const items = history.filter((h) => isSameDay(new Date(h.date), date));
    const sessions = items.filter(isFocusSession);
    return {
      name: format(date, 'EEE'),
      fullDate: format(date, 'MMM d'),
      score: items.length ? Math.round(avg(items.map((h) => h.score))) : null,
      minutes: sessions.reduce((a, s) => a + s.durationMinutes, 0),
    };
  });
}

export function daysSince(iso: string, now = new Date()) {
  return differenceInCalendarDays(now, new Date(iso));
}
