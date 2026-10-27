import { describe, it, expect } from 'vitest';
import { buildCheckoutUrl } from '../../src/app/services/checkout';

const cfg = { monthly: 'https://focuschecker.lemonsqueezy.com/buy/abc', yearly: 'https://focuschecker.lemonsqueezy.com/buy/def', hosts: ['focuschecker.lemonsqueezy.com'], userParam: 'checkout[custom][user_id]', emailParam: 'checkout[email]' };
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'a@example.com' };

describe('buildCheckoutUrl', () => {
  it('builds the checkout link and attaches the account id (so the webhook knows who paid)', () => {
    const url = new URL(buildCheckoutUrl('monthly', user, cfg)!);
    expect(url.origin + url.pathname).toBe('https://focuschecker.lemonsqueezy.com/buy/abc');
    expect(url.searchParams.get('checkout[custom][user_id]')).toBe(user.id);
    expect(url.searchParams.get('checkout[email]')).toBe('a@example.com');
  });
  it('uses the yearly link for the yearly plan', () => {
    expect(buildCheckoutUrl('yearly', user, cfg)).toContain('/buy/def');
  });
  it('returns null when checkout is not configured', () => {
    expect(buildCheckoutUrl('monthly', user, { ...cfg, monthly: '' })).toBeNull();
  });
  it.each([
    ['http (not https)', 'http://focuschecker.lemonsqueezy.com/buy/abc'],
    ['javascript url', 'javascript:alert(1)'],
    ['data url', 'data:text/html,<script>alert(1)</script>'],
    ['another host', 'https://evil.example/buy/abc'],
    ['look-alike suffix host', 'https://focuschecker.lemonsqueezy.com.evil.example/buy'],
    ['userinfo trick', 'https://focuschecker.lemonsqueezy.com@evil.example/buy'],
    ['protocol-relative', '//evil.example/buy'],
    ['not a url', 'hello'],
  ])('refuses %s', (_n, bad) => {
    expect(buildCheckoutUrl('monthly', user, { ...cfg, monthly: bad })).toBeNull();
  });
  it('does not let user data break out of the query string', () => {
    const url = new URL(buildCheckoutUrl('monthly', { id: user.id, email: 'x@y.com&checkout[discount_code]=FREE#frag' }, cfg)!);
    expect(url.searchParams.get('checkout[discount_code]')).toBeNull();
    expect(url.hash).toBe('');
  });
  it('requires a real user id', () => {
    expect(buildCheckoutUrl('monthly', { id: 'guest', email: '' }, cfg)).toBeNull();
    expect(buildCheckoutUrl('monthly', { id: "1'; drop", email: '' }, cfg)).toBeNull();
  });
});
