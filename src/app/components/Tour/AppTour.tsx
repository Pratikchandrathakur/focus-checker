import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Keyboard, 
  Compass, 
  Lightbulb, 
  ExternalLink,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TOUR_STEPS, KEYBOARD_SHORTCUTS, type TourStep } from './tourSteps';

export interface AppTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'dial' | 'check' | 'stress' | 'sound' | 'dashboard' | 'history';
  onNavigateTab: (tab: 'dial' | 'check' | 'stress' | 'sound' | 'dashboard' | 'history') => void;
  setMobileDialView?: (view: 'dial' | 'atmosphere') => void;
  initialStep?: number;
}

const BADGE_COLORS: Record<string, string> = {
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
};

const TAB_NAMES: Record<string, string> = {
  dial: 'Focus Dial',
  check: 'Readiness Check',
  stress: 'De-Stress Reset',
  sound: 'Soundscapes',
  dashboard: 'Analytics',
  history: 'Journal',
};

export function AppTour({
  isOpen,
  onClose,
  activeTab,
  onNavigateTab,
  setMobileDialView,
  initialStep = 0,
}: AppTourProps) {
  const [stepIndex, setStepIndex] = useState(initialStep);
  const [mode, setMode] = useState<'walkthrough' | 'shortcuts'>('walkthrough');
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Sync step changes when initialStep updates or tour opens
  useEffect(() => {
    if (isOpen) {
      setStepIndex(Math.max(0, Math.min(initialStep, TOUR_STEPS.length - 1)));
    }
  }, [isOpen, initialStep]);

  const step: TourStep = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const StepIcon = step.icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Change step with live tab navigation
  const goToStep = useCallback((idx: number) => {
    const target = Math.max(0, Math.min(idx, TOUR_STEPS.length - 1));
    setStepIndex(target);
    const targetStep = TOUR_STEPS[target];
    if (targetStep) {
      onNavigateTab(targetStep.tab);
      if (setMobileDialView && targetStep.mobileDialView) {
        setMobileDialView(targetStep.mobileDialView);
      }
    }
  }, [onNavigateTab, setMobileDialView]);

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      goToStep(stepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      goToStep(stepIndex - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('focus-checker-tour-seen', 'true');
      if (dontShowAgain) {
        localStorage.setItem('focus-checker-tour-dismissed', 'true');
      }
    } catch {
      // ignore
    }
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleComplete();
      } else if (mode === 'walkthrough') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (!isLast) goToStep(stepIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (!isFirst) goToStep(stepIndex - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, stepIndex, isFirst, isLast, goToStep]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-md transition-all"
        role="dialog"
        aria-modal="true"
        aria-label="FocusChecker App Tour"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="clay-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-white/80 dark:border-slate-700/80"
        >
          {/* Top Sticky Header */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl clay-tile-cyan flex items-center justify-center shadow-sm">
                <Compass className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">
                  FocusChecker Interactive Tour
                </h3>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {mode === 'walkthrough' ? `Step ${stepIndex + 1} of ${TOUR_STEPS.length}` : 'Quick Reference & Shortcuts'}
                </span>
              </div>
            </div>

            {/* Mode switch pills */}
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <button
                  onClick={() => setMode('walkthrough')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'walkthrough'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Guided Tour
                </button>
                <button
                  onClick={() => setMode('shortcuts')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    mode === 'shortcuts'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Keyboard size={12} />
                  <span>Shortcuts</span>
                </button>
              </div>

              <button
                onClick={handleComplete}
                className="w-8 h-8 rounded-xl clay-button flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                title="Close tour (Esc)"
                aria-label="Close tour"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {mode === 'walkthrough' ? (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="space-y-4"
              >
                  {/* Step Category Badge & Live View Indicator */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${BADGE_COLORS[step.badgeColor] ?? BADGE_COLORS.sky}`}>
                        {step.category}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {step.badge}
                      </span>
                    </div>

                    {/* Live Tab Sync Indicator */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Viewing live: {TAB_NAMES[step.tab]}</span>
                    </div>
                  </div>

                  {/* Step Headline & Icon */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl clay-card-subtle shrink-0 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                      <StepIcon className="size-6" />
                    </div>
                    <div>
                      <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                        {step.title}
                      </h4>
                      <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">
                        {step.headline}
                      </p>
                    </div>
                  </div>

                  {/* Main Description */}
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {step.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="clay-card-subtle p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{h.icon}</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {h.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                          {h.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Science Pro-Tip Card */}
                  <div className="clay-card-subtle p-3 sm:p-3.5 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/80 to-amber-100/30 dark:from-amber-950/20 dark:to-slate-900/40 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Lightbulb size={14} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
                        Cognitive Science Tip
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {step.proTip}
                      </p>
                    </div>
                  </div>
                </motion.div>
            ) : (
              /* Shortcuts & Quick Reference Mode */
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Keyboard Shortcuts Cheatsheet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Navigate and operate FocusChecker without touching the trackpad.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {KEYBOARD_SHORTCUTS.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl clay-card-subtle border border-slate-200/60 dark:border-slate-800/60"
                    >
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {s.description}
                      </span>
                      <kbd className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 shadow-xs border border-slate-300 dark:border-slate-600 shrink-0 ml-2">
                        {s.label}
                      </kbd>
                    </div>
                  ))}
                </div>

                {/* Quick Jump Links */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Direct Feature Jump
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TOUR_STEPS.slice(1).map((ts) => (
                      <button
                        key={ts.id}
                        onClick={() => {
                          onNavigateTab(ts.tab);
                          if (setMobileDialView && ts.mobileDialView) {
                            setMobileDialView(ts.mobileDialView);
                          }
                          handleComplete();
                        }}
                        className="px-3 py-2 rounded-xl text-left clay-card-subtle hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {ts.title}
                        </span>
                        <ExternalLink size={12} className="text-slate-400 group-hover:text-sky-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sticky Control Bar */}
          <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Step navigation dots & Dismiss checkbox */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              {mode === 'walkthrough' ? (
                <div className="flex items-center gap-1.5" role="tablist" aria-label="Tour steps">
                  {TOUR_STEPS.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => goToStep(idx)}
                      role="tab"
                      aria-selected={idx === stepIndex}
                      aria-label={`Go to step ${idx + 1}: ${s.title}`}
                      className={`h-2 rounded-full transition-all ${
                        idx === stepIndex
                          ? 'w-6 bg-sky-500 shadow-xs'
                          : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setMode('walkthrough')}
                  className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Guided Tour</span>
                </button>
              )}

              <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 text-xs"
                />
                <span>Don't show again</span>
              </label>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleComplete}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 clay-button transition-colors"
              >
                Try this screen
              </button>

              {mode === 'walkthrough' && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={isFirst}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 clay-button transition-colors ${
                      isFirst
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <ArrowLeft size={13} />
                    <span>Back</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold clay-tile-cyan text-white shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <span>{isLast ? 'Get Started' : 'Next Step'}</span>
                    <ArrowRight size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
