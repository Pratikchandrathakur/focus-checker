import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  CheckCircle2, 
  Fingerprint, 
  Zap, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Flame,
  Wind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { FocusSession, EmotionalState, DayFlow, WorkPlace } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface TactileFocusDialProps {
  onSessionComplete: (session: FocusSession) => void;
  onOpenStressReset: () => void;
  activeSoundscape: string;
  onToggleSoundscape: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
}

type ModeType = 'deep' | 'flow' | 'reset' | 'sound';

export function TactileFocusDial({
  onSessionComplete,
  onOpenStressReset,
  activeSoundscape,
  onToggleSoundscape,
}: TactileFocusDialProps) {
  // Mode selection (matches the top squircle buttons in the image)
  const [activeMode, setActiveMode] = useState<ModeType>('deep');

  // Duration in minutes (selectable: 15, 25, 45, 60, 90)
  const [selectedDuration, setSelectedDuration] = useState<number>(25);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('Deep Focus Flow');
  const [completedSessionsToday, setCompletedSessionsToday] = useState<number>(3);
  const [breaksCount, setBreaksCount] = useState<number>(0);

  // Self assessment state (modal after finish)
  const [showAssessment, setShowAssessment] = useState(false);
  const [focusQuality, setFocusQuality] = useState(8);
  const [contentClarity, setContentClarity] = useState(8);
  const [frustrationLevel, setFrustrationLevel] = useState(2);
  const [attentionFaded, setAttentionFaded] = useState(false);
  const [fadeMinutes, setFadeMinutes] = useState(20);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync remaining seconds when duration changes (only if not currently active)
  useEffect(() => {
    if (!isActive && !isBreak) {
      setSecondsRemaining(selectedDuration * 60);
    }
  }, [selectedDuration, isActive, isBreak]);

  // Main countdown timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
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

  const handleStartToggle = () => {
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

  const handleTimerComplete = () => {
    setIsActive(false);
    if (!isBreak) {
      toast.success("Focus block finished! Well done.", {
        description: "Take a moment to record your session quality.",
        duration: 8000,
      });
      setShowAssessment(true);
    } else {
      toast.info("Break finished! Ready to dive back in?");
      setIsBreak(false);
      setSecondsRemaining(selectedDuration * 60);
    }
  };

  const handleTakeBreak = () => {
    setIsActive(false);
    setIsBreak(true);
    setBreaksCount((b) => b + 1);
    setSecondsRemaining(5 * 60); // 5 minute standard break
    toast.info("Switched to 5-minute break mode", {
      icon: <Coffee className="size-4 text-amber-500" />
    });
  };

  const handleReset = () => {
    setIsActive(false);
    setIsBreak(false);
    setSecondsRemaining(selectedDuration * 60);
    setSessionStartTime('');
  };

  const handleSaveAssessment = () => {
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

    onSessionComplete(newSession);
    setShowAssessment(false);
    handleReset();
    setCompletedSessionsToday((c) => c + 1);
  };

  // Calculations for circular arc
  const totalDurationSeconds = isBreak ? 5 * 60 : selectedDuration * 60;
  const elapsed = totalDurationSeconds - secondsRemaining;
  const progressRatio = Math.min(1, Math.max(0, elapsed / totalDurationSeconds));

  const minutesDisplay = Math.floor(secondsRemaining / 60);
  const secondsDisplay = secondsRemaining % 60;
  const formattedTime = `${String(minutesDisplay).padStart(2, '0')}:${String(secondsDisplay).padStart(2, '0')}`;

  // SVG circular gauge geometry
  const radius = 108;
  const circumference = 2 * Math.PI * radius;
  // Use 270 degree arc for gauge look
  const strokeDashoffset = circumference - (circumference * 0.75 * progressRatio);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Phone container with soft claymorphic depth matching the image */}
      <div className="clay-card p-6 md:p-8 relative overflow-hidden transition-all duration-300">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
              Focus Suite
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {isBreak ? 'Break Mode' : isActive ? 'Active Flow' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Quick Mode Switches (Matches AC / Light / Climate / Energy in the image) */}
        <div className="grid grid-cols-3 gap-2.5 mb-7">
          {/* Deep Focus Tile */}
          <button
            onClick={() => {
              setActiveMode('deep');
              setSelectedDuration(45);
            }}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
              activeMode === 'deep'
                ? 'clay-tile-cyan scale-[1.02]'
                : 'clay-button text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeMode === 'deep' ? 'bg-white/20' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'}`}>
              <Zap size={18} />
            </div>
            <span className="text-xs font-semibold">Deep</span>
            <span className={`text-[10px] ${activeMode === 'deep' ? 'text-white/80' : 'text-slate-400'}`}>
              45 min
            </span>
          </button>

          {/* Calm Flow Tile */}
          <button
            onClick={() => {
              setActiveMode('flow');
              setSelectedDuration(25);
            }}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
              activeMode === 'flow'
                ? 'clay-tile-amber scale-[1.02]'
                : 'clay-button text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeMode === 'flow' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
              <Flame size={18} />
            </div>
            <span className="text-xs font-semibold">Pomodoro</span>
            <span className={`text-[10px] ${activeMode === 'flow' ? 'text-white/80' : 'text-slate-400'}`}>
              25 min
            </span>
          </button>

          {/* Stress Reset Tile */}
          <button
            onClick={() => {
              setActiveMode('reset');
              onOpenStressReset();
            }}
            className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
              activeMode === 'reset'
                ? 'clay-tile-emerald scale-[1.02]'
                : 'clay-button text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className={`p-2 rounded-xl ${activeMode === 'reset' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
              <Wind size={18} />
            </div>
            <span className="text-xs font-semibold">De-Stress</span>
            <span className={`text-[10px] ${activeMode === 'reset' ? 'text-white/80' : 'text-slate-400'}`}>
              Sigh 2m
            </span>
          </button>
        </div>

        {/* Central Dial Area (Thermostat-style dial with ticks and inner floating disc) */}
        <div className="relative flex flex-col items-center justify-center my-3">
          
          {/* Circular SVG Gauge with tick marks */}
          <div className="relative w-72 h-72 flex items-center justify-center">
            
            {/* Ticks ring around perimeter */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 280 280">
              <defs>
                <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              
              {/* Perimeter ticks */}
              {Array.from({ length: 36 }).map((_, i) => {
                const angle = (i * 10) - 90;
                const rad = (angle * Math.PI) / 180;
                const x1 = 140 + 124 * Math.cos(rad);
                const y1 = 140 + 124 * Math.sin(rad);
                const x2 = 140 + (i % 3 === 0 ? 116 : 120) * Math.cos(rad);
                const y2 = 140 + (i % 3 === 0 ? 116 : 120) * Math.sin(rad);
                const isHighlighted = (i / 36) <= progressRatio;

                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isHighlighted ? '#0ea5e9' : 'currentColor'}
                    strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
                    strokeLinecap="round"
                    className={isHighlighted ? 'opacity-90' : 'text-slate-300 dark:text-slate-700 opacity-60'}
                  />
                );
              })}

              {/* Progress Arc */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100 dark:text-slate-800"
                strokeDasharray={circumference * 0.75}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(135 140 140)"
              />
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="url(#dialGradient)"
                strokeWidth="8"
                strokeDasharray={circumference * 0.75}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(135 140 140)"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Floating Tactile Dial Disc */}
            <div className="w-48 h-48 rounded-full clay-dial-rim flex flex-col items-center justify-center p-4 z-10 select-none">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                {isBreak ? 'Resting Mind' : activeMode === 'deep' ? 'Deep Zone' : 'Flow State'}
              </span>
              
              {/* Primary Time Readout */}
              <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                {formattedTime}
              </div>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {isBreak ? '5m rest' : `${selectedDuration}m target`}
              </span>

              {/* Status pill inside dial */}
              <div className="mt-2.5 px-3 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-800 flex items-center gap-1">
                <Activity size={10} />
                <span>{isActive ? 'In Session' : 'Ready'}</span>
              </div>
            </div>
          </div>

          {/* Quick Duration Buttons (15, 25, 45, 60, 90) */}
          <div className="flex items-center gap-1.5 mt-2 mb-4 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            {[15, 25, 45, 60, 90].map((dur) => (
              <button
                key={dur}
                onClick={() => {
                  if (!isActive) setSelectedDuration(dur);
                }}
                disabled={isActive}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedDuration === dur
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                } disabled:opacity-50`}
              >
                {dur}m
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Metrics Columns (69m² / 46m style in the image) */}
        <div className="grid grid-cols-2 gap-4 my-2 text-center">
          <div className="clay-card-subtle p-3.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Readiness</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">94%</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Optimal Focus</div>
          </div>

          <div className="clay-card-subtle p-3.5">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{completedSessionsToday}</div>
            <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">Sessions today</div>
          </div>
        </div>

        {/* Central Tactile Biometric Action Button (Fingerprint / Play button in reference image) */}
        <div className="flex items-center justify-center gap-4 mt-6">
          {/* Break trigger button */}
          <button
            onClick={handleTakeBreak}
            disabled={isBreak}
            className="w-12 h-12 rounded-2xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40"
            title="Take a quick 5-minute break"
          >
            <Coffee size={18} />
          </button>

          {/* Main Action Disc (Fingerprint styled tactile button) */}
          <button
            onClick={handleStartToggle}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isActive
                ? 'clay-tile-amber scale-105'
                : 'clay-tile-cyan hover:scale-105'
            }`}
          >
            {isActive ? (
              <Pause size={24} className="text-white fill-white" />
            ) : (
              <Fingerprint size={28} className="text-white" />
            )}
          </button>

          {/* Reset / Stop button */}
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-2xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Reset timer"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Soundscape Quick Pill */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 size={16} className="text-sky-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {activeSoundscape !== 'none' ? `Audio: ${activeSoundscape} Waves` : 'Binaural Focus Audio'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleSoundscape('gamma')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeSoundscape === 'gamma'
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              40Hz
            </button>
            <button
              onClick={() => onToggleSoundscape('alpha')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeSoundscape === 'alpha'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              10Hz
            </button>
          </div>
        </div>
      </div>

      {/* Post Session Self Assessment Modal */}
      <AnimatePresence>
        {showAssessment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="clay-card max-w-md w-full p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Session Complete</h4>
                  <p className="text-xs text-slate-500">Record your cognitive metrics to uncover attention patterns</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              {/* Quality Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Focus Quality</span>
                  <span className="text-sky-600 font-bold">{focusQuality}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={focusQuality}
                  onChange={(e) => setFocusQuality(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              {/* Clarity Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Content Clarity</span>
                  <span className="text-indigo-600 font-bold">{contentClarity}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={contentClarity}
                  onChange={(e) => setContentClarity(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Attention Fade Toggle */}
              <div className="clay-card-subtle p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Did your attention fade?</span>
                  <button
                    onClick={() => setAttentionFaded(!attentionFaded)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      attentionFaded ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {attentionFaded ? 'Yes, it dropped' : 'Held steady'}
                  </button>
                </div>
                {attentionFaded && (
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Faded after approx:</span>
                      <span className="font-bold text-amber-600">{fadeMinutes} mins</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max={selectedDuration}
                      value={fadeMinutes}
                      onChange={(e) => setFadeMinutes(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setShowAssessment(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold clay-button text-slate-600 dark:text-slate-400"
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveAssessment}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold clay-tile-cyan"
                >
                  Save Metrics
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
