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
  Compass
} from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onOpenQuickCheck: () => void;
  onOpenStressReset: () => void;
}

export function LandingPage({
  onEnterApp,
  onOpenAuth,
  onOpenQuickCheck,
  onOpenStressReset,
}: LandingPageProps) {
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
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 uppercase tracking-wider">
              Neuroscience Edition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Headline & Action */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-card-subtle text-xs font-semibold text-sky-600 dark:text-sky-400">
            <Sparkles size={14} />
            <span>AI-Slop Free • Rooted in Cognitive Neuroscience</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
            Restore Deep Focus. <br />
            <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              De-escalate Mental Stress.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
            Stop forcing attention when your nervous system is depleted. FocusChecker combines physiological state diagnostics, Huberman-style breathing resets, 40Hz binaural synthesis, and tactile flow tracking.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 justify-center lg:justify-start pt-2">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl clay-tile-cyan font-bold text-sm flex items-center justify-center gap-2.5 shadow-xl hover:scale-[1.02] transition-transform"
            >
              <Fingerprint size={20} />
              Launch Focus Suite (Demo)
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
              <span>Zero Emojis & Gimmicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              <span>100% Offline Audio Synthesis</span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Tactile Preview Card (matching the image) */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="clay-card p-6 w-full max-w-sm rounded-[32px] relative shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" /> Live Dial Preview
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px]">
                Optimal HRV
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
            Engineered For High Performers
          </span>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Built for Real Human Physiology
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            No shallow motivational quotes. FocusChecker addresses the neurological mechanisms that govern sustained attention and mental exhaustion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center text-white">
              <Wind size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Physiological Sigh Reset
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Two rapid nasal inhales followed by an extended oral exhalation pops lung alveoli and triggers the vagus nerve to slow heart rate in 60 seconds.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-amber flex items-center justify-center text-white">
              <Clock size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Ultradian Dial Timer
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Respects human 90-minute ultradian cognitive cycles with break intervals so you finish tasks without burning out your willpower.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-violet flex items-center justify-center text-white">
              <Headphones size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              40Hz Gamma Soundscapes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Pure mathematical audio synthesis of 40Hz binaural beats and acoustic pink noise to induce steady brainwave synchrony.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="clay-card p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl clay-tile-emerald flex items-center justify-center text-white">
              <TrendingUp size={22} />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Attention Span Profiling
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Detects precisely when your focus begins to drop and learns your personal chronotype, best working hours, and sleep threshold.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-slate-200/40 dark:border-slate-800/40 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          © 2026 FocusChecker. Designed for genuine focus and stress relief.
        </div>
        <div className="flex gap-4">
          <button onClick={onOpenQuickCheck} className="hover:text-sky-500">Quick Check</button>
          <button onClick={onOpenStressReset} className="hover:text-sky-500">De-Stress</button>
          <button onClick={onEnterApp} className="hover:text-sky-500">Focus Suite</button>
        </div>
      </footer>
    </div>
  );
}
