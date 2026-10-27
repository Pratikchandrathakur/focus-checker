// Weekly focus report. Pure and dependency-free so the app (Analytics) and the weekly email job
// (Deno edge function) compute exactly the same numbers. Input rows come from user-controlled JSON,
// so everything is validated: bad rows are skipped, never trusted and never thrown on.

export interface ReportOptions {
  now: Date;
  /** Reader's offset from UTC in minutes (Kathmandu = 345, New York in summer = -240). */
  utcOffsetMinutes?: number;
}

export interface WeeklyReport {
  periodLabel: string;
  hasActivity: boolean;
  focus: {
    sessions: number;
    minutes: number;
    avgScore: number | null;
    bestDay: { label: string; minutes: number } | null;
    minutesVsPrevWeek: number | null;
  };
  checks: { count: number; avgReadiness: number | null };
  resets: { count: number; avgStressDrop: number | null; ratedCount: number };
  topTasks: { task: string; minutes: number }[];
  highlights: string[];
}

const DAY = 86_400_000;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n: number) => Math.round(n * 10) / 10;

function cleanText(v: unknown, max = 60): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

const dayLabel = (dayKey: number) =>
  new Date(dayKey * DAY).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
const shortLabel = (dayKey: number) =>
  new Date(dayKey * DAY).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export function buildWeeklyReport(items: unknown[], opts: ReportOptions): WeeklyReport {
  const offset = (opts.utcOffsetMinutes ?? 0) * 60_000;
  const today = Math.floor((opts.now.getTime() + offset) / DAY);
  const start = today - 6;
  const prevStart = today - 13;
  const prevEnd = today - 7;

  const perDay = new Map<number, number>();
  const taskMinutes = new Map<string, { task: string; minutes: number }>();
  const scores: number[] = [];
  const readiness: number[] = [];
  const drops: number[] = [];
  let sessions = 0, minutes = 0, prevMinutes = 0, prevSessions = 0, checks = 0, resets = 0;

  for (const it of Array.isArray(items) ? items : []) {
    if (!isObj(it) || typeof it.date !== 'string') continue;
    const ms = Date.parse(it.date);
    if (!Number.isFinite(ms)) continue;
    const day = Math.floor((ms + offset) / DAY);
    const inWeek = day >= start && day <= today;
    const inPrev = day >= prevStart && day <= prevEnd;
    if (!inWeek && !inPrev) continue;

    if (it.type === 'Session') {
      const d = num(it.durationMinutes);
      if (d === null || d <= 0 || d > 1440) continue;
      if (inPrev) { prevMinutes += d; prevSessions++; continue; }
      sessions++;
      minutes += d;
      perDay.set(day, (perDay.get(day) ?? 0) + d);
      const s = num(it.score);
      if (s !== null && s > 0 && s <= 100) scores.push(s);
      const task = cleanText(it.task);
      if (task) {
        const key = task.toLowerCase();
        const cur = taskMinutes.get(key) ?? { task, minutes: 0 };
        cur.minutes += d;
        taskMinutes.set(key, cur);
      }
    } else if (inWeek && it.type === 'Check') {
      checks++;
      const s = num(it.score);
      if (s !== null && s > 0 && s <= 100) readiness.push(s);
    } else if (inWeek && it.type === 'StressReset') {
      resets++;
      const b = num(it.stressBefore), a = num(it.stressAfter);
      if (b !== null && a !== null && b >= 1 && b <= 10 && a >= 0 && a <= 10) drops.push(b - a);
    }
  }

  let bestDay: WeeklyReport['focus']['bestDay'] = null;
  for (const [day, m] of [...perDay.entries()].sort((a, b) => a[0] - b[0])) {
    if (!bestDay || m > bestDay.minutes) bestDay = { label: dayLabel(day), minutes: m };
  }
  const minutesVsPrevWeek = prevSessions > 0 ? Math.round(minutes - prevMinutes) : null;
  const avgStressDrop = drops.length ? round1(avg(drops)) : null;

  const highlights: string[] = [];
  if (sessions > 0) highlights.push(`${Math.round(minutes)} min of focus across ${sessions} session${sessions === 1 ? '' : 's'}.`);
  if (minutesVsPrevWeek !== null && minutesVsPrevWeek !== 0) {
    highlights.push(`${Math.abs(minutesVsPrevWeek)} min ${minutesVsPrevWeek > 0 ? 'more' : 'less'} than last week.`);
  }
  if (bestDay && perDay.size >= 2) highlights.push(`Your longest day was ${bestDay.label} (${Math.round(bestDay.minutes)} min).`);
  if (drops.length >= 2 && avgStressDrop !== null && avgStressDrop > 0) {
    highlights.push(`Your self-rated stress dropped by about ${avgStressDrop} points after breathing resets.`);
  }

  return {
    periodLabel: `${shortLabel(start)} – ${shortLabel(today)}`,
    hasActivity: sessions + checks + resets > 0,
    focus: { sessions, minutes: Math.round(minutes), avgScore: scores.length ? Math.round(avg(scores)) : null, bestDay, minutesVsPrevWeek },
    checks: { count: checks, avgReadiness: readiness.length ? Math.round(avg(readiness)) : null },
    resets: { count: resets, avgStressDrop, ratedCount: drops.length },
    topTasks: [...taskMinutes.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 3).map((t) => ({ task: t.task, minutes: Math.round(t.minutes) })),
    highlights,
  };
}
