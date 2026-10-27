import { describe, it, expect } from 'vitest';
import { parseHistory, parseGuestProfile, safeJsonParse } from '../../src/app/services/validators';

const session = (o: Record<string, unknown> = {}) => ({
  id: 1, date: '2026-10-27T09:00:00Z', type: 'Session', task: 'Write', tags: ['a'], mode: 'deep-work', emotionalState: 'calm', dayFlow: 'steady', workPlace: 'office',
  sleepHours: 7, startTime: '2026-10-27T09:00:00Z', endTime: '2026-10-27T09:45:00Z', durationMinutes: 45, plannedDurationMinutes: 45, breaks: [{ startMinute: 20, durationMinutes: 5 }],
  focusQuality: 8, contentClarity: 7, frustrationLevel: 2, score: 82, note: 'ok', attentionFaded: false, ...o,
});
const check = (o: Record<string, unknown> = {}) => ({
  id: 2, date: '2026-10-27T08:00:00Z', type: 'Check', concentration: 7, energy: 6, clarity: 7, motivation: 7, distractionResistance: 6, comfort: 7,
  emotionalState: 'calm', dayFlow: 'steady', sleepHours: 7.5, note: '', score: 72, recommendation: 'Go', ...o,
});
const reset = (o: Record<string, unknown> = {}) => ({ id: 3, date: '2026-10-27T10:00:00Z', type: 'StressReset', technique: 'box-breathing', durationSeconds: 120, cyclesCompleted: 8, stressBefore: 8, stressAfter: 4, score: 70, note: '', ...o });

describe('parseHistory', () => {
  it('keeps valid items of every type', () => {
    expect(parseHistory([session(), check(), reset()])).toHaveLength(3);
  });
  it('returns [] for anything that is not an array', () => {
    for (const v of [null, undefined, 5, 'x', {}, true]) expect(parseHistory(v)).toEqual([]);
  });
  it('drops items that are malformed instead of crashing the app', () => {
    const bad = [null, 5, 'x', [], {}, { type: 'Session' }, session({ id: 'abc' }), session({ date: 'nope' }), session({ durationMinutes: -5 }), session({ durationMinutes: 1e9 }), session({ score: 500 }), check({ type: 'Admin' }), reset({ stressBefore: 99 })];
    expect(parseHistory([...bad, session({ id: 10 })])).toHaveLength(1);
  });
  it('clamps and trims free text so it cannot blow up the UI', () => {
    const [s] = parseHistory([session({ task: 'x'.repeat(5000), note: 'n'.repeat(5000), tags: Array.from({ length: 100 }, (_, i) => 't'.repeat(100) + i) })]) as any[];
    expect(s.task.length).toBeLessThanOrEqual(200);
    expect(s.note.length).toBeLessThanOrEqual(2000);
    expect(s.tags.length).toBeLessThanOrEqual(10);
    expect(s.tags.every((t: string) => t.length <= 40)).toBe(true);
  });
  it('removes unknown properties (nothing unexpected is carried into state)', () => {
    const [s] = parseHistory([{ ...session(), __proto__: { x: 1 }, evil: '<img src=x onerror=alert(1)>', isPro: true }]) as any[];
    expect(s.evil).toBeUndefined();
    expect(s.isPro).toBeUndefined();
  });
  it('removes duplicates by id and limits the list size', () => {
    expect(parseHistory([session({ id: 1 }), session({ id: 1 })])).toHaveLength(1);
    const many = Array.from({ length: 6000 }, (_, i) => session({ id: i + 1 }));
    expect(parseHistory(many).length).toBeLessThanOrEqual(5000);
  });
  it('falls back to safe values for unknown enum strings', () => {
    const [s] = parseHistory([session({ emotionalState: '<b>x</b>', workPlace: 'moon', mode: 'hack' })]) as any[];
    expect(s.emotionalState).toBe('neutral');
    expect(s.workPlace).toBe('home-office');
    expect(s.mode).toBe('deep-work');
  });
});

describe('safeJsonParse', () => {
  it('parses normal JSON and returns undefined on garbage or oversize input', () => {
    expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    expect(safeJsonParse('{nope')).toBeUndefined();
    expect(safeJsonParse('x'.repeat(6_000_000))).toBeUndefined();
    expect(safeJsonParse(null)).toBeUndefined();
  });
});

describe('parseGuestProfile', () => {
  it('accepts only a real guest profile', () => {
    const g = { id: 'guest', email: '', name: 'Guest', avatarSeed: 'g', joinedAt: '2026-10-01T00:00:00Z', streakDays: 0, lastActiveDate: '2026-10-01T00:00:00Z' };
    expect(parseGuestProfile(g)).toMatchObject({ id: 'guest', name: 'Guest' });
  });
  it('never lets stored data impersonate a cloud account', () => {
    expect(parseGuestProfile({ id: '11111111-1111-4111-8111-111111111111', name: 'Admin' })).toBeNull();
    expect(parseGuestProfile({ id: 'guest', name: '<script>alert(1)</script>'.repeat(20) })!.name.length).toBeLessThanOrEqual(40);
    expect(parseGuestProfile(null)).toBeNull();
    expect(parseGuestProfile('guest')).toBeNull();
  });
});

import { sanitizeTimerState, sanitizePomodoro } from '../../src/app/services/validators';

describe('sanitizeTimerState (saved timer from localStorage)', () => {
  it('keeps a sensible saved state', () => {
    const s = sanitizeTimerState({ activeMode: 'flow', selectedDuration: 25, isBreak: false, isActive: true, endAt: Date.now() + 60000, remainingMs: 60000, sessionStartTime: '2026-10-27T09:00:00Z', savedFocusRemainingMs: null, breaksCount: 2, taskName: 'Write', breakMinutes: 5, breakKind: 'short', pomodoroRound: 1 });
    expect(s).toMatchObject({ activeMode: 'flow', selectedDuration: 25, isActive: true, breaksCount: 2, breakKind: 'short' });
  });
  it.each([null, 'x', 5, [], undefined])('returns {} for %p', (v) => expect(sanitizeTimerState(v)).toEqual({}));
  it('drops values that could break the timer (NaN, negatives, huge numbers, wrong types)', () => {
    const s = sanitizeTimerState({ activeMode: '<script>', selectedDuration: 1e12, remainingMs: -5, endAt: 'soon', breaksCount: -3, taskName: 5, breakMinutes: 0, breakKind: 'hack', pomodoroRound: 9999, isActive: 'yes', sessionStartTime: 'nope', savedFocusRemainingMs: NaN });
    expect(s.activeMode).toBeUndefined();
    expect(s.selectedDuration).toBeUndefined();
    expect(s.remainingMs).toBeUndefined();
    expect(s.endAt).toBeUndefined();
    expect(s.breaksCount).toBeUndefined();
    expect(s.taskName).toBeUndefined();
    expect(s.breakMinutes).toBeUndefined();
    expect(s.breakKind).toBeUndefined();
    expect(s.pomodoroRound).toBeUndefined();
    expect(s.isActive).toBeUndefined();
    expect(s.sessionStartTime).toBeUndefined();
    expect(s.savedFocusRemainingMs).toBeUndefined();
  });
  it('limits long task names', () => {
    expect(sanitizeTimerState({ taskName: 'x'.repeat(5000) }).taskName!.length).toBeLessThanOrEqual(200);
  });
});

describe('sanitizePomodoro', () => {
  const D = { work: 25, shortBreak: 5, longBreak: 15, rounds: 4, autoStartBreaks: true, autoStartWork: false };
  it('uses defaults for anything missing or invalid', () => {
    expect(sanitizePomodoro(null, D)).toEqual(D);
    expect(sanitizePomodoro({ work: -1, shortBreak: 'x', longBreak: 1e9, rounds: 0, autoStartBreaks: 'yes' }, D)).toEqual(D);
  });
  it('accepts valid custom values', () => {
    expect(sanitizePomodoro({ work: 50, shortBreak: 10, longBreak: 20, rounds: 3, autoStartBreaks: false, autoStartWork: true }, D)).toEqual({ work: 50, shortBreak: 10, longBreak: 20, rounds: 3, autoStartBreaks: false, autoStartWork: true });
  });
});
