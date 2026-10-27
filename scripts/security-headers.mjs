// Single source of truth for the security headers. `npm run headers` rewrites vercel.json and
// public/_headers from this; tests/security/headers.test.ts fails if they drift or if the CSP
// would block the app's own inline theme script.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** sha256 CSP sources for every executable inline <script> (JSON-LD data blocks and module/src scripts are skipped). */
export function inlineScriptHashes(html) {
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(attrs)) continue;
    out.push(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  return out;
}

export function buildCsp(html, { supabaseOrigins = ['https://*.supabase.co', 'wss://*.supabase.co'] } = {}) {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'", // motion/Radix set inline style attributes; scripts stay locked down
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigins.join(' ')}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function securityHeaders(html) {
  return {
    'Content-Security-Policy': buildCsp(html),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

export function applyToVercel(vercel, headers) {
  const next = structuredClone(vercel);
  const entry = next.headers.find((h) => h.source === '/(.*)');
  entry.headers = Object.entries(headers).map(([key, value]) => ({ key, value }));
  return next;
}

export function applyToHeadersFile(text, headers) {
  const block = '/*\n' + Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join('\n') + '\n';
  return text.replace(/^\/\*\n(?: {2}.*\n)+/m, block);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const html = readFileSync('index.html', 'utf8');
  const h = securityHeaders(html);
  writeFileSync('vercel.json', JSON.stringify(applyToVercel(JSON.parse(readFileSync('vercel.json', 'utf8')), h), null, 2) + '\n');
  writeFileSync('public/_headers', applyToHeadersFile(readFileSync('public/_headers', 'utf8'), h));
  console.log('Security headers written to vercel.json and public/_headers');
}
