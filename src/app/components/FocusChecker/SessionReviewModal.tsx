import React, { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTimer } from '../../context/FocusTimerContext';

function Slider({
  label, value, onChange, accent, hint,
}: { label: string; value: number; onChange: (v: number) => void; accent: string; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-bold text-slate-900 dark:text-white">{value}/10</span>
      </div>
      <input
        type="range" min="1" max="10" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accent}`}
        aria-label={label}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

/** Rendered once at app level so a finished block is always captured, whatever tab is open. */
export function SessionReviewModal() {
  const { pendingReview, saveReview, dismissReview, taskName, setTaskName } = useFocusTimer();
  const [focusQuality, setFocusQuality] = useState(7);
  const [contentClarity, setContentClarity] = useState(7);
  const [frustrationLevel, setFrustrationLevel] = useState(3);
  const [attentionFaded, setAttentionFaded] = useState(false);
  const [fadeMinutes, setFadeMinutes] = useState(20);

  useEffect(() => {
    if (pendingReview) {
      setAttentionFaded(false);
      setFadeMinutes(Math.max(5, Math.round(pendingReview.actualMinutes * 0.6)));
    }
  }, [pendingReview]);

  return (
    <AnimatePresence>
      {pendingReview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="clay-card max-w-md w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 id="review-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {pendingReview.completed ? 'Block complete' : 'Block ended early'}
                </h4>
                <p className="text-xs text-slate-500">
                  {pendingReview.actualMinutes} min of focus. Rating each session is how your patterns emerge.
                </p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                <CheckCircle2 size={18} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block" htmlFor="task-name">
                What did you work on?
              </label>
              <input
                id="task-name"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                maxLength={80}
                className="w-full px-3 py-2 rounded-xl clay-card-subtle text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <Slider label="Focus quality" value={focusQuality} onChange={setFocusQuality} accent="accent-sky-500" />
            <Slider label="Clarity on the task" value={contentClarity} onChange={setContentClarity} accent="accent-indigo-500" />
            <Slider label="Frustration" value={frustrationLevel} onChange={setFrustrationLevel} accent="accent-rose-500" hint="1 = none, 10 = very frustrated" />

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
                    <span>Faded after about</span>
                    <span className="font-bold text-amber-600">{fadeMinutes} min</span>
                  </div>
                  <input
                    type="range" min="1" max={Math.max(1, pendingReview.actualMinutes)} value={fadeMinutes}
                    onChange={(e) => setFadeMinutes(Number(e.target.value))}
                    className="w-full accent-amber-500" aria-label="Minutes before attention faded"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={dismissReview} className="flex-1 py-2 rounded-xl text-xs font-semibold clay-button text-slate-600 dark:text-slate-400">
                Discard
              </button>
              <button
                onClick={() => saveReview({ focusQuality, contentClarity, frustrationLevel, attentionFaded, fadeMinutes })}
                className="flex-1 py-2 rounded-xl text-xs font-semibold clay-tile-cyan"
              >
                Save session
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
