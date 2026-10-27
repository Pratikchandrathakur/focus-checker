// Everything that comes back from storage (localStorage, the cloud) is treated as untrusted input:
// it could be corrupted, edited by hand, or written by a bug. We rebuild each item field by field
// so unexpected data never reaches state, and one bad row can't crash the app.
import type {
  HistoryItem, FocusSession, ReadinessCheck, StressResetSession, EmotionalState, DayFlow, WorkPlace, BreathingTechnique, UserProfile,
} from '../types';

export const MAX_HISTORY_ITEMS = 5000;
const MAX_JSON_CHARS = 5_000_000;

export function safeJsonParse(raw: unknown): unknown {
  if (typeof raw !== 'string' || raw.length > MAX_JSON_CHARS) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const EMOTIONS: EmotionalState[] = ['calm', 'focused', 'energized', 'neutral', 'scattered', 'fatigued', 'overwhelmed', 'anxious', 'frustrated'];
const FLOWS: DayFlow[] = ['productive', 'steady', 'relaxed', 'demanding', 'chaotic', 'sluggish'];
const PLACES: WorkPlace[] = ['home-office', 'office', 'cafe', 'library', 'coworking', 'outdoor', 'commute'];
const MODES: FocusSession['mode'][] = ['deep-work', 'light-focus', 'creative', 'audio-focus'];
const TECHNIQUES: BreathingTechnique[] = ['physiological-sigh', 'box-breathing', 'calm-478'];

const strictNum = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null;
const softNum = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
const text = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const isoOrNull = (v: unknown): string | null => (typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v)) ? v : null);

function parseItem(raw: unknown): HistoryItem | null {
  if (!isObj(raw)) return null;
  const id = raw.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null;
  const date = isoOrNull(raw.date);
  const score = strictNum(raw.score, 0, 100);
  if (!date || score === null) return null;

  if (raw.type === 'Session') {
    const durationMinutes = strictNum(raw.durationMinutes, 0.01, 1440);
    if (durationMinutes === null) return null;
    const breaks = (Array.isArray(raw.breaks) ? raw.breaks.slice(0, 50) : [])
      .filter(isObj)
      .map((b) => ({ startMinute: softNum(b.startMinute, 0, 1440, 0), durationMinutes: softNum(b.durationMinutes, 0, 240, 0) }));
    const tags = (Array.isArray(raw.tags) ? raw.tags : [])
      .filter((t): t is string => typeof t === 'string')
      .map((t) => text(t, 40).trim())
      .filter(Boolean)
      .slice(0, 10);
    const fade = strictNum(raw.fadeAfterMinutes, 0, 1440);
    const s: FocusSession = {
      id, date, type: 'Session',
      task: text(raw.task, 200), tags,
      mode: pick(raw.mode, MODES, 'deep-work'),
      emotionalState: pick(raw.emotionalState, EMOTIONS, 'neutral'),
      dayFlow: pick(raw.dayFlow, FLOWS, 'steady'),
      workPlace: pick(raw.workPlace, PLACES, 'home-office'),
      sleepHours: softNum(raw.sleepHours, 0, 24, 0),
      startTime: isoOrNull(raw.startTime) ?? date,
      endTime: isoOrNull(raw.endTime) ?? date,
      durationMinutes,
      plannedDurationMinutes: softNum(raw.plannedDurationMinutes, 0, 1440, durationMinutes),
      breaks,
      focusQuality: softNum(raw.focusQuality, 0, 10, 0),
      contentClarity: softNum(raw.contentClarity, 0, 10, 0),
      frustrationLevel: softNum(raw.frustrationLevel, 0, 10, 0),
      score, note: text(raw.note, 2000),
      attentionFaded: raw.attentionFaded === true,
      ...(fade !== null ? { fadeAfterMinutes: fade } : {}),
    };
    return s;
  }

  if (raw.type === 'Check') {
    const c: ReadinessCheck = {
      id, date, type: 'Check',
      concentration: softNum(raw.concentration, 0, 10, 5), energy: softNum(raw.energy, 0, 10, 5), clarity: softNum(raw.clarity, 0, 10, 5),
      motivation: softNum(raw.motivation, 0, 10, 5), distractionResistance: softNum(raw.distractionResistance, 0, 10, 5), comfort: softNum(raw.comfort, 0, 10, 5),
      emotionalState: pick(raw.emotionalState, EMOTIONS, 'neutral'),
      dayFlow: pick(raw.dayFlow, FLOWS, 'steady'),
      sleepHours: softNum(raw.sleepHours, 0, 24, 0),
      note: text(raw.note, 2000), score, recommendation: text(raw.recommendation, 500),
    };
    return c;
  }

  if (raw.type === 'StressReset') {
    const before = strictNum(raw.stressBefore, 0, 10);
    const after = strictNum(raw.stressAfter, 0, 10);
    if (before === null || after === null) return null;
    const r: StressResetSession = {
      id, date, type: 'StressReset',
      technique: pick(raw.technique, TECHNIQUES, 'box-breathing'),
      durationSeconds: softNum(raw.durationSeconds, 0, 7200, 0),
      cyclesCompleted: softNum(raw.cyclesCompleted, 0, 1000, 0),
      stressBefore: before, stressAfter: after, score, note: text(raw.note, 2000),
    };
    return r;
  }
  return null;
}

export function parseHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: HistoryItem[] = [];
  for (const entry of raw) {
    if (out.length >= MAX_HISTORY_ITEMS) break;
    const item = parseItem(entry);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Only a guest profile may live in localStorage; cloud accounts are restored by the auth library. */
export function parseGuestProfile(raw: unknown): UserProfile | null {
  if (!isObj(raw) || raw.id !== 'guest') return null;
  const now = new Date().toISOString();
  return {
    id: 'guest',
    email: '',
    name: text(raw.name, 40) || 'Guest',
    avatarSeed: text(raw.avatarSeed, 40) || 'guest',
    joinedAt: isoOrNull(raw.joinedAt) ?? now,
    streakDays: Math.round(softNum(raw.streakDays, 0, 10000, 0)),
    lastActiveDate: isoOrNull(raw.lastActiveDate) ?? now,
  };
}

// ---- Saved timer + Pomodoro settings ----
export interface SavedTimer {
  activeMode: 'deep' | 'flow' | 'reset' | 'sound';
  selectedDuration: number;
  isBreak: boolean;
  isActive: boolean;
  endAt: number | null;
  remainingMs: number;
  sessionStartTime: string;
  savedFocusRemainingMs: number | null;
  breaksCount: number;
  taskName: string;
  breakMinutes: number;
  breakKind: 'short' | 'long' | 'manual';
  pomodoroRound: number;
}

/** Keeps only saved-timer fields that are the right type and a sane size. Everything else is dropped. */
export function sanitizeTimerState(raw: unknown): Partial<SavedTimer> {
  if (!isObj(raw)) return {};
  const out: Partial<SavedTimer> = {};
  const intIn = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
  if (['deep', 'flow', 'reset', 'sound'].includes(raw.activeMode as string)) out.activeMode = raw.activeMode as SavedTimer['activeMode'];
  const dur = intIn(raw.selectedDuration, 1, 600); if (dur !== undefined) out.selectedDuration = dur;
  if (typeof raw.isBreak === 'boolean') out.isBreak = raw.isBreak;
  if (typeof raw.isActive === 'boolean') out.isActive = raw.isActive;
  const end = intIn(raw.endAt, 1, 8.64e15); if (end !== undefined) out.endAt = end; else if (raw.endAt === null) out.endAt = null;
  const rem = intIn(raw.remainingMs, 0, 86_400_000); if (rem !== undefined) out.remainingMs = rem;
  const start = isoOrNull(raw.sessionStartTime); if (start) out.sessionStartTime = start;
  const saved = intIn(raw.savedFocusRemainingMs, 0, 86_400_000); if (saved !== undefined) out.savedFocusRemainingMs = saved; else if (raw.savedFocusRemainingMs === null) out.savedFocusRemainingMs = null;
  const br = intIn(raw.breaksCount, 0, 1000); if (br !== undefined) out.breaksCount = br;
  if (typeof raw.taskName === 'string') out.taskName = text(raw.taskName, 200);
  const bm = intIn(raw.breakMinutes, 1, 120); if (bm !== undefined) out.breakMinutes = bm;
  if (['short', 'long', 'manual'].includes(raw.breakKind as string)) out.breakKind = raw.breakKind as SavedTimer['breakKind'];
  const pr = intIn(raw.pomodoroRound, 0, 20); if (pr !== undefined) out.pomodoroRound = pr;
  return out;
}

export interface PomodoroShape { work: number; shortBreak: number; longBreak: number; rounds: number; autoStartBreaks: boolean; autoStartWork: boolean }

export function sanitizePomodoro(raw: unknown, defaults: PomodoroShape): PomodoroShape {
  if (!isObj(raw)) return defaults;
  const n = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? Math.round(v) : d);
  const b = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  return {
    work: n(raw.work, 1, 180, defaults.work),
    shortBreak: n(raw.shortBreak, 1, 60, defaults.shortBreak),
    longBreak: n(raw.longBreak, 1, 120, defaults.longBreak),
    rounds: n(raw.rounds, 1, 12, defaults.rounds),
    autoStartBreaks: b(raw.autoStartBreaks, defaults.autoStartBreaks),
    autoStartWork: b(raw.autoStartWork, defaults.autoStartWork),
  };
}
