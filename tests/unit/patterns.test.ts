import { describe, it, expect } from 'vitest';
import { bestHours, breakCadence, sleepFocus } from '../../src/app/services/patterns';
import type { FocusSession } from '../../src/app/types';

let id = 1;
const at = (hour: number, daysAgo = 1) => new Date(2026, 9, 28 - daysAgo, hour, 0, 0).toISOString();
const s = (o: Partial<FocusSession> & { hour?: number } = {}): FocusSession => {
  const hour = o.hour ?? 9;
  return {
    id: id++, date: at(hour), type: 'Session', task: 't', tags: [], mode: 'deep-work', emotionalState: 'calm', dayFlow: 'steady', workPlace: 'office', sleepHours: 7,
    startTime: at(hour, id % 20), endTime: at(hour), durationMinutes: 45, plannedDurationMinutes: 45, breaks: [], focusQuality: 7, contentClarity: 7, frustrationLevel: 2,
    score: 70, note: '', attentionFaded: false, ...o,
  };
};
const many = (n: number, o: Partial<FocusSession> & { hour?: number } = {}) => Array.from({ length: n }, () => s(o));

describe('bestHours', () => {
  it('asks for more data instead of guessing', () => {
    const r = bestHours(many(5));
    expect(r.status).toBe('insufficient');
    if (r.status === 'insufficient') expect(r.need).toBe(8);
  });
  it('ranks hours by average score and needs 3+ sessions in an hour to count it', () => {
    const r = bestHours([...many(4, { hour: 9, score: 90 }), ...many(4, { hour: 14, score: 60 }), ...many(3, { hour: 20, score: 75 }), s({ hour: 3, score: 100 })]);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.hours.map((h) => h.hour)).toEqual([9, 20, 14]);
      expect(r.hours[0]).toMatchObject({ label: '9 am', avgScore: 90, sessions: 4 });
      expect(r.totalSessions).toBe(12);
    }
  });
  it('ignores unscored sessions', () => {
    const r = bestHours([...many(8, { hour: 9, score: 0 })]);
    expect(r.status).toBe('insufficient');
  });
});

describe('breakCadence', () => {
  it('asks for more data when few sessions had breaks', () => {
    expect(breakCadence(many(10)).status).toBe('insufficient');
  });
  it('reports the usual stretch before a break and break length (medians)', () => {
    const withBreaks = [20, 25, 30, 25, 40].map((m) => s({ breaks: [{ startMinute: m, durationMinutes: 5 }] }));
    const r = breakCadence(withBreaks);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.typicalStretchMinutes).toBe(25);
      expect(r.typicalBreakMinutes).toBe(5);
      expect(r.sessionsWithBreaks).toBe(5);
    }
  });
  it('compares scores with and without breaks only when both groups are big enough', () => {
    const a = Array.from({ length: 4 }, () => s({ breaks: [{ startMinute: 25, durationMinutes: 5 }], score: 85 }));
    const b = Array.from({ length: 4 }, () => s({ score: 65 }));
    const r = breakCadence([...a, ...b]);
    if (r.status === 'ok') expect(r.scoreWithBreaks).toBe(85), expect(r.scoreWithoutBreaks).toBe(65);
    const r2 = breakCadence([...a, s({ score: 65 })]);
    if (r2.status === 'ok') expect(r2.scoreWithoutBreaks).toBeNull();
  });
  it('suggests a break time from where attention actually faded', () => {
    const faded = [32, 28, 35, 30].map((m) => s({ attentionFaded: true, fadeAfterMinutes: m, breaks: [{ startMinute: 25, durationMinutes: 5 }] }));
    const r = breakCadence([...faded, s({ breaks: [{ startMinute: 20, durationMinutes: 5 }] })]);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.suggestedEveryMinutes).toBe(30);
  });
});

describe('sleepFocus', () => {
  it('asks for more data under 8 sessions with sleep logged', () => {
    expect(sleepFocus(many(7)).status).toBe('insufficient');
  });
  it('says there is no clear link when sleep and score do not move together', () => {
    const data = [6, 7, 8, 6, 7, 8, 6, 7, 8, 7].map((h, i) => s({ sleepHours: h, score: i % 2 ? 70 : 72 }));
    const r = sleepFocus(data);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') expect(r.strength).toBe('none');
  });
  it('finds a strong positive link and compares short vs long sleep', () => {
    const data = [4.5, 5, 5.5, 6.5, 7, 7.5, 8, 8.5, 9, 8].map((h) => s({ sleepHours: h, score: Math.round(30 + h * 7) }));
    const r = sleepFocus(data);
    expect(r.status).toBe('ok');
    if (r.status === 'ok') {
      expect(r.direction).toBe('positive');
      expect(r.r).toBeGreaterThan(0.9);
      expect(r.strength).toBe('strong');
      expect(r.shortSleepAvg).not.toBeNull();
      expect(r.longSleepAvg!).toBeGreaterThan(r.shortSleepAvg!);
      expect(r.caveat).toMatch(/not (proof|a cause)|doesn.t prove|not cause/i);
    }
  });
  it('does not divide by zero when sleep never varies', () => {
    const r = sleepFocus(many(10, { sleepHours: 7 }));
    expect(r.status).toBe('insufficient');
  });
  it('ignores sessions with no sleep logged', () => {
    expect(sleepFocus(many(12, { sleepHours: 0 })).status).toBe('insufficient');
  });
});
