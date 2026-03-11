import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Zap, Clock, Calendar, Brain, MapPin, Moon, Coffee, AlertTriangle, Lightbulb } from 'lucide-react';
import { format, isSameDay, subDays, getHours } from 'date-fns';
import { HistoryItem, FocusSession, ReadinessCheck, AttentionInsight, EmotionalState, WorkPlace } from '../../types';

import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';

interface DashboardProps {
  history: HistoryItem[];
}

function isFocusSession(item: HistoryItem): item is FocusSession {
  return item.type === 'Session';
}

function isReadinessCheck(item: HistoryItem): item is ReadinessCheck {
  return item.type === 'Check';
}

const EMOTIONAL_LABELS: Record<EmotionalState, string> = {
  calm: '😌 Calm', relaxed: '😊 Relaxed', happy: '😄 Happy', excited: '🤩 Excited',
  neutral: '😐 Neutral', nervous: '😰 Nervous', worried: '😟 Worried', frustrated: '😤 Frustrated', depressed: '😔 Depressed',
};

const WORKPLACE_LABELS: Record<WorkPlace, string> = {
  'home-office': 'Home Office', office: 'Office', cafe: 'Café', library: 'Library',
  coworking: 'Coworking', outdoor: 'Outdoor', other: 'Other',
};

export function Dashboard({ history }: DashboardProps) {
  const sessions = useMemo(() => history.filter(isFocusSession), [history]);
  const checks = useMemo(() => history.filter(isReadinessCheck), [history]);

  // Basic stats
  const stats = useMemo(() => {
    const totalScore = history.reduce((acc, item) => acc + item.score, 0);
    const avgScore = history.length > 0 ? Math.round(totalScore / history.length) : 0;

    const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);

    const totalBreaks = sessions.reduce((acc, s) => acc + s.breaks.length, 0);

    return { avgScore, totalHours, totalMinutes, totalBreaks };
  }, [history, sessions]);

  // Attention span analysis
  const attentionInsights = useMemo((): AttentionInsight | null => {
    if (sessions.length < 2) return null;

    // Average attention span (from sessions where attention faded)
    const fadedSessions = sessions.filter(s => s.attentionFaded && s.fadeAfterMinutes);
    const avgAttentionSpan = fadedSessions.length > 0
      ? Math.round(fadedSessions.reduce((a, s) => a + (s.fadeAfterMinutes || 0), 0) / fadedSessions.length)
      : Math.round(sessions.reduce((a, s) => a + s.durationMinutes, 0) / sessions.length);

    // Best time of day
    const hourScores: Record<number, { total: number; count: number }> = {};
    sessions.forEach(s => {
      const h = getHours(new Date(s.startTime));
      if (!hourScores[h]) hourScores[h] = { total: 0, count: 0 };
      hourScores[h].total += s.score;
      hourScores[h].count += 1;
    });
    const bestHourEntry = Object.entries(hourScores).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
    const bestHour = bestHourEntry ? parseInt(bestHourEntry[0]) : 9;
    const bestTimeOfDay = `${bestHour % 12 || 12}:00 ${bestHour >= 12 ? 'PM' : 'AM'} - ${(bestHour + 2) % 12 || 12}:00 ${(bestHour + 2) >= 12 ? 'PM' : 'AM'}`;

    // Best emotional state
    const emotionScores: Record<string, { total: number; count: number }> = {};
    sessions.forEach(s => {
      if (!emotionScores[s.emotionalState]) emotionScores[s.emotionalState] = { total: 0, count: 0 };
      emotionScores[s.emotionalState].total += s.score;
      emotionScores[s.emotionalState].count += 1;
    });
    const bestEmotion = Object.entries(emotionScores).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
    const bestEmotionalState = (bestEmotion?.[0] || 'calm') as EmotionalState;

    // Best workplace
    const placeScores: Record<string, { total: number; count: number }> = {};
    sessions.forEach(s => {
      if (!placeScores[s.workPlace]) placeScores[s.workPlace] = { total: 0, count: 0 };
      placeScores[s.workPlace].total += s.score;
      placeScores[s.workPlace].count += 1;
    });
    const bestPlace = Object.entries(placeScores).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
    const bestWorkPlace = (bestPlace?.[0] || 'home-office') as WorkPlace;

    // Best sleep
    const sleepBuckets: Record<number, { total: number; count: number }> = {};
    sessions.forEach(s => {
      const bucket = Math.round(s.sleepHours);
      if (!sleepBuckets[bucket]) sleepBuckets[bucket] = { total: 0, count: 0 };
      sleepBuckets[bucket].total += s.score;
      sleepBuckets[bucket].count += 1;
    });
    const bestSleep = Object.entries(sleepBuckets).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];

    // Optimal break interval
    const sessionsWithBreaks = sessions.filter(s => s.breaks.length > 0);
    const optimalBreakInterval = sessionsWithBreaks.length > 0
      ? Math.round(sessionsWithBreaks.reduce((a, s) => a + (s.breaks[0]?.startMinute || 30), 0) / sessionsWithBreaks.length)
      : 45;

    // Weekly pattern
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyPattern = dayNames.map(day => {
      const daySessions = sessions.filter(s => format(new Date(s.date), 'EEE') === day);
      return {
        day,
        avgScore: daySessions.length > 0 ? Math.round(daySessions.reduce((a, s) => a + s.score, 0) / daySessions.length) : 0,
        avgDuration: daySessions.length > 0 ? Math.round(daySessions.reduce((a, s) => a + s.durationMinutes, 0) / daySessions.length) : 0,
        sessionCount: daySessions.length,
      };
    });

    return {
      avgAttentionSpan,
      bestTimeOfDay,
      bestEmotionalState,
      bestWorkPlace,
      bestSleepHours: bestSleep ? parseInt(bestSleep[0]) : 7,
      optimalBreakInterval,
      weeklyPattern,
    };
  }, [sessions]);

  // Chart data
  const chartData = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayItems = history.filter(h => isSameDay(new Date(h.date), date));
      const daySessions = dayItems.filter(isFocusSession);

      const avgScore = dayItems.length > 0 ? Math.round(dayItems.reduce((a, i) => a + i.score, 0) / dayItems.length) : 0;
      const durationHours = parseFloat((daySessions.reduce((a, s) => a + s.durationMinutes, 0) / 60).toFixed(1));

      return {
        name: format(date, 'EEE'),
        fullDate: format(date, 'MMM d'),
        score: avgScore,
        duration: durationHours,
      };
    });
  }, [history]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Average Focus" value={`${stats.avgScore}%`} change={stats.avgScore > 70 ? 'Good' : 'Needs Work'} icon={Zap} color="indigo" />
        <StatCard title="Total Hours" value={`${stats.totalHours}h`} change={`${sessions.length} sessions`} icon={Clock} color="blue" />
        <StatCard title="Breaks Taken" value={stats.totalBreaks.toString()} change="Total breaks" icon={Coffee} color="emerald" />
        <StatCard title="Total Entries" value={history.length.toString()} change={`${sessions.length} sessions, ${checks.length} checks`} icon={Calendar} color="purple" />
      </div>

      {/* Attention Span Insights — the key feature */}
      {attentionInsights && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={22} />
            <h3 className="font-bold text-lg">Your Attention Span Insights</h3>
            <Badge className="ml-auto bg-white/20 border-0 text-white text-xs">{sessions.length} sessions analyzed</Badge>
          </div>
          <p className="text-indigo-100 text-sm mb-5">
            These patterns are discovered from your logged sessions. Keep documenting — more data means more accurate insights.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <InsightCard icon={<Clock size={16} />} label="Avg Attention Span" value={`${attentionInsights.avgAttentionSpan}m`} />
            <InsightCard icon={<TrendingUp size={16} />} label="Best Time" value={attentionInsights.bestTimeOfDay} />
            <InsightCard icon={<Lightbulb size={16} />} label="Best Mood" value={EMOTIONAL_LABELS[attentionInsights.bestEmotionalState]} />
            <InsightCard icon={<MapPin size={16} />} label="Best Place" value={WORKPLACE_LABELS[attentionInsights.bestWorkPlace]} />
            <InsightCard icon={<Moon size={16} />} label="Best Sleep" value={`${attentionInsights.bestSleepHours}h`} />
            <InsightCard icon={<Coffee size={16} />} label="Break Every" value={`${attentionInsights.optimalBreakInterval}m`} />
          </div>
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="trends">Focus Trends</TabsTrigger>
          <TabsTrigger value="hours">Daily Hours</TabsTrigger>
          {attentionInsights && <TabsTrigger value="weekly">Weekly Pattern</TabsTrigger>}
        </TabsList>

        <TabsContent value="trends">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Focus Trends (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullDate || ''}
                  />
                  <Area type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" name="Avg Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Daily Hours</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="duration" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        {attentionInsights && (
          <TabsContent value="weekly">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Weekly Pattern</h3>
              <div className="space-y-3">
                {attentionInsights.weeklyPattern.map(day => (
                  <div key={day.day} className="flex items-center gap-4">
                    <span className="w-10 text-sm font-medium text-slate-600 dark:text-slate-400">{day.day}</span>
                    <div className="flex-1">
                      <Progress value={day.avgScore} className="h-3" />
                    </div>
                    <div className="flex items-center gap-3 text-sm w-40 justify-end">
                      <span className="text-slate-600 dark:text-slate-400">{day.avgScore}%</span>
                      <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs">
                        {day.sessionCount} sess
                      </Badge>
                      <span className="text-xs text-slate-400">{day.avgDuration}m avg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Recent Activity */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
          <Separator className="mb-4" />
          <div className="space-y-3">
            {history.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs border-0 ${
                    item.type === 'Session' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {item.type}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.note}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(item.date), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
                <Badge className={`border-0 text-sm font-bold ${
                  item.score >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : item.score >= 45 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {item.score}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data prompt */}
      {history.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain size={32} className="text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Start Discovering Your Patterns</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Do a Quick Check to assess your current state, then log focus sessions. After a few entries, you'll start seeing your attention span patterns here.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, change, icon: Icon, color }: any) {
  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}><Icon size={24} /></div>
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</h4>
      <p className="text-xs text-slate-400 mt-1">{change}</p>
    </div>
  );
}

function InsightCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1 opacity-80">{icon}<span className="text-xs">{label}</span></div>
      <p className="font-bold text-sm">{value}</p>
    </div>
  );
}
