// Pro "personal patterns". Pure functions over the user's own sessions.
// Rules: say nothing until there is enough data, report medians/means plainly, and never present a
// correlation as a cause.
import { format } from 'date-fns';
import type { FocusSession } from '../types';

export type Insufficient = { status: 'insufficient'; have: number; need: number; reason?: string };

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const validSession = (s: FocusSession) => Number.isFinite(Date.parse(s.startTime)) || Number.isFinite(Date.parse(s.date));

export const MIN_PATTERN_SESSIONS = 8;

// ---- Best hours ----
export type BestHours =
  | Insufficient
  | { status: 'ok'; hours: { hour: number; label: string; avgScore: number; sessions: number }[]; totalSessions: number };

export function bestHours(sessions: FocusSession[]): BestHours {
  const scored = sessions.filter((s) => validSession(s) && s.score > 0);
  if (scored.length < MIN_PATTERN_SESSIONS) return { status: 'insufficient', have: scored.length, need: MIN_PATTERN_SESSIONS };
  const byHour = new Map<number, number[]>();
  for (const s of scored) {
    const d = new Date(Number.isFinite(Date.parse(s.startTime)) ? s.startTime : s.date);
    byHour.set(d.getHours(), [...(byHour.get(d.getHours()) ?? []), s.score]);
  }
  const hours = [...byHour.entries()]
    .filter(([, v]) => v.length >= 3)
    .map(([hour, v]) => ({ hour, label: format(new Date(2000, 0, 1, hour), 'h a').toLowerCase(), avgScore: Math.round(avg(v)), sessions: v.length }))
    .sort((a, b) => b.avgScore - a.avgScore || b.sessions - a.sessions)
    .slice(0, 3);
  if (!hours.length) return { status: 'insufficient', have: scored.length, need: MIN_PATTERN_SESSIONS, reason: 'No single hour has 3 or more sessions yet.' };
  return { status: 'ok', hours, totalSessions: scored.length };
}

// ---- Break cadence ----
export type BreakCadence =
  | Insufficient
  | {
      status: 'ok';
      sessionsWithBreaks: number;
      typicalStretchMinutes: number;
      typicalBreakMinutes: number;
      scoreWithBreaks: number | null;
      scoreWithoutBreaks: number | null;
      suggestedEveryMinutes: number | null;
    };

export function breakCadence(sessions: FocusSession[]): BreakCadence {
  const withBreaks = sessions.filter((s) => Array.isArray(s.breaks) && s.breaks.length > 0);
  if (withBreaks.length < 3) return { status: 'insufficient', have: withBreaks.length, need: 3 };
  const without = sessions.filter((s) => !Array.isArray(s.breaks) || s.breaks.length === 0);

  const stretches = withBreaks.map((s) => Math.min(...s.breaks.map((b) => b.startMinute)));
  const lengths = withBreaks.flatMap((s) => s.breaks.map((b) => b.durationMinutes)).filter((m) => m > 0);
  const scored = (list: FocusSession[]) => list.filter((s) => s.score > 0).map((s) => s.score);
  const a = scored(withBreaks), b = scored(without);
  const compare = a.length >= 3 && b.length >= 3;

  const fades = sessions.filter((s) => s.attentionFaded && (s.fadeAfterMinutes ?? 0) > 0).map((s) => s.fadeAfterMinutes as number);
  const suggested = fades.length >= 3 ? Math.max(10, Math.floor(median(fades) / 5) * 5) : null;

  return {
    status: 'ok',
    sessionsWithBreaks: withBreaks.length,
    typicalStretchMinutes: Math.round(median(stretches)),
    typicalBreakMinutes: lengths.length ? Math.round(median(lengths)) : 0,
    scoreWithBreaks: compare ? Math.round(avg(a)) : null,
    scoreWithoutBreaks: compare ? Math.round(avg(b)) : null,
    suggestedEveryMinutes: suggested,
  };
}

// ---- Sleep and focus ----
export type SleepFocus =
  | Insufficient
  | {
      status: 'ok';
      n: number;
      r: number;
      strength: 'none' | 'weak' | 'moderate' | 'strong';
      direction: 'positive' | 'negative' | 'none';
      shortSleepAvg: number | null; // sessions after < 6 h
      longSleepAvg: number | null; // sessions after >= 7.5 h
      summary: string;
      caveat: string;
    };

function pearson(xs: number[], ys: number[]): number | null {
  const mx = avg(xs), my = avg(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) return null;
  if (syy === 0) return 0;
  return sxy / Math.sqrt(sxx * syy);
}

export function sleepFocus(sessions: FocusSession[]): SleepFocus {
  const pairs = sessions.filter((s) => s.sleepHours > 0 && s.sleepHours <= 24 && s.score > 0);
  if (pairs.length < MIN_PATTERN_SESSIONS) return { status: 'insufficient', have: pairs.length, need: MIN_PATTERN_SESSIONS };
  const sleep = pairs.map((s) => s.sleepHours), score = pairs.map((s) => s.score);
  const r = pearson(sleep, score);
  if (r === null) return { status: 'insufficient', have: pairs.length, need: MIN_PATTERN_SESSIONS, reason: 'Your sleep hours were all the same, so there is nothing to compare yet.' };

  const abs = Math.abs(r);
  const strength = abs < 0.2 ? 'none' : abs < 0.4 ? 'weak' : abs < 0.6 ? 'moderate' : 'strong';
  const direction = strength === 'none' ? 'none' : r > 0 ? 'positive' : 'negative';
  const shortG = pairs.filter((s) => s.sleepHours < 6).map((s) => s.score);
  const longG = pairs.filter((s) => s.sleepHours >= 7.5).map((s) => s.score);
  const shortSleepAvg = shortG.length >= 2 ? Math.round(avg(shortG)) : null;
  const longSleepAvg = longG.length >= 2 ? Math.round(avg(longG)) : null;

  let summary: string;
  if (strength === 'none') summary = `Across ${pairs.length} sessions, how long you slept doesn't clearly line up with how well you focused.`;
  else if (shortSleepAvg !== null && longSleepAvg !== null) {
    summary = `After 7.5+ hours of sleep your sessions averaged ${longSleepAvg}%, versus ${shortSleepAvg}% after under 6 hours (${pairs.length} sessions, ${strength} ${direction} link).`;
  } else {
    summary = `There is a ${strength} ${direction} link between your sleep and your session scores (${pairs.length} sessions).`;
  }
  return {
    status: 'ok', n: pairs.length, r: Math.round(r * 100) / 100, strength, direction, shortSleepAvg, longSleepAvg, summary,
    caveat: 'This is a link in your own data, not proof that sleep causes the difference.',
  };
}
