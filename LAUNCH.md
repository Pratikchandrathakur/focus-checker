# FocusChecker: handover and launch guide

Plan: **Step 1** roll out to your team (under 50 people, each tracking themselves).
**Step 2** sell to the public. Both can run on **$0/month** with the setup below.

---

## 0. Do these first

- [ ] **Revoke the GitHub token** that's in `token.txt` *and* in the git remote URL (`git remote -v` shows it). GitHub → Settings → Developer settings → Personal access tokens → delete it. Then:
      `git remote set-url origin https://github.com/Pratikchandrathakur/focus-checker.git` and delete `token.txt`.
- [ ] Never commit `.env.local` (it's already in `.gitignore`).

---

## 1. Free, secure stack for your team

| Piece | Service (free tier) | Limits that matter | Why |
|---|---|---|---|
| Website hosting | **Cloudflare Pages** | Unlimited static requests and bandwidth, 500 builds/month | Free plan allows commercial use. **Vercel Hobby does not**: Vercel limits Hobby to non-commercial personal use, and that includes "a paid employee... writing the code". |
| Accounts + database | **Supabase Free** | 50,000 monthly users, 500 MB database, 2 projects. **Pauses after 1 week with no activity.** No backups included. | Real auth (email + password, magic link, password reset), Postgres with Row Level Security |
| Sign-in emails | **Resend Free** as custom SMTP in Supabase | 3,000 emails/month, 100/day, 1 domain | Supabase's built-in email sends only **4 per hour** and often lands in spam, which isn't usable for real people |

For 50 employees: a focus history row is about 1 KB, so 50 people × 20 entries/day × a full year ≈ 365 MB. That fits in 500 MB for the first year. Export old rows or upgrade before then.

### Setup steps (about 30 minutes)
1. **Supabase**: create a project in the region closest to your team (e.g. Mumbai `ap-south-1` for Nepal).
   - SQL Editor → paste and run `supabase/schema.sql`.
   - Authentication → Providers → Email: enable *Email + password* and *Magic link*. Turn **Confirm email ON**.
   - Authentication → URL Configuration: Site URL = your live URL; add `https://YOUR-DOMAIN/app` and `http://localhost:5173/app` to Redirect URLs.
   - Authentication → Policies (or Settings): minimum password length **8**, and turn on leaked-password protection if your plan offers it.
2. **Resend**: sign up, verify your domain (add the DNS records it shows), create an API key.
   In Supabase → Authentication → SMTP Settings: host `smtp.resend.com`, port `465`, user `resend`, password = API key, sender `no-reply@yourdomain`.
3. **Local**: copy `.env.example` to `.env.local` and paste the Supabase URL and **anon** key. `npm run dev`.
4. **Cloudflare Pages**: connect the GitHub repo. Build command `npm run build`, output `dist`. Add the same two `VITE_SUPABASE_*` variables under Settings → Environment variables. Single-page routing works automatically. `public/_headers` adds the security headers.
5. **Keep Supabase awake and backed up**: a free GitHub Action (`supabase/keepalive-backup.yml`) pings the database daily so it never pauses. It also saves a weekly backup as a private workflow artifact. Add it to `.github/workflows/` in GitHub (or check the `workflow` scope on your GitHub token), and add `SUPABASE_DB_URL` (Supabase → Project Settings → Database → connection string, session pooler) as a repo **secret**.

### Security: what's already built in
- **Row Level Security** on every table: a user can only read or write rows where `user_id = their id`. That holds even though the anon key is public by design.
- Passwords are hashed and stored by Supabase Auth, never by this app. Sessions use PKCE and refresh automatically.
- Supabase applies built-in rate limits on sign-in, sign-up and email sending.
- Signing out removes that person's history from the device, which matters on shared office computers.
- Security headers: no framing (clickjacking), nosniff, strict referrer, camera/mic/location blocked.
- Payload size check in the database, so one user can't fill your 500 MB with junk.
- **Never** put the `service_role` key in the frontend or in `VITE_*` variables.

### Concurrency
This is a static site plus Supabase, so there's no server of yours to overload. Pages serve from Cloudflare's CDN. Supabase Free handles hundreds of concurrent connections through its built-in API layer, far beyond 50 people saving a session every 25 minutes. The timer runs in each browser, so it costs nothing on the server.

---

## 2. Can you sell it?

**Yes, with three things fixed first.**

1. **"Pomodoro" + tomato trademark.** Francesco Cirillo's company holds "Pomodoro" as a registered trademark for software. Its published guidelines say no app may use "Pomodoro", or a tomato as an icon, without permission. That includes free apps. Internal use with your employees is low risk. **Before selling**, edit `src/app/config.ts` → `INTERVAL_MODE = { label: 'Sprint', icon: 'timer' }` (or any original name), or get a licence from legal@francescocirillo.com.
2. **Ownership.** The code is in Pratik's GitHub repo under the MIT licence. Make sure whoever sells it owns the rights or has written permission from the other contributors.
3. **Payments from Nepal.** Stripe and PayPal don't open merchant accounts for Nepal-based businesses. Lemon Squeezy's bank-payout list doesn't include Nepal, and it otherwise relies on PayPal. **Ask Paddle** (merchant of record, pays by wire transfer) and confirm in writing before building checkout. Otherwise use a foreign entity. Check foreign-currency rules with a Nepal tax advisor (Nepal Rastra Bank).

**Market reality.** The space is crowded, and most competitors are cheap with a free tier: Pomofocus (from $3/mo), Focus To-Do ($2.99/mo), Session ($4.99/mo), Flow (~$5/mo), TickTick ($35.99/yr), Forest, Marinara (free). Selling "a timer" won't work. Your angle is the **combination** of readiness check → breathing reset → focus → personal patterns, the distinctive tactile UI, privacy, and **team rollout**. Pricing at $3–5/month for individuals is in line with the market. A team plan (e.g. $3/user/month) for companies is likely the better business.

**Before charging money**, plan to:
- Upgrade Supabase to Pro ($25/mo) for daily backups and no pausing. Free tier is fine for your team pilot.
- Have the Privacy Policy and Terms (`/privacy`, `/terms`) reviewed by a lawyer.
- Add account deletion inside the app (currently by email request).

---

## 3. Checklist before handing to employees
- [ ] Steps 1–5 above done, live URL works, sign-up email arrives (check spam).
- [ ] Edit `src/app/config.ts`: name, URL, support email.
- [ ] Replace `focuschecker.app` in `index.html`, `public/robots.txt`, `public/sitemap.xml`.
- [ ] Each employee: open the link → Create Account → confirm email → install as an app (browser menu → Install).
- [ ] Tell them: data is private to each person; "Journal → Clear" deletes it everywhere.
