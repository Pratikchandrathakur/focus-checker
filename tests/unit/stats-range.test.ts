import { describe, it, expect } from 'vitest';
import { filterRange, trendSeries } from '../../src/app/services/stats';
import type { HistoryItem } from '../../src/app/types';

const NOW = new Date(2026, 9, 28, 12, 0, 0); // local noon, Wed Oct 28 2026
const dayAgo = (n: number, h = 10) => new Date(2026, 9, 28 - n, h, 0, 0).toISOString();
const item = (id: number, daysAgo: number, score = 80, minutes = 30): HistoryItem => ({
  id, date: dayAgo(daysAgo), type: 'Session', task: 't', tags: [], mode: 'deep-work', emotionalState: 'calm', dayFlow: 'steady', workPlace: 'office', sleepHours: 7,
  startTime: dayAgo(daysAgo), endTime: dayAgo(daysAgo), durationMinutes: minutes, plannedDurationMinutes: minutes, breaks: [], focusQuality: 8, contentClarity: 8,
  frustrationLevel: 1, score, note: '', attentionFaded: false,
});

describe('filterRange', () => {
  const h = [item(1, 0), item(2, 6), item(3, 7), item(4, 29), item(5, 30), item(6, 89), item(7, 400)];
  it('7 days means today plus the 6 days before (same window the server gives free accounts)', () => {
    expect(filterRange(h, 7, NOW).map((x) => x.id)).toEqual([1, 2]);
  });
  it('30 and 90 days', () => {
    expect(filterRange(h, 30, NOW).map((x) => x.id)).toEqual([1, 2, 3, 4]);
    expect(filterRange(h, 90, NOW).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('null means everything', () => {
    expect(filterRange(h, null, NOW)).toHaveLength(7);
  });
  it('ignores items with unreadable dates instead of crashing', () => {
    const bad = { ...item(9, 0), date: 'nope' } as HistoryItem;
    expect(filterRange([bad, item(1, 0)], 7, NOW).map((x) => x.id)).toEqual([1]);
  });
});

describe('trendSeries', () => {
  it('7 days: one point per day, null where nothing was logged', () => {
    const s = trendSeries([item(1, 0, 90), item(2, 2, 70)], 7, NOW);
    expect(s.granularity).toBe('day');
    expect(s.points).toHaveLength(7);
    expect(s.points[6].score).toBe(90);
    expect(s.points[4].score).toBe(70);
    expect(s.points[5].score).toBeNull();
  });
  it('30 days: one point per day', () => {
    expect(trendSeries([], 30, NOW).points).toHaveLength(30);
  });
  it('90 days: weekly points that average the days inside them', () => {
    const s = trendSeries([item(1, 0, 90), item(2, 1, 70)], 90, NOW);
    expect(s.granularity).toBe('week');
    expect(s.points.length).toBeGreaterThanOrEqual(13);
    const last = s.points[s.points.length - 1];
    expect(last.score).toBe(80);
    expect(last.minutes).toBe(60);
  });
  it('all time: spans from the first item, switching to months for long histories', () => {
    const short = trendSeries([item(1, 0), item(2, 120)], null, NOW);
    expect(short.granularity).toBe('week');
    const long = trendSeries([item(1, 0), item(2, 800)], null, NOW);
    expect(long.granularity).toBe('month');
    expect(long.points.length).toBeGreaterThan(20);
  });
  it('all time with no data is empty, not a crash', () => {
    expect(trendSeries([], null, NOW).points).toEqual([]);
  });
});
