import React, { useState } from 'react';
import { Volume2, VolumeX, Headphones, Zap, Sparkles, Waves, CloudRain, Lock, Mountain } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { toast } from 'sonner';
import { RangeInput } from '../ui/RangeInput';
import { useEntitlement } from '../../context/EntitlementContext';
import { MixBuilder } from '../Pro/MixBuilder';
import { ProLock } from '../Pro/ProLock';

type Sel = 'gamma' | 'alpha' | 'pink' | 'rain' | 'brown' | 'waves';

interface SoundscapesProps {
  activeSoundscape: string;
  onSelectPreset: (preset: Sel | 'mix' | 'none') => void;
  userId?: string | null;
}

export function Soundscapes({ activeSoundscape, onSelectPreset, userId = null }: SoundscapesProps) {
  const { ent, openUpgrade } = useEntitlement();
  const [volume, setVolume] = useState<number>(0.6);

  const presets = [
    {
      id: 'gamma' as const,
      name: '40Hz Gamma Focus',
      description: 'A steady 40Hz binaural beat that many people use for demanding, detail-heavy work. Needs stereo headphones.',
      icon: Zap,
      gradient: 'clay-tile-cyan',
      tag: 'Deep work',
    },
    {
      id: 'alpha' as const,
      name: '10Hz Alpha Flow',
      description: 'A slower 10Hz binaural beat many people find relaxing for reading and planning. Needs stereo headphones.',
      icon: Sparkles,
      gradient: 'clay-tile-violet',
      tag: 'Reading & planning',
    },
    {
      id: 'pink' as const,
      name: 'Broadband Pink Noise',
      description: 'Softer and deeper than white noise. Helps cover up background chatter. Works on any speaker.',
      icon: Waves,
      gradient: 'clay-tile-amber',
      tag: 'Masks noise',
    },
    {
      id: 'rain' as const,
      name: 'Organic Rain Mask',
      description: 'Gentle, ever-changing rain that masks distractions. Generated live, so it never loops.',
      icon: CloudRain,
      gradient: 'clay-tile-emerald',
      tag: 'Calm',
    },
    {
      id: 'brown' as const,
      name: 'Brown Noise',
      description: 'Deep, low rumble that blankets open-office and street noise. Works on any speaker.',
      icon: Mountain,
      gradient: 'clay-tile-violet',
      tag: 'Pro · Deep mask',
      pro: true,
    },
    {
      id: 'waves' as const,
      name: 'Ocean Waves',
      description: 'Slow, rolling waves generated live, so they never loop.',
      icon: Waves,
      gradient: 'clay-tile-cyan',
      tag: 'Pro · Calm',
      pro: true,
    },
  ];

  const NAMES: Record<Sel, string> = { gamma: '40Hz focus tone', alpha: '10Hz relax tone', pink: 'pink noise', rain: 'rain', brown: 'brown noise', waves: 'ocean waves' };
  const handleToggle = (id: Sel) => {
    if ((id === 'brown' || id === 'waves') && !ent.pro) { openUpgrade(); return; }
    if (activeSoundscape === id) {
      audioEngine.stop();
      onSelectPreset('none');
      toast.info('Sound off');
    } else {
      audioEngine.playPreset(id, volume);
      onSelectPreset(id);
      toast.success(`Playing ${NAMES[id]}`);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="clay-card p-3.5 sm:p-4.5 space-y-3">
        
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Headphones size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                Focus sounds
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generated live on your device. Works offline.</p>
            </div>
          </div>

          {activeSoundscape !== 'none' && (
            <button
              onClick={() => {
                audioEngine.stop();
                onSelectPreset('none');
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold clay-button text-red-500 flex items-center gap-1.5"
            >
              <VolumeX size={13} /> Stop
            </button>
          )}
        </div>

        {/* Master Volume Slider */}
        <div className="clay-card-subtle p-2 sm:p-2.5 rounded-xl flex items-center gap-3">
          <Volume2 size={16} className="text-slate-600 dark:text-slate-400 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-semibold mb-0.5 text-slate-700 dark:text-slate-300">
              <label htmlFor="master-volume">Volume</label>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <RangeInput
              id="master-volume"
              accent="sky"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Soundscape Grid */}
        <div data-tour="sound-grid" className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isPlaying = activeSoundscape === p.id;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleToggle(p.id)}
                aria-pressed={isPlaying}
                className={`p-3 sm:p-3.5 rounded-xl text-left w-full cursor-pointer transition-all duration-200 border ${
                  isPlaying
                    ? `${p.gradient} scale-[1.01]`
                    : 'clay-button hover:border-slate-300 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${isPlaying ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isPlaying ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {'pro' in p && p.pro && !ent.pro && <Lock size={10} aria-label="Pro" />}{p.tag}
                  </span>
                </div>

                <h4 className="font-bold text-xs sm:text-sm mb-0.5">{p.name}</h4>
                <p className={`text-xs leading-snug ${isPlaying ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
                  {p.description}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-xs font-semibold">
                  <span>{isPlaying ? 'Playing · tap to stop' : 'pro' in p && p.pro && !ent.pro ? 'Pro · tap to learn more' : 'Tap to play'}</span>
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div data-tour="mixer">
        {ent.pro ? (
          <MixBuilder userId={userId} masterVolume={volume} onPlay={() => onSelectPreset('mix')} />
        ) : (
          <ProLock title="Custom sound mixes" body="Layer up to six sounds, set each volume and save your own mixes to every device." onUpgrade={openUpgrade} />
        )}
        </div>

        {/* Info callout */}
        <div className="p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
          <span className="font-semibold">About the 40Hz and 10Hz tones: </span>
          Each ear gets a slightly different pitch and your brain hears the difference as a beat, so they only work with stereo headphones. Effects vary from person to person; if a sound bothers you, stop it.
        </div>
      </div>
    </div>
  );
}
