import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Coffee, StopCircle, Tag, Save, Clock, MapPin, Moon, Smile, Pause, RotateCcw, AlertTriangle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FocusSession, EmotionalState, DayFlow, WorkPlace, BreakEntry } from '../../types';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Toggle } from '../ui/toggle';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Slider } from '../ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface LogSessionProps {
  onComplete: (session: FocusSession) => void;
  breakReminderEnabled: boolean;
  breakIntervalMinutes: number;
}

const PRESET_TAGS = ['Deep Work', 'Learning', 'Coding', 'Writing', 'Research', 'Admin', 'Design', 'Reading'];

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

const WORK_PLACES: { value: WorkPlace; label: string }[] = [
  { value: 'home-office', label: 'Home Office' },
  { value: 'office', label: 'Office' },
  { value: 'cafe', label: 'Café' },
  { value: 'library', label: 'Library' },
  { value: 'coworking', label: 'Coworking' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'other', label: 'Other' },
];

const PLANNED_DURATIONS = [
  { label: '25m', value: 25, desc: 'Pomodoro' },
  { label: '45m', value: 45, desc: 'Medium' },
  { label: '60m', value: 60, desc: 'Standard' },
  { label: '90m', value: 90, desc: 'Deep Work' },
  { label: '120m', value: 120, desc: 'Extended' },
];

export function LogSession({ onComplete, breakReminderEnabled, breakIntervalMinutes }: LogSessionProps) {
  // Phase: setup -> active -> review
  const [phase, setPhase] = useState<'setup' | 'active' | 'onbreak' | 'review'>('setup');
  
  // Setup fields
  const [task, setTask] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [emotionalState, setEmotionalState] = useState<EmotionalState>('neutral');
  const [dayFlow, setDayFlow] = useState<DayFlow>('routine');
  const [workPlace, setWorkPlace] = useState<WorkPlace>('home-office');
  const [sleepHours, setSleepHours] = useState(7);
  const [plannedDuration, setPlannedDuration] = useState(45);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startTimeRef = useRef<string>('');

  // Breaks
  const [breaks, setBreaks] = useState<BreakEntry[]>([]);
  const [breakStart, setBreakStart] = useState(0);
  const [breakNotified, setBreakNotified] = useState(false);

  // Review fields
  const [focusQuality, setFocusQuality] = useState(7);
  const [contentClarity, setContentClarity] = useState(7);
  const [frustrationLevel, setFrustrationLevel] = useState(3);
  const [attentionFaded, setAttentionFaded] = useState(false);
  const [fadeAfterMinutes, setFadeAfterMinutes] = useState(30);
  const [sessionNote, setSessionNote] = useState('');

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && phase === 'active') {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, phase]);

  // Break reminder
  useEffect(() => {
    if (!breakReminderEnabled || !isRunning || phase !== 'active') return;
    const elapsedMinutes = Math.floor(seconds / 60);
    if (elapsedMinutes > 0 && elapsedMinutes % breakIntervalMinutes === 0 && !breakNotified) {
      toast.info(`You've been focusing for ${elapsedMinutes} minutes. Consider a short break!`, {
        duration: 8000,
        action: {
          label: 'Take Break',
          onClick: () => handleStartBreak(),
        },
      });
      setBreakNotified(true);
      setTimeout(() => setBreakNotified(false), 61000); // reset after 1 min
    }
  }, [seconds, isRunning, phase, breakReminderEnabled, breakIntervalMinutes, breakNotified]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleStart = () => {
    if (!task.trim()) {
      toast.error("Please enter what you'll be working on");
      return;
    }
    startTimeRef.current = new Date().toISOString();
    setPhase('active');
    setIsRunning(true);
    toast.success("Focus session started! Stay in the zone.");
  };

  const handleStartBreak = useCallback(() => {
    setIsRunning(false);
    setBreakStart(Math.ceil(seconds / 60));
    setPhase('onbreak');
    toast.info("Break started. Rest your mind.");
  }, [seconds]);

  const handleEndBreak = () => {
    const breakDuration = Math.max(1, Math.ceil(seconds / 60) - breakStart);
    setBreaks(prev => [...prev, { startMinute: breakStart, durationMinutes: breakDuration }]);
    setPhase('active');
    setIsRunning(true);
    toast.success("Back to focusing!");
  };

  const handleFinish = () => {
    setIsRunning(false);
    if (seconds < 60) {
      toast.error("Session too short to save (must be > 1 minute)");
      return;
    }
    setPhase('review');
  };

  const handleSave = () => {
    const durationMinutes = Math.ceil(seconds / 60);
    const score = Math.round(
      (focusQuality * 3 + contentClarity * 2 + (10 - frustrationLevel) * 2 + (attentionFaded ? 3 : 7)) / 8 * 10
    );

    const session: FocusSession = {
      id: Date.now(),
      date: startTimeRef.current || new Date().toISOString(),
      type: 'Session',
      task,
      tags: selectedTags,
      emotionalState,
      dayFlow,
      workPlace,
      sleepHours,
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      durationMinutes,
      plannedDurationMinutes: plannedDuration,
      breaks,
      focusQuality,
      contentClarity,
      frustrationLevel,
      score: Math.min(100, Math.max(0, score)),
      note: sessionNote || task,
      attentionFaded,
      fadeAfterMinutes: attentionFaded ? fadeAfterMinutes : undefined,
    };

    toast.success("Session saved! Check your dashboard for insights.");
    onComplete(session);

    // Reset
    setPhase('setup');
    setSeconds(0);
    setTask('');
    setSelectedTags([]);
    setBreaks([]);
    setSessionNote('');
    setFocusQuality(7);
    setContentClarity(7);
    setFrustrationLevel(3);
    setAttentionFaded(false);
  };

  const progressPercent = Math.min(100, (seconds / (plannedDuration * 60)) * 100);
  const elapsedMinutes = Math.floor(seconds / 60);

  // ===== SETUP PHASE =====
  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Task & Tags */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Tag size={20} className="text-indigo-500" />
              What are you working on?
            </h3>

            <div>
              <Label htmlFor="task" className="text-sm font-medium text-slate-700 dark:text-slate-300">Task / Topic</Label>
              <Input
                id="task"
                placeholder="e.g., Study networking module, Code API..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Tags</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map(tag => (
                  <Toggle
                    key={tag}
                    variant="outline"
                    size="sm"
                    pressed={selectedTags.includes(tag)}
                    onPressedChange={() => toggleTag(tag)}
                    className="data-[state=on]:bg-indigo-100 data-[state=on]:text-indigo-600 dark:data-[state=on]:bg-indigo-900/30 dark:data-[state=on]:text-indigo-400"
                  >
                    {tag}
                  </Toggle>
                ))}
              </div>
            </div>

            <Separator />

            {/* Planned duration */}
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Planned Duration</Label>
              <div className="flex flex-wrap gap-2">
                {PLANNED_DURATIONS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setPlannedDuration(d.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      plannedDuration === d.value
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700/50 dark:border-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>{d.label}</div>
                    <div className="text-[10px] opacity-60">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Context */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-5">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Smile size={20} className="text-indigo-500" />
              Your Current Context
            </h3>

            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Emotional State</Label>
              <Select value={emotionalState} onValueChange={(v: EmotionalState) => setEmotionalState(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMOTIONAL_STATES.map(es => (
                    <SelectItem key={es.value} value={es.value}>{es.emoji} {es.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Day Flow</Label>
              <Select value={dayFlow} onValueChange={(v: DayFlow) => setDayFlow(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_FLOWS.map(df => (
                    <SelectItem key={df.value} value={df.value}>{df.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block flex items-center gap-2">
                <MapPin size={14} className="text-indigo-500" />
                Work Place
              </Label>
              <Select value={workPlace} onValueChange={(v: WorkPlace) => setWorkPlace(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WORK_PLACES.map(wp => (
                    <SelectItem key={wp.value} value={wp.value}>{wp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Moon size={14} className="text-indigo-500" /> Sleep
                </Label>
                <span className="text-sm font-medium text-indigo-600">{sleepHours}h</span>
              </div>
              <Slider
                value={[sleepHours]}
                onValueChange={(val) => setSleepHours(val[0])}
                min={0} max={12} step={0.5}
              />
            </div>
          </div>
        </div>

        {/* Start button */}
        <Button
          onClick={handleStart}
          className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-500/20"
          size="lg"
        >
          <Play size={20} fill="currentColor" className="mr-2" />
          Start Focus Session ({plannedDuration}m)
        </Button>
      </div>
    );
  }

  // ===== ON BREAK =====
  if (phase === 'onbreak') {
    return (
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
          <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coffee size={40} className="text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Taking a Break</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Rest your mind. Step away from the screen if you can. Your session timer is paused.
          </p>
          <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white tabular-nums mb-6">
            {formatTime(seconds)}
          </div>
          <p className="text-sm text-slate-400 mb-6">Session elapsed: {elapsedMinutes} min • Break #{breaks.length + 1}</p>
          <Button
            onClick={handleEndBreak}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium"
            size="lg"
          >
            <RotateCcw size={20} className="mr-2" />
            Resume Focus
          </Button>
        </div>
      </div>
    );
  }

  // ===== REVIEW PHASE =====
  if (phase === 'review') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Session Complete!</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {elapsedMinutes} minutes focused on "{task}" • {breaks.length} break{breaks.length !== 1 ? 's' : ''} taken
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8 space-y-6">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">How did it go?</h3>

          {/* Focus Quality */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Focus Quality</Label>
              <Badge className="bg-indigo-50 text-indigo-600 border-0">{focusQuality}/10</Badge>
            </div>
            <Slider value={[focusQuality]} onValueChange={(v) => setFocusQuality(v[0])} min={1} max={10} step={1} />
            <div className="flex justify-between mt-1 text-xs text-slate-400"><span>Poor focus</span><span>Excellent focus</span></div>
          </div>

          <Separator />

          {/* Content Clarity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Content Clarity</Label>
              <Badge className="bg-indigo-50 text-indigo-600 border-0">{contentClarity}/10</Badge>
            </div>
            <Slider value={[contentClarity]} onValueChange={(v) => setContentClarity(v[0])} min={1} max={10} step={1} />
            <div className="flex justify-between mt-1 text-xs text-slate-400"><span>Confusing/unclear</span><span>Crystal clear</span></div>
          </div>

          <Separator />

          {/* Frustration Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Frustration Level</Label>
              <Badge className={`border-0 ${frustrationLevel >= 7 ? 'bg-red-100 text-red-600' : frustrationLevel >= 4 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {frustrationLevel}/10
              </Badge>
            </div>
            <Slider value={[frustrationLevel]} onValueChange={(v) => setFrustrationLevel(v[0])} min={1} max={10} step={1} />
            <div className="flex justify-between mt-1 text-xs text-slate-400"><span>No frustration</span><span>Very frustrated</span></div>
          </div>

          <Separator />

          {/* Attention Fade */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle size={18} className="text-amber-500" />
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Did your attention start to fade?</Label>
            </div>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => setAttentionFaded(true)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  attentionFaded ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                Yes, it faded
              </button>
              <button
                onClick={() => setAttentionFaded(false)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  !attentionFaded ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-400' : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
                }`}
              >
                Stayed focused
              </button>
            </div>
            {attentionFaded && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-slate-500">After how many minutes?</Label>
                  <span className="text-xs font-medium text-amber-600">{fadeAfterMinutes}m</span>
                </div>
                <Slider
                  value={[fadeAfterMinutes]}
                  onValueChange={(v) => setFadeAfterMinutes(v[0])}
                  min={5}
                  max={Math.max(elapsedMinutes, 10)}
                  step={5}
                />
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Session Notes (optional)</Label>
            <Textarea
              placeholder="What did you learn? Any observations about your attention?"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-500/20"
            size="lg"
          >
            <Save size={20} className="mr-2" />
            Save Session & View Insights
          </Button>
        </div>
      </div>
    );
  }

  // ===== ACTIVE TIMER =====
  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">
        {/* Timer ring */}
        <div className="w-52 h-52 rounded-full border-8 border-indigo-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-6 relative">
          <div>
            <div className="text-4xl font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {formatTime(seconds)}
            </div>
            <div className="text-sm text-slate-500 mt-1">{task}</div>
          </div>
          {isRunning && (
            <div className="absolute inset-0 border-8 border-indigo-500 rounded-full border-t-transparent animate-spin" style={{ animationDuration: '3s' }}></div>
          )}
        </div>

        {/* Progress toward planned duration */}
        <div className="w-full mb-6 space-y-1">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{elapsedMinutes}m elapsed</span>
            <span>{Math.round(progressPercent)}% of {plannedDuration}m goal</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Info badges */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
            {EMOTIONAL_STATES.find(e => e.value === emotionalState)?.emoji} {emotionalState}
          </Badge>
          <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
            <MapPin size={10} className="mr-1" /> {WORK_PLACES.find(w => w.value === workPlace)?.label}
          </Badge>
          {breaks.length > 0 && (
            <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-0 text-xs">
              {breaks.length} break{breaks.length > 1 ? 's' : ''}
            </Badge>
          )}
          {selectedTags.slice(0, 2).map(tag => (
            <Badge key={tag} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-0 text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-3 justify-center">
          {isRunning ? (
            <>
              <Button
                onClick={() => setIsRunning(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-amber-500/20"
                size="lg"
              >
                <Pause size={20} className="mr-2" />
                Pause
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleStartBreak}
                    variant="outline"
                    className="px-6 py-3 rounded-xl"
                    size="lg"
                  >
                    <Coffee size={20} className="mr-2" />
                    Break
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Take a break — rest your mind</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Button
              onClick={() => setIsRunning(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-500/20"
              size="lg"
            >
              <Play size={20} fill="currentColor" className="mr-2" />
              Resume
            </Button>
          )}
          {seconds > 60 && (
            <Button
              onClick={handleFinish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-emerald-500/20"
              size="lg"
            >
              <StopCircle size={20} className="mr-2" />
              Finish
            </Button>
          )}
        </div>

        {/* Attention fade warning */}
        {elapsedMinutes >= plannedDuration && (
          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-left">
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">You've exceeded your planned duration</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  If your attention is fading, it's better to stop and return later. Forcing focus leads to frustration, not progress.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Focus tip */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg mt-6 text-left">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={18} />
          <h3 className="font-bold">Remember</h3>
        </div>
        <p className="text-indigo-100 text-sm leading-relaxed">
          Attention is limited and personal. When you notice your focus dropping, that's your signal to take a break — not to push harder. Document this moment; it's valuable data about your attention span.
        </p>
      </div>
    </div>
  );
}

