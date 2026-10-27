import React, { useState } from 'react';
import { SlidersHorizontal, SkipForward, Minus, Plus } from 'lucide-react';
import { INTERVAL_MODE } from '../../config';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  CheckCircle2, 
  Fingerprint, 
  Zap, 
  Volume2, 
  Flame, 
  Wind, 
  Activity 
} from 'lucide-react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import { SprintIcon } from '../ui/SprintIcon';

interface TactileFocusDialProps {
  onOpenStressReset: () => void;
  activeSoundscape: string;
  onToggleSoundscape: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
  readinessScore: number | null;
  sessionsToday: number;
  onOpenReadiness: () => void;
}

export function TactileFocusDial({
  onOpenStressReset,
  activeSoundscape,
  onToggleSoundscape,
  readinessScore,
  sessionsToday,
  onOpenReadiness,
}: TactileFocusDialProps) {
  const {
    secondsRemaining,
    formattedTime,
    isActive,
    isBreak,
    activeMode,
    selectedDuration,
    progressRatio,
    hasStarted,
    totalDurationSeconds,
    toggleTimer,
    takeBreak,
    resetTimer,
    setDuration,
    setMode,
    pomodoro,
    pomodoroRound,
    breakKind,
    setPomodoro,
    skipBreak,
  } = useFocusTimer();
  const [showPomoSettings, setShowPomoSettings] = useState(false);
  const isPomodoro = activeMode === 'flow';

  // SVG circular gauge geometry (compacted to fit cleanly in viewport)
  // One scale for arc and ticks: a 270° sweep starting at 135° (lower-left), clockwise.
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const SWEEP = 270;
  const arcLength = circumference * (SWEEP / 360);
  const filledLength = arcLength * progressRatio;
  const TICKS = 28; // one every 10°, both ends included
  const accent = isBreak ? '#10b981' : isPomodoro ? '#f43f5e' : '#0ea5e9';

  return (
    <div className="clay-card p-3 sm:p-3.5 lg:p-4 relative transition-all duration-300 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Focus Suite
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {isBreak ? 'Break' : isActive ? 'In session' : hasStarted ? 'Paused' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Quick Mode Switches (Matches AC / Light / Climate in reference image) */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-2.5">
        {/* Deep Focus Tile */}
        <button
          onClick={() => setMode('deep')}
          className={`p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
            activeMode === 'deep'
              ? 'clay-tile-cyan scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeMode === 'deep' ? 'bg-white/20' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'}`}>
            <Zap size={15} />
          </div>
          <span className="text-[11px] font-semibold">Deep</span>
          <span className={`text-[11px] ${activeMode === 'deep' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
            45 min
          </span>
        </button>

        {/* 25 · 5 Sprint Tile */}
        <button
          onClick={() => setMode('flow')}
          className={`p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
            activeMode === 'flow'
              ? 'clay-tile-amber scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
          title="Classic 25-minute focus & 5-minute recovery cadence"
        >
          <div className={`p-1 rounded-xl ${activeMode === 'flow' ? 'bg-white/20' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400'}`}>
            <SprintIcon size={16} />
          </div>
          <span className="text-[11px] font-semibold">{INTERVAL_MODE.shortLabel}</span>
          <span className={`text-[11px] ${activeMode === 'flow' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
            {pomodoro.work}/{pomodoro.shortBreak} min
          </span>
        </button>

        {/* Stress Reset Tile */}
        <button
          onClick={() => {
            setMode('reset');
            onOpenStressReset();
          }}
          className={`p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
            activeMode === 'reset'
              ? 'clay-tile-emerald scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeMode === 'reset' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
            <Wind size={15} />
          </div>
          <span className="text-[11px] font-semibold">Breathe</span>
          <span className={`text-[11px] ${activeMode === 'reset' ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
            2 min reset
          </span>
        </button>
      </div>

      {/* Central Dial Area (Thermostat-style dial with ticks and inner floating disc) */}
      <div className="relative flex flex-col items-center justify-center my-0.5">
        
        {/* Circular SVG Gauge with tick marks */}
        <div className="relative w-44 h-44 sm:w-48 sm:h-48 lg:w-50 lg:h-50 flex items-center justify-center">
          
          {/* Ticks ring around perimeter */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            
            <defs>
              <linearGradient id="dialGradientPomo" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="55%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#be123c" />
              </linearGradient>
              <linearGradient id="dialGradientBreak" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>

            {/* Perimeter ticks — same 270° sweep as the arc */}
            {Array.from({ length: TICKS }).map((_, i) => {
              const frac = i / (TICKS - 1);
              const angle = 135 + frac * SWEEP;
              const rad = (angle * Math.PI) / 180;
              const major = i % 3 === 0;
              const x1 = 120 + 106 * Math.cos(rad);
              const y1 = 120 + 106 * Math.sin(rad);
              const x2 = 120 + (major ? 98 : 102) * Math.cos(rad);
              const y2 = 120 + (major ? 98 : 102) * Math.sin(rad);
              const lit = progressRatio > 0 && frac <= progressRatio + 1e-6;
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={lit ? accent : 'currentColor'}
                  strokeWidth={major ? 2 : 1.2}
                  strokeLinecap="round"
                  className={lit ? 'opacity-90' : 'text-slate-300 dark:text-slate-700 opacity-60'}
                  style={{ transition: 'stroke 300ms' }}
                />
              );
            })}

            {/* Track */}
            <circle
              cx="120" cy="120" r={radius} fill="none" stroke="currentColor" strokeWidth="7"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(135 120 120)"
            />

            {/* Progress — length is exactly elapsed / total of the sweep */}
            {progressRatio > 0 && (
              <circle
                cx="120" cy="120" r={radius} fill="none"
                stroke={`url(#${isBreak ? 'dialGradientBreak' : isPomodoro ? 'dialGradientPomo' : 'dialGradient'})`}
                strokeWidth="7"
                strokeDasharray={`${filledLength} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(135 120 120)"
                style={{ transition: 'stroke-dasharray 300ms linear' }}
              />
            )}
          </svg>

          {/* Inner Floating Tactile Dial Disc */}
          <div className="w-30 h-30 sm:w-34 sm:h-34 lg:w-36 lg:h-36 rounded-full clay-dial-rim flex flex-col items-center justify-center p-2 z-10 select-none">
            <span className="text-[11px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {isBreak ? (breakKind === 'long' ? 'Long Break' : 'Short Break') : activeMode === 'deep' ? 'Deep Zone' : `${INTERVAL_MODE.shortLabel} ${Math.min(pomodoroRound + 1, pomodoro.rounds)}/${pomodoro.rounds}`}
            </span>
            
            {/* Primary Time Readout */}
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {formattedTime}
            </div>

            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {isBreak ? `${Math.round(totalDurationSeconds / 60)}m rest` : `${selectedDuration}m target`}
            </span>

            {/* Status pill inside dial */}
            <div className="mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-800 flex items-center gap-1">
              <Activity size={9} />
              <span>{isActive ? 'In Session' : hasStarted ? 'Paused' : 'Ready'}</span>
            </div>
          </div>
        </div>

        {isPomodoro ? (
          <div className="flex items-center gap-2 mt-1 mb-2.5">
            <div
              className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
              aria-label={`Sprint round ${Math.min(pomodoroRound + 1, pomodoro.rounds)} of ${pomodoro.rounds}`}
            >
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-0.5 flex items-center gap-1">
                <SprintIcon size={12} />
                <span>Sprint:</span>
              </span>
              {Array.from({ length: pomodoro.rounds }).map((_, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full flex items-center justify-center transition-all ${
                    i < pomodoroRound
                      ? 'bg-rose-500 shadow-sm ring-2 ring-rose-500/20'
                      : i === pomodoroRound
                      ? 'bg-amber-400 ring-2 ring-amber-400/40 animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={`Round ${i + 1}${i < pomodoroRound ? ' (Completed)' : i === pomodoroRound ? ' (Current)' : ''}`}
                />
              ))}
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 ml-1">
                {Math.min(pomodoroRound + 1, pomodoro.rounds)}/{pomodoro.rounds}
              </span>
            </div>
            {isBreak ? (
              <button
                onClick={skipBreak}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold clay-button text-slate-600 dark:text-slate-300 flex items-center gap-1"
              >
                <SkipForward size={12} /> Skip break
              </button>
            ) : (
              <button
                onClick={() => setShowPomoSettings((v) => !v)}
                aria-expanded={showPomoSettings}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${showPomoSettings ? 'clay-tile-amber' : 'clay-button text-slate-600 dark:text-slate-300'}`}
                title={`${INTERVAL_MODE.label} settings`}
                aria-label={`${INTERVAL_MODE.label} settings`}
              >
                <SlidersHorizontal size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5 mb-1.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
            {[15, 25, 45, 60, 90].map((dur) => (
              <button
                key={dur}
                onClick={() => setDuration(dur)}
                disabled={isActive || hasStarted}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  selectedDuration === dur
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                } disabled:opacity-50`}
              >
                {dur}m
              </button>
            ))}
          </div>
        )}

        {isPomodoro && showPomoSettings && !isBreak && (
          <PomodoroSettingsPanel
            value={pomodoro}
            locked={isActive || hasStarted}
            onChange={setPomodoro}
          />
        )}
      </div>

      {/* Bottom Metrics Columns (69m² / 46m style in reference image) */}
      <div className="grid grid-cols-2 gap-2 my-1 text-center">
        <button
          onClick={onOpenReadiness}
          className="clay-card-subtle p-1.5 sm:p-2 text-center hover:scale-[1.01] transition-transform"
          title={readinessScore === null ? 'Take a 60-second readiness check' : 'Retake readiness check'}
        >
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Readiness</div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
            {readinessScore === null ? '—' : `${readinessScore}%`}
          </div>
          <div className={`text-[11px] font-medium mt-0.5 leading-tight ${
            readinessScore === null ? 'text-sky-600 dark:text-sky-400'
            : readinessScore >= 70 ? 'text-emerald-600 dark:text-emerald-400'
            : readinessScore >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {readinessScore === null ? 'Check in' : readinessScore >= 70 ? 'Good to focus' : readinessScore >= 45 ? 'Go lighter' : 'Reset first'}
          </div>
        </button>

        <div className="clay-card-subtle p-1.5 sm:p-2">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Completed</div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">{sessionsToday}</div>
          <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mt-0.5 leading-tight">{sessionsToday === 1 ? 'Session today' : 'Sessions today'}</div>
        </div>
      </div>

      {/* Central Tactile Biometric Action Button */}
      <div className="flex items-center justify-center gap-2.5 mt-1.5 sm:mt-2 mb-0.5">
        {/* Break trigger button */}
        <button
          onClick={takeBreak}
          disabled={isBreak}
          className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40"
          title="Take a quick 5-minute break"
          aria-label="Take a 5-minute break"
        >
          <Coffee size={15} />
        </button>

        {/* Main Action Disc (Fingerprint styled tactile button) */}
        <button
          onClick={toggleTimer}
          aria-label={isActive ? 'Pause' : 'Start focus block'}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
            isActive
              ? 'clay-tile-amber scale-105'
              : 'clay-tile-cyan hover:scale-105'
          }`}
        >
          {isActive ? (
            <Pause size={20} className="text-white fill-white" />
          ) : (
            <Fingerprint size={22} className="text-white" />
          )}
        </button>

        {/* Reset / Stop button */}
        <button
          onClick={resetTimer}
          className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
          title={hasStarted ? 'End block (5+ min blocks can be logged)' : 'Reset timer'}
          aria-label={hasStarted ? 'End block' : 'Reset timer'}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Soundscape Quick Pill */}
      <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Volume2 size={13} className="text-sky-500 shrink-0" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
            {activeSoundscape !== 'none' ? `${activeSoundscape} Waves` : 'Focus Audio'}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeSoundscape !== 'none' && (
            <button
              onClick={() => onToggleSoundscape(activeSoundscape as any)}
              className="px-1.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-all shadow-sm"
              title="Stop Audio immediately"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => onToggleSoundscape('gamma')}
            className={`px-1.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
              activeSoundscape === 'gamma'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            40Hz
          </button>
          <button
            onClick={() => onToggleSoundscape('alpha')}
            className={`px-1.5 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
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
  );
}

function Stepper({ id, label, value, unit, min, max, disabled, onChange }: {
  id: string; label: string; value: number; unit: string; min: number; max: number; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-1">
        <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="w-6 h-6 rounded-lg clay-button flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-40" aria-label={`Decrease ${label}`}>
          <Minus size={11} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(n); }}
          className="w-11 text-center text-xs font-bold font-mono bg-transparent text-slate-900 dark:text-white outline-none rounded-md focus:ring-2 focus:ring-rose-400 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="w-6 h-6 rounded-lg clay-button flex items-center justify-center text-slate-600 dark:text-slate-400 disabled:opacity-40" aria-label={`Increase ${label}`}>
          <Plus size={11} />
        </button>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 w-6">{unit}</span>
      </div>
    </div>
  );
}

function Toggle({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${checked ? 'bg-rose-500' : 'clay-switch-track'}`}
      >
        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

function PomodoroSettingsPanel({ value, locked, onChange }: {
  value: import('../../context/FocusTimerContext').PomodoroSettings;
  locked: boolean;
  onChange: (v: import('../../context/FocusTimerContext').PomodoroSettings) => void;
}) {
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  return (
    <div className="w-full clay-card-subtle p-3 space-y-2 mb-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <SprintIcon size={14} />
          <span>25 · 5 Sprint Cadence</span>
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Interval Settings</span>
      </div>
      <Stepper id="pomo-work" label="Focus" value={value.work} unit="min" min={1} max={180} disabled={locked} onChange={(v) => set({ work: v })} />
      <Stepper id="pomo-short" label="Short break" value={value.shortBreak} unit="min" min={1} max={60} onChange={(v) => set({ shortBreak: v })} />
      <Stepper id="pomo-long" label="Long break" value={value.longBreak} unit="min" min={1} max={90} onChange={(v) => set({ longBreak: v })} />
      <Stepper id="pomo-rounds" label="Rounds before long break" value={value.rounds} unit="" min={1} max={12} onChange={(v) => set({ rounds: v })} />
      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
        <Toggle id="pomo-auto-break" label="Start breaks automatically" checked={value.autoStartBreaks} onChange={(v) => set({ autoStartBreaks: v })} />
        <Toggle id="pomo-auto-work" label="Start next round automatically" checked={value.autoStartWork} onChange={(v) => set({ autoStartWork: v })} />
      </div>
      {locked && <p className="text-[11px] text-slate-500 dark:text-slate-400">Focus length can change once the current round ends.</p>}
    </div>
  );
}
