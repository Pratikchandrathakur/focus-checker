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
    <div className="w-full max-w-lg mx-auto">
      <div className="clay-card p-6 md:p-8 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                Stress De-escalation
              </h3>
              <p className="text-xs text-slate-500">Neuroscience autonomic reset</p>
            </div>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl clay-button text-slate-600 dark:text-slate-300"
            title="Toggle chime tones"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Technique Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <button
            onClick={() => {
              setTechnique('physiological-sigh');
              handleReset();
            }}
            className={`p-3 rounded-2xl text-xs font-semibold transition-all ${
              technique === 'physiological-sigh'
                ? 'clay-tile-emerald'
                : 'clay-button text-slate-600 dark:text-slate-300'
            }`}
          >
            Physiological Sigh
            <span className="block text-[10px] font-normal opacity-80 mt-0.5">Fastest Relief (Huberman)</span>
          </button>

          <button
            onClick={() => {
              setTechnique('box-breathing');
              handleReset();
            }}
            className={`p-3 rounded-2xl text-xs font-semibold transition-all ${
              technique === 'box-breathing'
                ? 'clay-tile-cyan'
                : 'clay-button text-slate-600 dark:text-slate-300'
            }`}
          >
            Box Breathing
            <span className="block text-[10px] font-normal opacity-80 mt-0.5">Navy SEAL Focus (4-4-4)</span>
          </button>
        </div>

        {/* Central Breathing Orb */}
        <div className="relative py-12 flex flex-col items-center justify-center">
          
          {/* Animated concentric ripples */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            
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
              className="w-48 h-48 rounded-full clay-dial-rim flex flex-col items-center justify-center text-center p-4 z-10 select-none shadow-2xl"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                {getPhaseInstruction()}
              </span>

              <div className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {isActive ? `${phaseTimeLeft}s` : 'START'}
              </div>

              <span className="text-xs text-slate-400 mt-1">
                Cycle {cyclesCompleted}/5
              </span>
            </motion.div>
          </div>
        </div>

        {/* Science Tip Pill */}
        <div className="clay-card-subtle p-3.5 mb-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Why it works: </span>
          {technique === 'physiological-sigh'
            ? 'Two rapid inhales pop collapsed alveoli in the lungs; the extended exhale dumps CO2 and activates the vagus nerve to slow heart rate immediately.'
            : 'Equal 4-second intervals balance oxygen and carbon dioxide, halting the fight-or-flight sympathetic response.'}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleReset}
            className="w-12 h-12 rounded-2xl clay-button flex items-center justify-center text-slate-600 dark:text-slate-300"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={isActive ? handlePause : handleStart}
            className="flex-1 py-3.5 rounded-2xl clay-tile-emerald flex items-center justify-center gap-2 font-semibold text-sm shadow-lg"
          >
            {isActive ? (
              <>
                <Pause size={18} /> Pause Breathwork
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" /> Begin De-escalation
              </>
            )}
          </button>

          {cyclesCompleted >= 2 && (
            <button
              onClick={() => setIsFinished(true)}
              className="w-12 h-12 rounded-2xl clay-button text-emerald-600 flex items-center justify-center"
              title="Log outcome"
            >
              <CheckCircle2 size={20} />
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
