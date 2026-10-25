// Supabase client + cloud sync for signed-in users.
// Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the app runs in guest-only mode.
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { HistoryItem, UserProfile } from '../types';

// Default production public credentials (safe for client side with RLS enabled)
const DEFAULT_SUPABASE_URL = 'https://cjxmuqejdnljhkdppgpx.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8l6vDGKbXKagijtmJUYBhg_imPJR_-g';

const url = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL
) as string;

const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY
) as string;

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

export const cloudEnabled = Boolean(supabase);

export function profileFromUser(user: User): UserProfile {
  const meta = (user.user_metadata || {}) as { name?: string };
  const name = (meta.name || user.email?.split('@')[0] || 'You').slice(0, 40);
  return {
    id: user.id,
    email: user.email || '',
    name,
    avatarSeed: name,
    joinedAt: user.created_at,
    streakDays: 0,
    lastActiveDate: new Date().toISOString(),
  };
}

/** Where auth emails (magic link, password reset) send people back to. */
export function redirectUrl() {
  return `${window.location.origin}/app`;
}

type Row = { id: number; type: string; date: string; payload: HistoryItem };

/** Download the user's history. */
export async function fetchHistory(): Promise<HistoryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('history_items')
    .select('id, type, date, payload')
    .order('date', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data as Row[]).map((r) => r.payload);
}

/** Insert or update items (idempotent by user + id). */
export async function upsertHistory(userId: string, items: HistoryItem[]) {
  if (!supabase || !items.length) return;
  const rows = items.map((h) => ({ user_id: userId, id: h.id, type: h.type, date: h.date, payload: h }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('history_items').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

export async function deleteAllHistory(userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from('history_items').delete().eq('user_id', userId);
  if (error) throw error;
}

/** Merge two lists by id, newest first. */
export function mergeHistory(a: HistoryItem[], b: HistoryItem[]): HistoryItem[] {
  const map = new Map<number, HistoryItem>();
  [...a, ...b].forEach((h) => map.set(h.id, h));
  return [...map.values()].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
}
