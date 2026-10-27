import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, CheckCircle2, HeartPulse, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { BreathingTechnique, StressResetSession } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import { RangeInput } from '../ui/RangeInput';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';

interface StressResetProps {
  onComplete: (session: StressResetSession) => void;
  onClose?: () => void;
}

type PhaseType = 'inhale1' | 'inhale2' | 'hold' | 'exhale' | 'hold2' | 'ready';
type Technique = Extract<BreathingTechnique, 'physiological-sigh' | 'box-breathing'>;

/** A reset is a fixed 2 minutes, whichever technique is picked. */
const TARGET_SECONDS = 120;
/** Don't offer "finish early" before this — too short to measure any change. */
const MIN_SECONDS = 20;

/** Phase order and length in whole seconds. Box breathing has four equal sides. */
const SEQUENCE: Record<Technique, PhaseType[]> = {
  'physiological-sigh': ['inhale1', 'inhale2', 'exhale'],
  'box-breathing': ['inhale1', 'hold', 'exhale', 'hold2'],
};
const DURATION: Record<Technique, Partial<Record<PhaseType, number>>> = {
  'physiological-sigh': { inhale1: 3, inhale2: 2, exhale: 6 },
  'box-breathing': { inhale1: 4, hold: 4, exhale: 4, hold2: 4 },
};
const ORB_SCALE: Record<Technique, Partial<Record<PhaseType, number>>> = {
  'physiological-sigh': { inhale1: 1.35, inhale2: 1.5, exhale: 0.9 },
  'box-breathing': { inhale1: 1.5, hold: 1.5, exhale: 0.9, hold2: 0.9 },
};
const INSTRUCTION: Record<Technique, Partial<Record<PhaseType, string>>> = {
  'physiological-sigh': { inhale1: 'Breathe in (nose)', inhale2: 'Top-off sip of air', exhale: 'Long breath out (mouth)' },
  'box-breathing': { inhale1: 'Breathe in', hold: 'Hold', exhale: 'Breathe out', hold2: 'Hold empty' },
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function StressReset({ onComplete, onClose }: StressResetProps) {
  const [technique, setTechnique] = useState<Technique>('physiological-sigh');
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<PhaseType>('ready');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Self-assessment: "before" is measured BEFORE the exercise, "after" when it ends.
  const [showPre, setShowPre] = useState(false);
  const [stressBefore, setStressBefore] = useState(5);
  const [stressAfter, setStressAfter] = useState(5);
  const [isFinished, setIsFinished] = useState(false);

  // The ticking loop reads from refs so the interval isn't torn down on every phase change.
  const live = useRef({ phase: 'ready' as PhaseType, left: 0, elapsed: 0, cycles: 0 });
  const techRef = useRef<Technique>(technique);
  const soundRef = useRef(soundEnabled);
  techRef.current = technique;
  soundRef.current = soundEnabled;

  const chime = (kind: 'inhale' | 'hold' | 'exhale') => {
    if (soundRef.current) audioEngine.playBreathChime(kind);
  };
  const chimeFor = (p: PhaseType) => chime(p === 'exhale' ? 'exhale' : p === 'hold' || p === 'hold2' ? 'hold' : 'inhale');

  const enterPhase = (p: PhaseType) => {
    live.current.phase = p;
    live.current.left = DURATION[techRef.current][p] ?? 0;
    chimeFor(p);
  };

  const sync = () => {
    const l = live.current;
    setPhase(l.phase);
    setPhaseTimeLeft(l.left);
    setElapsed(l.elapsed);
    setCycles(l.cycles);
  };

  const finish = () => {
    setIsActive(false);
    setIsFinished(true);
    setStressAfter(stressBefore); // user moves it; we don't guess how they feel
  };

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const l = live.current;
      l.elapsed += 1;
      l.left -= 1;
      if (l.elapsed >= TARGET_SECONDS) {
        sync();
        toast.success('2 minutes done. How do you feel now?');
        finish();
        return;
      }
      if (l.left <= 0) {
        const seq = SEQUENCE[techRef.current];
        const next = seq[(seq.indexOf(l.phase) + 1) % seq.length];
        if (next === seq[0]) l.cycles += 1;
        enterPhase(next);
      }
      sync();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const resetAll = () => {
    setIsActive(false);
    live.current = { phase: 'ready', left: 0, elapsed: 0, cycles: 0 };
    sync();
  };

  const begin = () => {
    setShowPre(false);
    live.current = { phase: 'ready', left: 0, elapsed: 0, cycles: 0 };
    enterPhase(SEQUENCE[technique][0]);
    sync();
    setIsActive(true);
  };

  const onMainButton = () => {
    if (isActive) setIsActive(false);
    else if (live.current.elapsed > 0) setIsActive(true); // resume
    else setShowPre(true); // first start: safety note + "before" rating
  };

  const pickTechnique = (t: Technique) => {
    if (t === technique) return;
    setTechnique(t);
    techRef.current = t;
    resetAll();
  };

  const handleSave = () => {
    const secs = Math.max(30, live.current.elapsed);
    const session: StressResetSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'StressReset',
      technique,
      durationSeconds: secs,
      cyclesCompleted: Math.max(1, live.current.cycles),
      stressBefore,
      stressAfter,
      score: Math.max(0, Math.round(((stressBefore - stressAfter) / stressBefore) * 100)),
      note: `${technique === 'physiological-sigh' ? 'Physiological sigh' : 'Box breathing'} · ${fmt(live.current.elapsed)}`,
    };
    onComplete(session);
    toast.success('Breathing reset saved to your journal.');
    resetAll();
    setIsFinished(false);
    onClose?.();
  };

  const delta = stressBefore - stressAfter;
  const scale = isActive || phase !== 'ready' ? ORB_SCALE[technique][phase] ?? 1 : 1;
  const phaseSeconds = DURATION[technique][phase] ?? 0.4;
  const started = elapsed > 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="clay-card p-4 sm:p-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={18} />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">2-minute breathing reset</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Slow your breathing to feel calmer.</p>
            </div>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-pressed={soundEnabled}
            aria-label={soundEnabled ? 'Mute breathing chimes' : 'Unmute breathing chimes'}
            title={soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
            className="w-10 h-10 rounded-xl clay-button text-slate-600 dark:text-slate-300 flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Technique */}
        <div className="grid grid-cols-2 gap-2 mb-3" role="group" aria-label="Breathing technique">
          {([
            ['physiological-sigh', 'Physiological sigh', 'Two inhales, long exhale', 'clay-tile-emerald'],
            ['box-breathing', 'Box breathing', 'In, hold, out, hold · 4s each', 'clay-tile-cyan'],
          ] as const).map(([id, name, sub, active]) => (
            <button
              key={id}
              onClick={() => pickTechnique(id)}
              aria-pressed={technique === id}
              className={`p-2.5 rounded-xl text-sm font-semibold transition-all text-center ${
                technique === id ? active : 'clay-button text-slate-700 dark:text-slate-200'
              }`}
            >
              {name}
              <span className={`block text-xs font-normal mt-0.5 ${technique === id ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'}`}>{sub}</span>
            </button>
          ))}
        </div>

        {/* Orb */}
        <div className="relative py-3 flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 flex items-center justify-center" role="img" aria-label={started ? `${INSTRUCTION[technique][phase] ?? 'Breathe'}, ${phaseTimeLeft} seconds` : 'Breathing guide, not started'}>
            <motion.div
              animate={{ scale: scale * 1.15, opacity: isActive ? 0.35 : 0.12 }}
              transition={{ duration: phaseSeconds, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-emerald-300 dark:bg-emerald-600 blur-xl"
            />
            <motion.div
              animate={{ scale }}
              transition={{ duration: phaseSeconds, ease: 'easeInOut' }}
              className="w-36 h-36 rounded-full clay-dial-rim flex flex-col items-center justify-center text-center p-3 z-10 select-none shadow-xl"
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 leading-tight mb-1">
                {started ? INSTRUCTION[technique][phase] ?? 'Breathe' : 'Ready'}
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                {started ? phaseTimeLeft : '2:00'}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {started ? `${fmt(TARGET_SECONDS - elapsed)} left` : 'Press start'}
              </span>
            </motion.div>
          </div>
          <div className="w-full max-w-[14rem] h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-2" aria-hidden>
            <div className="h-full bg-emerald-500 transition-[width] duration-1000 ease-linear" style={{ width: `${(elapsed / TARGET_SECONDS) * 100}%` }} />
          </div>
        </div>

        {/* Hint */}
        <p className="clay-card-subtle p-3 mb-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">How it works: </span>
          {technique === 'physiological-sigh'
            ? 'Breathe in through your nose, add a second short sip of air, then let it all out slowly through your mouth. Many people find the long exhale calming.'
            : 'Follow the four equal sides of the box: in, hold, out, hold. The steady rhythm gives your mind something simple to follow.'}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            onClick={resetAll}
            disabled={!started}
            aria-label="Restart"
            title="Restart"
            className="w-11 h-11 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-40"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onMainButton}
            className="flex-1 py-3 rounded-xl clay-tile-emerald flex items-center justify-center gap-2 font-semibold text-sm shadow-md"
          >
            {isActive ? (
              <><Pause size={16} /> Pause</>
            ) : started ? (
              <><Play size={16} fill="currentColor" /> Resume</>
            ) : (
              <><Play size={16} fill="currentColor" /> Start 2-minute reset</>
            )}
          </button>
          {elapsed >= MIN_SECONDS && (
            <button
              onClick={() => { setIsActive(false); setIsFinished(true); setStressAfter(stressBefore); }}
              aria-label="Finish and rate how I feel"
              title="Finish and rate how I feel"
              className="w-11 h-11 rounded-xl clay-button text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
            >
              <CheckCircle2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Before you start: safety note + "before" rating */}
      <Dialog open={showPre} onOpenChange={setShowPre}>
        <DialogContent className="clay-card border-0 max-w-sm p-6 gap-4">
          <div className="text-center space-y-1">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white text-center">Before you start</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 text-center">
              How stressed do you feel right now? We'll compare it with how you feel afterwards.
            </DialogDescription>
          </div>
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <label htmlFor="stress-before" className="text-slate-700 dark:text-slate-200">Stress right now</label>
              <span className="font-bold text-amber-600 dark:text-amber-400">{stressBefore}/10</span>
            </div>
            <RangeInput id="stress-before" accent="amber" min={1} max={10} value={stressBefore} onChange={(e) => setStressBefore(Number(e.target.value))} />
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400"><span>Calm</span><span>Very stressed</span></div>
          </div>
          <p className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-xl p-3 leading-relaxed">
            <ShieldAlert size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <span>FocusChecker is a productivity tool, not a medical device. Breathe gently. If you feel dizzy, lightheaded or uncomfortable, stop and breathe normally.</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowPre(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold clay-button text-slate-700 dark:text-slate-200">Cancel</button>
            <button onClick={begin} className="flex-1 py-2.5 rounded-xl text-sm font-semibold clay-tile-emerald">Start</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* After: rate how you feel now, see the change */}
      <Dialog open={isFinished} onOpenChange={(open) => { setIsFinished(open); if (!open) resetAll(); }}>
        <DialogContent className="clay-card border-0 max-w-sm p-6 gap-4">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-1">
              <HeartPulse size={24} />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white text-center">How do you feel now?</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 text-center">
              You breathed for {fmt(elapsed)}. Rate your stress right now.
            </DialogDescription>
          </div>
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <label htmlFor="stress-after" className="text-slate-700 dark:text-slate-200">Stress right now</label>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{stressAfter}/10</span>
            </div>
            <RangeInput id="stress-after" accent="emerald" min={1} max={10} value={stressAfter} onChange={(e) => setStressAfter(Number(e.target.value))} />
          </div>
          <div className="clay-card-subtle rounded-xl p-3 text-center text-sm" aria-live="polite">
            <span className="text-slate-500 dark:text-slate-400">Before </span><b className="text-amber-600 dark:text-amber-400">{stressBefore}</b>
            <span className="text-slate-500 dark:text-slate-400 mx-2">→</span>
            <span className="text-slate-500 dark:text-slate-400">Now </span><b className="text-emerald-600 dark:text-emerald-400">{stressAfter}</b>
            <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {delta > 0 ? `${delta} point${delta === 1 ? '' : 's'} lower` : delta === 0 ? 'No change. That is useful to know too.' : `${-delta} point${delta === -1 ? '' : 's'} higher`}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setIsFinished(false); resetAll(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold clay-button text-slate-700 dark:text-slate-200">Don't save</button>
            <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold clay-tile-emerald">Save and continue</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
