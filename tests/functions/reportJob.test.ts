// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { runWeeklyReports, type JobDeps } from '../../supabase/functions/_shared/reportJob';

const NOW = new Date('2026-10-28T10:00:00Z');
const sess = { type: 'Session', date: '2026-10-27T09:00:00Z', durationMinutes: 40, score: 80, task: 'Plan' };

function deps(over: Partial<JobDeps> = {}) {
  const sent: { to: string; subject: string; html: string }[] = [];
  const marked: string[] = [];
  const d: JobDeps = {
    now: () => NOW,
    appUrl: 'https://focuschecker.app',
    maxPerRun: 100,
    listRecipients: async () => [
      { user_id: 'u1', email: 'one@example.com', name: 'One' },
      { user_id: 'u2', email: 'two@example.com', name: 'Two' },
    ],
    fetchItems: async () => [sess],
    send: async (m) => { sent.push(m); },
    markSent: async (u) => { marked.push(u); },
    log: () => {},
    ...over,
  };
  return { d, sent, marked };
}

describe('runWeeklyReports', () => {
  it('emails each recipient with activity and marks them sent', async () => {
    const { d, sent, marked } = deps();
    const r = await runWeeklyReports(d);
    expect(r).toEqual({ sent: 2, skipped: 0, failed: 0 });
    expect(sent.map((s) => s.to)).toEqual(['one@example.com', 'two@example.com']);
    expect(marked).toEqual(['u1', 'u2']);
  });

  it('does not email people who had no activity (and does not mark them)', async () => {
    const { d, sent, marked } = deps({ fetchItems: async () => [] });
    const r = await runWeeklyReports(d);
    expect(r).toEqual({ sent: 0, skipped: 2, failed: 0 });
    expect(sent).toEqual([]);
    expect(marked).toEqual([]);
  });

  it('a failed send does not stop the others and is not marked as sent', async () => {
    const send = vi.fn(async (m: { to: string }) => { if (m.to === 'one@example.com') throw new Error('provider down'); });
    const { d, marked } = deps({ send });
    const r = await runWeeklyReports(d);
    expect(r).toEqual({ sent: 1, skipped: 0, failed: 1 });
    expect(marked).toEqual(['u2']);
  });

  it('skips addresses that are not valid emails (header-injection attempts included)', async () => {
    const bad = ['no-at-sign', 'a@b', 'x@y.com\nBcc: victim@example.com', 'x@y.com, z@w.com', '<script>@x.com', ''];
    const { d, sent } = deps({ listRecipients: async () => bad.map((e, i) => ({ user_id: `u${i}`, email: e, name: 'x' })) });
    const r = await runWeeklyReports(d);
    expect(sent).toEqual([]);
    expect(r.skipped).toBe(bad.length);
  });

  it('respects the per-run limit', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ user_id: `u${i}`, email: `u${i}@example.com`, name: 'x' }));
    const { d, sent } = deps({ listRecipients: async () => many, maxPerRun: 10 });
    await runWeeklyReports(d);
    expect(sent).toHaveLength(10);
  });

  it('escapes user text in the email body', async () => {
    const { d, sent } = deps({ fetchItems: async () => [{ ...sess, task: '<script>alert(1)</script>' }] });
    await runWeeklyReports(d);
    expect(sent[0].html).not.toContain('<script>alert');
  });

  it('never writes email addresses to the log', async () => {
    const lines: string[] = [];
    const { d } = deps({ log: (l) => lines.push(l) });
    await runWeeklyReports(d);
    expect(lines.join('\n')).not.toMatch(/@example\.com/);
  });

  it('only fetches the last 14 days of history per user', async () => {
    const fetchItems = vi.fn(async () => [sess]);
    const { d } = deps({ fetchItems });
    await runWeeklyReports(d);
    const since = new Date(fetchItems.mock.calls[0][1] as string).getTime();
    expect(NOW.getTime() - since).toBeLessThanOrEqual(15 * 864e5);
    expect(NOW.getTime() - since).toBeGreaterThanOrEqual(13 * 864e5);
  });
});
