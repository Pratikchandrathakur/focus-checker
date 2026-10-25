import React from 'react';
import { Sun, Wind, Zap, Headphones, ChevronRight, Sunrise, Sunset, MoonStar, Target } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface EnvironmentHubProps {
  userName: string;
  onOpenStressReset: () => void;
  activeSoundscape: string;
  onToggleSoundscape: (preset: 'gamma' | 'alpha' | 'pink' | 'rain') => void;
  onStopSoundscape?: () => void;
  warmLight: boolean;
  onToggleWarmLight: () => void;
  today: { focusMinutes: number; sessions: number; resets: number };
  streakDays: number;
  dailyGoalMinutes: number;
  onCycleDailyGoal: () => void;
}

function dayPhase(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 12) return { greet: 'Good morning', label: 'Morning', hint: 'Often a strong window for demanding work.', Icon: Sunrise };
  if (h >= 12 && h < 17) return { greet: 'Good afternoon', label: 'Afternoon', hint: 'Energy often dips after lunch — shorter blocks help.', Icon: Sun };
  if (h >= 17 && h < 22) return { greet: 'Good evening', label: 'Evening', hint: 'Good time to wrap up and review.', Icon: Sunset };
  return { greet: 'Working late', label: 'Night', hint: 'Warm light is easier on the eyes at night.', Icon: MoonStar };
}

export function EnvironmentHub({
  userName,
  onOpenStressReset,
  activeSoundscape,
  onToggleSoundscape,
  onStopSoundscape,
  warmLight,
  onToggleWarmLight,
  today,
  streakDays,
  dailyGoalMinutes,
  onCycleDailyGoal,
}: EnvironmentHubProps) {
  const phase = dayPhase();
  const goalPct = Math.min(100, Math.round((today.focusMinutes / dailyGoalMinutes) * 100));
  const binauralAudioOn = activeSoundscape !== 'none';

  const handleToggleAudio = () => {
    if (activeSoundscape !== 'none') {
      if (onStopSoundscape) onStopSoundscape();
      else audioEngine.stop();
    } else {
      onToggleSoundscape('gamma');
    }
  };

  return (
    <div className="clay-card p-3 sm:p-3.5 lg:p-4 space-y-2.5 select-none">
      
      {/* Top User Greeting (Hey, Vitaliy style from image) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full clay-dial-rim flex items-center justify-center font-bold text-sky-600 dark:text-sky-400 text-xs">
            {userName ? userName.charAt(0).toUpperCase() : <Zap size={13} />}
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
              {phase.greet}{userName ? `, ${userName.split(' ')[0]}` : ''}
            </h3>
            <p className="text-[10px] text-slate-400">Your focus environment</p>
          </div>
        </div>

        <div className={`w-2.5 h-2.5 rounded-full ${binauralAudioOn ? 'bg-violet-500 shadow-violet-500/40 animate-pulse' : 'bg-amber-400 shadow-amber-400/40'} shadow-lg`} title={binauralAudioOn ? 'Audio playing' : 'Audio off'} />
      </div>

      {/* Today */}
      <div className="clay-card-subtle p-2.5 sm:p-3 relative overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Today</span>
          <span className="text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            {phase.label}
          </span>
        </div>

        <div className="flex items-center gap-2.5 py-0.5">
          <div className="w-9 h-9 rounded-xl clay-button flex items-center justify-center text-amber-500 shrink-0">
            <phase.Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono flex items-baseline gap-1.5 leading-none">
              {today.focusMinutes}<span className="text-xs font-normal text-slate-400 font-sans">min focused</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{phase.hint}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
          <div>
            <div className="text-[9px] text-slate-400">Sessions</div>
            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{today.sessions}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Breathing resets</div>
            <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5">{today.resets}</div>
          </div>
          <div>
            <div className="text-[9px] text-slate-400">Streak</div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {streakDays} {streakDays === 1 ? 'day' : 'days'}
            </div>
          </div>
        </div>
      </div>

      {/* Focus Station / Controls (My home section in image) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Environment</span>
          <span className="text-sky-500 text-[10px]">{warmLight || binauralAudioOn ? 'Customised' : 'Default'}</span>
        </div>

        {/* Daily goal */}
        <button
          onClick={onCycleDailyGoal}
          className="w-full text-left clay-tile-emerald p-2.5 rounded-xl shadow-md space-y-1.5"
          title="Tap to change your daily goal"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-white/20 text-white">
                <Target size={15} />
              </div>
              <div>
                <div className="text-[9px] font-bold">Daily focus goal</div>
                <div className="text-xs sm:text-sm font-extrabold font-mono leading-tight">
                  {today.focusMinutes} / {dailyGoalMinutes} min
                </div>
              </div>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white">
              {goalPct >= 100 ? 'Goal met' : `${goalPct}%`}
            </span>
          </div>
          <div className="h-1 rounded-full bg-white/25 overflow-hidden">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${goalPct}%` }} />
          </div>
        </button>

        {/* Dual Control Cards with ON/OFF Switches (Light & Climate in reference image) */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          
          {/* Tile 1: Circadian Lighting */}
          <div className="clay-card-subtle p-2.5 rounded-xl flex flex-col justify-between space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase ${warmLight ? 'text-amber-500' : 'text-slate-400'}`}>
                {warmLight ? 'ON' : 'OFF'}
              </span>

              {/* Physical Toggle Switch */}
              <button
                onClick={onToggleWarmLight}
                role="switch"
                aria-checked={warmLight}
                aria-label="Warm light filter"
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  warmLight ? 'bg-amber-500' : 'clay-switch-track'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full clay-switch-thumb transition-transform ${
                    warmLight ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="text-center py-0.5">
              <div className="w-7 h-7 rounded-lg clay-button flex items-center justify-center text-amber-500 mx-auto mb-0.5">
                <Sun size={15} />
              </div>
              <div className="text-[10px] font-bold text-slate-900 dark:text-white leading-tight">Warm light</div>
              <div className="text-[8px] text-slate-400 mt-0.5">Softer screen tint</div>
            </div>
          </div>

          {/* Tile 2: Binaural Waves (Purple Tile in reference image) */}
          <div className={`p-2.5 rounded-xl flex flex-col justify-between space-y-1.5 transition-all ${
            binauralAudioOn
              ? 'clay-tile-violet shadow-md'
              : 'clay-card-subtle'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-bold uppercase ${
                binauralAudioOn ? 'text-white' : 'text-slate-400'
              }`}>
                {binauralAudioOn ? 'ON' : 'OFF'}
              </span>

              {/* Physical Toggle Switch */}
              <button
                onClick={handleToggleAudio}
                role="switch"
                aria-checked={binauralAudioOn}
                aria-label="40Hz focus tone"
                className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                  binauralAudioOn ? 'bg-white/40' : 'clay-switch-track'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                    binauralAudioOn ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="text-center py-0.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1 ${
                binauralAudioOn ? 'bg-white/20 text-white' : 'clay-button text-purple-500'
              }`}>
                <Headphones size={16} />
              </div>
              <div className="text-[11px] font-bold">40Hz tone</div>
              <div className={`text-[9px] mt-0.5 ${
                binauralAudioOn ? 'text-white/80' : 'text-slate-400'
              }`}>
                {activeSoundscape !== 'none' ? 'Active stream' : 'Headphones ready'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Calming Sigh Action Row */}
        <button
          onClick={onOpenStressReset}
          className="w-full text-left clay-card-subtle p-2.5 flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={15} />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                Quick breathing reset
              </div>
              <div className="text-[9px] text-slate-400">2-minute guided physiological sigh</div>
            </div>
          </div>

          <ChevronRight size={14} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
}
