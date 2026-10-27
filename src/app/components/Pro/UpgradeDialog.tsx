import React, { useState } from 'react';
import { Check, Crown, ExternalLink, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { CHECKOUT, PRICING, PRO_FEATURES, SITE } from '../../config';
import { buildCheckoutUrl } from '../../services/checkout';
import { useEntitlement } from '../../context/EntitlementContext';
import type { UserProfile } from '../../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  /** Cloud sign-in or registration (guests and signed-out visitors need an account to buy Pro). */
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const isHttps = (u: string) => { try { return new URL(u).protocol === 'https:'; } catch { return false; } };
const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');

export function UpgradeDialog({ open, onOpenChange, user, onOpenAuth }: Props) {
  const { ent, refresh } = useEntitlement();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const hasAccount = Boolean(user && user.id !== 'guest');
  const save = Math.round((1 - PRICING.proYearly / (PRICING.proMonthly * 12)) * 100);

  const checkout = hasAccount && user ? buildCheckoutUrl(plan, { id: user.id, email: user.email ?? '' }, CHECKOUT) : null;
  const waitlist = PRICING.waitlistUrl && isHttps(PRICING.waitlistUrl)
    ? PRICING.waitlistUrl
    : `mailto:${SITE.supportEmail}?subject=${encodeURIComponent('FocusChecker Pro waitlist')}`;
  const portal = CHECKOUT.billingPortalUrl && isHttps(CHECKOUT.billingPortalUrl) ? CHECKOUT.billingPortalUrl : '';

  const recheck = async () => {
    setChecking(true); setNote('');
    const next = await refresh();
    setChecking(false);
    setNote(next.pro ? 'Pro is active. Thank you!' : 'Not active yet. Payments can take a minute to arrive; try again shortly.');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown size={18} className="text-amber-500" aria-hidden /> {ent.pro ? 'You have Pro' : 'FocusChecker Pro'}</DialogTitle>
          <DialogDescription>
            {ent.pro
              ? `${ent.plan ? ent.plan[0].toUpperCase() + ent.plan.slice(1) + ' plan. ' : ''}${ent.cancelAtPeriodEnd ? 'Ends' : 'Renews or ends'} ${fmtDate(ent.periodEnd) || 'at the end of the period'}.`
              : 'For people who use FocusChecker every day.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex gap-2"><Check size={15} className="text-emerald-500 mt-0.5 shrink-0" aria-hidden />{f}</li>
          ))}
        </ul>

        {ent.pro ? (
          <div className="space-y-2">
            {portal && (
              <a href={portal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl clay-button text-sm font-semibold text-sky-600">
                Manage billing <ExternalLink size={14} aria-hidden />
              </a>
            )}
            <a href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent('[Pro priority] ')}`} className="block text-sm text-sky-600 underline">Contact priority support</a>
          </div>
        ) : !PRICING.proAvailable ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Pro isn't open for purchase yet. The waitlist is free and asks for no payment details.</p>
            <a href={waitlist} target="_blank" rel="noopener noreferrer" className="inline-flex px-4 py-2 rounded-xl clay-tile-cyan text-sm font-bold">Join the Pro waitlist</a>
          </div>
        ) : (
          <div className="space-y-3">
            <div role="radiogroup" aria-label="Billing period" className="grid grid-cols-2 gap-2">
              {(['monthly', 'yearly'] as const).map((p) => (
                <button key={p} type="button" role="radio" aria-checked={plan === p} onClick={() => setPlan(p)}
                  className={`p-2.5 rounded-xl text-left border text-sm ${plan === p ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                  <span className="block font-bold capitalize">{p}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-400">
                    {p === 'monthly' ? `${PRICING.currency}${PRICING.proMonthly}/month` : `${PRICING.currency}${PRICING.proYearly}/year · save ${save}%`}
                  </span>
                </button>
              ))}
            </div>
            {!hasAccount ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">Pro belongs to an account so it follows you across devices. Create one first (your existing local data is kept).</p>
                <button type="button" onClick={() => { onOpenChange(false); onOpenAuth('register'); }} className="px-4 py-2 rounded-xl clay-tile-cyan text-sm font-bold">Create a free account</button>
              </div>
            ) : checkout ? (
              <a href={checkout} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl clay-tile-cyan text-sm font-bold">
                Continue to secure checkout <ExternalLink size={14} aria-hidden />
              </a>
            ) : (
              <p role="alert" className="text-sm text-red-600">Checkout is unavailable right now. Please try again later.</p>
            )}
            {hasAccount && (
              <div className="pt-1">
                <button type="button" onClick={recheck} disabled={checking} className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 underline disabled:opacity-60">
                  {checking && <Loader2 size={12} className="animate-spin" aria-hidden />} I've paid — check again
                </button>
                {note && <p role="status" className="text-xs text-slate-600 dark:text-slate-400 mt-1">{note}</p>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
