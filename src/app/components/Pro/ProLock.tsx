import React from 'react';
import { Lock } from 'lucide-react';

/** A small, honest teaser: says what Pro adds and opens the upgrade dialog. Never shows fake numbers. */
export function ProLock({ title, body, onUpgrade, cta = 'See Pro' }: { title: string; body: string; onUpgrade: () => void; cta?: string }) {
  return (
    <div className="clay-card-subtle rounded-2xl p-3.5 flex items-start gap-3" data-testid="pro-lock">
      <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0"><Lock size={16} aria-hidden /></div>
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{title} <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Pro</span></h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{body}</p>
        <button type="button" onClick={onUpgrade} className="mt-1 px-3 py-1.5 rounded-xl clay-button text-xs font-semibold text-sky-600 dark:text-sky-400">{cta}</button>
      </div>
    </div>
  );
}
