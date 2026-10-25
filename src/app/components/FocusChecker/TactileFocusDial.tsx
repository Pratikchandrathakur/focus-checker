import React, { useState } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';

interface TactileFocusDialProps {
  onOpenStressReset: () => void;
  activeSoundscape: string;
  onToggleSoundscape: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
}

export function TactileFocusDial({
  onOpenStressReset,
  activeSoundscape,
  onToggleSoundscape,
}: TactileFocusDialProps) {
  const {
    secondsRemaining,
    formattedTime,
    isActive,
    isBreak,
    activeMode,
    selectedDuration,
    completedSessionsToday,
    progressRatio,
    toggleTimer,
    takeBreak,
    resetTimer,
    setDuration,
    setMode,
    handleSaveSession,
  } = useFocusTimer();

  // Self assessment state (modal after finish)
  const [showAssessment, setShowAssessment] = useState(false);
  const [focusQuality, setFocusQuality] = useState(8);
  const [contentClarity, setContentClarity] = useState(8);
  const [frustrationLevel, setFrustrationLevel] = useState(2);
  const [attentionFaded, setAttentionFaded] = useState(false);
  const [fadeMinutes, setFadeMinutes] = useState(20);

  // SVG circular gauge geometry (compacted to fit cleanly in viewport)
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * 0.75 * progressRatio);

  const onSaveMetrics = () => {
    handleSaveSession(focusQuality, contentClarity, frustrationLevel, attentionFaded, fadeMinutes);
    setShowAssessment(false);
  };

  return (
    <div className="clay-card p-4 sm:p-5 md:p-6 relative overflow-hidden transition-all duration-300 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Focus Suite
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {isBreak ? 'Break Mode' : isActive ? 'Active Flow' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Quick Mode Switches (Matches AC / Light / Climate in reference image) */}
      <div className="grid grid-cols-3 gap-2 mb-3 sm:mb-4">
        {/* Deep Focus Tile */}
        <button
          onClick={() => setMode('deep')}
          className={`p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
            activeMode === 'deep'
              ? 'clay-tile-cyan scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeMode === 'deep' ? 'bg-white/20' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'}`}>
            <Zap size={16} />
          </div>
          <span className="text-xs font-semibold">Deep</span>
          <span className={`text-[10px] ${activeMode === 'deep' ? 'text-white/80' : 'text-slate-400'}`}>
            45 min
          </span>
        </button>

        {/* Calm Flow Tile */}
        <button
          onClick={() => setMode('flow')}
          className={`p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
            activeMode === 'flow'
              ? 'clay-tile-amber scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeMode === 'flow' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'}`}>
            <Flame size={16} />
          </div>
          <span className="text-xs font-semibold">Pomodoro</span>
          <span className={`text-[10px] ${activeMode === 'flow' ? 'text-white/80' : 'text-slate-400'}`}>
            25 min
          </span>
        </button>

        {/* Stress Reset Tile */}
        <button
          onClick={() => {
            setMode('reset');
            onOpenStressReset();
          }}
          className={`p-2 sm:p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
            activeMode === 'reset'
              ? 'clay-tile-emerald scale-[1.02]'
              : 'clay-button text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className={`p-1.5 rounded-xl ${activeMode === 'reset' ? 'bg-white/20' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
            <Wind size={16} />
          </div>
          <span className="text-xs font-semibold">De-Stress</span>
          <span className={`text-[10px] ${activeMode === 'reset' ? 'text-white/80' : 'text-slate-400'}`}>
            Sigh 2m
          </span>
        </button>
      </div>

      {/* Central Dial Area (Thermostat-style dial with ticks and inner floating disc) */}
      <div className="relative flex flex-col items-center justify-center my-1">
        
        {/* Circular SVG Gauge with tick marks */}
        <div className="relative w-56 h-56 sm:w-60 sm:h-60 flex items-center justify-center">
          
          {/* Ticks ring around perimeter */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 240 240">
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
              const x1 = 120 + 106 * Math.cos(rad);
              const y1 = 120 + 106 * Math.sin(rad);
              const x2 = 120 + (i % 3 === 0 ? 98 : 102) * Math.cos(rad);
              const y2 = 120 + (i % 3 === 0 ? 98 : 102) * Math.sin(rad);
              const isHighlighted = (i / 36) <= progressRatio;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHighlighted ? '#0ea5e9' : 'currentColor'}
                  strokeWidth={i % 3 === 0 ? 2 : 1.2}
                  strokeLinecap="round"
                  className={isHighlighted ? 'opacity-90' : 'text-slate-300 dark:text-slate-700 opacity-60'}
                />
              );
            })}

            {/* Base Background Track */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(135 120 120)"
            />

            {/* Active Gradient Arc Track */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="none"
              stroke="url(#dialGradient)"
              strokeWidth="7"
              strokeDasharray={circumference * 0.75}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(135 120 120)"
              className="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Inner Floating Tactile Dial Disc */}
          <div className="w-38 h-38 sm:w-42 sm:h-42 rounded-full clay-dial-rim flex flex-col items-center justify-center p-3 z-10 select-none">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              {isBreak ? 'Resting Mind' : activeMode === 'deep' ? 'Deep Zone' : 'Flow State'}
            </span>
            
            {/* Primary Time Readout */}
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {formattedTime}
            </div>

            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {isBreak ? '5m rest' : `${selectedDuration}m target`}
            </span>

            {/* Status pill inside dial */}
            <div className="mt-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-800 flex items-center gap-1">
              <Activity size={9} />
              <span>{isActive ? 'In Session' : 'Ready'}</span>
            </div>
          </div>
        </div>

        {/* Quick Duration Buttons (15, 25, 45, 60, 90) */}
        <div className="flex items-center gap-1 mt-1 mb-2.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-full border border-slate-200/60 dark:border-slate-700/60">
          {[15, 25, 45, 60, 90].map((dur) => (
            <button
              key={dur}
              onClick={() => setDuration(dur)}
              disabled={isActive}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
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

      {/* Bottom Metrics Columns (69m² / 46m style in reference image) */}
      <div className="grid grid-cols-2 gap-3 my-1.5 text-center">
        <div className="clay-card-subtle p-2 sm:p-2.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Readiness</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">94%</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Optimal Focus</div>
        </div>

        <div className="clay-card-subtle p-2 sm:p-2.5">
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Completed</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{completedSessionsToday}</div>
          <div className="text-[10px] text-sky-600 dark:text-sky-400 font-medium mt-0.5">Sessions today</div>
        </div>
      </div>

      {/* Central Tactile Biometric Action Button */}
      <div className="flex items-center justify-center gap-3 mt-3 sm:mt-4">
        {/* Break trigger button */}
        <button
          onClick={takeBreak}
          disabled={isBreak}
          className="w-10 h-10 rounded-2xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40"
          title="Take a quick 5-minute break"
        >
          <Coffee size={16} />
        </button>

        {/* Main Action Disc (Fingerprint styled tactile button) */}
        <button
          onClick={toggleTimer}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            isActive
              ? 'clay-tile-amber scale-105'
              : 'clay-tile-cyan hover:scale-105'
          }`}
        >
          {isActive ? (
            <Pause size={22} className="text-white fill-white" />
          ) : (
            <Fingerprint size={26} className="text-white" />
          )}
        </button>

        {/* Reset / Stop button */}
        <button
          onClick={resetTimer}
          className="w-10 h-10 rounded-2xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
          title="Reset timer"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Soundscape Quick Pill */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Volume2 size={14} className="text-sky-500" />
          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
            {activeSoundscape !== 'none' ? `Audio: ${activeSoundscape} Waves` : 'Binaural Focus Audio'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {activeSoundscape !== 'none' && (
            <button
              onClick={() => onToggleSoundscape(activeSoundscape as any)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-all shadow-sm"
              title="Stop Audio immediately"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => onToggleSoundscape('gamma')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              activeSoundscape === 'gamma'
                ? 'bg-sky-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            40Hz
          </button>
          <button
            onClick={() => onToggleSoundscape('alpha')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
              activeSoundscape === 'alpha'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            10Hz
          </button>
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
              className="clay-card max-w-md w-full p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Session Complete</h4>
                  <p className="text-xs text-slate-500">Record your cognitive metrics to uncover attention patterns</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              </div>

              {/* Quality Slider */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
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
                <div className="flex justify-between text-xs font-medium mb-1">
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
              <div className="clay-card-subtle p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Did your attention fade?</span>
                  <button
                    onClick={() => setAttentionFaded(!attentionFaded)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      attentionFaded ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {attentionFaded ? 'Yes, it dropped' : 'Held steady'}
                  </button>
                </div>
                {attentionFaded && (
                  <div className="pt-1.5">
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
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

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowAssessment(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold clay-button text-slate-600 dark:text-slate-400"
                >
                  Skip
                </button>
                <button
                  onClick={onSaveMetrics}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold clay-tile-cyan"
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
