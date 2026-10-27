// Builds the payment-provider checkout link. The link comes from config (never from user input)
// and is only used if it is https and on an allowed host, so it can't become an open redirect.
export interface CheckoutConfig {
  monthly: string;
  yearly: string;
  hosts: string[];
  userParam: string;
  emailParam: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;

export function buildCheckoutUrl(plan: 'monthly' | 'yearly', user: { id: string; email: string }, cfg: CheckoutConfig): string | null {
  const base = plan === 'yearly' ? cfg.yearly : cfg.monthly;
  if (!base || !UUID_RE.test(user.id)) return null;
  let url: URL;
  try { url = new URL(base); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (!cfg.hosts.map((h) => h.toLowerCase()).includes(url.hostname.toLowerCase())) return null;
  url.hash = '';
  url.searchParams.set(cfg.userParam, user.id);
  if (user.email && user.email.length <= 254 && EMAIL_RE.test(user.email)) url.searchParams.set(cfg.emailParam, user.email);
  return url.toString();
}
