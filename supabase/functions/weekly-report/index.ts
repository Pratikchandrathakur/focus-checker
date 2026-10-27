// Supabase Edge Function: sends the weekly focus report to Pro users who opted in.
// Deploy:   supabase functions deploy weekly-report --no-verify-jwt
// Secrets:  supabase secrets set CRON_SECRET=<long random> RESEND_API_KEY=... REPORT_FROM="FocusChecker <reports@yourdomain>" APP_URL=https://focuschecker.app
// Schedule: call it every Monday with header  x-cron-secret: <CRON_SECRET>  (see supabase/README.md for the pg_cron snippet).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { runWeeklyReports } from '../_shared/reportJob.ts';

const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
const from = Deno.env.get('REPORT_FROM') ?? '';
const appUrl = Deno.env.get('APP_URL') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sameSecret(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false });
  if (cronSecret.length < 32 || !resendKey || !from || !appUrl) return json(503, { ok: false, error: 'not configured' }); // fail closed
  if (!sameSecret(req.headers.get('x-cron-secret') ?? '', cronSecret)) return json(401, { ok: false });

  const result = await runWeeklyReports({
    now: () => new Date(),
    appUrl,
    maxPerRun: 200,
    listRecipients: async (limit) => {
      const { data, error } = await admin.rpc('report_recipients', { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as { user_id: string; email: string }[];
    },
    fetchItems: async (userId, since) => {
      const { data, error } = await admin.from('history_items').select('payload').eq('user_id', userId).gte('date', since).limit(2000);
      if (error) throw error;
      return (data ?? []).map((r: { payload: unknown }) => r.payload);
    },
    send: async (m) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${resendKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      });
      if (!res.ok) throw new Error(`email provider ${res.status}`);
    },
    markSent: async (userId) => {
      const { error } = await admin.rpc('mark_report_sent', { p_user: userId });
      if (error) throw error;
    },
    log: (line) => console.log(line),
  });
  return json(200, { ok: true, ...result });
});
