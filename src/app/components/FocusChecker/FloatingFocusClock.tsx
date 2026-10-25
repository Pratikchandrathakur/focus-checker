import React, { useState, useRef } from 'react';
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
  Volume2,
  GripHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';

interface FloatingFocusClockProps {
  onOpenDial: () => void;
  activeSoundscape?: string;
  isDialTabActive?: boolean;
}

export function FloatingFocusClock({
  onOpenDial,
  activeSoundscape,
  isDialTabActive = false,
}: FloatingFocusClockProps) {
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

  // If user closed it or if not visible
  if (!isVisible) return null;

  // Mini circular arc radius
  const miniRadius = 22;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniStrokeOffset = miniCircumference - (miniCircumference * progressRatio);

  return (
    <div className="fixed bottom-5 right-5 z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Draggable Clay Pill */
          <motion.div
            key="minimized"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{ scale: 1.05 }}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="pointer-events-auto clay-card py-2 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xl touch-none border border-white/80 dark:border-slate-700"
          >
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
              {formattedTime}
            </span>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
              title="Expand clock"
            >
              <Maximize2 size={12} />
            </button>
          </motion.div>
        ) : (
          /* Expanded Draggable Claymorphic Clock */
          <motion.div
            key="expanded"
            drag
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{ scale: 1.02 }}
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            className="pointer-events-auto clay-card p-3.5 w-64 sm:w-72 shadow-2xl space-y-2.5 backdrop-blur-2xl border border-white/90 dark:border-slate-700/80"
          >
            {/* Tactile Drag Handle Header (grab anywhere on header to move on all devices) */}
            <div className="flex items-center justify-between text-xs cursor-grab active:cursor-grabbing touch-none py-0.5">
              <div className="flex items-center gap-1.5">
                <GripHorizontal size={14} className="text-slate-400 opacity-70" />
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] tracking-tight">
                  {isBreak ? 'Break Timer' : 'Focus Clock'}
                </span>
                {activeSoundscape && activeSoundscape !== 'none' && (
                  <span className="text-[10px] text-sky-500 font-semibold flex items-center gap-0.5 ml-1">
                    <Volume2 size={10} /> {activeSoundscape}
                  </span>
                )}
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-0.5 text-slate-400" onPointerDown={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Minimize"
                >
                  <Minimize2 size={12} />
                </button>
                <button
                  onClick={onOpenDial}
                  className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Go to full dial"
                >
                  <Maximize2 size={12} />
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Close"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Middle: Dial & Digital Time */}
            <div className="flex items-center gap-3 py-0.5">
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 54 54">
                  <circle
                    cx="27"
                    cy="27"
                    r={miniRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    className="text-slate-100 dark:text-slate-800"
                  />
                  <circle
                    cx="27"
                    cy="27"
                    r={miniRadius}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="3.5"
                    strokeDasharray={miniCircumference}
                    strokeDashoffset={miniStrokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fingerprint size={16} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white leading-none tracking-tight">
                  {formattedTime}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  <span className="capitalize">{activeMode}</span>
                  <span>•</span>
                  <span className={isActive ? 'text-emerald-500' : 'text-amber-500'}>
                    {isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800" onPointerDown={(e) => e.stopPropagation()}>
              <button
                onClick={toggleTimer}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  isActive ? 'clay-tile-amber' : 'clay-tile-cyan'
                }`}
              >
                {isActive ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
                <span>{isActive ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={takeBreak}
                disabled={isBreak}
                className="p-1.5 rounded-xl clay-button text-slate-600 dark:text-slate-300 disabled:opacity-40"
                title="Take 5-min break"
              >
                <Coffee size={13} />
              </button>

              <button
                onClick={resetTimer}
                className="p-1.5 rounded-xl clay-button text-slate-600 dark:text-slate-300"
                title="Reset timer"
              >
                <RotateCcw size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
