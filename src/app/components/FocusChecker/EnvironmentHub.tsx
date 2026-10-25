import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Wind, 
  Zap, 
  Headphones, 
  Activity, 
  ShieldCheck, 
  CloudSun, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { audioEngine } from '../../services/audioEngine';

interface EnvironmentHubProps {
  userName: string;
  onOpenStressReset: () => void;
  activeSoundscape: string;
  onToggleSoundscape: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
}

export function EnvironmentHub({
  userName,
  onOpenStressReset,
  activeSoundscape,
  onToggleSoundscape,
}: EnvironmentHubProps) {
  const [circadianLightOn, setCircadianLightOn] = useState<boolean>(true);
  const [binauralAudioOn, setBinauralAudioOn] = useState<boolean>(activeSoundscape !== 'none');

  const handleToggleAudio = () => {
    if (activeSoundscape !== 'none') {
      audioEngine.stop();
      onToggleSoundscape('gamma');
      setBinauralAudioOn(false);
    } else {
      onToggleSoundscape('gamma');
      setBinauralAudioOn(true);
    }
  };

  const handleToggleCircadian = () => {
    setCircadianLightOn(!circadianLightOn);
    toast.info(!circadianLightOn ? "Circadian warm spectrum engaged" : "Default light mode restored");
  };

  return (
    <div className="clay-card p-4 sm:p-5 md:p-6 space-y-3.5 select-none">
      
      {/* Top User Greeting (Hey, Vitaliy style from image) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full clay-dial-rim flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
              Hey, {userName.split(' ')[0]}
            </h3>
            <p className="text-[11px] text-slate-400">Manage your focus atmosphere</p>
          </div>
        </div>

        <div className="w-3 h-3 rounded-full bg-amber-400 shadow-lg shadow-amber-400/40 animate-pulse" />
      </div>

      {/* Weather / Circadian Atmosphere Card (Today 23° Sun with a cool style) */}
      <div className="clay-card-subtle p-3.5 relative overflow-hidden space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
            Circadian Phase
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            Peak Dopamine
          </span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl clay-button flex items-center justify-center text-amber-500">
              <CloudSun size={24} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-baseline gap-1.5">
                23° <span className="text-xs font-normal text-slate-400">Optimal Temp</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Cool airflow with low cognitive friction
              </p>
            </div>
          </div>
        </div>

        {/* Triple Micro Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
          <div>
            <div className="text-[9px] text-slate-400">Cognitive Load</div>
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">24%</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Resonance</div>
            <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5">82%</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Vagal Tone</div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">74 ms</div>
          </div>
        </div>
      </div>

      {/* Focus Station / Controls (My home section in image) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Atmosphere Hub</span>
          <span className="text-sky-500 text-[10px]">Optimal Alignment</span>
        </div>

        {/* Energy Banner (Energy 15.2 kWh style) */}
        <div className="clay-tile-emerald p-3 rounded-2xl flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-white/20 text-white">
              <Zap size={16} />
            </div>
            <div>
              <div className="text-[10px] font-bold">Neural Energy Output</div>
              <div className="text-sm font-extrabold font-mono leading-tight">15.2 kWh equivalent</div>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/25 text-white">
            2x Flow Active
          </span>
        </div>

        {/* Dual Control Cards with ON/OFF Switches (Light & Climate in reference image) */}
        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
          
          {/* Tile 1: Circadian Lighting */}
          <div className="clay-card-subtle p-3 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase ${circadianLightOn ? 'text-amber-500' : 'text-slate-400'}`}>
                {circadianLightOn ? 'ON' : 'OFF'}
              </span>

              {/* Physical Toggle Switch */}
              <button
                onClick={handleToggleCircadian}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  circadianLightOn ? 'bg-amber-500' : 'clay-switch-track'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full clay-switch-thumb transition-transform ${
                    circadianLightOn ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="text-center py-0.5">
              <div className="w-8 h-8 rounded-xl clay-button flex items-center justify-center text-amber-500 mx-auto mb-1">
                <Sun size={16} />
              </div>
              <div className="text-[11px] font-bold text-slate-900 dark:text-white">Circadian Light</div>
              <div className="text-[9px] text-slate-400 mt-0.5">2hr 19min flow</div>
            </div>
          </div>

          {/* Tile 2: Binaural Waves (Purple Tile in reference image) */}
          <div className={`p-3 rounded-2xl flex flex-col justify-between space-y-2 transition-all ${
            binauralAudioOn || activeSoundscape !== 'none'
              ? 'clay-tile-violet shadow-lg'
              : 'clay-card-subtle'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase ${
                binauralAudioOn || activeSoundscape !== 'none' ? 'text-white' : 'text-slate-400'
              }`}>
                {binauralAudioOn || activeSoundscape !== 'none' ? 'ON' : 'OFF'}
              </span>

              {/* Physical Toggle Switch */}
              <button
                onClick={handleToggleAudio}
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  binauralAudioOn || activeSoundscape !== 'none' ? 'bg-white/40' : 'clay-switch-track'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    binauralAudioOn || activeSoundscape !== 'none' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="text-center py-0.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1 ${
                binauralAudioOn || activeSoundscape !== 'none' ? 'bg-white/20 text-white' : 'clay-button text-purple-500'
              }`}>
                <Headphones size={16} />
              </div>
              <div className="text-[11px] font-bold">40Hz Gamma</div>
              <div className={`text-[9px] mt-0.5 ${
                binauralAudioOn || activeSoundscape !== 'none' ? 'text-white/80' : 'text-slate-400'
              }`}>
                {activeSoundscape !== 'none' ? 'Active stream' : 'Headphones ready'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Calming Sigh Action Row */}
        <div
          onClick={onOpenStressReset}
          className="clay-card-subtle p-2.5 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Quick Physiological Sigh
              </div>
              <div className="text-[9px] text-slate-400">2 min autonomic nervous reset</div>
            </div>
          </div>

          <ChevronRight size={14} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
