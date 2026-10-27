import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  PictureInPicture2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';
import { SprintIcon } from '../ui/SprintIcon';
import { pipService, PipLiveState } from '../../services/pipService';
import { toast } from 'sonner';
import { INTERVAL_MODE } from '../../config';

interface FloatingFocusClockProps {
  onOpenDial: () => void;
  activeSoundscape?: string;
  onStopSoundscape?: () => void;
  onToggleSoundscape?: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
  isDialTabActive?: boolean;
  /** False on marketing / legal pages. */
  enabled?: boolean;
}

// Keep the widget clear of the mobile bottom dock (~96px) and header.
const MOBILE_BREAKPOINT = 1024;
const DOCK_CLEARANCE = 104;
function defaultPosition(minimized: boolean) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const mobile = w < MOBILE_BREAKPOINT;
  const width = minimized ? 150 : 320;
  const height = minimized ? 56 : 230;
  return {
    x: Math.max(12, w - width - 12),
    y: Math.max(72, h - height - (mobile ? DOCK_CLEARANCE : 16)),
  };
}

export function FloatingFocusClock({
  onOpenDial,
  activeSoundscape = 'none',
  onStopSoundscape,
  onToggleSoundscape,
  isDialTabActive = false,
  enabled = true,
}: FloatingFocusClockProps) {
  const timer = useFocusTimer();
  // Phones start with the compact pill so content stays readable.
  const [isMinimized, setIsMinimized] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const [position, setPosition] = useState<{ x: number; y: number }>(() =>
    typeof window !== 'undefined' ? defaultPosition(window.innerWidth < MOBILE_BREAKPOINT) : { x: 40, y: 40 }
  );

  // Starting a block brings the widget back if it was closed.
  useEffect(() => {
    if (timer.isActive) setDismissed(false);
  }, [timer.isActive]);

  // Always on screen (as in the original design) unless the user closes it.
  void isDialTabActive;
  // Hidden on marketing/legal pages, except while a block is actually running so it never disappears mid-session.
  const isVisible = (enabled || timer.hasStarted) && !dismissed;

  // Keep a mutable ref of live timer state for Canvas PiP fallback
  const timerStateRef = useRef<PipLiveState>({
    time: timer.formattedTime,
    mode: timer.isBreak ? 'Break Mode' : timer.activeMode === 'flow' ? INTERVAL_MODE.label : 'Deep Work',
    progress: timer.progressRatio,
    isActive: timer.isActive,
    isBreak: timer.isBreak,
    soundscape: activeSoundscape,
  });

  useEffect(() => {
    timerStateRef.current = {
      time: timer.formattedTime,
      mode: timer.isBreak ? 'Break Mode' : timer.activeMode === 'flow' ? INTERVAL_MODE.label : 'Deep Work',
      progress: timer.progressRatio,
      isActive: timer.isActive,
      isBreak: timer.isBreak,
      soundscape: activeSoundscape,
    };
  }, [timer.formattedTime, timer.activeMode, timer.progressRatio, timer.isActive, timer.isBreak, activeSoundscape]);

  // Track window resize to ensure widget stays inside viewport
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setPosition((prev) => ({
        x: Math.max(8, Math.min(window.innerWidth - (isMinimized ? 150 : 320), prev.x)),
        y: Math.max(8, Math.min(window.innerHeight - (isMinimized ? 56 : 230) - (mobile ? DOCK_CLEARANCE : 8), prev.y)),
      }));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMinimized]);

  // Universal Window-level Pointer Dragging (Works on touch + mouse across all screens)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicking buttons, inputs, or interactive controls
    if (target.closest('button') || target.closest('input')) return;

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = position.x;
    const initY = position.y;

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;
      const widgetWidth = isMinimized ? 150 : 310;
      const widgetHeight = isMinimized ? 55 : 220;

      const newX = Math.max(8, Math.min(window.innerWidth - widgetWidth - 8, initX + dx));
      const bottomPad = window.innerWidth < MOBILE_BREAKPOINT ? DOCK_CLEARANCE : 8;
      const newY = Math.max(8, Math.min(window.innerHeight - widgetHeight - bottomPad, initY + dy));
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

  // Launch Picture-in-Picture Window (Chrome 116+ Document PiP API or High-DPI Canvas Fallback)
  const handleTogglePiP = async () => {
    // If PiP is already open, close it
    if (pipWindow) {
      try {
        pipWindow.close();
      } catch {}
      setPipWindow(null);
      toast.info("Picture-in-Picture window closed and docked");
      return;
    }

    if (pipService.isPiPActive()) {
      await pipService.exitPiP();
      toast.info("Picture-in-Picture closed");
      return;
    }

    // Attempt 1: Chrome 116+ Document Picture-in-Picture (Real HTML window with live React portal)
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pWin: Window = await (window as any).documentPictureInPicture.requestWindow({
          width: 340,
          height: 310,
        });

        pWin.document.title = 'Focus Clock • FocusChecker';

        // Safely copy styles without cross-document DOMException
        try {
          [...document.styleSheets].forEach((sheet) => {
            try {
              const cssRules = [...sheet.cssRules].map((r) => r.cssText).join('\n');
              const style = pWin.document.createElement('style');
              style.textContent = cssRules;
              pWin.document.head.appendChild(style);
            } catch {
              if (sheet.href) {
                const link = pWin.document.createElement('link');
                link.rel = 'stylesheet';
                link.href = sheet.href;
                pWin.document.head.appendChild(link);
              }
            }
          });
        } catch (styleErr) {
          console.warn("Stylesheet copy warning:", styleErr);
        }

        // Copy inline styles safely
        document.querySelectorAll('style').forEach((st) => {
          try {
            const style = pWin.document.createElement('style');
            style.textContent = st.textContent || '';
            pWin.document.head.appendChild(style);
          } catch {}
        });

        // Match Dark/Light theme class
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
          pWin.document.documentElement.classList.add('dark');
          pWin.document.body.style.backgroundColor = '#0b111c';
        } else {
          pWin.document.documentElement.classList.remove('dark');
          pWin.document.body.style.backgroundColor = '#eef2f6';
        }

        pWin.document.body.className = 'clay-canvas flex items-center justify-center p-3 m-0 min-h-screen select-none overflow-hidden';
        pWin.document.body.style.margin = '0';
        pWin.document.body.style.padding = '12px';
        pWin.document.body.style.boxSizing = 'border-box';

        pWin.addEventListener('pagehide', () => {
          setPipWindow(null);
        });

        setPipWindow(pWin);
        toast.success('Timer is now floating above your other windows');
        return;
      } catch (err) {
        console.warn("Document PiP request failed, falling back to Canvas PiP:", err);
      }
    }

    // Attempt 2: Canvas / Video Picture-in-Picture Fallback (High-DPI 600x340 animation)
    const started = await pipService.requestCanvasPiP(
      () => timerStateRef.current,
      {
        onToggleTimer: timer.toggleTimer,
        onResetTimer: timer.resetTimer,
        onStopSoundscape,
      }
    );

    if (started) {
      toast.success("Picture-in-Picture floating stream active!");
    } else {
      toast.info("Browser blocked native PiP window. Drag the in-browser floating clock anywhere!");
    }
  };

  if (!isVisible && !pipWindow) return null;

  return (
    <>
      {/* 1. In-Browser Draggable Clock Widget */}
      {isVisible && (
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
          data-tour="floating-clock"
        >
          {pipWindow ? (
            /* When PiP is open in another OS window, show docked shortcut pill here */
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onPointerDown={handlePointerDown}
              className="clay-card py-2 px-3.5 flex items-center gap-2.5 shadow-2xl border border-white/90 dark:border-slate-700 cursor-grab active:cursor-grabbing backdrop-blur-xl"
            >
              <GripHorizontal size={13} className="text-slate-500 dark:text-slate-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
              <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                PiP: {timer.formattedTime}
              </span>
              <button
                onClick={() => {
                  pipWindow.close();
                  setPipWindow(null);
                }}
                className="px-2 py-0.5 rounded-lg text-[11px] font-bold clay-tile-cyan text-white shadow-sm flex items-center gap-1 cursor-pointer"
                title="Dock back to main browser window"
              >
                <span>Dock</span>
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {isMinimized ? (
                /* Minimized Draggable Clay Pill */
                <motion.div
                  key="minimized"
                  onPointerDown={handlePointerDown}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  className="clay-card !bg-white dark:!bg-slate-900 py-2.5 px-3.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing shadow-2xl touch-none border border-white/80 dark:border-slate-700"
                >
                  <GripHorizontal size={13} className="text-slate-500 dark:text-slate-400" />
                  <div className={`w-2.5 h-2.5 rounded-full ${timer.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                    {timer.formattedTime}
                  </span>

                  {activeSoundscape !== 'none' && onStopSoundscape && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopSoundscape();
                      }}
                      className="p-1 rounded-md bg-red-100 dark:bg-red-950/60 text-red-500 hover:bg-red-200 cursor-pointer"
                      title="Stop Audio immediately"
                    >
                      <VolumeX size={12} />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMinimized(false);
                    }}
                    className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    title="Expand floating clock"
                  >
                    <Maximize2 size={12} />
                  </button>
                </motion.div>
              ) : (
                /* Expanded Draggable Claymorphic Clock Card */
                <motion.div
                  key="expanded"
                  onPointerDown={handlePointerDown}
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  className="clay-card p-3.5 w-72 sm:w-80 shadow-2xl space-y-2.5 backdrop-blur-2xl border border-white/90 dark:border-slate-700/80 cursor-grab active:cursor-grabbing touch-none"
                >
                  <ClockCardContent
                    timer={timer}
                    activeSoundscape={activeSoundscape}
                    onStopSoundscape={onStopSoundscape}
                    onToggleSoundscape={onToggleSoundscape}
                    onTogglePiP={handleTogglePiP}
                    isPiPActive={Boolean(pipWindow)}
                    onMinimize={() => setIsMinimized(true)}
                    onOpenDial={onOpenDial}
                    onClose={() => setDismissed(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* 2. Portal into Native Document Picture-in-Picture Window (Chrome 116+) */}
      {pipWindow &&
        createPortal(
          <div className="w-full clay-card p-4 rounded-3xl shadow-2xl space-y-3 border border-white/90 dark:border-slate-700/80 select-none">
            <ClockCardContent
              timer={timer}
              activeSoundscape={activeSoundscape}
              onStopSoundscape={onStopSoundscape}
              onToggleSoundscape={onToggleSoundscape}
              onTogglePiP={handleTogglePiP}
              isPiPActive={true}
              onMinimize={() => {
                pipWindow.close();
                setPipWindow(null);
                setIsMinimized(true);
              }}
              onOpenDial={onOpenDial}
              onClose={() => {
                pipWindow.close();
                setPipWindow(null);
              }}
              isInsideNativeWindow={true}
            />
          </div>,
          pipWindow.document.body
        )}
    </>
  );
}

// Reusable Pure Claymorphic Clock Content (Shared by Floating Widget & Native PiP Portal)
function ClockCardContent({
  timer,
  activeSoundscape,
  onStopSoundscape,
  onToggleSoundscape,
  onTogglePiP,
  isPiPActive,
  onMinimize,
  onOpenDial,
  onClose,
  isInsideNativeWindow = false,
}: {
  timer: ReturnType<typeof useFocusTimer>;
  activeSoundscape: string;
  onStopSoundscape?: () => void;
  onToggleSoundscape?: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
  onTogglePiP: () => void;
  isPiPActive: boolean;
  onMinimize: () => void;
  onOpenDial: () => void;
  onClose: () => void;
  isInsideNativeWindow?: boolean;
}) {
  const miniRadius = 26;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const miniStrokeOffset = miniCircumference - miniCircumference * timer.progressRatio;
  const hasAudioPlaying = activeSoundscape && activeSoundscape !== 'none';

  return (
    <>
      {/* Top Header Bar */}
      <div className="flex items-center justify-between text-xs py-0.5">
        <div className="flex items-center gap-1.5">
          {!isInsideNativeWindow && (
            <GripHorizontal size={14} className="text-slate-500 dark:text-slate-400 opacity-80" />
          )}
          <span className={`w-2.5 h-2.5 rounded-full ${timer.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-xs tracking-tight">
            {timer.isBreak
              ? 'Break Mode'
              : timer.activeMode === 'flow'
              ? `${INTERVAL_MODE.shortLabel} ${Math.min(timer.pomodoroRound + 1, timer.pomodoro.rounds)}/${timer.pomodoro.rounds}`
              : 'Deep Work'}
          </span>
        </div>

        {/* Window Action Controls */}
        <div
          className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={onTogglePiP}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              isPiPActive
                ? 'text-sky-500 bg-sky-50 dark:bg-sky-950/60 font-bold'
                : 'hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              isPiPActive
                ? 'Dock back into browser'
                : 'Float Picture-in-Picture on top of all OS windows'
            }
          >
            <PictureInPicture2 size={13} />
          </button>

          {!isInsideNativeWindow && (
            <button
              onClick={onMinimize}
              className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Minimize to pill"
            >
              <Minimize2 size={12} />
            </button>
          )}

          <button
            onClick={onOpenDial}
            className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Open focus dial in main page"
          >
            <ExternalLink size={12} />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Close widget"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Center: Tactile Dial Progress & Live Digital Time */}
      <div className="flex items-center gap-3.5 py-1">
        <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={miniRadius}
              fill="none"
              stroke="currentColor"
              strokeWidth="4.5"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="32"
              cy="32"
              r={miniRadius}
              fill="none"
              stroke={
                timer.isBreak
                  ? '#10b981'
                  : timer.activeMode === 'flow'
                  ? '#f43f5e'
                  : '#0ea5e9'
              }
              strokeWidth="4.5"
              strokeDasharray={miniCircumference}
              strokeDashoffset={miniStrokeOffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {timer.activeMode === 'flow' ? (
              <SprintIcon size={22} muted={!timer.isActive} />
            ) : (
              <Fingerprint
                size={20}
                className={timer.isActive ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'}
              />
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white leading-none tracking-tight">
            {timer.formattedTime}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5 truncate">
            <span className={timer.isActive ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
              {timer.isActive ? (timer.isBreak ? 'On break' : 'In session') : 'Paused'}
            </span>
            <span>•</span>
            <span>{Math.round(timer.progressRatio * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Direct Audio Status & Immediate Stop Button */}
      <div
        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 text-xs"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Volume2
            size={14}
            className={hasAudioPlaying ? 'text-sky-500 animate-pulse' : 'text-slate-500 dark:text-slate-400'}
          />
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
            {hasAudioPlaying ? `Sound: ${activeSoundscape}` : 'Sound: Off'}
          </span>
        </div>

        {hasAudioPlaying ? (
          <button
            onClick={onStopSoundscape}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 transition-all shadow-sm cursor-pointer"
            title="Immediately stop and silence audio"
          >
            <Square size={9} fill="currentColor" />
            <span>Stop Sound</span>
          </button>
        ) : (
          onToggleSoundscape && (
            <button
              onClick={() => onToggleSoundscape('gamma')}
              className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-200 cursor-pointer"
              title="Play 40Hz focus tone"
            >
              40Hz On
            </button>
          )
        )}
      </div>

      {/* Quick Actions Footer */}
      <div
        className="flex items-center gap-2 pt-0.5"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={timer.toggleTimer}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
            timer.isActive ? 'clay-tile-amber' : 'clay-tile-cyan'
          }`}
        >
          {timer.isActive ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
          <span>{timer.isActive ? 'Pause' : 'Resume'}</span>
        </button>

        <button
          onClick={timer.takeBreak}
          disabled={timer.isBreak}
          className="p-2 rounded-xl clay-button text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          title="Take 5-min break"
        >
          <Coffee size={14} />
        </button>

        <button
          onClick={timer.resetTimer}
          className="p-2 rounded-xl clay-button text-slate-600 dark:text-slate-300 cursor-pointer"
          title="End block"
          aria-label="End block"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </>
  );
}
