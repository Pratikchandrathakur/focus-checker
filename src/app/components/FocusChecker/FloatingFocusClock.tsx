import React, { useState, useEffect } from 'react';
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
  VolumeX,
  GripHorizontal,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import { TomatoIcon } from '../ui/TomatoIcon';

interface FloatingFocusClockProps {
  onOpenDial: () => void;
  activeSoundscape?: string;
  onStopSoundscape?: () => void;
  onToggleSoundscape?: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
  isDialTabActive?: boolean;
}

export function FloatingFocusClock({
  onOpenDial,
  activeSoundscape = 'none',
  onStopSoundscape,
  onToggleSoundscape,
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
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  // Track window resize to ensure drag bounds adapt to the entire browser
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isVisible) return null;

  // Mini circular arc radius
  const miniRadius = 22;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniStrokeOffset = miniCircumference - (miniCircumference * progressRatio);

  const hasAudioPlaying = activeSoundscape && activeSoundscape !== 'none';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Draggable Clay Pill across entire browser */
          <motion.div
            key="minimized"
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{
              left: 12,
              top: 12,
              right: Math.max(100, windowDimensions.width - 240),
              bottom: Math.max(100, windowDimensions.height - 60),
            }}
            initial={{ 
              x: Math.max(20, windowDimensions.width - 240), 
              y: Math.max(20, windowDimensions.height - 80),
              scale: 0.85, 
              opacity: 0 
            }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="pointer-events-auto absolute clay-card py-2 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xl touch-none border border-white/80 dark:border-slate-700"
          >
            <GripHorizontal size={12} className="text-slate-400" />
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
              {formattedTime}
            </span>

            {/* Direct audio stop button on minimized pill */}
            {hasAudioPlaying && onStopSoundscape && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStopSoundscape();
                }}
                className="p-1 rounded-md bg-red-100 dark:bg-red-950/60 text-red-500 hover:bg-red-200"
                title="Stop Audio Soundscape"
              >
                <VolumeX size={12} />
              </button>
            )}

            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white"
              title="Expand clock"
            >
              <Maximize2 size={12} />
            </button>
          </motion.div>
        ) : (
          /* Expanded Draggable Claymorphic Clock across entire browser */
          <motion.div
            key="expanded"
            drag
            dragMomentum={false}
            dragElastic={0.08}
            dragConstraints={{
              left: 12,
              top: 12,
              right: Math.max(100, windowDimensions.width - 320),
              bottom: Math.max(100, windowDimensions.height - 210),
            }}
            initial={{ 
              x: Math.max(20, windowDimensions.width - 320), 
              y: Math.max(20, windowDimensions.height - 210),
              scale: 0.92, 
              opacity: 0 
            }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="pointer-events-auto absolute clay-card p-3.5 w-68 sm:w-76 shadow-2xl space-y-2.5 backdrop-blur-2xl border border-white/90 dark:border-slate-700/80"
          >
            {/* Tactile Drag Handle Header (grab anywhere on header to move across entire browser) */}
            <div className="flex items-center justify-between text-xs cursor-grab active:cursor-grabbing touch-none py-0.5">
              <div className="flex items-center gap-1.5">
                <GripHorizontal size={14} className="text-slate-400 opacity-70" />
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] tracking-tight">
                  {isBreak ? 'Break Timer' : 'Focus Clock'}
                </span>
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
              <div className="relative w-13 h-13 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
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
                  {activeMode === 'flow' ? (
                    <TomatoIcon size={16} className={isActive ? 'text-red-500' : 'text-slate-400'} />
                  ) : (
                    <Fingerprint size={16} className={isActive ? 'text-sky-500' : 'text-slate-400'} />
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-white leading-none tracking-tight">
                  {formattedTime}
                </div>
                <div className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  <span className="capitalize">{activeMode === 'flow' ? 'Pomodoro' : activeMode}</span>
                  <span>•</span>
                  <span className={isActive ? 'text-emerald-500' : 'text-amber-500'}>
                    {isActive ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Audio Status & Stop Option Row */}
            <div 
              className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Volume2 size={13} className={hasAudioPlaying ? 'text-sky-500 animate-pulse' : 'text-slate-400'} />
                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                  {hasAudioPlaying ? `Audio: ${activeSoundscape}` : 'Soundscape: Off'}
                </span>
              </div>

              {hasAudioPlaying ? (
                <button
                  onClick={onStopSoundscape}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-all shadow-sm"
                  title="Immediately stop and silence audio"
                >
                  <Square size={9} fill="currentColor" /> Stop
                </button>
              ) : (
                onToggleSoundscape && (
                  <button
                    onClick={() => onToggleSoundscape('gamma')}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-200"
                    title="Play 40Hz focus tone"
                  >
                    40Hz On
                  </button>
                )
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center gap-1.5 pt-0.5" onPointerDown={(e) => e.stopPropagation()}>
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
