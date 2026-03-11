import React, { useState, useMemo } from 'react';
import { Calendar, Clock, BarChart2, Brain, MapPin, Moon, Tag, AlertTriangle, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { HistoryItem, FocusSession, ReadinessCheck, EmotionalState } from '../../types';

import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Separator } from '../ui/separator';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface HistoryProps {
  history: HistoryItem[];
}

function isFocusSession(item: HistoryItem): item is FocusSession {
  return item.type === 'Session';
}

function isReadinessCheck(item: HistoryItem): item is ReadinessCheck {
  return item.type === 'Check';
}

const EMOTIONAL_EMOJIS: Record<EmotionalState, string> = {
  calm: '😌', relaxed: '😊', happy: '😄', excited: '🤩', neutral: '😐', nervous: '😰', worried: '😟', frustrated: '😤', depressed: '😔',
};

export function History({ history }: HistoryProps) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState<string>('');

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      if (filter === 'sessions') return item.type === 'Session';
      if (filter === 'checks') return item.type === 'Check';
      return true;
    });
  }, [history, filter]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{filteredHistory.length} entries — click to expand details</p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            <SelectItem value="sessions">Sessions Only</SelectItem>
            <SelectItem value="checks">Checks Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <ScrollArea className={filteredHistory.length > 6 ? 'h-[700px]' : ''}>
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              <Brain size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No activity yet</p>
              <p className="text-sm mt-1">Start with a Quick Check or log a focus session to build your journal.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible value={expanded} onValueChange={setExpanded}>
              {filteredHistory.map((item) => (
                <AccordionItem key={item.id} value={String(item.id)} className="border-b border-slate-100 dark:border-slate-700">
                  <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:no-underline">
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className={`p-3 rounded-full flex-shrink-0 ${
                        item.type === 'Session'
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {item.type === 'Session' ? <Clock size={20} /> : <BarChart2 size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.note}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(item.date), 'MMM d, h:mm a')}
                          </span>
                          {isFocusSession(item) && (
                            <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-0 text-xs px-2 py-0.5">
                              {item.durationMinutes}m
                            </Badge>
                          )}
                          <span>{EMOTIONAL_EMOJIS[item.emotionalState]}</span>
                        </div>
                      </div>
                      <div className={`text-lg font-bold mr-2 ${
                        item.score >= 70 ? 'text-emerald-500' :
                        item.score >= 45 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {item.score}%
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {isFocusSession(item) ? (
                      <SessionDetail session={item} />
                    ) : isReadinessCheck(item) ? (
                      <CheckDetail check={item} />
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function SessionDetail({ session }: { session: FocusSession }) {
  return (
    <div className="space-y-4 pl-16">
      {/* Context */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ContextBadge icon={<span className="text-sm">{EMOTIONAL_EMOJIS[session.emotionalState]}</span>} label="Mood" value={session.emotionalState} />
        <ContextBadge icon={<MapPin size={14} />} label="Place" value={session.workPlace.replace('-', ' ')} />
        <ContextBadge icon={<Moon size={14} />} label="Sleep" value={`${session.sleepHours}h`} />
        <ContextBadge icon={<Clock size={14} />} label="Duration" value={`${session.durationMinutes}m / ${session.plannedDurationMinutes}m planned`} />
      </div>

      <Separator />

      {/* Self-assessment */}
      <div className="space-y-2">
        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Self Assessment</h5>
        <div className="grid grid-cols-3 gap-3">
          <MiniProgress label="Focus Quality" value={session.focusQuality} max={10} />
          <MiniProgress label="Content Clarity" value={session.contentClarity} max={10} />
          <MiniProgress label="Frustration" value={session.frustrationLevel} max={10} inverted />
        </div>
      </div>

      {/* Attention fade */}
      {session.attentionFaded && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Attention faded after ~{session.fadeAfterMinutes} minutes
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              This data point helps calculate your optimal attention span.
            </p>
          </div>
        </div>
      )}

      {/* Breaks */}
      {session.breaks.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Coffee size={14} className="text-amber-500" />
          <span>{session.breaks.length} break{session.breaks.length > 1 ? 's' : ''} taken</span>
          <span className="text-xs text-slate-400">
            ({session.breaks.map(b => `${b.durationMinutes}min at ${b.startMinute}m`).join(', ')})
          </span>
        </div>
      )}

      {/* Tags */}
      {session.tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-indigo-500" />
          {session.tags.map(tag => (
            <Badge key={tag} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-0 text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckDetail({ check }: { check: ReadinessCheck }) {
  const dimensions = [
    { label: 'Concentration', value: check.concentration },
    { label: 'Energy', value: check.energy },
    { label: 'Clarity', value: check.clarity },
    { label: 'Motivation', value: check.motivation },
    { label: 'Distraction Resistance', value: check.distractionResistance },
    { label: 'Comfort & Readiness', value: check.comfort },
  ];

  return (
    <div className="space-y-4 pl-16">
      {/* Dimensions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {dimensions.map(d => (
          <MiniProgress key={d.label} label={d.label} value={d.value} max={10} />
        ))}
      </div>

      {/* Context */}
      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
        <span>{EMOTIONAL_EMOJIS[check.emotionalState]} {check.emotionalState}</span>
        <span>•</span>
        <span>{check.sleepHours}h sleep</span>
        <span>•</span>
        <span>{check.dayFlow} day</span>
      </div>

      {/* Recommendation */}
      {check.recommendation && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3">
          <p className="text-sm text-indigo-800 dark:text-indigo-300 leading-relaxed">{check.recommendation}</p>
        </div>
      )}
    </div>
  );
}

function ContextBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2.5">
      <div className="flex items-center gap-1 text-slate-400 text-xs mb-0.5">{icon}<span>{label}</span></div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{value}</p>
    </div>
  );
}

function MiniProgress({ label, value, max, inverted }: { label: string; value: number; max: number; inverted?: boolean }) {
  const percent = (value / max) * 100;
  const color = inverted
    ? (percent <= 30 ? 'text-emerald-600' : percent <= 60 ? 'text-amber-600' : 'text-red-600')
    : (percent >= 70 ? 'text-emerald-600' : percent >= 40 ? 'text-amber-600' : 'text-red-600');

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`text-xs font-bold ${color}`}>{value}/{max}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}
