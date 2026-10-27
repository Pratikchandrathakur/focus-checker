import React from 'react';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/instrument-sans';
import '../../../styles/landing.css';
import {
  Wind,
  Headphones,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Compass,
  Check,
  Lock,
  Plus,
  Moon,
  Sun,
  WifiOff,
} from 'lucide-react';
import { SITE, PRICING, FREE_FEATURES, PRO_FEATURES } from '../../config';
import { InstallAppButton } from '../InstallAppButton';
import { LogoMark, Wordmark } from '../Logo';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenQuickCheck: () => void;
  onOpenStressReset: () => void;
  onNavigate: (path: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  /** Set when Pro is purchasable: the Pro button opens the upgrade dialog instead of the waitlist. */
  onUpgrade?: () => void;
  darkMode?: boolean;
  onToggleDark?: () => void;
}

const FAQ = [
  {
    q: 'Is it really free?',
    a: 'Yes. The timer, breathing resets, readiness check-ins, focus sounds, analytics and journal are free, and you can use them without an account. Pro, a paid plan for people who use FocusChecker every day, adds unlimited synced history, longer analytics, personal patterns, custom sound mixes and a weekly email report.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Open the app and press start. Create a free account only if you want your journal saved to the cloud so you can open it on other devices.',
  },
  {
    q: 'Where is my data stored?',
    a: 'On your device, in your browser. If you sign in, your journal is also saved to your account so it can follow you between devices. You can export everything as JSON or CSV, or delete it, from the Journal at any time. There are no ads and no tracking.',
  },
  {
    q: 'Does it work offline? Can I install it?',
    a: 'Yes to both. After your first visit the app works without a connection, and all sound is generated in your browser. In Chrome, Edge or on Android, use the Install app button. On iPhone or iPad, tap Share, then Add to Home Screen.',
  },
  {
    q: 'Do I need headphones?',
    a: 'Only for the 40Hz and 10Hz binaural tones, which need stereo. Pink noise and rain work on any speaker.',
  },
  {
    q: 'Is this a medical or therapy app?',
    a: 'No. FocusChecker is a productivity tool. The breathing exercises are for general wellbeing and are not a treatment for any condition. Stop any exercise that makes you uncomfortable.',
  },
];

const STEPS = [
  { icon: Compass, color: 'var(--sky)', title: 'Check in', text: 'Rate how you feel and how you slept. Get a readiness score and a block length that fits.', path: '/app/readiness' },
  { icon: Wind, color: 'var(--mint)', title: 'Reset if needed', text: 'Stressed? A guided 2-minute breathing exercise, with a before-and-after rating.', path: '/app/breathe' },
  { icon: Clock, color: 'var(--amber)', title: 'Focus', text: 'Start the timer, add a sound, and take breaks that pause your progress.', path: '/app' },
  { icon: TrendingUp, color: 'var(--violet)', title: 'Learn', text: 'Rate each session in seconds. See your best time of day and ideal break length.', path: '/app/analytics' },
];

/** The four sides of box breathing, 4 seconds each. Matches the in-app pacer. */
const BREATH = [
  { label: 'Breathe in', k: 1 },
  { label: 'Hold', k: 1 },
  { label: 'Breathe out', k: 0.62 },
  { label: 'Hold empty', k: 0.62 },
];

function proCta() {
  if (PRICING.waitlistUrl) return PRICING.waitlistUrl;
  return `mailto:${SITE.supportEmail}?subject=${encodeURIComponent('FocusChecker Pro waitlist')}&body=${encodeURIComponent('Please let me know when Pro launches.')}`;
}

/** Live box-breathing pacer: the product's most characteristic moment, running on the page. */
function BreathOrb() {
  const [on, setOn] = React.useState(false);
  const [t, setT] = React.useState(0);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setOn(true));
    const id = window.setInterval(() => setT((v) => v + 1), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  const phase = BREATH[Math.floor(t / 4) % 4];
  const sec = 4 - (t % 4);
  const k = on ? phase.k : 0.62;

  return (
    <div
      className="lp-orb mx-auto"
      role="img"
      aria-label="A live box breathing pacer: breathe in for 4 seconds, hold for 4, breathe out for 4, hold for 4."
      style={{ ['--k' as string]: k }}
    >
      <div className="lp-orb-ticks" aria-hidden="true" />
      <div className="lp-orb-halo two" aria-hidden="true" />
      <div className="lp-orb-halo" aria-hidden="true" />
      <div className="lp-orb-core" aria-hidden="true" />
      <div className="lp-orb-label" aria-hidden="true">
        <span className="lp-display text-2xl sm:text-3xl">{phase.label}</span>
        <span className="text-base font-semibold tabular-nums mt-1 opacity-80">{sec}</span>
      </div>
    </div>
  );
}

function Waveform() {
  const bars = [22, 38, 30, 54, 42, 64, 48, 72, 40, 58, 34, 66, 52, 44, 70, 36, 56, 28, 46, 60, 32, 50, 24, 40];
  return (
    <div className="flex items-end gap-[3px] h-16" aria-hidden="true">
      {bars.map((h, i) => (
        <span key={i} className="flex-1 rounded-full" style={{ height: `${h}%`, background: 'var(--violet)', opacity: 0.35 + (h / 100) * 0.65 }} />
      ))}
    </div>
  );
}

function DayBars() {
  const bars = [30, 44, 70, 92, 100, 78, 42, 34, 54, 64, 48, 28];
  return (
    <div aria-hidden="true">
      <div className="flex items-end gap-1.5 h-20">
        {bars.map((h, i) => (
          <span key={i} className="flex-1 rounded-md" style={{ height: `${h}%`, background: i === 4 ? 'var(--amber)' : 'var(--line)' }} />
        ))}
      </div>
    </div>
  );
}

function MiniDial() {
  const r = 62;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0" aria-hidden="true">
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle cx="80" cy="80" r={r} fill="none" stroke="var(--amber)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 80 80)" />
      <text x="80" y="82" textAnchor="middle" className="lp-display" style={{ fontSize: 30, fill: 'var(--text)' }}>25:00</text>
      <text x="80" y="104" textAnchor="middle" style={{ fontSize: 12, fill: 'var(--muted)', fontWeight: 600 }}>Sprint</text>
    </svg>
  );
}

export function LandingPage({
  onEnterApp,
  onOpenQuickCheck,
  onOpenStressReset,
  onNavigate,
  onOpenAuth,
  onUpgrade,
  darkMode,
  onToggleDark,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [yearly, setYearly] = React.useState(true);
  void onOpenQuickCheck;
  void onOpenStressReset;

  /** Real <a href> for in-app navigation (middle-click, copy link and screen readers all work). */
  const link = (path: string) => ({
    href: path,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      onNavigate(path);
    },
  });

  const yearlySave = Math.round((1 - PRICING.proYearly / (PRICING.proMonthly * 12)) * 100);
  const shell = 'max-w-6xl mx-auto px-5 sm:px-8';
  const h2 = 'lp-display text-4xl sm:text-5xl leading-[1.02]';
  const cardBase = 'rounded-[28px] p-7 sm:p-8 flex flex-col gap-5 border';

  return (
    <div className="lp w-full min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-slate-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b" style={{ background: 'color-mix(in srgb, var(--ink) 94%, transparent)', borderColor: 'var(--on-ink-line)', color: 'var(--on-ink)' }}>
        <div className={`${shell} h-16 flex items-center justify-between gap-3`}>
          <a {...link('/')} className="flex items-center gap-2.5 shrink-0" aria-label="FocusChecker home">
            <LogoMark size={38} />
            <Wordmark className="text-xl" />
          </a>

          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Site">
            {[['#how', 'How it works'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className="hidden md:inline-block px-3 py-2 text-sm font-semibold rounded-lg" style={{ color: 'var(--on-ink-muted)' }}>
                {label}
              </a>
            ))}
            <span className="hidden lg:inline-flex">
              <InstallAppButton variant="pill" className="lp-btn lp-btn-ghost !min-h-10 !px-4 !text-sm" />
            </span>
            {onToggleDark && (
              <button
                onClick={onToggleDark}
                className="hidden sm:flex w-10 h-10 rounded-full items-center justify-center border"
                style={{ borderColor: 'var(--on-ink-line)', color: 'var(--on-ink)' }}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <button onClick={() => onOpenAuth('login')} className="lp-btn lp-btn-ghost !min-h-10 !px-4 !text-sm">
              Sign in
            </button>
            <button onClick={() => onOpenAuth('register')} className="lp-btn lp-btn-primary !min-h-10 !px-4 !text-sm">
              <span className="sm:hidden">Sign up</span>
              <span className="hidden sm:inline">Create account</span>
            </button>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section
          style={{
            background: 'radial-gradient(60rem 36rem at 78% 30%, rgba(76,195,255,.16), transparent 60%), var(--ink)',
            color: 'var(--on-ink)',
          }}
        >
          <div className={`${shell} pt-12 sm:pt-16 lg:pt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center`}>
            <div className="lg:col-span-7 space-y-8">
              <h1 className="lp-display text-[2.9rem] sm:text-7xl lg:text-[5.5rem] leading-[0.96] text-balance">
                Focus deeper. Reset faster when you're stressed.
              </h1>
              <p className="text-lg sm:text-xl leading-relaxed max-w-[34rem]" style={{ color: 'var(--on-ink-muted)' }}>
                Don't force focus when you're running on empty. Check how ready you are, take a 2-minute breathing reset when you need one, and learn from every session when you work best.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onEnterApp} className="lp-btn lp-btn-primary !min-h-14 !px-7 !text-lg">
                  Start focusing — it's free
                </button>
                <a {...link('/app/breathe')} className="lp-btn lp-btn-ghost !min-h-14 !px-7 !text-lg">
                  <Wind size={18} />
                  Try the 2-min breathing reset
                </a>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px] font-medium" style={{ color: 'var(--on-ink-muted)' }}>
                <li className="flex items-center gap-2"><CheckCircle2 size={16} style={{ color: 'var(--mint)' }} />No account needed</li>
                <li className="flex items-center gap-2"><ShieldCheck size={16} style={{ color: 'var(--mint)' }} />Private by default</li>
                <li className="flex items-center gap-2"><WifiOff size={16} style={{ color: 'var(--mint)' }} />Works offline</li>
              </ul>
            </div>

            <div className="lg:col-span-5">
              <BreathOrb />
            </div>
          </div>

          {/* Example readout: what a session looks like in the app */}
          <div className={`${shell} mt-14 sm:mt-20`}>
            <div className="border-t py-6 flex flex-col md:flex-row md:items-center gap-5 md:gap-10" style={{ borderColor: 'var(--on-ink-line)' }}>
              <p className="text-sm font-semibold md:w-40" style={{ color: 'var(--on-ink-muted)' }}>An example session</p>
              <dl className="flex-1 grid grid-cols-3 gap-4">
                {[
                  ['45:00', 'Deep work block'],
                  ['94%', 'Readiness score'],
                  ['48 min', 'Attention span'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <dt className="text-sm" style={{ color: 'var(--on-ink-muted)' }}>{l}</dt>
                    <dd className="lp-display text-2xl sm:text-4xl mt-1">{v}</dd>
                  </div>
                ))}
              </dl>
              <button onClick={onEnterApp} className="lp-btn lp-btn-ghost self-start md:self-auto">
                Try it yourself <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-h" className={`${shell} py-20 sm:py-28 scroll-mt-16`}>
          <div className="max-w-2xl mb-14">
            <h2 id="how-h" className={h2}>A simple loop that gets better with use</h2>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
              What you learn at the end of one session shapes how you start the next.
            </p>
          </div>
          <ol className="lp-rail grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-8">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative flex lg:block gap-5">
                  <span className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: s.color, color: '#05202c' }}>
                    <Icon size={20} />
                  </span>
                  <div className="lg:mt-6">
                    <h3 className="lp-display text-2xl">{s.title}</h3>
                    <p className="mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>{s.text}</p>
                    <a {...link(s.path)} className="mt-3 inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--sky-text)' }}>
                      Try it <ArrowRight size={15} />
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* What's inside */}
        <section aria-labelledby="inside-h" className="py-20 sm:py-28" style={{ background: 'var(--surface)', borderBlock: '1px solid var(--line)' }}>
          <div className={shell}>
            <div className="max-w-2xl mb-12">
              <h2 id="inside-h" className={h2}>Built around how attention actually works</h2>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
                No motivational quotes. A few simple tools that help you start, stay focused and recover, plus data that shows what's working.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Breathing */}
              <a {...link('/app/breathe')} className={`${cardBase} lg:col-span-7 group`} style={{ background: 'var(--ink)', color: 'var(--on-ink)', borderColor: 'transparent' }}>
                <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--mint)', color: '#05271a' }}><Wind size={20} /></span>
                <div>
                  <h3 className="lp-display text-3xl">2-minute breathing reset</h3>
                  <p className="mt-3 leading-relaxed max-w-xl" style={{ color: 'var(--on-ink-muted)' }}>
                    Guided physiological sighs and box breathing with a visual pacer. Rate your stress before and after to see what helps you.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-auto pt-2" aria-hidden="true">
                  {[['In', 4], ['Hold', 4], ['Out', 4], ['Hold', 4]].map(([l, n], i) => (
                    <div key={i}>
                      <div className="h-2 rounded-full" style={{ background: 'var(--mint)', opacity: i % 2 ? 0.4 : 1 }} />
                      <div className="mt-2 text-sm" style={{ color: 'var(--on-ink-muted)' }}>{l} {n}s</div>
                    </div>
                  ))}
                </div>
              </a>

              {/* Dial */}
              <a {...link('/app')} className={`${cardBase} lg:col-span-5 group`} style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
                <div className="flex items-start justify-between gap-4">
                  <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--amber)', color: '#2e1c00' }}><Clock size={20} /></span>
                  <MiniDial />
                </div>
                <div className="mt-auto">
                  <h3 className="lp-display text-3xl">Tactile focus dial</h3>
                  <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    Deep work and 25 · 5 sprint blocks from 15 to 90 minutes, breaks that pause your progress, and a floating timer that follows you across tabs.
                  </p>
                </div>
              </a>

              {/* Sounds */}
              <a {...link('/app/sounds')} className={`${cardBase} lg:col-span-5 group`} style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
                <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--violet)', color: '#150f40' }}><Headphones size={20} /></span>
                <Waveform />
                <div className="mt-auto">
                  <h3 className="lp-display text-3xl">Focus soundscapes</h3>
                  <p className="mt-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                    40Hz and 10Hz binaural tones, pink noise and rain, generated live in your browser. They work offline and never loop. The binaural tones need headphones.
                  </p>
                </div>
              </a>

              {/* Patterns */}
              <a {...link('/app/analytics')} className={`${cardBase} lg:col-span-7 group`} style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
                <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--sky)', color: '#04202f' }}><TrendingUp size={20} /></span>
                <div>
                  <DayBars />
                  <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Example: attention by hour of the day, best hour highlighted</p>
                </div>
                <div className="mt-auto">
                  <h3 className="lp-display text-3xl">Your attention patterns</h3>
                  <p className="mt-3 leading-relaxed max-w-xl" style={{ color: 'var(--muted)' }}>
                    Rate each session in seconds. FocusChecker shows your average attention span, best time of day and a break interval that suits you.
                  </p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" aria-labelledby="pricing-h" className={`${shell} py-20 sm:py-28 scroll-mt-16`}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <h2 id="pricing-h" className={`${h2} max-w-xl`}>Free to use. Upgrade when you want more.</h2>
            <div className="inline-flex self-start md:self-auto p-1 rounded-full border text-sm font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }} role="group" aria-label="Billing period">
              <button onClick={() => setYearly(false)} aria-pressed={!yearly} className="px-5 py-2.5 rounded-full" style={!yearly ? { background: 'var(--ink)', color: 'var(--on-ink)' } : { color: 'var(--muted)' }}>
                Monthly
              </button>
              <button onClick={() => setYearly(true)} aria-pressed={yearly} className="px-5 py-2.5 rounded-full" style={yearly ? { background: 'var(--ink)', color: 'var(--on-ink)' } : { color: 'var(--muted)' }}>
                Yearly −{yearlySave}%
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className={cardBase} style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
              <div>
                <h3 className="lp-display text-2xl">Free</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="lp-display text-6xl">{PRICING.currency}0</span>
                  <span style={{ color: 'var(--muted)' }}>forever</span>
                </div>
                <p className="mt-2" style={{ color: 'var(--muted)' }}>Everything you need to focus every day.</p>
              </div>
              <ul className="space-y-3 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex gap-3"><Check size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--sky-text)' }} />{f}</li>
                ))}
              </ul>
              <button onClick={onEnterApp} className="lp-btn lp-btn-line w-full">Start free</button>
            </div>

            <div className={`${cardBase} relative`} style={{ background: 'var(--ink)', color: 'var(--on-ink)', borderColor: 'transparent' }}>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="lp-display text-2xl">Pro</h3>
                  <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--sky)', color: '#04202f' }}>
                    {PRICING.proAvailable ? 'Most popular' : 'Coming soon'}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="lp-display text-6xl">
                    {PRICING.currency}{yearly ? (PRICING.proYearly / 12).toFixed(PRICING.proYearly % 12 ? 2 : 0) : PRICING.proMonthly}
                  </span>
                  <span style={{ color: 'var(--on-ink-muted)' }}>/ month</span>
                </div>
                <p className="mt-2" style={{ color: 'var(--on-ink-muted)' }}>
                  {yearly ? `Billed ${PRICING.currency}${PRICING.proYearly} yearly.` : 'Billed monthly. Cancel anytime.'}
                </p>
              </div>
              <ul className="space-y-3 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex gap-3"><Check size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--mint)' }} />{f}</li>
                ))}
              </ul>
              <div className="space-y-3">
                {PRICING.proAvailable && onUpgrade ? (
                  <button type="button" onClick={onUpgrade} className="lp-btn lp-btn-primary w-full">Upgrade to Pro</button>
                ) : (
                  <a href={proCta()} target={PRICING.waitlistUrl ? '_blank' : undefined} rel="noopener noreferrer" className="lp-btn lp-btn-primary w-full">
                    {PRICING.proAvailable ? 'Upgrade to Pro' : <><Lock size={15} /> Join the Pro waitlist</>}
                  </a>
                )}
                {!PRICING.proAvailable && (
                  <p className="text-sm text-center" style={{ color: 'var(--on-ink-muted)' }}>Pro isn't live yet. The waitlist is free, with no payment details.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-h" className="scroll-mt-16" style={{ borderTop: '1px solid var(--line)' }}>
          <div className={`${shell} py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-12 gap-10`}>
            <div className="lg:col-span-4">
              <h2 id="faq-h" className={`${h2} lg:sticky lg:top-28`}>Questions</h2>
            </div>
            <div className="lg:col-span-8 border-t" style={{ borderColor: 'var(--line)' }}>
              {FAQ.map((item, i) => {
                const open = openFaq === i;
                return (
                  <div key={item.q} className="border-b" style={{ borderColor: 'var(--line)' }}>
                    <h3>
                      <button
                        onClick={() => setOpenFaq(open ? null : i)}
                        className="w-full py-6 flex items-center justify-between gap-4 text-left lp-display text-xl sm:text-2xl"
                        style={{ fontWeight: 600 }}
                        aria-expanded={open}
                        aria-controls={`faq-panel-${i}`}
                        id={`faq-btn-${i}`}
                      >
                        {item.q}
                        <Plus size={22} className="shrink-0 transition-transform" style={{ transform: open ? 'rotate(45deg)' : 'none', color: 'var(--sky-text)' }} />
                      </button>
                    </h3>
                    {open && (
                      <p id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`} className="pb-7 text-lg leading-relaxed max-w-2xl" style={{ color: 'var(--muted)' }}>
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden" style={{ background: 'var(--ink)', color: 'var(--on-ink)' }}>
          <div className="lp-ring-deco absolute -right-24 sm:right-0 top-1/2 -translate-y-1/2 w-[26rem] sm:w-[34rem] aspect-square opacity-70" aria-hidden="true" />
          <div className={`${shell} relative py-24 sm:py-32`}>
            <h2 className="lp-display text-5xl sm:text-7xl leading-[0.98] max-w-2xl text-balance">Your next focused hour starts here.</h2>
            <p className="mt-5 text-xl" style={{ color: 'var(--on-ink-muted)' }}>No account needed. Open it and press start.</p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
              <button onClick={onEnterApp} className="lp-btn lp-btn-primary !min-h-14 !px-8 !text-lg">
                Open FocusChecker <ArrowRight size={18} />
              </button>
              <InstallAppButton variant="pill" className="lp-btn lp-btn-ghost !min-h-14 !px-7 !text-base" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--ink)', color: 'var(--on-ink)', borderTop: '1px solid var(--on-ink-line)' }}>
        <div className={`${shell} py-14 grid grid-cols-2 md:grid-cols-4 gap-10 text-[15px]`}>
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <LogoMark size={40} />
              <Wordmark className="text-2xl" />
            </div>
            <p className="max-w-xs leading-relaxed" style={{ color: 'var(--on-ink-muted)' }}>
              Focus timer, 2-minute breathing resets and attention insights. Private, free and works offline.
            </p>
          </div>
          <nav aria-label="Product">
            <h2 className="font-bold mb-4">Product</h2>
            <ul className="space-y-2.5" style={{ color: 'var(--on-ink-muted)' }}>
              <li><a {...link('/app')} className="hover:text-white">Focus timer</a></li>
              <li><a {...link('/app/readiness')} className="hover:text-white">Readiness check</a></li>
              <li><a {...link('/app/breathe')} className="hover:text-white">Breathing reset</a></li>
              <li><a {...link('/app/sounds')} className="hover:text-white">Focus sounds</a></li>
              <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h2 className="font-bold mb-4">Company</h2>
            <ul className="space-y-2.5" style={{ color: 'var(--on-ink-muted)' }}>
              <li><a {...link('/privacy')} className="hover:text-white">Privacy</a></li>
              <li><a {...link('/terms')} className="hover:text-white">Terms</a></li>
              <li><a href={`mailto:${SITE.supportEmail}`} className="hover:text-white">Contact</a></li>
            </ul>
          </nav>
        </div>
        <div className="border-t" style={{ borderColor: 'var(--on-ink-line)' }}>
          <div className={`${shell} py-6 flex flex-col md:flex-row md:items-start justify-between gap-4 text-sm`} style={{ color: 'var(--on-ink-muted)' }}>
            <div className="flex items-center gap-5">
              <p>© {new Date().getFullYear()} {SITE.name}</p>
              {onToggleDark && (
                <button onClick={onToggleDark} className="inline-flex items-center gap-1.5 font-semibold hover:text-white">
                  {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                  {darkMode ? 'Light mode' : 'Dark mode'}
                </button>
              )}
            </div>
            <p className="md:max-w-xl md:text-right leading-relaxed">
              {SITE.name} is a productivity tool, not a medical device. It does not diagnose or treat any condition. Stop any breathing exercise that makes you uncomfortable.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
