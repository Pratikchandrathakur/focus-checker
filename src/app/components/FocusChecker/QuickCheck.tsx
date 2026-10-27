import React, { useState } from 'react';
import {
  Target,
  Zap,
  Brain,
  ShieldCheck,
  Heart,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Lightbulb,
  Moon,
  Wind,
  Compass,
} from 'lucide-react';
import { ReadinessCheck, EmotionalState, DayFlow } from '../../types';
import { RangeInput } from '../ui/RangeInput';

/** A suggested next block, derived from the check. Applied to the timer when the user saves. */
export interface BlockSuggestion {
  mode: 'deep' | 'flow';
  minutes: number;
  label: string;
}

interface QuickCheckProps {
  /** `goBreathe` = user chose to do a breathing reset next. The check is always saved first. */
  onComplete: (check: ReadinessCheck, suggestion: BlockSuggestion, goBreathe: boolean) => void;
  onOpenStressReset?: () => void;
}

const EMOTIONAL_STATES: { value: EmotionalState; label: string; sub: string }[] = [
  { value: 'calm', label: 'Calm', sub: 'Relaxed and steady' },
  { value: 'focused', label: 'Focused', sub: 'Ready to concentrate' },
  { value: 'energized', label: 'Energized', sub: 'Plenty of energy' },
  { value: 'neutral', label: 'Neutral', sub: 'Neither up nor down' },
  { value: 'scattered', label: 'Scattered', sub: 'Mind is all over' },
  { value: 'fatigued', label: 'Tired', sub: 'Low on energy' },
  { value: 'overwhelmed', label: 'Overwhelmed', sub: 'Too much at once' },
  { value: 'anxious', label: 'Anxious', sub: 'Tense or on edge' },
  { value: 'frustrated', label: 'Frustrated', sub: 'Stuck or irritated' },
];

const DAY_FLOWS: { value: DayFlow; label: string; sub: string }[] = [
  { value: 'productive', label: 'Productive', sub: 'Got a lot done' },
  { value: 'steady', label: 'Steady', sub: 'Normal pace' },
  { value: 'relaxed', label: 'Relaxed', sub: 'Low pressure' },
  { value: 'demanding', label: 'Demanding', sub: 'Lots of mental effort' },
  { value: 'chaotic', label: 'Chaotic', sub: 'Many interruptions' },
  { value: 'sluggish', label: 'Sluggish', sub: 'Slow, low momentum' },
];

const STRESSED: EmotionalState[] = ['anxious', 'overwhelmed', 'frustrated'];

/** Maps readiness to a block length. Low readiness → shorter blocks (25-minute sprint), as promised on the landing page. */
function suggestBlock(score: number, emotionalState: EmotionalState, sleepHours: number): BlockSuggestion {
  if (STRESSED.includes(emotionalState) || sleepHours < 5.5 || score < 60) {
    return { mode: 'flow', minutes: 25, label: '25-minute sprint' };
  }
  if (score >= 80) return { mode: 'deep', minutes: 60, label: '60-minute deep work block' };
  return { mode: 'deep', minutes: 45, label: '45-minute deep work block' };
}

function generateRecommendation(
  score: number,
  emotionalState: EmotionalState,
  sleepHours: number
): { text: string; actionType: 'work' | 'sigh' | 'setup' } {
  if (STRESSED.includes(emotionalState)) {
    return {
      text: "You're feeling stressed, and deep work tends to feel harder like this. Try a 2-minute breathing reset first (two inhales, one long exhale), then start a shorter block.",
      actionType: 'sigh',
    };
  }
  if (sleepHours < 5.5) {
    return {
      text: 'You slept less than usual. A shorter 25-minute sprint with regular breaks is usually easier on a short night. Save the hardest thinking for when you feel sharpest.',
      actionType: 'setup',
    };
  }
  if (score >= 80) {
    return { text: "You're feeling sharp. Use it on your hardest, most important task first.", actionType: 'work' };
  }
  if (score >= 60) {
    return {
      text: 'Solid readiness. Close unused tabs, put your phone out of reach, and start a focused block on one task.',
      actionType: 'work',
    };
  }
  return {
    text: 'Your energy is on the low side today. Start with a 25-minute sprint on something light, or take a short walk first, before tackling demanding work.',
    actionType: 'setup',
  };
}

const SLIDER_FIELDS = [
  { key: 'concentration' as const, label: 'Focus', desc: 'How easily you can stay on one thing', icon: Target },
  { key: 'energy' as const, label: 'Energy', desc: 'How awake and energised you feel', icon: Zap },
  { key: 'clarity' as const, label: 'Clear head', desc: 'Free of fog and racing thoughts', icon: Brain },
  { key: 'distractionResistance' as const, label: 'Resisting distractions', desc: 'Not pulled away by phone or other tasks', icon: ShieldCheck },
  { key: 'comfort' as const, label: 'Physical comfort', desc: 'Posture, hunger, aches, temperature', icon: Heart },
];

function Progress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step} aria-label={`Step ${step} of 2`}>
      {[1, 2].map((n) => (
        <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
      ))}
    </div>
  );
}

export function QuickCheck({ onComplete, onOpenStressReset }: QuickCheckProps) {
  const [step, setStep] = useState<'context' | 'sliders' | 'result'>('context');
  // No pre-selected answers: a score built from untouched defaults would be fake data.
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null);
  const [dayFlow, setDayFlow] = useState<DayFlow | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  // Mid-point defaults, so an untouched slider reads as "average", not "great".
  const [answers, setAnswers] = useState({
    concentration: 5,
    energy: 5,
    clarity: 5,
    motivation: 5,
    distractionResistance: 5,
    comfort: 5,
  });
  const [result, setResult] = useState<{
    score: number;
    recommendation: { text: string; actionType: 'work' | 'sigh' | 'setup' };
    suggestion: BlockSuggestion;
  } | null>(null);

  const calculateScore = () => {
    const values = Object.values(answers);
    return Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 10)) * 100);
  };
  const currentScore = calculateScore();
  const canContinue = emotionalState !== null && dayFlow !== null;

  const handleSlidersSubmit = () => {
    if (!emotionalState) return;
    const score = calculateScore();
    setResult({
      score,
      recommendation: generateRecommendation(score, emotionalState, sleepHours),
      suggestion: suggestBlock(score, emotionalState, sleepHours),
    });
    setStep('result');
  };

  const save = (goBreathe: boolean) => {
    if (!result || !emotionalState || !dayFlow) return;
    const check: ReadinessCheck = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'Check',
      ...answers,
      emotionalState,
      dayFlow,
      sleepHours,
      note: `Feeling ${emotionalState} · day ${dayFlow}`,
      score: result.score,
      recommendation: result.recommendation.text,
    };
    onComplete(check, result.suggestion, goBreathe);
  };

  // ── Step 1: how are you feeling ──
  if (step === 'context') {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="clay-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Compass size={18} />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Quick readiness check</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Step 1 of 2 · How are you feeling? About 30 seconds.</p>
            </div>
          </div>
          <Progress step={1} />

          <div className="space-y-2" role="group" aria-labelledby="qc-feel">
            <div id="qc-feel" className="text-xs font-bold text-slate-600 dark:text-slate-300">How do you feel right now?</div>
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONAL_STATES.map((es) => (
                <button
                  key={es.value}
                  onClick={() => setEmotionalState(es.value)}
                  aria-pressed={emotionalState === es.value}
                  className={`p-2 sm:p-2.5 rounded-xl text-left transition-all border min-h-[56px] ${
                    emotionalState === es.value ? 'clay-tile-cyan' : 'clay-button text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs leading-tight">{es.label}</div>
                  <div className={`text-[11px] leading-snug mt-0.5 ${emotionalState === es.value ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                    {es.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2" role="group" aria-labelledby="qc-day">
            <div id="qc-day" className="text-xs font-bold text-slate-600 dark:text-slate-300">How has your day gone so far?</div>
            <div className="grid grid-cols-3 gap-2">
              {DAY_FLOWS.map((df) => (
                <button
                  key={df.value}
                  onClick={() => setDayFlow(df.value)}
                  aria-pressed={dayFlow === df.value}
                  className={`p-2 sm:p-2.5 rounded-xl text-left transition-all border min-h-[56px] ${
                    dayFlow === df.value ? 'clay-tile-amber' : 'clay-button text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs leading-tight">{df.label}</div>
                  <div className={`text-[11px] leading-snug mt-0.5 ${dayFlow === df.value ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>
                    {df.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="clay-card-subtle p-3 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="qc-sleep" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Moon size={14} className="text-indigo-500" /> Sleep last night
              </label>
              <span className="text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                {sleepHours} h
              </span>
            </div>
            <RangeInput
              id="qc-sleep"
              accent="indigo"
              min={3}
              max={12}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
            />
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>3 h</span>
              <span>7–8.5 h is typical</span>
              <span>12 h</span>
            </div>
          </div>

          <div>
            <button
              onClick={() => setStep('sliders')}
              disabled={!canContinue}
              className="w-full py-3 rounded-xl clay-tile-cyan font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight size={16} />
            </button>
            {!canContinue && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1.5">Pick one answer in each group to continue.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: rate each area ──
  if (step === 'sliders') {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="clay-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Target size={18} />
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Rate each area</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Step 2 of 2 · 1 is low, 10 is high.</p>
              </div>
            </div>
            <div className="text-right" aria-live="polite">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Score so far</div>
              <div className={`text-xl font-extrabold font-mono ${currentScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {currentScore}%
              </div>
            </div>
          </div>
          <Progress step={2} />

          <div className="space-y-2.5">
            {SLIDER_FIELDS.map((field) => {
              const Icon = field.icon;
              const val = answers[field.key];
              return (
                <div key={field.key} className="clay-card-subtle p-3 rounded-xl space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={15} className="text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <label htmlFor={`qc-${field.key}`} className="block text-xs font-bold text-slate-800 dark:text-slate-100">{field.label}</label>
                        <div className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">{field.desc}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-sm shrink-0">
                      {val}/10
                    </span>
                  </div>
                  <RangeInput
                    id={`qc-${field.key}`}
                    min={1}
                    max={10}
                    value={val}
                    onChange={(e) => setAnswers({ ...answers, [field.key]: Number(e.target.value) })}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => setStep('context')}
              className="py-3 px-4 rounded-xl clay-button text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button
              onClick={handleSlidersSubmit}
              className="flex-1 py-3 rounded-xl clay-tile-cyan font-bold text-sm flex items-center justify-center gap-2 shadow-md"
            >
              See my result <CheckCircle size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Result ──
  const ready = (result?.score ?? 0) >= 70;
  const breatheFirst = result?.recommendation.actionType === 'sigh' && onOpenStressReset;
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="clay-card p-4 sm:p-5 space-y-4">
        <div className="text-center py-1" aria-live="polite">
          <div className="w-24 h-24 rounded-full clay-dial-rim flex flex-col items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">{result?.score}%</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Readiness</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {ready ? 'Ready for deep work' : 'Ease in before deep work'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">
            Feeling {emotionalState} · {sleepHours} h sleep · day {dayFlow}
          </p>
        </div>

        <div className="clay-card-subtle p-3.5 rounded-xl space-y-1.5 border-l-4 border-l-sky-500">
          <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-bold text-xs uppercase tracking-wider">
            <Lightbulb size={14} /> Suggestion
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{result?.recommendation.text}</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Suggested next block: {result?.suggestion.label}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {breatheFirst && (
            <button
              onClick={() => save(true)}
              className="flex-1 py-3 rounded-xl clay-tile-emerald font-bold text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <Wind size={16} /> Save, then breathe for 2 min
            </button>
          )}
          <button
            onClick={() => save(false)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${breatheFirst ? 'clay-button text-slate-800 dark:text-slate-100' : 'clay-tile-cyan shadow-md'}`}
          >
            <Zap size={16} /> Save and set up my {result?.suggestion.minutes}-min block
          </button>
        </div>
        <button
          onClick={() => setStep('sliders')}
          className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600"
        >
          Change my answers
        </button>
      </div>
    </div>
  );
}
