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

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

/**
 * Payment provider checkout (Lemon Squeezy, Paddle, Stripe... anything that gives you a hosted checkout link
 * and can send a webhook). Set these in .env.local / your host's environment, never in the code:
 *   VITE_CHECKOUT_MONTHLY, VITE_CHECKOUT_YEARLY  - the hosted checkout links (https only)
 *   VITE_CHECKOUT_HOSTS                           - comma-separated hosts those links may use
 *   VITE_BILLING_PORTAL_URL                       - where customers manage or cancel (optional)
 * Pro unlocks only when the payments webhook has told the server someone paid; see supabase/README.md.
 */
export const CHECKOUT = {
  monthly: env.VITE_CHECKOUT_MONTHLY ?? '',
  yearly: env.VITE_CHECKOUT_YEARLY ?? '',
  hosts: (env.VITE_CHECKOUT_HOSTS ?? '').split(',').map((h) => h.trim()).filter(Boolean),
  /** Query parameter names your provider uses to pass the account id and email through checkout. */
  userParam: env.VITE_CHECKOUT_USER_PARAM ?? 'checkout[custom][user_id]',
  emailParam: env.VITE_CHECKOUT_EMAIL_PARAM ?? 'checkout[email]',
  billingPortalUrl: env.VITE_BILLING_PORTAL_URL ?? '',
};

export const PRICING = {
  currency: '$',
  proMonthly: 4,
  proYearly: 36,
  /** Until checkout is configured, the Pro button collects interest here (empty = mailto link). */
  waitlistUrl: '',
  /** True automatically once both checkout links and their host are configured. */
  proAvailable: Boolean(CHECKOUT.monthly && CHECKOUT.yearly && CHECKOUT.hosts.length),
};

export const FREE_FEATURES = [
  'Focus dial timer with Deep Work & 25 · 5 Sprint modes',
  'Guided breathing resets (physiological sigh, box breathing)',
  'Readiness check-ins',
  '4 built-in focus soundscapes',
  'Floating & picture-in-picture timer',
  '7-day analytics and a full journal on your device',
  'Sign in to sync your last 7 days across devices',
  'Export your data anytime (JSON / CSV)',
];

export const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited history, synced across all your devices',
  '30, 90-day and all-time analytics and trends',
  'Personal patterns: best hours, break cadence, sleep and focus',
  'Custom sound mixes: layer sounds and save your own',
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
