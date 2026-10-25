import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Zap, Coffee } from 'lucide-react';
import { FocusSession } from '../types';

export type FocusModeType = 'deep' | 'flow' | 'reset' | 'sound';

interface FocusTimerContextType {
  secondsRemaining: number;
  totalDurationSeconds: number;
  isActive: boolean;
  isBreak: boolean;
  activeMode: FocusModeType;
  selectedDuration: number;
  taskName: string;
  completedSessionsToday: number;
  breaksCount: number;
  progressRatio: number;
  formattedTime: string;
  
  // Actions
  toggleTimer: () => void;
  pauseTimer: () => void;
  startTimer: () => void;
  resetTimer: () => void;
  takeBreak: () => void;
  setDuration: (minutes: number) => void;
  setMode: (mode: FocusModeType) => void;
  setTaskName: (name: string) => void;
  handleSaveSession: (focusQuality: number, contentClarity: number, frustrationLevel: number, attentionFaded: boolean, fadeMinutes: number) => FocusSession;
}

const FocusTimerContext = createContext<FocusTimerContextType | null>(null);

export function FocusTimerProvider({ children, onSessionSaved }: { children: React.ReactNode; onSessionSaved?: (session: FocusSession) => void }) {
  const [activeMode, setActiveMode] = useState<FocusModeType>('deep');
  const [selectedDuration, setSelectedDuration] = useState<number>(25);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('Deep Focus Flow');
  const [completedSessionsToday, setCompletedSessionsToday] = useState<number>(3);
  const [breaksCount, setBreaksCount] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync remaining seconds when duration changes (only if not active)
  useEffect(() => {
    if (!isActive && !isBreak) {
      setSecondsRemaining(selectedDuration * 60);
    }
  }, [selectedDuration, isActive, isBreak]);

  // Main countdown timer interval
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isBreak]);

  const handleComplete = () => {
    setIsActive(false);
    if (!isBreak) {
      toast.success("Focus block finished! Well done.", {
        description: "Take a moment to record your session quality.",
        duration: 8000,
      });
    } else {
      toast.info("Break finished! Ready to dive back in?");
      setIsBreak(false);
      setSecondsRemaining(selectedDuration * 60);
    }
  };

  const toggleTimer = () => {
    if (!isActive) {
      if (!sessionStartTime) {
        setSessionStartTime(new Date().toISOString());
      }
      setIsActive(true);
      toast.success(isBreak ? "Break started — rest your eyes" : "Focus session engaged — staying in flow", {
        icon: <Zap className="size-4 text-sky-500" />
      });
    } else {
      setIsActive(false);
      toast.info("Session paused");
    }
  };

  const startTimer = () => {
    if (!sessionStartTime) setSessionStartTime(new Date().toISOString());
    setIsActive(true);
  };

  const pauseTimer = () => {
    setIsActive(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setSecondsRemaining(selectedDuration * 60);
    setSessionStartTime('');
  };

  const takeBreak = () => {
    setIsActive(false);
    setIsBreak(true);
    setBreaksCount((b) => b + 1);
    setSecondsRemaining(5 * 60);
    toast.info("Switched to 5-minute break mode", {
      icon: <Coffee className="size-4 text-amber-500" />
    });
  };

  const setDuration = (minutes: number) => {
    if (!isActive) {
      setSelectedDuration(minutes);
      setSecondsRemaining(minutes * 60);
    }
  };

  const setMode = (mode: FocusModeType) => {
    setActiveMode(mode);
    if (mode === 'deep') setDuration(45);
    else if (mode === 'flow') setDuration(25);
  };

  const handleSaveSession = (
    focusQuality: number,
    contentClarity: number,
    frustrationLevel: number,
    attentionFaded: boolean,
    fadeMinutes: number
  ): FocusSession => {
    const totalMinutes = selectedDuration;
    const computedScore = Math.round(
      (focusQuality * 3 + contentClarity * 2 + (10 - frustrationLevel) * 2 + (attentionFaded ? 4 : 8)) / 8 * 10
    );

    const newSession: FocusSession = {
      id: Date.now(),
      date: sessionStartTime || new Date().toISOString(),
      type: 'Session',
      task: taskName,
      tags: [activeMode === 'deep' ? 'Deep Work' : activeMode === 'flow' ? 'Calm Flow' : 'Creative'],
      mode: activeMode === 'deep' ? 'deep-work' : activeMode === 'flow' ? 'light-focus' : 'creative',
      emotionalState: 'focused',
      dayFlow: 'productive',
      workPlace: 'home-office',
      sleepHours: 7.5,
      startTime: sessionStartTime || new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes: totalMinutes,
      plannedDurationMinutes: selectedDuration,
      breaks: breaksCount > 0 ? [{ startMinute: Math.round(totalMinutes / 2), durationMinutes: 5 }] : [],
      focusQuality,
      contentClarity,
      frustrationLevel,
      score: Math.min(100, Math.max(0, computedScore)),
      note: `${taskName} (${totalMinutes}m)`,
      attentionFaded,
      fadeAfterMinutes: attentionFaded ? fadeMinutes : undefined,
    };

    if (onSessionSaved) onSessionSaved(newSession);
    setCompletedSessionsToday((c) => c + 1);
    resetTimer();
    return newSession;
  };

  // Calculations
  const totalDurationSeconds = isBreak ? 5 * 60 : selectedDuration * 60;
  const elapsed = totalDurationSeconds - secondsRemaining;
  const progressRatio = Math.min(1, Math.max(0, elapsed / totalDurationSeconds));

  const minutesDisplay = Math.floor(secondsRemaining / 60);
  const secondsDisplay = secondsRemaining % 60;
  const formattedTime = `${String(minutesDisplay).padStart(2, '0')}:${String(secondsDisplay).padStart(2, '0')}`;

  // Tab Title Sync Effect
  useEffect(() => {
    if (isActive) {
      const modeLabel = isBreak ? 'Break' : activeMode === 'deep' ? 'Deep Zone' : 'Focus Flow';
      document.title = `(${formattedTime}) ${modeLabel} • FocusChecker`;
    } else if (secondsRemaining < totalDurationSeconds && secondsRemaining > 0) {
      document.title = `(⏸ ${formattedTime}) FocusChecker`;
    } else {
      document.title = 'FocusChecker — Neuroscience Attention Suite';
    }
  }, [isActive, secondsRemaining, formattedTime, isBreak, activeMode, totalDurationSeconds]);

  return (
    <FocusTimerContext.Provider
      value={{
        secondsRemaining,
        totalDurationSeconds,
        isActive,
        isBreak,
        activeMode,
        selectedDuration,
        taskName,
        completedSessionsToday,
        breaksCount,
        progressRatio,
        formattedTime,
        toggleTimer,
        pauseTimer,
        startTimer,
        resetTimer,
        takeBreak,
        setDuration,
        setMode,
        setTaskName,
        handleSaveSession,
      }}
    >
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimer() {
  const context = useContext(FocusTimerContext);
  if (!context) {
    throw new Error('useFocusTimer must be used within a FocusTimerProvider');
  }
  return context;
}
