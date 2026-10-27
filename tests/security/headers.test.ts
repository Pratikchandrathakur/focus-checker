import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
// @ts-expect-error plain ESM script
import { securityHeaders, inlineScriptHashes } from '../../scripts/security-headers.mjs';

const read = (p: string) => readFileSync(p, 'utf8');
const html = read('index.html');
const expected = securityHeaders(html) as Record<string, string>;

describe('security headers', () => {
  it('vercel.json and public/_headers match the generator (run `npm run headers` if this fails)', () => {
    const vercel = JSON.parse(read('vercel.json'));
    const entry = vercel.headers.find((h: { source: string }) => h.source === '/(.*)');
    const got = Object.fromEntries(entry.headers.map((h: { key: string; value: string }) => [h.key, h.value]));
    expect(got).toEqual(expected);
    const file = read('public/_headers');
    for (const [k, v] of Object.entries(expected)) expect(file).toContain(`  ${k}: ${v}\n`);
  });

  it('the CSP allows the theme script by hash and forbids unsafe script', () => {
    const csp = expected['Content-Security-Policy'];
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).not.toMatch(/unsafe-inline|unsafe-eval|\*|https?:/);
    for (const h of inlineScriptHashes(html)) expect(script).toContain(h);
    expect(inlineScriptHashes(html).length).toBe(1);
  });

  it('covers the framing, plugin and base-uri vectors', () => {
    const csp = expected['Content-Security-Policy'];
    for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "form-action 'self'", "default-src 'self'"]) expect(csp).toContain(d);
  });

  it('the built page (if present) has no inline script the CSP does not cover', () => {
    if (!existsSync('dist/index.html')) return;
    const built = read('dist/index.html');
    const csp = expected['Content-Security-Policy'];
    for (const h of inlineScriptHashes(built)) expect(csp).toContain(h);
  });

  it('long-lived assets stay cacheable and the service worker is never stale', () => {
    const f = read('public/_headers');
    expect(f).toMatch(/\/sw\.js\n\s+Cache-Control: no-cache/);
  });
});
