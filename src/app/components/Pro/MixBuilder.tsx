import React, { useCallback, useEffect, useState } from 'react';
import { Play, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { MIX_LIMITS, MIX_PRESETS, type MixLayer, type SoundMix } from '../../services/mix';
import { deleteMix, fetchMixes, saveMix } from '../../services/proData';
import { supabase } from '../../services/supabase';
import { audioEngine } from '../../services/audioEngine';
import { RangeInput } from '../ui/RangeInput';

const LABELS: Record<(typeof MIX_PRESETS)[number], string> = {
  gamma: '40Hz gamma', alpha: '10Hz alpha', pink: 'Pink noise', rain: 'Rain', brown: 'Brown noise', waves: 'Ocean waves',
};

interface Props {
  userId: string | null;
  masterVolume: number;
  onPlay: () => void;
  client?: typeof supabase;
}

export function MixBuilder({ userId, masterVolume, onPlay, client = supabase }: Props) {
  const [layers, setLayers] = useState<MixLayer[]>([{ preset: 'rain', volume: 0.7 }, { preset: 'brown', volume: 0.4 }]);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<SoundMix[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { if (client && userId) setSaved(await fetchMixes(client)); }, [client, userId]);
  useEffect(() => { void load(); }, [load]);

  const unused = MIX_PRESETS.filter((p) => !layers.some((l) => l.preset === p));
  const add = () => { if (unused.length && layers.length < MIX_LIMITS.maxLayers) setLayers([...layers, { preset: unused[0], volume: 0.5 }]); };
  const play = (ls: MixLayer[]) => { if (ls.length) { audioEngine.playMix(ls, masterVolume); onPlay(); } };

  const save = async () => {
    if (!client || !userId) return;
    setBusy(true);
    const r = await saveMix(client, userId, { name, layers });
    setBusy(false);
    if (r.ok) { toast.success('Mix saved'); setName(''); void load(); } else toast.error(r.error);
  };
  const remove = async (m: SoundMix) => {
    if (!client || !m.id) return;
    const r = await deleteMix(client, m.id);
    if (r.ok) void load(); else toast.error(r.error);
  };

  return (
    <div className="clay-card-subtle p-3 rounded-xl space-y-2.5" data-testid="mix-builder">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Sound mixer <span className="ml-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">Pro</span></h4>
      <ul className="space-y-2">
        {layers.map((l, i) => (
          <li key={l.preset} className="flex items-center gap-2">
            <select aria-label={`Layer ${i + 1} sound`} value={l.preset}
              onChange={(e) => setLayers(layers.map((x, j) => (j === i ? { ...x, preset: e.target.value as MixLayer['preset'] } : x)))}
              className="text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-1.5 py-1">
              {MIX_PRESETS.filter((p) => p === l.preset || !layers.some((x) => x.preset === p)).map((p) => <option key={p} value={p}>{LABELS[p]}</option>)}
            </select>
            <div className="flex-1">
              <RangeInput aria-label={`${LABELS[l.preset]} volume`} accent="sky" min="0" max="1" step="0.05" value={l.volume}
                onChange={(e) => setLayers(layers.map((x, j) => (j === i ? { ...x, volume: Number(e.target.value) } : x)))} />
            </div>
            <button type="button" aria-label={`Remove ${LABELS[l.preset]}`} disabled={layers.length <= 1} onClick={() => setLayers(layers.filter((_, j) => j !== i))}
              className="p-1 rounded-lg text-slate-500 hover:text-red-500 disabled:opacity-40"><X size={14} /></button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={add} disabled={!unused.length || layers.length >= MIX_LIMITS.maxLayers} className="px-2.5 py-1.5 rounded-xl clay-button text-xs font-semibold flex items-center gap-1 disabled:opacity-50"><Plus size={13} /> Add layer</button>
        <button type="button" onClick={() => play(layers)} className="px-2.5 py-1.5 rounded-xl clay-tile-cyan text-xs font-bold flex items-center gap-1"><Play size={13} /> Play mix</button>
      </div>
      {userId && client && (
        <>
          <div className="flex gap-2">
            <input aria-label="Mix name" value={name} maxLength={MIX_LIMITS.maxName} onChange={(e) => setName(e.target.value)} placeholder="Name this mix"
              className="flex-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 py-1.5" />
            <button type="button" onClick={save} disabled={busy || !name.trim()} className="px-2.5 py-1.5 rounded-xl clay-button text-xs font-semibold flex items-center gap-1 disabled:opacity-50"><Save size={13} /> Save</button>
          </div>
          {saved.length > 0 && (
            <ul className="space-y-1" aria-label="Saved mixes">
              {saved.map((m) => (
                <li key={m.id ?? m.name} className="flex items-center justify-between gap-2 text-xs">
                  {/* name is rendered as text only (React escapes it) */}
                  <span className="truncate font-semibold text-slate-800 dark:text-slate-200">{m.name}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label={`Play ${m.name}`} onClick={() => { setLayers(m.layers); play(m.layers); }} className="p-1 text-sky-600"><Play size={14} /></button>
                    <button type="button" aria-label={`Delete ${m.name}`} onClick={() => remove(m)} className="p-1 text-slate-500 hover:text-red-500"><Trash2 size={14} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
