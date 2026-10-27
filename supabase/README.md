# Backend: Pro subscriptions, sync and the weekly report

Everything that decides who is Pro lives in Postgres. The browser only *asks* (`select public.my_entitlement()`) and hides or shows buttons; it can't grant itself anything.

## 1. Deploy

```bash
supabase db push                                   # runs supabase/migrations/*.sql
supabase functions deploy payments-webhook --no-verify-jwt
supabase functions deploy weekly-report   --no-verify-jwt
supabase secrets set PAYMENTS_WEBHOOK_SECRET=$(openssl rand -hex 32) PAYMENTS_PROVIDER=yourprovider
supabase secrets set CRON_SECRET=$(openssl rand -hex 32) RESEND_API_KEY=... \
  REPORT_FROM="FocusChecker <reports@yourdomain>" APP_URL=https://focuschecker.app
```

* Secrets must be at least 32 characters. Shorter ones make the function refuse every request (fail closed).
* Rotating the webhook secret: set `PAYMENTS_WEBHOOK_SECRET=new,old`, switch the provider to `new`, then remove `old`.
* The `history_items` migration drops any policy it finds on that table before creating its own, because one leftover permissive policy would bypass the limits. Review `select policyname from pg_policies where tablename='history_items'` first if you rely on a custom one.
* Auth → URL configuration: add only your real site URL(s) to the redirect allow-list.
* Turn on "Leaked password protection" and set a minimum password length of 8 or more in Auth settings.

## 2. Connect a payment provider

`payments-webhook` accepts one **normalized** event and nothing else. Put a small adapter (a tiny function of yours, or your provider's webhook transformer) in front that turns the provider's payload into this shape and signs it:

```json
{
  "id": "evt_123",                       // unique per event (idempotency key)
  "type": "subscription.created | subscription.updated | subscription.canceled | subscription.expired",
  "occurredAt": "2026-10-27T10:00:00Z",  // provider's event time (used to ignore out-of-order events)
  "userId": "<auth.users uuid>",         // you pass this through checkout as custom data
  "subscription": {
    "id": "sub_9", "customerId": "cus_7",
    "plan": "monthly | yearly",
    "status": "active | trialing | past_due | paused | canceled | expired",
    "currentPeriodEnd": "2026-11-27T10:00:00Z",
    "cancelAtPeriodEnd": false
  }
}
```

Signature header: `X-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the shared secret>`. Requests older than 5 minutes (or more than 1 minute in the future) are rejected.

Mapping hints: Lemon Squeezy `subscription_created/updated/cancelled/expired` + `custom_data.user_id`; Paddle Billing `subscription.created/updated/canceled` + `custom_data.user_id`; Stripe `customer.subscription.*` + `metadata.user_id`. Use each provider's own signature check in your adapter *before* signing for us.

Then set `VITE_CHECKOUT_MONTHLY`, `VITE_CHECKOUT_YEARLY`, `VITE_CHECKOUT_HOSTS` (see `.env.example`). Until all three are set the site shows the Pro waitlist instead of a purchase button. After checkout, send buyers back to `https://yoursite/app?upgraded=1`; the app re-checks their plan.

Status rules (`is_pro_user`): `active`, `trialing`, `past_due` (3 days grace) and `canceled` (until the period ends) are Pro; `paused` and `expired` are not.

## 3. Weekly email

```sql
select cron.schedule('weekly-focus-report', '0 8 * * 1', $$
  select net.http_post(
    url := 'https://YOUR-PROJECT.supabase.co/functions/v1/weekly-report',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>', 'content-type', 'application/json'),
    body := '{}'::jsonb) $$);
```

Only Pro users who switched it on in Analytics get it, at most once per 6 days. Addresses are read from `auth.users` server side and never logged.

## 4. What is enforced where

| Feature | Enforced by | Notes |
|---|---|---|
| Cloud history older than 7 days | **Database** (RLS) | Free accounts can't read or write older rows. |
| History size / row shape | **Database** (trigger) | 500 rows free, 50,000 Pro; payload ≤ 16 KB. |
| Saved sound mixes | **Database** | Pro only to create; validated name and layers. |
| Weekly email | **Database + function** | Opt-in requires Pro; sending re-checks Pro. |
| 30/90-day/all-time views, patterns, extra sounds | **UI only** | They run on data already on the user's own device, so a determined user can always compute them. They are a convenience, not a secret. |

## 5. Tests

`npm test` runs everything. `npm run test:db` runs the migrations against a real Postgres (PGlite) with Supabase-style roles; `npm run test:security` runs the headers checks and the attack suites.
