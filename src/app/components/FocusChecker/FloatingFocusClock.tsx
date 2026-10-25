import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Coffee, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Fingerprint, 
  X, 
  Volume2, 
  VolumeX, 
  GripHorizontal, 
  Square, 
  PictureInPicture2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import { TomatoIcon } from '../ui/TomatoIcon';
import { pipService } from '../../services/pipService';
import { toast } from 'sonner';

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
  const [isPiPActive, setIsPiPActive] = useState<boolean>(false);

  // Absolute Screen Coordinates for 100% Reliable Draggability Anywhere on Screen
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      const h = window.innerHeight;
      return {
        x: Math.max(16, w - 310),
        y: Math.max(16, h - 220),
      };
    }
    return { x: 40, y: 40 };
  });

  // Track window resize to ensure widget stays inside viewport
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => ({
        x: Math.max(8, Math.min(window.innerWidth - 290, prev.x)),
        y: Math.max(8, Math.min(window.innerHeight - 190, prev.y)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Universal Window-level Pointer Dragging (Works on touch + mouse across all screens)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = position.x;
    const initY = position.y;

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const widgetWidth = isMinimized ? 220 : 300;
      const widgetHeight = isMinimized ? 55 : 210;

      const newX = Math.max(8, Math.min(window.innerWidth - widgetWidth - 8, initX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - widgetHeight - 8, initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  // Picture-in-Picture trigger
  const handleTogglePiP = async () => {
    if (pipService.isPiPActive()) {
      await pipService.exitPiP();
      setIsPiPActive(false);
      toast.info("Picture-in-Picture window closed");
    } else {
      const started = await pipService.requestCanvasPiP(
        () => formattedTime,
        () => (isBreak ? 'Break Mode' : activeMode === 'flow' ? 'Pomodoro' : 'Deep Work'),
        () => progressRatio,
        () => isActive
      );
      if (started) {
        setIsPiPActive(true);
        toast.success("Picture-in-Picture floating on top of screen!");
      } else {
        toast.info("Browser Picture-in-Picture blocked or unsupported. Use the in-browser floating clock widget!");
      }
    }
  };

  if (!isVisible) return null;

  // Mini circular arc radius
  const miniRadius = 22;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniStrokeOffset = miniCircumference - (miniCircumference * progressRatio);

  const hasAudioPlaying = activeSoundscape && activeSoundscape !== 'none';

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        touchAction: 'none',
      }}
      className="select-none will-change-transform"
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Draggable Clay Pill across entire browser */
          <motion.div
            key="minimized"
            onPointerDown={handlePointerDown}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="clay-card py-2 px-3 flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-2xl touch-none border border-white/80 dark:border-slate-700"
          >
            <GripHorizontal size={13} className="text-slate-400" />
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
          /* Expanded Draggable Claymorphic Clock with Picture-in-Picture */
          <motion.div
            key="expanded"
            onPointerDown={handlePointerDown}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="clay-card p-3.5 w-68 sm:w-76 shadow-2xl space-y-2.5 backdrop-blur-2xl border border-white/90 dark:border-slate-700/80 cursor-grab active:cursor-grabbing touch-none"
          >
            {/* Tactile Drag Handle Header (grab anywhere on header to move across entire browser) */}
            <div className="flex items-center justify-between text-xs py-0.5">
              <div className="flex items-center gap-1.5">
                <GripHorizontal size={14} className="text-slate-400 opacity-80" />
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] tracking-tight">
                  {isBreak ? 'Break Timer' : 'Focus Clock'}
                </span>
              </div>

              {/* Window Controls: PiP, Minimize, Full Dial, Close */}
              <div className="flex items-center gap-0.5 text-slate-400">
                {/* PiP Button */}
                <button
                  onClick={handleTogglePiP}
                  className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                    isPiPActive ? 'text-sky-500 font-bold' : 'hover:text-slate-700 dark:hover:text-white'
                  }`}
                  title="Float on top of all OS windows (Picture-in-Picture)"
                >
                  <PictureInPicture2 size={13} />
                </button>
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
            <div className="flex items-center justify-between p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs">
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
            <div className="flex items-center gap-1.5 pt-0.5">
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
