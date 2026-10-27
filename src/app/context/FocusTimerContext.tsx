import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Zap, Coffee } from 'lucide-react';
import { FocusSession, ReadinessCheck } from '../types';
import { audioEngine } from '../services/audioEngine';
import { INTERVAL_MODE } from '../config';

export type FocusModeType = 'deep' | 'flow' | 'reset' | 'sound';

const BREAK_MINUTES = 5;
/** Sessions shorter than this are discarded on reset instead of offered for logging. */
const MIN_LOGGABLE_MINUTES = 5;
const PERSIST_KEY = 'focus-checker-timer';
const POMO_KEY = 'focus-checker-pomodoro';

export interface PomodoroSettings {
  work: number;
  shortBreak: number;
  longBreak: number;
  /** Work rounds before a long break. */
  rounds: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  work: 25, shortBreak: 5, longBreak: 15, rounds: 4, autoStartBreaks: true, autoStartWork: false,
};

function loadPomodoro(): PomodoroSettings {
  try {
    return { ...DEFAULT_POMODORO, ...JSON.parse(localStorage.getItem(POMO_KEY) || '{}') };
  } catch {
    return DEFAULT_POMODORO;
  }
}

export interface PendingReview {
  actualMinutes: number;
  plannedMinutes: number;
  startTime: string;
  endTime: string;
  completed: boolean;
}

export interface SessionReviewInput {
  focusQuality: number;
  contentClarity: number;
  frustrationLevel: number;
  attentionFaded: boolean;
  fadeMinutes: number;
}

interface FocusTimerContextType {
  secondsRemaining: number;
  totalDurationSeconds: number;
  isActive: boolean;
  isBreak: boolean;
  /** True once a focus block has been started and not yet finished or reset. */
  hasStarted: boolean;
  activeMode: FocusModeType;
  selectedDuration: number;
  taskName: string;
  breaksCount: number;
  progressRatio: number;
  formattedTime: string;
  pendingReview: PendingReview | null;
  pomodoro: PomodoroSettings;
  /** Work rounds completed in the current Pomodoro cycle (0..rounds). */
  pomodoroRound: number;
  breakKind: 'short' | 'long' | 'manual';
  setPomodoro: (s: PomodoroSettings) => void;
  skipBreak: () => void;

  toggleTimer: () => void;
  pauseTimer: () => void;
  startTimer: () => void;
  resetTimer: () => void;
  finishEarly: () => void;
  takeBreak: () => void;
  setDuration: (minutes: number) => void;
  setMode: (mode: FocusModeType) => void;
  setTaskName: (name: string) => void;
  saveReview: (input: SessionReviewInput) => FocusSession | null;
  dismissReview: () => void;
}

const FocusTimerContext = createContext<FocusTimerContextType | null>(null);

interface PersistedTimer {
  activeMode: FocusModeType;
  selectedDuration: number;
  isBreak: boolean;
  isActive: boolean;
  endAt: number | null;
  remainingMs: number;
  sessionStartTime: string;
  savedFocusRemainingMs: number | null;
  breaksCount: number;
  taskName: string;
  breakMinutes?: number;
  breakKind?: 'short' | 'long' | 'manual';
  pomodoroRound?: number;
}

function loadPersisted(): Partial<PersistedTimer> {
  try {
    return JSON.parse(localStorage.getItem(PERSIST_KEY) || '{}');
  } catch {
    return {};
  }
}

function notify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, icon: '/icon.svg' });
    }
  } catch {
    /* notifications are best-effort */
  }
}

export function FocusTimerProvider({
  children,
  onSessionSaved,
  latestCheck,
}: {
  children: React.ReactNode;
  onSessionSaved?: (session: FocusSession) => void;
  /** Today's most recent readiness check, used to give a logged session real context. */
  latestCheck?: ReadinessCheck | null;
}) {
  const p = useRef(loadPersisted()).current;

  const [activeMode, setActiveMode] = useState<FocusModeType>(p.activeMode ?? 'deep');
  const [selectedDuration, setSelectedDuration] = useState<number>(p.selectedDuration ?? 45);
  const [isBreak, setIsBreak] = useState<boolean>(p.isBreak ?? false);
  const [isActive, setIsActive] = useState<boolean>(false);
  // Timing is driven by wall-clock timestamps, so it stays accurate in background tabs.
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(() => {
    if (p.isActive && p.endAt) return Math.max(0, p.endAt - Date.now());
    return p.remainingMs ?? (p.selectedDuration ?? 45) * 60000;
  });
  const [sessionStartTime, setSessionStartTime] = useState<string>(p.sessionStartTime ?? '');
  const [savedFocusRemainingMs, setSavedFocusRemainingMs] = useState<number | null>(p.savedFocusRemainingMs ?? null);
  const [taskName, setTaskName] = useState<string>(p.taskName ?? 'Deep focus block');
  const [breaksCount, setBreaksCount] = useState<number>(p.breaksCount ?? 0);
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [pomodoro, setPomodoroState] = useState<PomodoroSettings>(loadPomodoro);
  const [pomodoroRound, setPomodoroRound] = useState<number>(p.pomodoroRound ?? 0);
  const [breakMinutes, setBreakMinutes] = useState<number>(p.breakMinutes ?? BREAK_MINUTES);
  const [breakKind, setBreakKind] = useState<'short' | 'long' | 'manual'>(p.breakKind ?? 'manual');
  const [, forceTick] = useState(0);

  // Resume a block that was running before a page reload.
  useEffect(() => {
    if (p.isActive && p.endAt && p.endAt > Date.now()) {
      setEndAt(p.endAt);
      setIsActive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveRemainingMs = isActive && endAt ? Math.max(0, endAt - Date.now()) : remainingMs;
  const totalDurationSeconds = isBreak ? breakMinutes * 60 : selectedDuration * 60;
  const secondsRemaining = Math.ceil(liveRemainingMs / 1000);

  // Persist so a refresh doesn't lose a running session.
  useEffect(() => {
    const data: PersistedTimer = {
      activeMode, selectedDuration, isBreak, isActive, endAt,
      remainingMs: liveRemainingMs, sessionStartTime, savedFocusRemainingMs, breaksCount, taskName,
      breakMinutes, breakKind, pomodoroRound,
    };
    try { localStorage.setItem(PERSIST_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode, selectedDuration, isBreak, isActive, endAt, remainingMs, sessionStartTime, savedFocusRemainingMs, breaksCount, taskName, breakMinutes, breakKind, pomodoroRound]);

  useEffect(() => {
    try { localStorage.setItem(POMO_KEY, JSON.stringify(pomodoro)); } catch { /* ignore */ }
  }, [pomodoro]);

  const isPomodoro = activeMode === 'flow';

  /** Start a countdown of `ms` right away. */
  const runFor = (ms: number) => {
    setRemainingMs(ms);
    setEndAt(Date.now() + ms);
    setIsActive(true);
  };

  const openReview = useCallback((completed: boolean, focusMsRemaining: number) => {
    const plannedMinutes = selectedDuration;
    const actualMinutes = Math.max(1, Math.round((plannedMinutes * 60000 - focusMsRemaining) / 60000));
    setPendingReview({
      actualMinutes,
      plannedMinutes,
      startTime: sessionStartTime || new Date(Date.now() - actualMinutes * 60000).toISOString(),
      endTime: new Date().toISOString(),
      completed,
    });
  }, [selectedDuration, sessionStartTime]);

  const completeRef = useRef<() => void>(() => {});
  completeRef.current = () => {
    setIsActive(false);
    setEndAt(null);
    audioEngine.playBreathChime('exhale');
    if (isBreak) {
      setIsBreak(false);
      if (isPomodoro && breakKind !== 'manual') {
        // Pomodoro: break over, next work round.
        if (breakKind === 'long') setPomodoroRound(0);
        setBreakKind('manual');
        const ms = selectedDuration * 60000;
        if (pomodoro.autoStartWork) {
          setSessionStartTime(new Date().toISOString());
          runFor(ms);
          toast.info('Break over — next round started');
        } else {
          setRemainingMs(ms);
          toast.info('Break over — press play for the next round');
        }
        notify('Break finished', 'Time for the next round.');
        return;
      }
      const resume = savedFocusRemainingMs;
      setSavedFocusRemainingMs(null);
      setRemainingMs(resume ?? selectedDuration * 60000);
      toast.info(resume ? 'Break over — press play to continue your block.' : 'Break over. Ready when you are.');
      notify('Break finished', 'Time to get back to it.');
    } else if (isPomodoro) {
      // Pomodoro: log the round, then move into a short or long break.
      openReview(true, 0);
      const round = pomodoroRound + 1;
      const long = round >= pomodoro.rounds;
      setPomodoroRound(long ? pomodoro.rounds : round);
      const mins = long ? pomodoro.longBreak : pomodoro.shortBreak;
      setSessionStartTime('');
      setBreaksCount(0);
      setIsBreak(true);
      setBreakKind(long ? 'long' : 'short');
      setBreakMinutes(mins);
      if (pomodoro.autoStartBreaks) runFor(mins * 60000);
      else setRemainingMs(mins * 60000);
      toast.success(long ? `Round ${round} done — take a ${mins}-minute long break` : `Round ${round} done — ${mins}-minute break`, { duration: 6000 });
      notify('Round complete', long ? 'Long break time.' : 'Short break time.');
    } else {
      setRemainingMs(0);
      toast.success('Focus block complete. Nice work.', { duration: 6000 });
      notify('Focus block complete', 'Take a moment to rate the session.');
      openReview(true, 0);
    }
  };

  // Tick: re-render a few times a second while running; detect completion.
  useEffect(() => {
    if (!isActive || !endAt) return;
    const id = setInterval(() => {
      if (Date.now() >= endAt) completeRef.current();
      else forceTick((t) => t + 1);
    }, 250);
    return () => clearInterval(id);
  }, [isActive, endAt]);

  const startTimer = () => {
    if (isActive) return;
    if (!isBreak && !sessionStartTime) setSessionStartTime(new Date().toISOString());
    const ms = remainingMs > 0 ? remainingMs : totalDurationSeconds * 1000;
    setEndAt(Date.now() + ms);
    setIsActive(true);
    try {
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    } catch { /* ignore */ }
  };

  const pauseTimer = () => {
    if (!isActive) return;
    setRemainingMs(liveRemainingMs);
    setEndAt(null);
    setIsActive(false);
  };

  const toggleTimer = () => {
    if (isActive) {
      pauseTimer();
      toast.info('Paused');
    } else {
      startTimer();
      toast.success(isBreak ? 'Break started — rest your eyes' : 'Focus block started', {
        icon: <Zap className="size-4 text-sky-500" />,
      });
    }
  };

  const clearSession = (durationMinutes = selectedDuration) => {
    setIsActive(false);
    setIsBreak(false);
    setEndAt(null);
    setRemainingMs(durationMinutes * 60000);
    setSessionStartTime('');
    setSavedFocusRemainingMs(null);
    setBreaksCount(0);
    setBreakKind('manual');
  };

  /** Stop the current block. Meaningful partial blocks are offered for logging. */
  const finishEarly = () => {
    if (isBreak) {
      clearSession();
      toast.info('Break ended — timer reset');
      return;
    }
    const focusRemaining = liveRemainingMs;
    const elapsedMin = (selectedDuration * 60000 - focusRemaining) / 60000;
    if (sessionStartTime && elapsedMin >= MIN_LOGGABLE_MINUTES) {
      setIsActive(false);
      setEndAt(null);
      openReview(false, focusRemaining);
    } else {
      clearSession();
      toast.info('Timer reset');
    }
  };

  const resetTimer = () => {
    if (isBreak) {
      clearSession();
      toast.info('Break ended — timer reset');
      return;
    }
    finishEarly();
  };

  const takeBreak = () => {
    if (isBreak) return;
    const mins = isPomodoro ? pomodoro.shortBreak : BREAK_MINUTES;
    // Keep the focus block's progress so it can resume after the break.
    if (sessionStartTime) setSavedFocusRemainingMs(liveRemainingMs);
    setIsBreak(true);
    setBreakKind('manual');
    setBreakMinutes(mins);
    setBreaksCount((b) => b + 1);
    runFor(mins * 60000);
    toast.info(`${mins}-minute break started`, { icon: <Coffee className="size-4 text-amber-500" /> });
  };

  /** End the current break now. */
  const skipBreak = () => {
    if (!isBreak) return;
    setIsBreak(false);
    setIsActive(false);
    setEndAt(null);
    const resume = savedFocusRemainingMs;
    setSavedFocusRemainingMs(null);
    if (resume && resume > 0) {
      setRemainingMs(resume);
      toast.info('Break skipped — press play to continue');
    } else {
      setRemainingMs(selectedDuration * 60000);
      toast.info('Break skipped — ready for next round');
    }
  };

  const setPomodoro = (next: PomodoroSettings) => {
    const clean: PomodoroSettings = {
      work: Math.min(180, Math.max(1, Math.round(next.work))),
      shortBreak: Math.min(60, Math.max(1, Math.round(next.shortBreak))),
      longBreak: Math.min(90, Math.max(1, Math.round(next.longBreak))),
      rounds: Math.min(12, Math.max(1, Math.round(next.rounds))),
      autoStartBreaks: next.autoStartBreaks,
      autoStartWork: next.autoStartWork,
    };
    setPomodoroState(clean);
    if (activeMode === 'flow' && !isActive && !sessionStartTime && !isBreak) {
      setSelectedDuration(clean.work);
      setRemainingMs(clean.work * 60000);
    }
    if (pomodoroRound > clean.rounds) setPomodoroRound(0);
  };

  const setDuration = (minutes: number) => {
    if (isActive || sessionStartTime) return;
    setSelectedDuration(minutes);
    setRemainingMs(minutes * 60000);
  };

  const setMode = (mode: FocusModeType) => {
    if (isActive) return;
    setActiveMode(mode);
    if (sessionStartTime) return;
    if (mode === 'deep') setDuration(45);
    else if (mode === 'flow') setDuration(pomodoro.work);
  };

  const saveReview = (input: SessionReviewInput): FocusSession | null => {
    if (!pendingReview) return null;
    const { focusQuality, contentClarity, frustrationLevel, attentionFaded, fadeMinutes } = input;
    const score = Math.round(
      ((focusQuality * 3 + contentClarity * 2 + (10 - frustrationLevel) * 2 + (attentionFaded ? 4 : 8)) / 8) * 10
    );
    const mins = pendingReview.actualMinutes;
    const session: FocusSession = {
      id: Date.now(),
      date: pendingReview.startTime,
      type: 'Session',
      task: taskName,
      tags: [activeMode === 'deep' ? 'Deep Work' : activeMode === 'flow' ? INTERVAL_MODE.label : 'Focus'],
      mode: activeMode === 'deep' ? 'deep-work' : activeMode === 'flow' ? 'light-focus' : 'creative',
      emotionalState: latestCheck?.emotionalState ?? 'neutral',
      dayFlow: latestCheck?.dayFlow ?? 'steady',
      workPlace: 'home-office',
      sleepHours: latestCheck?.sleepHours ?? 0,
      startTime: pendingReview.startTime,
      endTime: pendingReview.endTime,
      durationMinutes: mins,
      plannedDurationMinutes: pendingReview.plannedMinutes,
      breaks: Array.from({ length: breaksCount }, () => ({ startMinute: 0, durationMinutes: BREAK_MINUTES })),
      focusQuality,
      contentClarity,
      frustrationLevel,
      score: Math.min(100, Math.max(0, score)),
      note: pendingReview.completed ? '' : `Ended early at ${mins} of ${pendingReview.plannedMinutes} min`,
      attentionFaded,
      fadeAfterMinutes: attentionFaded ? Math.min(fadeMinutes, mins) : undefined,
    };
    onSessionSaved?.(session);
    setPendingReview(null);
    if (!isBreak || !pendingReview.completed) clearSession();
    return session;
  };

  const dismissReview = () => {
    const wasEarly = !pendingReview?.completed;
    setPendingReview(null);
    if (!isBreak || wasEarly) clearSession();
  };

  const elapsed = totalDurationSeconds - secondsRemaining;
  const progressRatio = Math.min(1, Math.max(0, elapsed / totalDurationSeconds));
  const formattedTime = `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`;
  const hasStarted = Boolean(sessionStartTime) || isBreak;

  useEffect(() => {
    // Marketing/legal pages manage their own titles.
    if (!window.location.pathname.startsWith('/app')) return;
    if (isActive) {
      const label = isBreak ? 'Break' : activeMode === 'deep' ? 'Deep work' : INTERVAL_MODE.shortLabel;
      document.title = `${formattedTime} · ${label} — FocusChecker`;
    } else if (hasStarted) {
      document.title = `Paused ${formattedTime} — FocusChecker`;
    } else {
      document.title = 'FocusChecker — Focus timer, breathing resets & attention insights';
    }
  }, [isActive, formattedTime, isBreak, activeMode, hasStarted]);

  return (
    <FocusTimerContext.Provider
      value={{
        secondsRemaining, totalDurationSeconds, isActive, isBreak, hasStarted, activeMode, selectedDuration,
        taskName, breaksCount, progressRatio, formattedTime, pendingReview,
        pomodoro, pomodoroRound, breakKind, setPomodoro, skipBreak,
        toggleTimer, pauseTimer, startTimer, resetTimer, finishEarly, takeBreak, setDuration, setMode,
        setTaskName, saveReview, dismissReview,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const context = useContext(FocusTimerContext);
  if (!context) throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  return context;
}
