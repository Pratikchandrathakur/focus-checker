import React, { useState } from 'react';
import { Volume2, VolumeX, Headphones, Zap, Sparkles, Waves, CloudRain } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';
import { toast } from 'sonner';

interface SoundscapesProps {
  activeSoundscape: string;
  onSelectPreset: (preset: 'gamma' | 'alpha' | 'pink' | 'rain' | 'none') => void;
}

export function Soundscapes({ activeSoundscape, onSelectPreset }: SoundscapesProps) {
  const [volume, setVolume] = useState<number>(0.6);

  const presets = [
    {
      id: 'gamma' as const,
      name: '40Hz Gamma Focus',
      description: 'Binaural carrier for peak cognitive processing and working memory.',
      icon: Zap,
      gradient: 'clay-tile-cyan',
      tag: 'Deep Coding & Logic',
    },
    {
      id: 'alpha' as const,
      name: '10Hz Alpha Flow',
      description: 'A slower 10Hz beat many people find calming for reading and planning.',
      icon: Sparkles,
      gradient: 'clay-tile-violet',
      tag: 'Reading & Strategy',
    },
    {
      id: 'pink' as const,
      name: 'Broadband Pink Noise',
      description: 'Deeper than white noise (1/f spectral density), shields intrusive speech.',
      icon: Waves,
      gradient: 'clay-tile-amber',
      tag: 'Distraction Shield',
    },
    {
      id: 'rain' as const,
      name: 'Organic Rain Mask',
      description: 'Natural frequency spectrum proven to decrease stress hormones.',
      icon: CloudRain,
      gradient: 'clay-tile-emerald',
      tag: 'Calm & Steady',
    },
  ];

  const handleToggle = (id: 'gamma' | 'alpha' | 'pink' | 'rain') => {
    if (activeSoundscape === id) {
      audioEngine.stop();
      onSelectPreset('none');
      toast.info("Audio disabled");
    } else {
      audioEngine.playPreset(id, volume);
      onSelectPreset(id);
      toast.success(`Playing ${id === 'gamma' ? '40Hz Gamma' : id === 'alpha' ? '10Hz Alpha' : id} soundscape`);
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
                Neuroscience Soundscapes
              </h3>
              <p className="text-[10px] text-slate-500">Synthesized locally in real-time — headphones recommended</p>
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
          <Volume2 size={16} className="text-slate-500 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-semibold mb-0.5 text-slate-700 dark:text-slate-300">
              <span>Master Soundscape Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer h-1.5"
            />
          </div>
        </div>

        {/* Soundscape Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isPlaying = activeSoundscape === p.id;

            return (
              <div
                key={p.id}
                onClick={() => handleToggle(p.id)}
                className={`p-3 sm:p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                  isPlaying
                    ? `${p.gradient} scale-[1.01]`
                    : 'clay-button hover:border-slate-300 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className={`p-1.5 rounded-lg ${isPlaying ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    isPlaying ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {p.tag}
                  </span>
                </div>

                <h4 className="font-bold text-xs sm:text-sm mb-0.5">{p.name}</h4>
                <p className={`text-[11px] leading-snug line-clamp-2 ${isPlaying ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
                  {p.description}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold">
                  <span>{isPlaying ? 'Currently Active' : 'Tap to Activate'}</span>
                  <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info callout */}
        <div className="p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-[10px] text-sky-800 dark:text-sky-300 leading-relaxed">
          <span className="font-semibold">Binaural Beats Note: </span>
          Gamma and Alpha presets work through stereo frequency disparity (e.g., 220Hz left, 260Hz right). Wear stereo headphones to hear the beat.
        </div>
      </div>
    </div>
  );
}
