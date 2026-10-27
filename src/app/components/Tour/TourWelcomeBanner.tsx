import React from 'react';
import { Sparkles, Compass, X, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface TourWelcomeBannerProps {
  onStartTour: () => void;
  onDismiss: () => void;
}

export function TourWelcomeBanner({ onStartTour, onDismiss }: TourWelcomeBannerProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      className="clay-card p-4 sm:p-5 mb-5 border border-sky-200/50 dark:border-sky-800/40 bg-gradient-to-r from-sky-50/90 via-white/95 to-sky-50/80 dark:from-sky-950/40 dark:via-slate-900/90 dark:to-slate-900/95 shadow-md relative overflow-hidden"
      aria-label="Welcome tour"
    >
      {/* Decorative accent blur */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl clay-tile-cyan shrink-0 flex items-center justify-center shadow-sm">
            <Compass className="size-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300">
                Quick Guide
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                New to FocusChecker?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 max-w-xl">
              Take a 60-second interactive tour to master your tactile dial, autonomic breathing resets, and binaural soundscapes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0 w-full sm:w-auto">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 clay-button transition-colors"
          >
            Explore alone
          </button>
          <button
            onClick={onStartTour}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold clay-tile-cyan text-white shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Sparkles size={14} />
            <span>Take Tour</span>
            <ArrowRight size={13} />
          </button>
          <button
            onClick={onDismiss}
            aria-label="Dismiss welcome banner"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
