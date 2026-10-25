import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { 
  TrendingUp, 
  Zap, 
  Clock, 
  Calendar, 
  Brain, 
  MapPin, 
  Moon, 
  Coffee, 
  ShieldCheck, 
  Sparkles,
  Wind,
  Activity
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { isFocusSession, isStressReset, insights, overallScore, weeklySeries, MIN_SESSIONS_FOR_PATTERNS } from '../../services/stats';

interface DashboardProps {
  history: HistoryItem[];
  onOpenQuickCheck?: () => void;
  onOpenStressReset?: () => void;
  onOpenDial?: () => void;
}

export function Dashboard({ history, onOpenQuickCheck, onOpenStressReset, onOpenDial }: DashboardProps) {
  const sessions = useMemo(() => history.filter(isFocusSession), [history]);
  const stressResets = useMemo(() => history.filter(isStressReset), [history]);
  const avgScore = useMemo(() => overallScore(history), [history]);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const info = useMemo(() => insights(history), [history]);
  const chartData = useMemo(() => weeklySeries(history), [history]);
  const hasChartData = chartData.some((d) => d.score !== null);
  const scoreLabel = avgScore === null ? 'No data yet' : avgScore >= 75 ? 'Strong' : avgScore >= 55 ? 'Steady' : 'Room to grow';

  if (history.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto clay-card p-8 md:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center mx-auto">
          <Activity size={22} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your analytics start with one session</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Complete and rate a focus block, take a readiness check or do a breathing reset. Charts appear right away;
          personal patterns like your best time of day unlock after {MIN_SESSIONS_FOR_PATTERNS} rated sessions.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          {onOpenDial && (
            <button onClick={onOpenDial} className="px-5 py-2.5 rounded-xl clay-tile-cyan text-xs font-bold">Start a focus block</button>
          )}
          {onOpenQuickCheck && (
            <button onClick={onOpenQuickCheck} className="px-5 py-2.5 rounded-xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300">Take readiness check</button>
          )}
          {onOpenStressReset && (
            <button onClick={onOpenStressReset} className="px-5 py-2.5 rounded-xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300">Breathing reset</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-7">
      
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: Average Focus */}
        <div className="clay-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg. score</span>
            <div className="p-2 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {avgScore === null ? '—' : `${avgScore}%`}
          </div>
          <span className="inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {scoreLabel}
          </span>
        </div>

        {/* Stat 2: Total Hours */}
        <div className="clay-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Deep Work</span>
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {totalHours}h
          </div>
          <span className="inline-block text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} logged
          </span>
        </div>

        {/* Stat 3: Stress Resets */}
        <div className="clay-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Resets</span>
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={16} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {stressResets.length}
          </div>
          <span className="inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Breathing resets
          </span>
        </div>

        {/* Stat 4: Optimal Span */}
        <div className="clay-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Attention span</span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Brain size={16} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            {info.avgAttentionSpan === null ? '—' : `${info.avgAttentionSpan}m`}
          </div>
          <span className="inline-block text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            {info.avgAttentionSpan === null ? 'Log a focus session' : 'Before focus fades'}
          </span>
        </div>
      </div>

      {/* Main Trends Chart */}
      <div className="clay-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
              Last 7 days
            </h3>
            <p className="text-xs text-slate-500">Average score of everything you logged each day</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-sky-500">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Focus Score
            </span>
          </div>
        </div>

        <div className="h-[280px] w-full relative">
          {!hasChartData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 z-10">
              Nothing logged in the last 7 days
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#0ea5e9"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#scoreGlow)"
                connectNulls
                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                name="Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personal patterns */}
      <div className="clay-card-subtle p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Sparkles size={16} className="text-amber-500" />
            <span>Your patterns</span>
          </div>
          {!info.enough && (
            <span className="text-[11px] text-slate-500">
              {MIN_SESSIONS_FOR_PATTERNS - sessions.length} more rated {MIN_SESSIONS_FOR_PATTERNS - sessions.length === 1 ? 'session' : 'sessions'} to unlock
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="clay-card p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold">Best time of day</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{info.bestTimeOfDay ?? 'Not enough data yet'}</div>
            <p className="text-[10px] text-slate-500">The 2-hour window where your sessions score highest</p>
          </div>

          <div className="clay-card p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold">Suggested break interval</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {info.suggestedBreakInterval ? `Every ${info.suggestedBreakInterval} minutes` : 'Not enough data yet'}
            </div>
            <p className="text-[10px] text-slate-500">Based on when you report your attention fading</p>
          </div>

          <div className="clay-card p-4 space-y-1">
            <span className="text-[11px] text-slate-400 font-semibold">Stress change after resets</span>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {info.stressReductionPct === null ? 'Not enough data yet' : `${info.stressReductionPct > 0 ? '−' : '+'}${Math.abs(info.stressReductionPct)}% self-rated`}
            </div>
            <p className="text-[10px] text-slate-500">Your before/after ratings from breathing sessions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
