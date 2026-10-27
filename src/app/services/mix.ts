// Custom sound mixes: validation shared by the editor and the cloud loader.
// The limits mirror the database (supabase/migrations), which is what actually enforces them.
export const MIX_PRESETS = ['gamma', 'alpha', 'pink', 'rain', 'brown', 'waves'] as const;
export type MixPreset = (typeof MIX_PRESETS)[number];
export interface MixLayer { preset: MixPreset; volume: number }
export interface SoundMix { id?: string; name: string; layers: MixLayer[] }
export const MIX_LIMITS = { maxName: 40, maxLayers: 6, maxMixes: 20 } as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export type MixResult = { ok: true; mix: { name: string; layers: MixLayer[] } } | { ok: false; error: string };

/** Rebuilds a mix from untrusted input, keeping only the fields the server accepts. */
export function sanitizeMix(input: unknown): MixResult {
  if (!isObj(input)) return { ok: false, error: 'Not a mix.' };
  if (typeof input.name !== 'string' || /[\u0000-\u001f\u007f]/.test(input.name)) return { ok: false, error: 'Give your mix a name.' };
  const name = input.name.trim();
  if (name.length < 1) return { ok: false, error: 'Give your mix a name.' };
  if (name.length > MIX_LIMITS.maxName) return { ok: false, error: `Names can be up to ${MIX_LIMITS.maxName} characters.` };
  if (!Array.isArray(input.layers) || input.layers.length < 1) return { ok: false, error: 'Add at least one sound.' };
  if (input.layers.length > MIX_LIMITS.maxLayers) return { ok: false, error: `A mix can have up to ${MIX_LIMITS.maxLayers} sounds.` };

  const seen = new Set<string>();
  const layers: MixLayer[] = [];
  for (const l of input.layers) {
    if (!isObj(l) || !MIX_PRESETS.includes(l.preset as MixPreset)) return { ok: false, error: 'Unknown sound.' };
    if (typeof l.volume !== 'number' || !Number.isFinite(l.volume)) return { ok: false, error: 'Invalid volume.' };
    if (seen.has(l.preset as string)) return { ok: false, error: 'Each sound can be used once.' };
    seen.add(l.preset as string);
    layers.push({ preset: l.preset as MixPreset, volume: Math.round(Math.min(1, Math.max(0, l.volume)) * 100) / 100 });
  }
  return { ok: true, mix: { name, layers } };
}

export function parseMixRows(rows: unknown): SoundMix[] {
  if (!Array.isArray(rows)) return [];
  const out: SoundMix[] = [];
  for (const r of rows) {
    if (!isObj(r) || typeof r.id !== 'string' || !UUID_RE.test(r.id)) continue;
    const m = sanitizeMix({ name: r.name, layers: r.layers });
    if (m.ok) out.push({ id: r.id, ...m.mix });
  }
  return out;
}
