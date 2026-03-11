# 🎯 Focus Checker

**Track your attention span, discover focus patterns, and learn when you work best.**

Focus Checker is a personal attention management tool built on the principle that *attention is limited and personal*. Instead of forcing focus, it helps you understand your natural attention patterns — when you focus best, in what emotional state, at what time of day, and with how much sleep.

## ✨ Features

### Quick Check — Readiness Assessment
- Rate 6 focus dimensions: concentration, energy, clarity, motivation, distraction resistance, and comfort
- Log your emotional state, day flow, and sleep hours
- Get a personalized recommendation on whether to dive in or take a break
- Score-based guidance: **Ready** (≥70%), **Moderate** (≥45%), or **Low** (<45%)

### Log Session — Full Context Tracking
- Track focus sessions with a live timer
- Record environment context: emotional state, day flow, workplace, sleep
- Built-in break support with configurable reminders
- Attention fade detection — mark when your focus starts dropping
- Self-assessment after each session: focus quality, content clarity, frustration level

### Dashboard — Pattern Discovery
- Attention span insights: average span, best time of day, best mood, best workplace, optimal sleep, break intervals
- Focus trend charts (last 7 days)
- Daily hours and weekly pattern analysis
- Stat cards: average score, total hours, breaks taken, total entries

### Activity Journal — History & Review
- Expandable entries with full session/check details
- Filter by sessions or checks
- View self-assessments, attention fade data, breaks, and tags

### Additional
- **Dark mode** with persistence
- **Command palette** (Ctrl+K / ⌘K) for quick navigation
- **Settings**: name, break reminder toggle, break interval customization
- **localStorage persistence** — all data stays in your browser
- **Mobile responsive** with bottom navigation bar

## 🛠 Tech Stack

- **React 18** + **TypeScript**
- **Vite 6** — fast builds and HMR
- **Tailwind CSS v4** — utility-first styling
- **shadcn/ui** — 48 accessible Radix-based components
- **Recharts** — data visualization
- **Framer Motion** — smooth animations
- **Sonner** — toast notifications
- **date-fns** — date formatting
- **localStorage** — client-side persistence

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/Pratikchandrathakur/focus-checker.git
cd focus-checker

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # Preview the production build locally
```

### Type Check

```bash
npm run type-check
```

## 📦 Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import the `focus-checker` repo
4. Vercel auto-detects Vite — click **Deploy**
5. Live in ~60 seconds

## 💡 The Methodology

This app is based on an attention management approach:

> **Attention** is influenced by your emotional state, interests, needs, beliefs, goals, and experiences. **Concentration** is maintaining attention on a specific topic. Attention naturally decreases over time — forcing focus leads to frustration, not progress.

**How it works:**
1. **Assess** your current state before starting work (Quick Check)
2. **Track** your sessions with full context (Log Session)
3. **Discover** patterns after one week of data (Dashboard)
4. **Experiment** with different environments, times, and conditions
5. **Never force** focus — stop when attention fades, that data point is valuable

## 📁 Project Structure

```
src/
├── main.tsx                          # Entry point
├── app/
│   ├── App.tsx                       # Main app with routing & persistence
│   ├── types.ts                      # Data model & type definitions
│   └── components/
│       ├── FocusChecker/
│       │   ├── QuickCheck.tsx        # Readiness assessment (2-step)
│       │   ├── LogSession.tsx        # Session tracker (4-phase)
│       │   ├── Dashboard.tsx         # Insights & charts
│       │   └── History.tsx           # Activity journal
│       └── ui/                       # 48 shadcn/ui components
└── styles/
    ├── index.css                     # CSS entry
    ├── tailwind.css                  # Tailwind imports
    ├── theme.css                     # CSS variables & dark mode
    └── fonts.css                     # Font configuration
```

## 📄 License

MIT
