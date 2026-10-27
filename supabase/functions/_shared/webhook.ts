// Payments webhook core: signature check + strict validation. No I/O, no imports, so it runs
// unchanged in Deno (the edge function), Node (tests) and anywhere with WebCrypto.
//
// Contract (provider-agnostic): your payment provider's webhook is translated to the normalized
// event below by a tiny adapter, then signed with a shared secret:
//   header  X-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">
// See supabase/README.md for the event shape and how to map Lemon Squeezy / Paddle / Stripe to it.

export const MAX_BODY_BYTES = 64 * 1024;
const TOLERANCE_PAST_SEC = 300;
const TOLERANCE_FUTURE_SEC = 60;

export type Plan = 'monthly' | 'yearly';
export type Status = 'active' | 'trialing' | 'past_due' | 'paused' | 'canceled' | 'expired';
export type ApplyResult = 'applied' | 'duplicate' | 'stale' | 'unknown_user' | 'conflict';

export interface ApplyArgs {
  provider: string;
  eventId: string;
  eventTime: string;
  userId: string;
  subId: string;
  customerId: string | null;
  plan: Plan;
  status: Status;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
}

const EVENT_TYPES = [
  'subscription.created', 'subscription.updated', 'subscription.resumed',
  'subscription.canceled', 'subscription.expired', 'subscription.payment_failed',
];
const PLANS: Plan[] = ['monthly', 'yearly'];
const STATUSES: Status[] = ['active', 'trialing', 'past_due', 'paused', 'canceled', 'expired'];
const ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const enc = new TextEncoder();
const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sign(secret: string, timestampSec: number, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(`${timestampSec}.${rawBody}`)));
}

/** Compares two hex strings without exiting early on the first difference. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function parseHeader(header: string | null | undefined): { t: number; sigs: string[] } | null {
  if (!header || header.length > 600) return null;
  const parts = header.split(',');
  if (parts.length > 10) return null;
  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of parts) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === 't' && /^\d{1,12}$/.test(v)) t = Number(v);
    else if (k === 'v1' && /^[0-9a-fA-F]{64}$/.test(v)) sigs.push(v.toLowerCase());
  }
  return t !== null && sigs.length > 0 ? { t, sigs } : null;
}

export const MIN_SECRET_LENGTH = 32;

export async function verifySignature(a: { secrets: string[]; header: string | null | undefined; rawBody: string; nowMs: number }): Promise<boolean> {
  try {
    const parsed = parseHeader(a.header);
    if (!parsed) return false;
    const nowSec = Math.floor(a.nowMs / 1000);
    if (parsed.t < nowSec - TOLERANCE_PAST_SEC || parsed.t > nowSec + TOLERANCE_FUTURE_SEC) return false;
    let ok = false;
    for (const secret of a.secrets.filter((s) => s.trim().length >= MIN_SECRET_LENGTH)) {
      const expected = await sign(secret, parsed.t, a.rawBody);
      for (const sig of parsed.sigs) ok = timingSafeEqualHex(expected, sig) || ok; // no early exit
    }
    return ok;
  } catch {
    return false;
  }
}

type Parsed = { ok: true; args: Omit<ApplyArgs, 'provider'> } | { ok: false; reason: string };
const fail = (reason: string): Parsed => ({ ok: false, reason });
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isoMs = (v: unknown): number | null => (typeof v === 'string' && ISO_RE.test(v) && Number.isFinite(Date.parse(v)) ? Date.parse(v) : null);

export function parseEvent(raw: string, nowMs: number): Parsed {
  let ev: unknown;
  try { ev = JSON.parse(raw); } catch { return fail('invalid json'); }
  if (!isObj(ev)) return fail('not an object');
  for (const k of ['__proto__', 'constructor', 'prototype']) {
    if (Object.prototype.hasOwnProperty.call(ev, k)) return fail('forbidden key');
  }
  if (typeof ev.id !== 'string' || !ID_RE.test(ev.id)) return fail('id');
  if (typeof ev.type !== 'string' || !EVENT_TYPES.includes(ev.type)) return fail('type');
  if (typeof ev.userId !== 'string' || !UUID_RE.test(ev.userId)) return fail('userId');
  const at = isoMs(ev.occurredAt);
  if (at === null || at > nowMs + 5 * 60_000 || at < Date.UTC(2020, 0, 1)) return fail('occurredAt');
  const s = ev.subscription;
  if (!isObj(s)) return fail('subscription');
  if (typeof s.id !== 'string' || !ID_RE.test(s.id)) return fail('subscription.id');
  if (s.customerId != null && (typeof s.customerId !== 'string' || !ID_RE.test(s.customerId))) return fail('subscription.customerId');
  if (typeof s.plan !== 'string' || !PLANS.includes(s.plan as Plan)) return fail('subscription.plan');
  if (typeof s.status !== 'string' || !STATUSES.includes(s.status as Status)) return fail('subscription.status');
  const end = isoMs(s.currentPeriodEnd);
  if (end === null || end < nowMs - 2 * 365 * 864e5 || end > nowMs + 3 * 365 * 864e5) return fail('subscription.currentPeriodEnd');
  if (s.cancelAtPeriodEnd !== undefined && typeof s.cancelAtPeriodEnd !== 'boolean') return fail('subscription.cancelAtPeriodEnd');

  return {
    ok: true,
    args: {
      eventId: ev.id,
      eventTime: new Date(at).toISOString(),
      userId: ev.userId.toLowerCase(),
      subId: s.id,
      customerId: typeof s.customerId === 'string' ? s.customerId : null,
      plan: s.plan as Plan,
      status: s.status as Status,
      periodEnd: new Date(end).toISOString(),
      cancelAtPeriodEnd: s.cancelAtPeriodEnd === true,
    },
  };
}

export interface WebhookRequest {
  method: string;
  rawBody: string;
  header(name: string): string | null;
}
export interface WebhookDeps {
  secrets: string[];
  provider: string;
  nowMs: () => number;
  apply: (args: ApplyArgs) => Promise<ApplyResult | string>;
}
export interface WebhookResponse {
  status: number;
  body: { ok: boolean; result?: string; error?: string };
}

const respond = (status: number, error?: string, result?: string): WebhookResponse => ({
  status,
  body: { ok: status < 300, ...(result ? { result } : {}), ...(error ? { error } : {}) },
});

export async function handleWebhook(req: WebhookRequest, deps: WebhookDeps): Promise<WebhookResponse> {
  if (req.method !== 'POST') return respond(405, 'method not allowed');
  // Fail closed on a missing OR weak secret: a short secret can be brute-forced offline from one captured request.
  if (deps.secrets.length === 0 || deps.secrets.some((s) => s.trim().length < MIN_SECRET_LENGTH)) return respond(500, 'webhook not configured');
  if (!(req.header('content-type') || '').toLowerCase().startsWith('application/json')) return respond(415, 'unsupported media type');
  if (enc.encode(req.rawBody).length > MAX_BODY_BYTES) return respond(413, 'payload too large');

  const now = deps.nowMs();
  if (!(await verifySignature({ secrets: deps.secrets, header: req.header('x-signature'), rawBody: req.rawBody, nowMs: now }))) {
    return respond(401, 'invalid signature'); // same answer for every failure: nothing to learn
  }

  const parsed = parseEvent(req.rawBody, now);
  if (!parsed.ok) return respond(400, 'invalid event');

  try {
    const result = await deps.apply({ provider: deps.provider, ...parsed.args });
    if (result === 'conflict') return respond(409, 'subscription belongs to another account', result);
    return respond(200, undefined, String(result));
  } catch {
    return respond(500, 'could not process event'); // never leak database errors
  }
}
