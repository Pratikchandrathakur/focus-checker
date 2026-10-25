// ─────────────────────────────────────────────────────────────
//  Brand & business settings — edit these before launch.
// ─────────────────────────────────────────────────────────────
export const SITE = {
  name: 'FocusChecker',
  tagline: 'Focus timer, breathing resets & attention insights',
  /** Production URL, no trailing slash. Also update index.html, robots.txt and sitemap.xml. */
  url: 'https://focuschecker.app',
  supportEmail: 'hello@focuschecker.app',
  /** Legal entity / owner shown in Terms & Privacy. */
  owner: 'FocusChecker',
  jurisdiction: 'Nepal',
  legalLastUpdated: 'October 25, 2026',
};

export const PRICING = {
  currency: '$',
  proMonthly: 4,
  proYearly: 36,
  /**
   * Until payments are live, the Pro button collects interest here.
   * Paste a Tally / Google Form / Lemon Squeezy checkout URL. Empty = mailto link.
   */
  waitlistUrl: '',
  /** Flip to true once checkout (Lemon Squeezy / Paddle) is wired up. */
  proAvailable: false,
};

export const FREE_FEATURES = [
  'Focus dial timer with Deep Work & 25 · 5 Sprint modes',
  'Guided breathing resets (physiological sigh, box breathing)',
  'Readiness check-ins',
  '4 built-in focus soundscapes',
  'Floating & picture-in-picture timer',
  '7-day analytics and full journal',
  'Export your data anytime (JSON / CSV)',
];

export const PRO_FEATURES = [
  'Everything in Free',
  'Sync across all your devices',
  'Full history analytics & trends beyond 7 days',
  'Personal patterns: best hours, break cadence, sleep correlation',
  'More soundscapes & custom mixes',
  'Weekly email focus report',
  'Priority support',
];

/**
 * Interval mode branding. "25 · 5 Sprint" delivers instant recognition
 * for the classic 25m work / 5m recovery method while completely avoiding
 * trademark restrictions on "Pomodoro" or tomato imagery.
 */
export const INTERVAL_MODE = {
  label: '25 · 5 Sprint',
  shortLabel: 'Sprint',
  badge: '25/5 Cadence',
  icon: 'sprint' as 'sprint' | 'timer',
  descriptor: '25m Focus • 5m Recovery',
  hint: 'Classic 25-minute focus intervals with structured 5-minute recovery rounds',
};
