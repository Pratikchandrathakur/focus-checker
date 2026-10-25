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
      description: 'Gentle brainwave entrainment for relaxed alertness and creative flow.',
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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="clay-card p-6 md:p-8 space-y-6">
        
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Headphones size={22} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                Neuroscience Soundscapes
              </h3>
              <p className="text-xs text-slate-500">Synthesized locally in real-time — headphones recommended</p>
            </div>
          </div>

          {activeSoundscape !== 'none' && (
            <button
              onClick={() => {
                audioEngine.stop();
                onSelectPreset('none');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold clay-button text-red-500 flex items-center gap-1.5"
            >
              <VolumeX size={14} /> Stop
            </button>
          )}
        </div>

        {/* Master Volume Slider */}
        <div className="clay-card-subtle p-4 flex items-center gap-4">
          <Volume2 size={18} className="text-slate-500 shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
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
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Soundscape Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isPlaying = activeSoundscape === p.id;

            return (
              <div
                key={p.id}
                onClick={() => handleToggle(p.id)}
                className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  isPlaying
                    ? `${p.gradient} scale-[1.01]`
                    : 'clay-button hover:border-slate-300 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl ${isPlaying ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    isPlaying ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}>
                    {p.tag}
                  </span>
                </div>

                <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                <p className={`text-xs leading-relaxed ${isPlaying ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'}`}>
                  {p.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs font-semibold">
                  <span>{isPlaying ? 'Currently Active' : 'Tap to Activate'}</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-white animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Info callout */}
        <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
          <span className="font-semibold">Binaural Beats Note: </span>
          Gamma and Alpha presets work through stereo frequency disparity (e.g., 220Hz left, 260Hz right). To experience the neural entrainment effect, wear stereo headphones.
        </div>
      </div>
    </div>
  );
}
