# Security

## Reporting
Email the address in `src/app/config.ts` (`SITE.supportEmail`) with details and steps to reproduce. Please don't open public issues for vulnerabilities.

## Design
* **Server-enforced Pro.** Plan state is written only by `apply_subscription_event` (service role), which the HMAC-verified webhook calls. Users have read-only access to four columns of their own subscription row. See `supabase/README.md` for what is and isn't server-enforced.
* **Least privilege.** Every table has RLS; grants are revoked from `public/anon/authenticated` and re-granted narrowly (column-level where it matters). `SECURITY DEFINER` functions set `search_path = ''` and are executable only by the roles that need them.
* **Webhook.** Fail-closed config, 32+ character secrets, constant-time comparison, 5-minute replay window, 64 KB body cap, strict schema validation, idempotency table, out-of-order protection, generic error responses.
* **Untrusted input everywhere.** `localStorage`, cloud rows and saved mixes are re-validated on load and rebuilt from a whitelist (no prototype pollution, bounded sizes). React escapes all rendered text. The only `dangerouslySetInnerHTML` is the stock `ui/chart.tsx` helper, which injects developer-defined colours into a style tag and is not imported anywhere.
* **Browser hardening.** Strict CSP (no inline script except the hashed theme snippet, no `eval`, `connect-src` limited to self and Supabase, `frame-ancestors 'none'`), HSTS, COOP/CORP, nosniff, Permissions-Policy. `npm run headers` regenerates `vercel.json` and `public/_headers`; a test fails if they drift or the hash goes stale.
* **Checkout links** come from config only, must be https on an allow-listed host with no credentials in the URL; they open with `noopener,noreferrer`.
* **Secrets.** Only the public (anon/publishable) Supabase key ships in the bundle. Service-role, webhook, cron and email keys exist only as function secrets. `.env.local` is git-ignored.

## Known limits (stated honestly)
1. **Client-side gates are cosmetic.** Longer analytics ranges, personal patterns, extra sounds and the sound-mixer *player* run in the browser on the user's own data. Anyone can bypass them with dev tools; only cloud storage limits, saved mixes and the email are enforced server-side.
2. **History window uses the date the client sends.** A free user could label old sessions with recent dates to sync them. It's their own data, capped at 500 rows and `now + 2 days`, so the impact is nil.
3. **Auth throttling is Supabase's.** The 5-attempts/30-second lockout in the sign-in form only slows casual scripting in one tab.
4. **Payment-provider adapter is yours.** The webhook trusts whoever holds the shared secret; protect it like a password and rotate it if exposed.
5. **Dev tooling.** `npm audit` is clean at the time of writing; re-run it regularly.

## Penetration test (October 2026)
Method: attack suites that run on every `npm test` (`tests/security/pentest-*.test.ts`) against a real Postgres with Supabase-style roles, a fuzzed webhook, and a headless-Chromium session against the production build served with the real headers.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `apply_subscription_event` stored whatever event time and period end it was given. A buggy or compromised provider could send a far-future event time (freezing the account, as every later event looks stale) or a year-9999 period end (free lifetime Pro). The webhook validated this, the database did not. | Medium (needs the webhook secret or a provider bug) | Fixed: the function now rejects event times >5 min ahead and period ends outside −2/+3 years. Regression tests added. |
| 2 | The webhook accepted any non-empty secret, including a 5-character one, which can be brute-forced offline from one captured request. | Medium (misconfiguration) | Fixed: secrets under 32 characters make the endpoint refuse everything. Regression test added. |
| 3 | `npm audit`: high-severity `lodash` (via charts library) in production deps; critical/high issues in dev tooling (`vite`, `vitest`/`tinypool`). | High (prod dep) / dev only | Fixed: `lodash` updated; `vite` 6.4.5, `vitest` 5.0.5. 0 vulnerabilities. |
| – | Held up under attack: self-granting Pro through every table and function, role switching, search-path hijack, subscription-id theft, replayed/stale events, JSONB bombs and injection strings, back-dating, lapsed-Pro writes, mail forging; forged/mutated/replayed/oversized webhooks and 300 fuzzed mutations; poisoned localStorage/history/profile payloads, prototype pollution, XSS payloads, route injection, eval/inline-script/exfiltration under CSP, clickjacking, Pro unlock via storage flags; secrets scan of the bundle (no service keys, no source maps). | – | No issue found. |

Not tested: a live Supabase project, a real payment provider, real devices, or load/DoS behaviour.
