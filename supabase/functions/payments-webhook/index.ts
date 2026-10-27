// Supabase Edge Function: receives signed subscription events and updates entitlements.
// Deploy:  supabase functions deploy payments-webhook --no-verify-jwt
// (--no-verify-jwt because the caller is your payment provider, not a signed-in user; the HMAC
//  signature is the authentication.)
// Secrets: supabase secrets set PAYMENTS_WEBHOOK_SECRET=...   (comma-separate two values while rotating)
//          supabase secrets set PAYMENTS_PROVIDER=lemonsqueezy
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { handleWebhook, type ApplyArgs } from '../_shared/webhook.ts';

const secrets = (Deno.env.get('PAYMENTS_WEBHOOK_SECRET') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const provider = (Deno.env.get('PAYMENTS_PROVIDER') ?? '').toLowerCase();
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function apply(a: ApplyArgs): Promise<string> {
  const { data, error } = await admin.rpc('apply_subscription_event', {
    p_provider: a.provider, p_event_id: a.eventId, p_event_time: a.eventTime, p_user_id: a.userId,
    p_sub_id: a.subId, p_customer_id: a.customerId, p_plan: a.plan, p_status: a.status,
    p_period_end: a.periodEnd, p_cancel_at_period_end: a.cancelAtPeriodEnd,
  });
  if (error) throw error;
  return String(data);
}

Deno.serve(async (req) => {
  const rawBody = await req.text();
  const res = await handleWebhook(
    { method: req.method, rawBody, header: (n) => req.headers.get(n) },
    { secrets: /^[a-z0-9_-]{1,32}$/.test(provider) ? secrets : [], provider, nowMs: () => Date.now(), apply },
  );
  // Log the outcome only: never the body, headers or secrets.
  console.log(JSON.stringify({ status: res.status, result: res.body.result ?? res.body.error }));
  return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
});
