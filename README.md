# FocusChecker

A focus timer with 2-minute breathing resets, readiness check-ins, focus sounds and personal attention
insights. Claymorphic UI, light and dark mode, private by default (data stays in the browser), works offline
and installs as an app.

> Launching or selling it? Start with **[LAUNCH.md](./LAUNCH.md)**.

## Features

- **Focus dial**: Deep work (45 min) and 25 · 5 Sprint (25 min) modes, 15–90 minute blocks. Breaks pause and resume your block, and timing stays accurate in background tabs and across reloads.
- **Session review**: rate each block in a few seconds (focus, clarity, frustration, when attention faded). Blocks ended early after 5+ minutes can still be logged.
- **Floating timer**: follows you to other tabs; can pop out as picture-in-picture above other windows.
- **Breathing resets**: physiological sigh, box breathing and 4-7-8, with before/after stress ratings.
- **Readiness check**: a short self check-in with a suggested next step.
- **Soundscapes**: 40Hz / 10Hz binaural tones, pink noise and rain, generated live with the Web Audio API (no audio files).
- **Today panel**: focus minutes, sessions, streak, daily goal, warm-light screen tint.
- **Analytics**: 7-day trend, average attention span, best time of day, suggested break interval, stress change. Calculated only from real data, with clear empty states.
- **Journal**: full history, JSON and CSV export, delete-all with confirmation.
- **Site**: landing page, Free vs Pro pricing, FAQ, Privacy and Terms pages, SEO and social preview tags, PWA (installable + offline).

## Routes

| Path | Page |
|---|---|
| `/` | Landing + pricing + FAQ |
| `/app` | Focus dial (also `/app/breathe`, `/app/readiness`, `/app/sounds`, `/app/analytics`, `/app/journal`) |
| `/privacy`, `/terms` | Legal pages |

## Configure

Brand name, URL, support email, prices, waitlist link and plan features live in **`src/app/config.ts`**.

## Develop

```bash
npm install
npm run dev         # http://localhost:5173
npm run type-check
npm run build       # outputs dist/
npm run preview     # serve the production build
```

## Tech

React 18, TypeScript, Vite 6, Tailwind CSS v4, Motion, Recharts (lazy-loaded), Lucide, Radix UI, Sonner.
Deployed as a static site (see `vercel.json`).

## Disclaimer

FocusChecker is a productivity tool, not a medical device. It does not diagnose or treat any condition.

## License

MIT
