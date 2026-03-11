import React, { useState } from 'react';
import { Target, Zap, Brain, Rocket, Shield, Heart, ArrowRight, CheckCircle, Lightbulb, Moon, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { ReadinessCheck, EmotionalState, DayFlow } from '../../types';

import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

interface QuickCheckProps {
  onComplete: (check: ReadinessCheck) => void;
}

const EMOTIONAL_STATES: { value: EmotionalState; label: string; emoji: string }[] = [
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'relaxed', label: 'Relaxed', emoji: '😊' },
  { value: 'happy', label: 'Happy', emoji: '😄' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'nervous', label: 'Nervous', emoji: '😰' },
  { value: 'worried', label: 'Worried', emoji: '😟' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
  { value: 'depressed', label: 'Depressed', emoji: '😔' },
];

const DAY_FLOWS: { value: DayFlow; label: string }[] = [
  { value: 'productive', label: 'Productive' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'routine', label: 'Routine' },
  { value: 'slow', label: 'Slow' },
  { value: 'stressful', label: 'Stressful' },
  { value: 'chaotic', label: 'Chaotic' },
];

function generateRecommendation(score: number, answers: Record<string, number>, emotionalState: EmotionalState, sleepHours: number): string {
  if (score >= 80) {
    return "You're in an excellent state to focus. Dive into challenging work — your attention span is at its peak right now. Consider tackling the hardest task on your list.";
  }
  if (score >= 65) {
    const weak = Object.entries(answers).sort((a, b) => a[1] - b[1])[0];
    const tips: Record<string, string> = {
      concentration: "Try removing distractions first — close unnecessary tabs, put your phone in another room.",
      energy: "Consider a short walk or some light stretching to boost your energy before starting.",
      clarity: "Take 2 minutes to write down exactly what you want to accomplish. Clear goals = clear thinking.",
      motivation: "Start with the most interesting part of your task. Motivation often follows action.",
      distractionResistance: "Set up a distraction-free environment first. Use website blockers if needed.",
      comfort: "Adjust your workspace — lighting, seating, temperature. Comfort matters for sustained focus.",
    };
    return `You're in a decent state. ${tips[weak[0]] || "Take a moment to prepare your environment."} Your attention span should be good for 30-45 minutes.`;
  }
  if (score >= 45) {
    if (sleepHours < 6) {
      return "Your sleep was short — this is likely affecting your focus. Consider a 20-minute power nap or lighter tasks. Don't force deep work when tired; it leads to frustration.";
    }
    if (['frustrated', 'worried', 'nervous'].includes(emotionalState)) {
      return "Your emotional state may hinder deep focus. Try a 5-minute breathing exercise or journal your thoughts first. Sometimes acknowledging worries frees up mental space.";
    }
    return "Your focus capacity is moderate. Start with easier, routine tasks for 15-20 minutes to build momentum. If focus improves, gradually shift to harder work.";
  }
  return "Now might not be the best time for intense focus work. Consider: taking a real break, going for a walk, listening to music, or doing something enjoyable first. Remember — forcing focus leads to frustration, not progress. Come back when you feel more ready.";
}

export function QuickCheck({ onComplete }: QuickCheckProps) {
  const [step, setStep] = useState<'context' | 'focus' | 'result'>('context');
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('neutral');
  const [dayFlow, setDayFlow] = useState<DayFlow>('routine');
  const [sleepHours, setSleepHours] = useState(7);
  const [note, setNote] = useState('');

  const [answers, setAnswers] = useState({
    concentration: 5,
    energy: 5,
    clarity: 5,
    motivation: 5,
    distractionResistance: 5,
    comfort: 5,
  });

  const [result, setResult] = useState<{ score: number; recommendation: string } | null>(null);

  const calculateScore = () => {
    const values = Object.values(answers);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / (values.length * 10)) * 100);
  };

  const handleSubmit = () => {
    const score = calculateScore();
    const recommendation = generateRecommendation(score, answers, emotionalState, sleepHours);
    setResult({ score, recommendation });
    setStep('result');
    toast.success("Readiness check complete!");
  };

  const handleSave = () => {
    const score = calculateScore();
    const recommendation = generateRecommendation(score, answers, emotionalState, sleepHours);
    const check: ReadinessCheck = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'Check',
      ...answers,
      emotionalState,
      dayFlow,
      sleepHours,
      note: note || `Readiness check — feeling ${emotionalState}`,
      score,
      recommendation,
    };
    onComplete(check);
  };

  const sliderFields = [
    { key: 'concentration' as const, label: 'How well can you concentrate right now?', minLabel: 'Very scattered', maxLabel: 'Laser focused', icon: Target },
    { key: 'energy' as const, label: 'What is your current energy level?', minLabel: 'Exhausted', maxLabel: 'Energized', icon: Zap },
    { key: 'clarity' as const, label: 'How clear is your thinking?', minLabel: 'Foggy/confused', maxLabel: 'Crystal clear', icon: Brain },
    { key: 'motivation' as const, label: 'How motivated do you feel?', minLabel: 'No drive', maxLabel: 'Highly driven', icon: Rocket },
    { key: 'distractionResistance' as const, label: 'How resistant are you to distractions?', minLabel: 'Easily distracted', maxLabel: 'Fully resistant', icon: Shield },
    { key: 'comfort' as const, label: 'Do you feel comfortable and ready to learn?', minLabel: 'Not at all', maxLabel: 'Completely ready', icon: Heart },
  ];

  const currentScore = calculateScore();

  // Step 1: Context (emotional state, sleep, day flow)
  if (step === 'context') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Smile size={16} />
            Step 1 of 2 — Your Current State
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">How are you doing right now?</h3>
          <p className="text-slate-500 dark:text-slate-400">Understanding your current state helps us give you better focus recommendations.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8 space-y-6">
          {/* Emotional State */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 block">
              Current Emotional State
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {EMOTIONAL_STATES.map(es => (
                <button
                  key={es.value}
                  onClick={() => setEmotionalState(es.value)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all border ${
                    emotionalState === es.value
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">{es.emoji}</span> {es.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Day Flow */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              How has your day been so far?
            </Label>
            <Select value={dayFlow} onValueChange={(v: DayFlow) => setDayFlow(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_FLOWS.map(df => (
                  <SelectItem key={df.value} value={df.value}>{df.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Sleep */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Moon size={16} className="text-indigo-500" />
                Hours of sleep last night
              </Label>
              <Badge className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-0">
                {sleepHours}h
              </Badge>
            </div>
            <Slider
              value={[sleepHours]}
              onValueChange={(val) => setSleepHours(val[0])}
              min={0}
              max={12}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between mt-1 text-xs text-slate-400">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
            </div>
          </div>

          <Separator />

          {/* Optional Note */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Quick note (optional)
            </Label>
            <Textarea
              placeholder="How are you feeling? Any context about your day..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          <Button
            onClick={() => setStep('focus')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-500/20"
            size="lg"
          >
            Next: Focus Assessment
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Result
  if (step === 'result' && result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-6 ${
            result.score >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
            result.score >= 45 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
            'bg-red-100 dark:bg-red-900/30 text-red-500'
          }`}>
            <div>
              <div className="text-3xl font-bold">{result.score}%</div>
              <div className="text-xs font-medium opacity-70">
                {result.score >= 70 ? 'Ready' : result.score >= 45 ? 'Moderate' : 'Low'}
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {result.score >= 70 ? 'You\'re Ready to Focus!' : result.score >= 45 ? 'Proceed with Care' : 'Consider Taking a Break'}
          </h2>
          <Progress value={result.score} className="h-3 max-w-xs mx-auto mt-4" />
        </div>

        {/* Recommendation Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 shrink-0">
              <Lightbulb size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Recommendation</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{result.recommendation}</p>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Dimension Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {sliderFields.map(field => (
              <div key={field.key} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                <field.icon size={14} className="text-indigo-500 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">{field.label.split('?')[0].replace('How ', '').replace('Do you feel ', '')}</span>
                <Badge className={`text-xs border-0 ${
                  answers[field.key] >= 7 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  answers[field.key] >= 4 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {answers[field.key]}/10
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4 text-sm text-slate-500 dark:text-slate-400">
            <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0">
              {EMOTIONAL_STATES.find(e => e.value === emotionalState)?.emoji} {emotionalState}
            </Badge>
            <span>•</span>
            <span>{sleepHours}h sleep</span>
            <span>•</span>
            <span>{dayFlow} day</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => { setStep('context'); setResult(null); }}
            variant="outline"
            className="flex-1 py-6 rounded-xl"
            size="lg"
          >
            Redo Check
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-xl shadow-lg shadow-indigo-500/20"
            size="lg"
          >
            {result.score >= 70 ? 'Save & Start Working' : 'Save Check'}
            <CheckCircle size={20} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Focus Sliders
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Target size={16} />
          Step 2 of 2 — Focus Assessment
        </div>
        {/* Live score */}
        <Tooltip>
          <TooltipTrigger>
            <div className={`text-4xl font-bold ${currentScore >= 70 ? 'text-emerald-600' : currentScore >= 45 ? 'text-amber-500' : 'text-red-500'}`}>
              {currentScore}%
            </div>
          </TooltipTrigger>
          <TooltipContent>Your readiness score based on your responses</TooltipContent>
        </Tooltip>
        <Progress value={currentScore} className="h-2 max-w-xs mx-auto mt-3 mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Answer honestly — this helps you discover your attention patterns over time.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8">
        {sliderFields.map((field, idx) => (
          <div key={field.key} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                <field.icon size={20} />
              </div>
              <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">{field.label}</h3>
              <Badge className="ml-auto bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-0">
                {answers[field.key]}/10
              </Badge>
            </div>

            <Slider
              value={[answers[field.key]]}
              onValueChange={(val) => setAnswers({ ...answers, [field.key]: val[0] })}
              min={1}
              max={10}
              step={1}
              className="w-full"
            />

            <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>{field.minLabel}</span>
              <span>{field.maxLabel}</span>
            </div>

            {idx < sliderFields.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}

        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => setStep('context')}
            variant="outline"
            className="py-6 rounded-xl px-8"
            size="lg"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-500/20"
            size="lg"
          >
            Get My Focus Score
            <ArrowRight size={20} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
