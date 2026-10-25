import React from 'react';
import { 
  Zap, 
  Wind, 
  Headphones, 
  Activity, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Fingerprint, 
  CheckCircle2, 
  Brain, 
  Clock, 
  TrendingUp,
  Moon,
  Compass,
  Check,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { SITE, PRICING, FREE_FEATURES, PRO_FEATURES } from '../../config';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenQuickCheck: () => void;
  onOpenStressReset: () => void;
  onNavigate: (path: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
}

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. The timer, breathing resets, readiness check-ins, soundscapes and 7-day analytics are free with no account. Pro adds sync and deeper insights for people who use it every day.',
  },
  {
    q: 'Where is my data stored?',
    a: 'In your browser, on your device. Nothing is uploaded. You can export it as JSON or CSV, or delete it, from the Journal at any time.',
  },
  {
    q: 'Do I need headphones?',
    a: 'Only for the 40Hz and 10Hz binaural tones, which need stereo. Pink noise and rain work on any speaker.',
  },
  {
    q: 'Is this a medical or therapy app?',
    a: 'No. FocusChecker is a productivity tool. The breathing exercises are for general wellbeing and are not a treatment for any condition.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. Once loaded, the app works without a connection. All sound is generated in your browser, so there are no audio files to download. You can also install it to your home screen or desktop.',
  },
];

function proCta() {
  if (PRICING.waitlistUrl) return PRICING.waitlistUrl;
  return `mailto:${SITE.supportEmail}?subject=${encodeURIComponent('FocusChecker Pro waitlist')}&body=${encodeURIComponent('Please let me know when Pro launches.')}`;
}

export function LandingPage({
  onEnterApp,
  onOpenQuickCheck,
  onOpenStressReset,
  onNavigate,
  onOpenAuth,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [yearly, setYearly] = React.useState(true);
  return (
    <div className="w-full min-h-screen clay-canvas text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl clay-tile-cyan flex items-center justify-center shadow-md">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
              Focus<span className="text-sky-500">Checker</span>
            </span>

          </div>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href="#pricing"
            className="hidden sm:inline-block px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="hidden sm:inline-block px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-sky-600"
          >
            FAQ
          </a>
          <button
            onClick={() => onOpenAuth('login')}
            className="px-4 py-2 rounded-xl text-xs font-semibold clay-button text-slate-700 dark:text-slate-300"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-4 py-2 rounded-xl text-xs font-semibold clay-tile-cyan"
          >
            Create Account
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Headline & Action */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-card-subtle text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Sparkles size={14} />
            <span>Free • No sign-up • Works offline</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            Focus deeper. <br />
            <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Reset faster when you're stressed.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            Don't force focus when you're running on empty. FocusChecker checks how ready you are, guides a 2-minute breathing reset when you need one, plays focus sounds, and learns from every session when you work best.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-center lg:justify-start pt-2">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl clay-tile-cyan font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl hover:scale-[1.02] transition-transform"
            >
              <Fingerprint size={20} />
              Start focusing — it's free
            </button>

            <button
              onClick={onOpenStressReset}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl clay-tile-emerald font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform"
            >
              <Wind size={18} />
              Try 2-Min Stress Reset
            </button>
          </div>

          {/* Micro trust indicators */}
          <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>Private: data stays on your device</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>No ads, no account needed</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Tactile Preview Card (matching the image) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="clay-card p-6 w-full max-w-sm rounded-[32px] relative shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> App preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px]">
                Example
              </span>
            </div>

            {/* Mini Dial Display */}
            <div className="w-48 h-48 rounded-full clay-dial-rim mx-auto flex flex-col items-center justify-center shadow-lg my-2">
              <span className="text-[10px] font-bold uppercase text-slate-400">Target Time</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono mt-0.5">
                45:00
              </div>
              <span className="text-[11px] text-sky-500 font-semibold mt-1">Deep Work Block</span>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="clay-card-subtle p-3">
                <div className="text-[10px] text-slate-400">Readiness Score</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">94%</div>
              </div>
              <div className="clay-card-subtle p-3">
                <div className="text-[10px] text-slate-400">Attention Span</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">48 min</div>
              </div>
            </div>

            {/* Tactile Button */}
            <button
              onClick={onEnterApp}
              className="w-full py-3 rounded-2xl clay-tile-cyan font-bold text-xs flex items-center justify-center gap-2"
            >
              Enter Focus Experience <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-500">
            What's inside
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Built around how attention actually works
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            No motivational quotes. Just a few simple tools that help you start, stay focused and recover — and data that shows you what's working.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center text-white">
              <Wind size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              2-Minute Breathing Reset
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Guided physiological sighs and box breathing with a visual pacer. Rate your stress before and after to see what helps you.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-amber flex items-center justify-center text-white">
              <Clock size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Tactile Focus Dial
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Deep work and 25 · 5 sprint blocks from 15 to 90 minutes, breaks that pause your progress, and a floating timer that follows you across tabs.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-violet flex items-center justify-center text-white">
              <Headphones size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Focus Soundscapes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              40Hz and 10Hz binaural tones, pink noise and rain — generated live in your browser, so they work offline and never loop.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-emerald flex items-center justify-center text-white">
              <TrendingUp size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Your Attention Patterns
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Rate each session in seconds. FocusChecker shows your average attention span, best time of day and a break interval that suits you.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-16 border-t border-slate-200/60 dark:border-slate-800/60 scroll-mt-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-500">Pricing</span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">Free to use. Pro when you're hooked.</h2>
          <div className="inline-flex mt-5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl text-xs font-semibold">
            <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-xl ${!yearly ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-xl ${yearly ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
              Yearly <span className="text-emerald-600 dark:text-emerald-400">−{Math.round((1 - PRICING.proYearly / (PRICING.proMonthly * 12)) * 100)}%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="clay-card p-7 space-y-5 flex flex-col">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{PRICING.currency}0</span>
                <span className="text-sm text-slate-500">forever</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Everything you need to focus every day.</p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5"><Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
            <button onClick={onEnterApp} className="w-full py-3 rounded-2xl clay-button font-bold text-sm text-slate-800 dark:text-slate-100">
              Start free
            </button>
          </div>

          <div className="clay-card p-7 space-y-5 flex flex-col ring-2 ring-sky-500/70 relative">
            <span className="absolute -top-3 left-7 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full clay-tile-cyan">
              {PRICING.proAvailable ? 'Most popular' : 'Coming soon'}
            </span>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {PRICING.currency}{yearly ? (PRICING.proYearly / 12).toFixed(PRICING.proYearly % 12 ? 2 : 0) : PRICING.proMonthly}
                </span>
                <span className="text-sm text-slate-500">/ month</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {yearly ? `Billed ${PRICING.currency}${PRICING.proYearly} yearly.` : 'Billed monthly. Cancel anytime.'}
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex gap-2.5"><Check size={16} className="text-sky-500 shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
            <a
              href={proCta()}
              target={PRICING.waitlistUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl clay-tile-cyan font-bold text-sm text-center flex items-center justify-center gap-2"
            >
              {PRICING.proAvailable ? 'Upgrade to Pro' : <><Lock size={15} /> Join the Pro waitlist</>}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-16 border-t border-slate-200/60 dark:border-slate-800/60 scroll-mt-6">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-8">Questions</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={item.q} className="clay-card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full px-5 py-4 flex items-center justify-between text-left text-sm font-semibold text-slate-900 dark:text-white"
                aria-expanded={openFaq === i}
              >
                {item.q}
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && <p className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="clay-card p-8 md:p-10 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Your next focused hour starts here.</h2>
          <p className="text-sm text-slate-500">No account, no download. Open it and press start.</p>
          <button onClick={onEnterApp} className="px-8 py-3.5 rounded-2xl clay-tile-cyan font-bold text-sm inline-flex items-center gap-2 shadow-xl">
            Open FocusChecker <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/40 dark:border-slate-800/40 space-y-4 text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} {SITE.name}</div>
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            <button onClick={onEnterApp} className="hover:text-sky-500">App</button>
            <button onClick={onOpenQuickCheck} className="hover:text-sky-500">Readiness check</button>
            <button onClick={onOpenStressReset} className="hover:text-sky-500">Breathing reset</button>
            <button onClick={() => onNavigate('/privacy')} className="hover:text-sky-500">Privacy</button>
            <button onClick={() => onNavigate('/terms')} className="hover:text-sky-500">Terms</button>
            <a href={`mailto:${SITE.supportEmail}`} className="hover:text-sky-500">Contact</a>
          </nav>
        </div>
        <p className="text-[11px] text-slate-400 text-center sm:text-left max-w-3xl">
          {SITE.name} is a productivity tool, not a medical device. It does not diagnose or treat any condition.
          Stop any breathing exercise that makes you uncomfortable.
        </p>
      </footer>
    </div>
  );
}
