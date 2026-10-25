import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  BarChart2, 
  Brain, 
  Wind, 
  Tag, 
  Download, 
  Trash2, 
  CheckCircle2,
  ChevronDown,
  Activity,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { HistoryItem, FocusSession, ReadinessCheck, StressResetSession } from '../../types';
import { toast } from 'sonner';

interface HistoryProps {
  history: HistoryItem[];
  onClearHistory: () => void;
}

function isFocusSession(item: HistoryItem): item is FocusSession {
  return item.type === 'Session';
}

function isReadinessCheck(item: HistoryItem): item is ReadinessCheck {
  return item.type === 'Check';
}

function isStressReset(item: HistoryItem): item is StressResetSession {
  return item.type === 'StressReset';
}

export function History({ history, onClearHistory }: HistoryProps) {
  const [filter, setFilter] = useState<'all' | 'sessions' | 'checks' | 'resets'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    return history.filter((item) => {
      if (filter === 'sessions') return item.type === 'Session';
      if (filter === 'checks') return item.type === 'Check';
      if (filter === 'resets') return item.type === 'StressReset';
      return true;
    });
  }, [history, filter]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `focus-checker-journal-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Journal exported as JSON");
  };

  const handleExportCSV = () => {
    const cols = ['type', 'date', 'score', 'task', 'durationMinutes', 'focusQuality', 'contentClarity', 'frustrationLevel', 'attentionFaded', 'fadeAfterMinutes', 'technique', 'stressBefore', 'stressAfter', 'sleepHours', 'note'];
    const esc = (v: unknown) => {
      const str = v === undefined || v === null ? '' : String(v);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = history.map((h) => cols.map((c) => esc((h as unknown as Record<string, unknown>)[c])).join(','));
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focus-checker-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Journal exported as CSV');
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Top Filter and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl max-w-full overflow-x-auto">
          {[
            { id: 'all' as const, label: 'All Activity' },
            { id: 'sessions' as const, label: 'Focus Sessions' },
            { id: 'checks' as const, label: 'Readiness' },
            { id: 'resets' as const, label: 'Stress Resets' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 rounded-xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                title="Export journal"
              >
                <Download size={14} /> JSON
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 rounded-xl clay-button text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                title="Export journal as CSV (opens in Excel / Sheets)"
              >
                <Download size={14} /> CSV
              </button>

              {confirmClear ? (
                <>
                  <button
                    onClick={() => { onClearHistory(); setConfirmClear(false); }}
                    className="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Delete all
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-3 py-1.5 rounded-xl clay-button text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="px-3 py-1.5 rounded-xl clay-button text-xs font-semibold text-red-500 flex items-center gap-1.5"
                  title="Clear journal"
                >
                  <Trash2 size={14} /> Clear
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Journal List */}
      <div className="clay-card p-6 md:p-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-full clay-card-subtle flex items-center justify-center mx-auto text-slate-400">
              <Brain size={28} />
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Nothing logged yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Finish a focus block, take a readiness check or do a 2-minute breathing reset and it will show up here.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="clay-card-subtle p-4 transition-all duration-200 overflow-hidden"
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Item icon badge */}
                    <div
                      className={`p-2.5 rounded-2xl flex items-center justify-center ${
                        item.type === 'Session'
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                          : item.type === 'StressReset'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {item.type === 'Session' ? (
                        <Zap size={18} />
                      ) : item.type === 'StressReset' ? (
                        <Wind size={18} />
                      ) : (
                        <Activity size={18} />
                      )}
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.note || item.type}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(item.date), 'MMM d, h:mm a')}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score pill */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                        item.score >= 75
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.score}%
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3 text-xs">
                    {isFocusSession(item) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="clay-card p-2.5">
                          <span className="text-[10px] text-slate-400">Duration</span>
                          <div className="font-bold">{item.durationMinutes}m</div>
                        </div>
                        <div className="clay-card p-2.5">
                          <span className="text-[10px] text-slate-400">Quality</span>
                          <div className="font-bold">{item.focusQuality}/10</div>
                        </div>
                        <div className="clay-card p-2.5">
                          <span className="text-[10px] text-slate-400">Clarity</span>
                          <div className="font-bold">{item.contentClarity}/10</div>
                        </div>
                        <div className="clay-card p-2.5">
                          <span className="text-[10px] text-slate-400">Frustration</span>
                          <div className="font-bold">{item.frustrationLevel}/10</div>
                        </div>
                      </div>
                    )}

                    {isReadinessCheck(item) && (
                      <div className="clay-card p-3.5 space-y-2">
                        <span className="font-bold text-sky-500">Recommendation</span>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.recommendation}
                        </p>
                      </div>
                    )}

                    {isStressReset(item) && (
                      <div className="clay-card p-3.5 space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span>Cycles: {item.cyclesCompleted}</span>
                          <span className="text-emerald-600">
                            Stress dropped: {item.stressBefore} → {item.stressAfter}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
