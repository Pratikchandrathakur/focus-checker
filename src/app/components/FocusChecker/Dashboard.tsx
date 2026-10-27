import React, { useEffect, useMemo, useState } from 'react';
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
  Activity,
  Lock
} from 'lucide-react';
import { HistoryItem } from '../../types';
import { isFocusSession, isStressReset, insights, overallScore, trendSeries, filterRange, MIN_SESSIONS_FOR_PATTERNS } from '../../services/stats';
import { bestHours, breakCadence, sleepFocus } from '../../services/patterns';
import { historyRangeAllowed } from '../../services/entitlements';
import { getWeeklyEmail, setWeeklyEmail } from '../../services/proData';
import { supabase } from '../../services/supabase';
import { useEntitlement } from '../../context/EntitlementContext';
import { ProLock } from '../Pro/ProLock';
import { buildWeeklyReport } from '../../../../supabase/functions/_shared/report';
import { toast } from 'sonner';

const RANGES: { label: string; days: number | null }[] = [
  { label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }, { label: 'All time', days: null },
];

interface DashboardProps {
  history: HistoryItem[];
  onOpenQuickCheck?: () => void;
  onOpenStressReset?: () => void;
  onOpenDial?: () => void;
  /** Cloud account id (null for guests): needed for the weekly-email setting. */
  userId?: string | null;
}

type Pat = { status: string; have?: number; need?: number; reason?: string } | null;
const needText = (p: Pat, what: string) =>
  p && p.status === 'insufficient' ? (p.reason ?? `Needs ${Math.max(1, (p.need ?? 0) - (p.have ?? 0))} more ${what}.`) : '';
const cadenceText = (c: Extract<ReturnType<typeof breakCadence>, { status: 'ok' }>) =>
  `You usually take your first break about ${c.typicalStretchMinutes} min in.` +
  (c.suggestedEveryMinutes ? ` Your attention tends to fade near ${c.suggestedEveryMinutes} min, so a break around then may help.` : '') +
  (c.scoreWithBreaks !== null && c.scoreWithoutBreaks !== null ? ` Sessions with breaks averaged ${c.scoreWithBreaks}% vs ${c.scoreWithoutBreaks}% without.` : '');

export function Dashboard({ history: allHistory, onOpenQuickCheck, onOpenStressReset, onOpenDial, userId = null }: DashboardProps) {
  const { ent, openUpgrade } = useEntitlement();
  const [range, setRange] = useState<number | null>(7);
  // Anything the account may not use falls back to 7 days (e.g. after Pro ends).
  const activeRange = historyRangeAllowed(ent, range) ? range : 7;
  const history = useMemo(() => filterRange(allHistory, activeRange), [allHistory, activeRange]);
  const [weeklyEmail, setWeeklyEmailState] = useState(false);
  useEffect(() => {
    let live = true;
    if (ent.pro && userId && supabase) getWeeklyEmail(supabase, userId).then((v) => { if (live) setWeeklyEmailState(v); });
    return () => { live = false; };
  }, [ent.pro, userId]);
  const toggleEmail = async () => {
    if (!userId || !supabase) return;
    const next = !weeklyEmail;
    const r = await setWeeklyEmail(supabase, userId, next);
    if (r.ok) { setWeeklyEmailState(next); toast.success(next ? 'Weekly report on' : 'Weekly report off'); }
    else toast.error(r.error);
  };
  const sessions = useMemo(() => history.filter(isFocusSession), [history]);
  const stressResets = useMemo(() => history.filter(isStressReset), [history]);
  const avgScore = useMemo(() => overallScore(history), [history]);
  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const info = useMemo(() => insights(history), [history]);
  const trend = useMemo(() => trendSeries(allHistory, activeRange), [allHistory, activeRange]);
  const chartData = trend.points;
  const hasChartData = chartData.some((d) => d.score !== null);
  const proSessions = useMemo(() => allHistory.filter(isFocusSession), [allHistory]);
  const hours = useMemo(() => (ent.pro ? bestHours(proSessions) : null), [ent.pro, proSessions]);
  const cadence = useMemo(() => (ent.pro ? breakCadence(proSessions) : null), [ent.pro, proSessions]);
  const sleep = useMemo(() => (ent.pro ? sleepFocus(proSessions) : null), [ent.pro, proSessions]);
  const report = useMemo(
    () => (ent.pro ? buildWeeklyReport(allHistory, { now: new Date(), utcOffsetMinutes: -new Date().getTimezoneOffset() }) : null),
    [ent.pro, allHistory],
  );
  const rangeLabel = RANGES.find((r) => r.days === activeRange)?.label ?? '7 days';
  const scoreLabel = avgScore === null ? 'No data yet' : avgScore >= 75 ? 'Strong' : avgScore >= 55 ? 'Steady' : 'Room to grow';

  if (allHistory.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto clay-card p-8 md:p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl clay-tile-cyan flex items-center justify-center mx-auto">
          <Activity size={22} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your analytics start with one session</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
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
    <div className="w-full max-w-5xl mx-auto space-y-3.5 sm:space-y-4">
      <div role="group" aria-label="Analytics range" className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => {
          const allowed = historyRangeAllowed(ent, r.days);
          const on = r.days === activeRange;
          return (
            <button
              key={r.label}
              type="button"
              aria-pressed={on}
              onClick={() => (allowed ? setRange(r.days) : openUpgrade())}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 ${on ? 'clay-tile-cyan' : 'clay-button text-slate-700 dark:text-slate-300'}`}
              title={allowed ? undefined : 'Pro: longer analytics ranges'}
            >
              {r.label}{!allowed && <Lock size={11} aria-label="Pro" />}
            </button>
          );
        })}
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        
        {/* Stat 1: Average Focus */}
        <div className="clay-card p-3 sm:p-3.5 space-y-1 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Avg. score</span>
            <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              <Zap size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
            {avgScore === null ? '—' : `${avgScore}%`}
          </div>
          <span className="inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {scoreLabel}
          </span>
        </div>

        {/* Stat 2: Total Hours */}
        <div className="clay-card p-3 sm:p-3.5 space-y-1 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Deep Work</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
            {totalHours}h
          </div>
          <span className="inline-block text-[11px] font-semibold text-sky-600 dark:text-sky-400">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} logged
          </span>
        </div>

        {/* Stat 3: Stress Resets */}
        <div className="clay-card p-3 sm:p-3.5 space-y-1 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Resets</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Wind size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
            {stressResets.length}
          </div>
          <span className="inline-block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Breathing resets
          </span>
        </div>

        {/* Stat 4: Optimal Span */}
        <div className="clay-card p-3 sm:p-3.5 space-y-1 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Attention span</span>
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Brain size={14} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono leading-none">
            {info.avgAttentionSpan === null ? '—' : `${info.avgAttentionSpan}m`}
          </div>
          <span className="inline-block text-[11px] font-semibold text-purple-600 dark:text-purple-400">
            {info.avgAttentionSpan === null ? 'Log a focus session' : 'Before focus fades'}
          </span>
        </div>
      </div>

      {/* Main Trends Chart */}
      <div className="clay-card p-3.5 sm:p-4.5 space-y-2.5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
              Last {rangeLabel === 'All time' ? 'all time' : rangeLabel}
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Average score of everything you logged each day</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1.5 text-sky-500">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Focus Score
            </span>
          </div>
        </div>

        <div className="h-[180px] sm:h-[200px] w-full relative">
          {!hasChartData && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400 z-10">
              Nothing logged in this range
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
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 100]} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: 'none',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#scoreGlow)"
                connectNulls
                dot={{ r: 3.5, fill: '#0ea5e9', strokeWidth: 0 }}
                name="Score"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personal patterns */}
      <div className="clay-card-subtle p-3 sm:p-3.5 space-y-2 rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Sparkles size={14} className="text-amber-500" />
            <span>Your patterns</span>
          </div>
          {!info.enough && (
            <span className="text-[11px] text-slate-600 dark:text-slate-400">
              {MIN_SESSIONS_FOR_PATTERNS - sessions.length} more rated {MIN_SESSIONS_FOR_PATTERNS - sessions.length === 1 ? 'session' : 'sessions'} to unlock
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div className="clay-card p-2.5 space-y-0.5 rounded-xl">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Best time of day</span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{info.bestTimeOfDay ?? 'Not enough data yet'}</div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Highest scoring 2-hour window</p>
          </div>

          <div className="clay-card p-2.5 space-y-0.5 rounded-xl">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Suggested break interval</span>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {info.suggestedBreakInterval ? `Every ${info.suggestedBreakInterval} minutes` : 'Not enough data yet'}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">When attention typically fades</p>
          </div>

          <div className="clay-card p-2.5 space-y-0.5 rounded-xl">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Stress change after resets</span>
            <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {info.stressReductionPct === null ? 'Not enough data yet' : `${info.stressReductionPct > 0 ? '−' : '+'}${Math.abs(info.stressReductionPct)}% self-rated`}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">Average before/after breathing shift</p>
          </div>
        </div>
      </div>

      {/* Pro: deeper patterns */}
      {!ent.pro ? (
        <ProLock
          title="Deeper personal patterns"
          body="Your best hours, how long you can focus before it fades, and how sleep relates to your focus, built only from your own sessions."
          onUpgrade={openUpgrade}
        />
      ) : (
        <div className="clay-card-subtle p-3 sm:p-3.5 space-y-2 rounded-2xl" data-testid="pro-patterns">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Sparkles size={14} className="text-amber-500" /> <span>Deeper patterns · Pro</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="clay-card p-2.5 rounded-xl space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Best hours</span>
              {hours?.status === 'ok' ? (
                <ul className="text-xs text-slate-800 dark:text-slate-200">
                  {hours.hours.slice(0, 3).map((h) => <li key={h.hour}><b>{h.label}</b> · {h.avgScore}% over {h.sessions} sessions</li>)}
                </ul>
              ) : <p className="text-xs text-slate-600 dark:text-slate-400">{needText(hours, 'scored sessions')}</p>}
            </div>
            <div className="clay-card p-2.5 rounded-xl space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Break cadence</span>
              <p className="text-xs text-slate-800 dark:text-slate-200">
                {cadence?.status === 'ok' ? cadenceText(cadence) : needText(cadence, 'sessions with breaks')}
              </p>
            </div>
            <div className="clay-card p-2.5 rounded-xl space-y-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Sleep and focus</span>
              <p className="text-xs text-slate-800 dark:text-slate-200">
                {sleep?.status === 'ok' ? <>{sleep.summary} <span className="text-slate-500 dark:text-slate-400">{sleep.caveat}</span></> : needText(sleep, 'sessions with sleep logged')}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">These are patterns in your own data, not proof of cause.</p>
        </div>
      )}

      {/* Pro: weekly report */}
      {!ent.pro ? (
        <ProLock
          title="Weekly focus report"
          body="A summary of your week, in the app and by email each Monday if you want it."
          onUpgrade={openUpgrade}
        />
      ) : report && (
        <div className="clay-card-subtle p-3 sm:p-3.5 space-y-2 rounded-2xl" data-testid="weekly-report">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Weekly report · {report.periodLabel}</div>
            {userId && supabase && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={weeklyEmail} onChange={toggleEmail} /> Email me this every week
              </label>
            )}
          </div>
          {report.hasActivity ? (
            <ul className="text-xs text-slate-800 dark:text-slate-200 list-disc pl-4 space-y-0.5">
              {report.highlights.map((h) => <li key={h}>{h}</li>)}
              <li>{report.focus.sessions} focus sessions · {report.focus.minutes} min{report.focus.avgScore !== null ? ` · avg ${report.focus.avgScore}%` : ''}</li>
            </ul>
          ) : <p className="text-xs text-slate-600 dark:text-slate-400">Nothing logged in the past week yet.</p>}
        </div>
      )}
    </div>
  );
}
