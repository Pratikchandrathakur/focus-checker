// Cloud reads/writes for Pro features. The database (row level security) is the real gatekeeper;
// this file validates input before it leaves the browser and turns database errors into plain language.
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeMix, parseMixRows, MIX_LIMITS, type SoundMix } from './mix';

type Client = Pick<SupabaseClient, 'from'>;
export type Result<T = undefined> = ({ ok: true } & (T extends undefined ? object : { value: T })) | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function explain(error: { code?: string; message?: string } | null | undefined): string {
  if (error?.code === '42501') return 'This is a Pro feature. Upgrade to use it.';
  if (error?.code === '53400') return `You've reached the limit of ${MIX_LIMITS.maxMixes} mixes. Delete one to add another.`;
  return 'Something went wrong. Please try again.'; // never show database details
}

export async function fetchMixes(client: Client): Promise<SoundMix[]> {
  try {
    const { data, error } = await client.from('sound_mixes').select('id, name, layers').order('created_at', { ascending: true }).limit(MIX_LIMITS.maxMixes);
    return error ? [] : parseMixRows(data);
  } catch {
    return [];
  }
}

export async function saveMix(client: Client, userId: string, input: unknown, id?: string): Promise<Result<SoundMix>> {
  const m = sanitizeMix(input);
  if (!m.ok) return { ok: false, error: m.error };
  if (!UUID_RE.test(userId) || (id !== undefined && !UUID_RE.test(id))) return { ok: false, error: 'Something went wrong. Please try again.' };
  try {
    const q = id
      ? client.from('sound_mixes').update({ name: m.mix.name, layers: m.mix.layers }).eq('id', id).eq('user_id', userId).select('id, name, layers').single()
      : client.from('sound_mixes').insert({ user_id: userId, name: m.mix.name, layers: m.mix.layers }).select('id, name, layers').single();
    const { data, error } = await q;
    if (error) return { ok: false, error: explain(error) };
    const [saved] = parseMixRows([data]);
    return saved ? { ok: true, value: saved } : { ok: false, error: 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function deleteMix(client: Client, id: string): Promise<Result> {
  if (!UUID_RE.test(id)) return { ok: false, error: 'Something went wrong. Please try again.' };
  try {
    const { error } = await client.from('sound_mixes').delete().eq('id', id);
    return error ? { ok: false, error: explain(error) } : { ok: true };
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function getWeeklyEmail(client: Client, userId: string): Promise<boolean> {
  try {
    const { data, error } = await client.from('report_prefs').select('weekly_email').eq('user_id', userId).maybeSingle();
    return !error && !!data && (data as { weekly_email?: unknown }).weekly_email === true;
  } catch {
    return false;
  }
}

export async function setWeeklyEmail(client: Client, userId: string, on: boolean): Promise<Result> {
  if (!UUID_RE.test(userId)) return { ok: false, error: 'Something went wrong. Please try again.' };
  try {
    const { error } = await client.from('report_prefs').upsert({ user_id: userId, weekly_email: on === true }, { onConflict: 'user_id' });
    return error ? { ok: false, error: explain(error) } : { ok: true };
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
