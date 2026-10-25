import React, { useState } from 'react';
import { 
  Target, 
  Zap, 
  Brain, 
  ShieldCheck, 
  Heart, 
  ArrowRight, 
  CheckCircle, 
  Lightbulb, 
  Moon, 
  Activity,
  Wind,
  Compass,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { ReadinessCheck, EmotionalState, DayFlow } from '../../types';

interface QuickCheckProps {
  onComplete: (check: ReadinessCheck) => void;
  onOpenStressReset?: () => void;
}

const EMOTIONAL_STATES: { value: EmotionalState; label: string; sub: string }[] = [
  { value: 'calm', label: 'Calm', sub: 'Autonomic stability' },
  { value: 'focused', label: 'Focused', sub: 'High attention' },
  { value: 'energized', label: 'Energized', sub: 'High arousal' },
  { value: 'neutral', label: 'Neutral', sub: 'Baseline state' },
  { value: 'scattered', label: 'Scattered', sub: 'Attention fragmented' },
  { value: 'fatigued', label: 'Fatigued', sub: 'Low glycogen/sleep' },
  { value: 'overwhelmed', label: 'Overwhelmed', sub: 'High cognitive load' },
  { value: 'anxious', label: 'Anxious', sub: 'Sympathetic arousal' },
  { value: 'frustrated', label: 'Frustrated', sub: 'Effort/reward friction' },
];

const DAY_FLOWS: { value: DayFlow; label: string; sub: string }[] = [
  { value: 'productive', label: 'Productive', sub: 'High accomplishment' },
  { value: 'steady', label: 'Steady', sub: 'Consistent rhythm' },
  { value: 'relaxed', label: 'Relaxed', sub: 'Low pressure' },
  { value: 'demanding', label: 'Demanding', sub: 'High cognitive demand' },
  { value: 'chaotic', label: 'Chaotic', sub: 'Frequent interruptions' },
  { value: 'sluggish', label: 'Sluggish', sub: 'Slow momentum' },
];

function generateRecommendation(
  score: number,
  answers: Record<string, number>,
  emotionalState: EmotionalState,
  sleepHours: number
): { text: string; actionType: 'work' | 'sigh' | 'nap' | 'setup' } {
  if (['anxious', 'overwhelmed', 'frustrated'].includes(emotionalState)) {
    return {
      text: "You're reporting a stressed state. Deep work tends to feel harder like this — try a 2-minute breathing reset (two inhales, one long exhale) before you start.",
      actionType: 'sigh',
    };
  }
  if (sleepHours < 5.5) {
    return {
      text: "You slept less than usual. Shorter 25-minute blocks with regular breaks are usually easier on a short night — and avoid heavy multitasking.",
      actionType: 'setup',
    };
  }
  if (score >= 80) {
    return {
      text: "You're feeling sharp. Use it on your hardest, most important task first.",
      actionType: 'work',
    };
  }
  if (score >= 60) {
    return {
      text: "Solid baseline readiness. Eliminate friction: close unused browser tabs, put phone in another room, and dive into a 45-minute structured focus session.",
      actionType: 'work',
    };
  }
  return {
    text: "Moderate readiness. Your attention resources are scattered. Start with a light 15-minute warmup task or a 5-minute stroll before attempting deep analytical work.",
    actionType: 'setup',
  };
}

export function QuickCheck({ onComplete, onOpenStressReset }: QuickCheckProps) {
  const [step, setStep] = useState<'context' | 'sliders' | 'result'>('context');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('calm');
  const [dayFlow, setDayFlow] = useState<DayFlow>('steady');
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [note, setNote] = useState<string>('');

  const [answers, setAnswers] = useState({
    concentration: 7,
    energy: 7,
    clarity: 7,
    motivation: 7,
    distractionResistance: 6,
    comfort: 8,
  });

  const [result, setResult] = useState<{
    score: number;
    recommendation: { text: string; actionType: 'work' | 'sigh' | 'nap' | 'setup' };
  } | null>(null);

  const calculateScore = () => {
    const values = Object.values(answers);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / (values.length * 10)) * 100);
  };

  const currentScore = calculateScore();

  const handleContextNext = () => {
    setStep('sliders');
  };

  const handleSlidersSubmit = () => {
    const score = calculateScore();
    const rec = generateRecommendation(score, answers, emotionalState, sleepHours);
    setResult({ score, recommendation: rec });
    setStep('result');
    toast.success("Readiness diagnostic calculated");
  };

  const handleSaveAndProceed = () => {
    const score = calculateScore();
    const rec = generateRecommendation(score, answers, emotionalState, sleepHours);

    const check: ReadinessCheck = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'Check',
      ...answers,
      emotionalState,
      dayFlow,
      sleepHours,
      note: note || `State: ${emotionalState} • Day: ${dayFlow}`,
      score,
      recommendation: rec.text,
    };

    onComplete(check);
  };

  const sliderFields = [
    { key: 'concentration' as const, label: 'Attentional Focus', desc: 'Ability to hold a single cognitive target', icon: Target },
    { key: 'energy' as const, label: 'Energy', desc: 'How physically energised you feel', icon: Zap },
    { key: 'clarity' as const, label: 'Mental Clarity', desc: 'Absence of brain fog and rumination', icon: Brain },
    { key: 'distractionResistance' as const, label: 'Distraction Immunity', desc: 'Resistance to impulsive task switching', icon: ShieldCheck },
    { key: 'comfort' as const, label: 'Somatic Readiness', desc: 'Ergonomic & physiological comfort', icon: Heart },
  ];

  // STEP 1: Physiological Context
  if (step === 'context') {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="clay-card p-3.5 sm:p-4.5 space-y-3">
          
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Compass size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Readiness Diagnostic
              </h3>
              <p className="text-[10px] text-slate-500">Step 1 of 2 — Autonomic & Environmental State</p>
            </div>
          </div>

          {/* Emotional State Grid (state badges) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Current Autonomic State
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {EMOTIONAL_STATES.map((es) => (
                <button
                  key={es.value}
                  onClick={() => setEmotionalState(es.value)}
                  className={`p-1.5 sm:p-2 rounded-xl text-left transition-all border ${
                    emotionalState === es.value
                      ? 'clay-tile-cyan'
                      : 'clay-button text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[11px] sm:text-xs capitalize leading-tight">{es.label}</div>
                  <div className={`text-[9px] truncate mt-0.5 ${emotionalState === es.value ? 'text-white/80' : 'text-slate-400'}`}>
                    {es.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Day Flow */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Day Rhythm & Tempo
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DAY_FLOWS.map((df) => (
                <button
                  key={df.value}
                  onClick={() => setDayFlow(df.value)}
                  className={`p-1.5 sm:p-2 rounded-xl text-left transition-all border ${
                    dayFlow === df.value
                      ? 'clay-tile-amber'
                      : 'clay-button text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-[11px] sm:text-xs capitalize leading-tight">{df.label}</div>
                  <div className={`text-[9px] truncate mt-0.5 ${dayFlow === df.value ? 'text-white/80' : 'text-slate-400'}`}>
                    {df.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sleep Hours Slider */}
          <div className="clay-card-subtle p-2 sm:p-2.5 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Moon size={13} className="text-indigo-500" /> Sleep Duration Last Night
              </span>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                {sleepHours} Hours
              </span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400">
              <span>Deficit (3h)</span>
              <span>Optimal (7-8.5h)</span>
              <span>Extended (12h)</span>
            </div>
          </div>

          <button
            onClick={handleContextNext}
            className="w-full py-2.5 sm:py-3 rounded-xl clay-tile-cyan font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
          >
            Continue to Focus Dimensions <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: Focus Sliders
  if (step === 'sliders') {
    return (
      <div className="w-full max-w-xl mx-auto">
        <div className="clay-card p-3.5 sm:p-4.5 space-y-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Target size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Cognitive Assessment
                </h3>
                <p className="text-[10px] text-slate-500">Step 2 of 2 — Rate your current mental capacity</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400">Live Score</div>
              <div className={`text-lg sm:text-xl font-extrabold font-mono ${currentScore >= 70 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {currentScore}%
              </div>
            </div>
          </div>

          {/* Slider list */}
          <div className="space-y-2">
            {sliderFields.map((field) => {
              const Icon = field.icon;
              const val = answers[field.key];

              return (
                <div key={field.key} className="clay-card-subtle p-2 sm:p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className="text-sky-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{field.label}</div>
                        <div className="text-[9px] text-slate-400 truncate">{field.desc}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-sm shrink-0">
                      {val}/10
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={val}
                    onChange={(e) => setAnswers({ ...answers, [field.key]: Number(e.target.value) })}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              onClick={() => setStep('context')}
              className="py-2.5 px-4 rounded-xl clay-button text-xs font-semibold text-slate-600"
            >
              Back
            </button>
            <button
              onClick={handleSlidersSubmit}
              className="flex-1 py-2.5 rounded-xl clay-tile-cyan font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
            >
              Compute Action Plan <CheckCircle size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Results & Action Recommendation
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="clay-card p-3.5 sm:p-4.5 space-y-3">
        
        {/* Metric gauge */}
        <div className="text-center py-2">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full clay-dial-rim flex flex-col items-center justify-center mx-auto mb-2 shadow-lg">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
              {result?.score}%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Readiness
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {result?.score && result.score >= 70 ? 'Primed for Deep Work' : 'Regulate Before Forcing Focus'}
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            State: {emotionalState} • Sleep: {sleepHours}h • Tempo: {dayFlow}
          </p>
        </div>

        {/* Actionable recommendation card */}
        <div className="clay-card-subtle p-3 rounded-xl space-y-1.5 border-l-4 border-l-sky-500">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold text-[11px] uppercase tracking-wider">
            <Lightbulb size={14} /> Suggestion
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            {result?.recommendation.text}
          </p>
        </div>

        {/* Action Button based on recommendation */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {result?.recommendation.actionType === 'sigh' && onOpenStressReset && (
            <button
              onClick={onOpenStressReset}
              className="flex-1 py-2.5 sm:py-3 rounded-xl clay-tile-emerald font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
            >
              <Wind size={16} /> Launch 2-Minute Stress Reset
            </button>
          )}

          <button
            onClick={handleSaveAndProceed}
            className="flex-1 py-2.5 sm:py-3 rounded-xl clay-tile-cyan font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <Zap size={16} /> Save & Enter Focus Suite
          </button>
        </div>
      </div>
    </div>
  );
}
