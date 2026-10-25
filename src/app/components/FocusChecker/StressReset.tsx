import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, CheckCircle2, ShieldCheck, HeartPulse, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { BreathingTechnique, StressResetSession } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface StressResetProps {
  onComplete: (session: StressResetSession) => void;
  onClose?: () => void;
}

type PhaseType = 'inhale1' | 'inhale2' | 'hold' | 'exhale' | 'ready';

export function StressReset({ onComplete, onClose }: StressResetProps) {
  const [technique, setTechnique] = useState<BreathingTechnique>('physiological-sigh');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<PhaseType>('ready');
  const [phaseTimeLeft, setPhaseTimeLeft] = useState<number>(0);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Self assessment
  const [stressBefore, setStressBefore] = useState<number>(7);
  const [stressAfter, setStressAfter] = useState<number>(3);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalSecondsRef = useRef<number>(0);

  // Techniques timing profiles in seconds
  // Physiological Sigh: Inhale 1 (2.5s) -> Inhale 2 top-off (1.5s) -> Exhale slow (6s)
  // Box Breathing: Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Hold (4s)
  // 4-7-8: Inhale (4s) -> Hold (7s) -> Exhale (8s)

  const handleStart = () => {
    setIsActive(true);
    setIsFinished(false);
    startPhase('inhale1', technique === 'physiological-sigh' ? 3 : 4);
    if (soundEnabled) audioEngine.playBreathChime('inhale');
  };

  const handlePause = () => {
    setIsActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleReset = () => {
    setIsActive(false);
    setPhase('ready');
    setPhaseTimeLeft(0);
    setCyclesCompleted(0);
    totalSecondsRef.current = 0;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startPhase = (nextPhase: PhaseType, duration: number) => {
    setPhase(nextPhase);
    setPhaseTimeLeft(duration);
  };

  // Breathing loop step
  useEffect(() => {
    if (!isActive) return;

    timerRef.current = setInterval(() => {
      totalSecondsRef.current += 1;

      setPhaseTimeLeft((prev) => {
        if (prev <= 1) {
          // Advance to next phase according to technique
          if (technique === 'physiological-sigh') {
            if (phase === 'inhale1') {
              if (soundEnabled) audioEngine.playBreathChime('inhale');
              startPhase('inhale2', 1.5);
              return 1.5;
            } else if (phase === 'inhale2') {
              if (soundEnabled) audioEngine.playBreathChime('exhale');
              startPhase('exhale', 6);
              return 6;
            } else {
              // Loop back
              setCyclesCompleted((c) => {
                const nextC = c + 1;
                if (nextC >= 5) {
                  // Recommend completing after 5 cycles (standard sigh protocol)
                  setIsActive(false);
                  setIsFinished(true);
                  toast.success("5 cycles completed! Check your stress level now.");
                }
                return nextC;
              });
              if (soundEnabled) audioEngine.playBreathChime('inhale');
              startPhase('inhale1', 3);
              return 3;
            }
          } else if (technique === 'box-breathing') {
            if (phase === 'inhale1') {
              if (soundEnabled) audioEngine.playBreathChime('hold');
              startPhase('hold', 4);
              return 4;
            } else if (phase === 'hold') {
              if (soundEnabled) audioEngine.playBreathChime('exhale');
              startPhase('exhale', 4);
              return 4;
            } else {
              setCyclesCompleted((c) => c + 1);
              if (soundEnabled) audioEngine.playBreathChime('inhale');
              startPhase('inhale1', 4);
              return 4;
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, phase, technique, soundEnabled]);

  const handleSaveSession = () => {
    const session: StressResetSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'StressReset',
      technique,
      durationSeconds: Math.max(30, totalSecondsRef.current),
      cyclesCompleted: Math.max(1, cyclesCompleted),
      stressBefore,
      stressAfter,
      score: Math.max(0, Math.round(((stressBefore - stressAfter) / stressBefore) * 100)),
      note: `${technique === 'physiological-sigh' ? 'Physiological Sigh' : 'Box Breathing'} (${cyclesCompleted} cycles)`,
    };

    onComplete(session);
    toast.success("Stress reset logged! Nervous system recalibrated.");
    if (onClose) onClose();
  };

  // Instruction text based on phase
  const getPhaseInstruction = () => {
    switch (phase) {
      case 'inhale1':
        return technique === 'physiological-sigh'
          ? 'Deep Inhale (Nose)'
          : 'Slow Inhale (4s)';
      case 'inhale2':
        return 'Sharp Top-Off Inhale';
      case 'hold':
        return 'Hold Steadily';
      case 'exhale':
        return 'Prolonged Exhale (Mouth)';
      default:
        return 'Ready to Begin';
    }
  };

  // Scale of the visual breathing orb
  const getOrbScale = () => {
    if (!isActive) return 1;
    if (phase === 'inhale1') return 1.35;
    if (phase === 'inhale2') return 1.5;
    if (phase === 'hold') return 1.5;
    if (phase === 'exhale') return 0.9;
    return 1;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="clay-card p-3.5 sm:p-4 lg:p-4 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={18} />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                Stress De-escalation
              </h3>
              <p className="text-[10px] text-slate-500">Neuroscience autonomic reset</p>
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-xl clay-button text-slate-600 dark:text-slate-300"
            title="Toggle chime tones"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>

        {/* Technique Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-2.5 sm:mb-3">
          <button
            onClick={() => {
              setTechnique('physiological-sigh');
              handleReset();
            }}
            className={`p-2 sm:p-2.5 rounded-xl text-xs font-semibold transition-all ${
              technique === 'physiological-sigh'
                ? 'clay-tile-emerald'
                : 'clay-button text-slate-600 dark:text-slate-300'
            }`}
          >
            Physiological Sigh
            <span className="block text-[9px] font-normal opacity-85 mt-0.5">Two inhales, long exhale</span>
          </button>

          <button
            onClick={() => {
              setTechnique('box-breathing');
              handleReset();
            }}
            className={`p-2 sm:p-2.5 rounded-xl text-xs font-semibold transition-all ${
              technique === 'box-breathing'
                ? 'clay-tile-cyan'
                : 'clay-button text-slate-600 dark:text-slate-300'
            }`}
          >
            Box Breathing
            <span className="block text-[9px] font-normal opacity-85 mt-0.5">Equal 4-second phases</span>
          </button>
        </div>

        {/* Central Breathing Orb */}
        <div className="relative py-2 sm:py-3.5 flex flex-col items-center justify-center">
          
          {/* Animated concentric ripples */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
            
            {/* Ambient pulse ring */}
            <motion.div
              animate={{
                scale: getOrbScale() * 1.15,
                opacity: isActive ? 0.35 : 0.1,
              }}
              transition={{ duration: phase === 'exhale' ? 6 : 2.5, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-emerald-300 dark:bg-emerald-600 blur-xl"
            />

            {/* Middle tactile orb container */}
            <motion.div
              animate={{
                scale: getOrbScale(),
              }}
              transition={{ duration: phase === 'exhale' ? 6 : 2.5, ease: 'easeInOut' }}
              className="w-34 h-34 sm:w-38 sm:h-38 rounded-full clay-dial-rim flex flex-col items-center justify-center text-center p-3 z-10 select-none shadow-xl"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
                {getPhaseInstruction()}
              </span>

              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
                {isActive ? `${phaseTimeLeft}s` : 'START'}
              </div>

              <span className="text-[10px] text-slate-400 mt-0.5">
                Cycle {cyclesCompleted}/5
              </span>
            </motion.div>
          </div>
        </div>

        {/* Science Tip Pill */}
        <div className="clay-card-subtle p-2.5 mb-2.5 sm:mb-3 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Why it works: </span>
          {technique === 'physiological-sigh'
            ? 'A double inhale followed by a slow exhale helps activate the parasympathetic nervous system.'
            : 'Equal 4-second phases provide steady cognitive rhythm and heart-rate coherence.'}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            onClick={handleReset}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Reset"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={isActive ? handlePause : handleStart}
            className="flex-1 py-2.5 sm:py-3 rounded-xl clay-tile-emerald flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm shadow-md"
          >
            {isActive ? (
              <>
                <Pause size={16} /> Pause Breathwork
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" /> Begin De-escalation
              </>
            )}
          </button>

          {cyclesCompleted >= 2 && (
            <button
              onClick={() => setIsFinished(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl clay-button text-emerald-600 flex items-center justify-center"
              title="Log outcome"
            >
              <CheckCircle2 size={17} />
            </button>
          )}
        </div>

        {/* Post-breathwork outcome modal */}
        <AnimatePresence>
          {isFinished && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="clay-card max-w-sm w-full p-6 space-y-4"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <HeartPulse size={24} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white">State Recalibration</h4>
                  <p className="text-xs text-slate-500">Notice the physiological shift in your heart rate and jaw tension</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Stress Level Before:</span>
                    <span className="font-bold text-amber-600">{stressBefore}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={stressBefore}
                    onChange={(e) => setStressBefore(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span>Stress Level Right Now:</span>
                    <span className="font-bold text-emerald-600">{stressAfter}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={stressAfter}
                    onChange={(e) => setStressAfter(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setIsFinished(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold clay-button text-slate-600"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveSession}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold clay-tile-emerald"
                  >
                    Save & Return to Work
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
