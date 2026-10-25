import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Coffee, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Fingerprint, 
  Zap, 
  X,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';

interface FloatingFocusClockProps {
  onOpenDial: () => void;
  activeSoundscape?: string;
}

export function FloatingFocusClock({ onOpenDial, activeSoundscape }: FloatingFocusClockProps) {
  const {
    secondsRemaining,
    formattedTime,
    isActive,
    isBreak,
    activeMode,
    progressRatio,
    toggleTimer,
    takeBreak,
    resetTimer,
  } = useFocusTimer();

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);

  if (!isVisible) return null;

  // Mini circular arc radius
  const miniRadius = 24;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniStrokeOffset = miniCircumference - (miniCircumference * progressRatio);

  return (
    <div className="fixed bottom-6 right-6 z-50 select-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Sleek Clay Pill */
          <motion.div
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="clay-card py-2 px-3.5 flex items-center gap-2.5 cursor-pointer shadow-2xl hover:scale-105 transition-transform"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
              {formattedTime}
            </span>
            <span className="text-[10px] font-semibold text-slate-400 capitalize">
              {isBreak ? 'Break' : activeMode}
            </span>
            <Maximize2 size={12} className="text-slate-400 ml-1" />
          </motion.div>
        ) : (
          /* Expanded Tactile Floating Clock */
          <motion.div
            key="expanded"
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="clay-card p-4 w-72 shadow-2xl space-y-3.5 backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {isBreak ? 'Break Timer' : 'Focus Clock'}
                </span>
                {activeSoundscape && activeSoundscape !== 'none' && (
                  <span className="text-[10px] text-sky-500 flex items-center gap-0.5">
                    <Volume2 size={10} /> {activeSoundscape}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-lg hover:text-slate-700 dark:hover:text-white"
                  title="Minimize to pill"
                >
                  <Minimize2 size={13} />
                </button>
                <button
                  onClick={onOpenDial}
                  className="p-1 rounded-lg hover:text-slate-700 dark:hover:text-white"
                  title="Open full focus suite"
                >
                  <Maximize2 size={13} />
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 rounded-lg hover:text-slate-700 dark:hover:text-white"
                  title="Close floating widget"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Center: Mini Gauge & Time */}
            <div className="flex items-center gap-4 py-1">
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                  <circle
                    cx="30"
                    cy="30"
                    r={miniRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r={miniRadius}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="4"
                    strokeDasharray={miniCircumference}
                    strokeDashoffset={miniStrokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint size={18} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
                </div>
              </div>

              <div className="flex-1">
                <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white leading-none">
                  {formattedTime}
                </div>
                <div className="text-[11px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="capitalize">{activeMode} Block</span>
                  <span>•</span>
                  <span className={isActive ? 'text-emerald-500' : 'text-amber-500'}>
                    {isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={toggleTimer}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isActive ? 'clay-tile-amber' : 'clay-tile-cyan'
                }`}
              >
                {isActive ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                <span>{isActive ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={takeBreak}
                disabled={isBreak}
                className="p-2 rounded-xl clay-button text-slate-600 dark:text-slate-300 disabled:opacity-40"
                title="Take 5-min break"
              >
                <Coffee size={14} />
              </button>

              <button
                onClick={resetTimer}
                className="p-2 rounded-xl clay-button text-slate-600 dark:text-slate-300"
                title="Reset timer"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
