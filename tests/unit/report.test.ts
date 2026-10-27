// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildWeeklyReport } from '../../supabase/functions/_shared/report';
import { renderReportEmail } from '../../supabase/functions/_shared/html';

const NOW = new Date('2026-10-28T10:00:00Z'); // a Wednesday, UTC
const DAY = 864e5;
const at = (daysAgo: number, hour = 9) => new Date(Date.UTC(2026, 9, 28 - daysAgo, hour, 0, 0)).toISOString();
const session = (daysAgo: number, minutes: number, extra: Record<string, unknown> = {}) =>
  ({ type: 'Session', date: at(daysAgo), startTime: at(daysAgo), durationMinutes: minutes, score: 80, task: 'Write report', ...extra });
const reset = (daysAgo: number, before: number, after: number) => ({ type: 'StressReset', date: at(daysAgo), stressBefore: before, stressAfter: after, score: 70 });
const check = (daysAgo: number, score: number) => ({ type: 'Check', date: at(daysAgo), score });
const build = (items: unknown[], extra: Record<string, unknown> = {}) => buildWeeklyReport(items, { now: NOW, utcOffsetMinutes: 0, ...extra } as any);

describe('buildWeeklyReport', () => {
  it('reports no activity for an empty week', () => {
    const r = build([]);
    expect(r.hasActivity).toBe(false);
    expect(r.highlights).toEqual([]);
    expect(r.focus.sessions).toBe(0);
    expect(r.focus.avgScore).toBeNull();
  });

  it('adds up the last 7 days only', () => {
    const r = build([session(0, 30), session(3, 45), session(6, 25), session(7, 60), session(20, 90)]);
    expect(r.focus.sessions).toBe(3);
    expect(r.focus.minutes).toBe(100);
  });

  it('ignores items dated in the future', () => {
    const r = build([session(-2, 50), session(1, 20)]);
    expect(r.focus.minutes).toBe(20);
  });

  it('uses the reader’s local day boundaries', () => {
    // 23:30 UTC on Oct 27 is already Oct 28 in Kathmandu (UTC+5:45) -> it belongs to "today" there.
    const item = { type: 'Session', date: '2026-10-27T23:30:00Z', durationMinutes: 30, score: 70 };
    const eightDaysBack = { type: 'Session', date: '2026-10-21T23:30:00Z', durationMinutes: 40, score: 70 };
    const ktm = buildWeeklyReport([item, eightDaysBack], { now: NOW, utcOffsetMinutes: 345 });
    expect(ktm.focus.minutes).toBe(30 + 40); // Oct 21 23:30Z = Oct 22 05:15 local: still inside the 7 local days (22..28)
    const utc = buildWeeklyReport([item, eightDaysBack], { now: NOW, utcOffsetMinutes: 0 });
    expect(utc.focus.minutes).toBe(30); // Oct 21 is outside Oct 22..28 in UTC
  });

  it('averages only real scores', () => {
    const r = build([session(1, 30, { score: 90 }), session(2, 30, { score: 70 }), session(3, 30, { score: 0 }), session(4, 30, { score: 'x' })]);
    expect(r.focus.avgScore).toBe(80);
  });

  it('survives hostile or corrupt rows without throwing or counting them', () => {
    const junk = [null, 5, 'x', [], {}, { type: 'Session' }, session(1, -50), session(1, 1e9), session(1, NaN), { type: 'Session', date: 'nope', durationMinutes: 30 }, { type: 'Admin', date: at(1), durationMinutes: 99 }];
    const r = build([...junk, session(1, 30)]);
    expect(r.focus.sessions).toBe(1);
    expect(r.focus.minutes).toBe(30);
  });

  it('finds the best day (earliest wins ties)', () => {
    const r = build([session(1, 30), session(2, 90), session(2, 10), session(3, 100)]);
    expect(r.focus.bestDay?.minutes).toBe(100);
    const tie = build([session(1, 60), session(3, 60)]);
    expect(tie.focus.bestDay?.label).toBe('Sun, Oct 25');
  });

  it('compares with the previous 7 days only when there is something to compare', () => {
    expect(build([session(1, 60)]).focus.minutesVsPrevWeek).toBeNull();
    expect(build([session(1, 60), session(9, 40)]).focus.minutesVsPrevWeek).toBe(20);
    expect(build([session(1, 30), session(9, 40)]).focus.minutesVsPrevWeek).toBe(-10);
  });

  it('measures stress change from rated resets only', () => {
    const r = build([reset(1, 8, 4), reset(2, 6, 4), reset(3, 0, 0), reset(4, 5, 99)]);
    expect(r.resets.count).toBe(4);
    expect(r.resets.avgStressDrop).toBe(3); // (4 + 2) / 2
  });

  it('averages readiness check scores', () => {
    expect(build([check(1, 60), check(2, 80)]).checks.avgReadiness).toBe(70);
    expect(build([check(1, 0)]).checks.avgReadiness).toBeNull();
  });

  it('groups top tasks case-insensitively and cleans the text', () => {
    const r = build([
      session(1, 30, { task: 'Write report' }), session(2, 40, { task: '  write REPORT ' }), session(3, 20, { task: 'Email' }),
      session(4, 10, { task: '' }), session(5, 15, { task: 'x'.repeat(200) }), session(5, 5, { task: 'bad\u0000\u0007task' }),
    ]);
    expect(r.topTasks[0]).toEqual({ task: 'Write report', minutes: 70 });
    expect(r.topTasks.every((t) => t.task.length <= 60 && !/[\u0000-\u001f]/.test(t.task))).toBe(true);
    expect(r.topTasks.length).toBeLessThanOrEqual(3);
  });

  it('only states things the data supports', () => {
    const few = build([session(1, 30)]);
    expect(few.highlights.join(' ')).not.toMatch(/stress|last week/i);
    const rich = build([session(1, 90), session(9, 40), reset(1, 8, 4), reset(2, 7, 5)]);
    const text = rich.highlights.join(' ');
    expect(text).toMatch(/50 min more than last week/);
    expect(text).toMatch(/stress/i);
  });

  it('flags activity when only checks or resets happened', () => {
    expect(build([reset(1, 5, 3)]).hasActivity).toBe(true);
    expect(build([check(1, 70)]).hasActivity).toBe(true);
  });
});

describe('renderReportEmail', () => {
  const report = build([session(1, 45, { task: '<img src=x onerror=alert(1)>' }), session(2, 30)]);

  it('produces a subject, html and plain text', () => {
    const m = renderReportEmail(report, { appUrl: 'https://focuschecker.app', name: 'Krishna' });
    expect(m.subject).toMatch(/week/i);
    expect(m.html).toContain('Krishna');
    expect(m.text).toContain('75');
  });

  it('escapes everything that came from the user', () => {
    const m = renderReportEmail(report, { appUrl: 'https://focuschecker.app', name: '<script>alert(1)</script>' });
    expect(m.html).not.toContain('<script>');
    expect(m.html).not.toContain('<img src=x');
    expect(m.html).toContain('&lt;script&gt;');
    expect(m.html).toContain('&lt;img');
  });

  it('never loads remote content and only links to the app over https', () => {
    const m = renderReportEmail(report, { appUrl: 'https://focuschecker.app' });
    expect(m.html).not.toMatch(/<img|<script|<iframe|<link|@import|url\(/i);
    const links = [...m.html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
    expect(links.length).toBeGreaterThan(0);
    expect(links.every((l) => l.startsWith('https://focuschecker.app'))).toBe(true);
  });

  it('refuses a non-https app url', () => {
    expect(() => renderReportEmail(report, { appUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => renderReportEmail(report, { appUrl: 'http://focuschecker.app' })).toThrow();
  });
});
