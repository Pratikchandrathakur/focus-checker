import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { ResponsiveContainer: Pass, AreaChart: Pass, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, BarChart: Pass, Bar: () => null };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const cfg = vi.hoisted(() => ({ available: true }));
vi.mock('../../src/app/config', async (orig) => {
  const m = await orig<typeof import('../../src/app/config')>();
  return {
    ...m,
    get PRICING() { return { ...m.PRICING, proAvailable: cfg.available }; },
    CHECKOUT: { ...m.CHECKOUT, monthly: 'https://pay.example.com/m', yearly: 'https://pay.example.com/y', hosts: ['pay.example.com'], billingPortalUrl: 'javascript:alert(1)' },
  };
});

const engine = vi.hoisted(() => ({ playMix: vi.fn(), playPreset: vi.fn(), stop: vi.fn(), setVolume: vi.fn() }));
vi.mock('../../src/app/services/audioEngine', () => ({ audioEngine: engine }));

import { EntitlementProvider } from '../../src/app/context/EntitlementContext';
import { UpgradeDialog } from '../../src/app/components/Pro/UpgradeDialog';
import { Dashboard } from '../../src/app/components/FocusChecker/Dashboard';
import { MixBuilder } from '../../src/app/components/Pro/MixBuilder';
import { Soundscapes } from '../../src/app/components/FocusChecker/Soundscapes';
import type { HistoryItem } from '../../src/app/types';

const UID = '11111111-1111-4111-8111-111111111111';
const user = { id: UID, email: 'a@b.co', name: 'A', avatarSeed: 'a', joinedAt: '', streakDays: 0, lastActiveDate: '' };
const proRow = { pro: true, plan: 'yearly', status: 'active', current_period_end: '2030-01-01T00:00:00Z', cancel_at_period_end: false, history_days: null, max_mixes: 20 };
const freeRow = { pro: false, history_days: 7 };
const clientFor = (row: unknown) => ({ rpc: () => Promise.resolve({ data: row, error: null }) });

function withEnt(ui: React.ReactElement, row: unknown, openUpgrade = vi.fn(), userId: string | null = UID) {
  return render(<EntitlementProvider userId={userId} openUpgrade={openUpgrade} client={clientFor(row)}>{ui}</EntitlementProvider>);
}

const session = (i: number, daysAgo: number): HistoryItem => ({
  id: i, type: 'Session', date: new Date(Date.now() - daysAgo * 864e5).toISOString(), score: 70, task: 't', durationMinutes: 25,
  startTime: new Date(Date.now() - daysAgo * 864e5).toISOString(), breaks: [], attentionFaded: false, sleepHours: 7,
} as unknown as HistoryItem);

beforeEach(() => { cfg.available = true; vi.clearAllMocks(); });

describe('UpgradeDialog', () => {
  it('asks guests to create an account before paying', async () => {
    const onAuth = vi.fn();
    withEnt(<UpgradeDialog open onOpenChange={() => {}} user={{ ...user, id: 'guest' }} onOpenAuth={onAuth} />, freeRow, undefined, null);
    fireEvent.click(await screen.findByText('Create a free account'));
    expect(onAuth).toHaveBeenCalledWith('register');
    expect(screen.queryByText(/secure checkout/)).toBeNull();
  });

  it('links to checkout with the account id, opened safely', async () => {
    withEnt(<UpgradeDialog open onOpenChange={() => {}} user={user} onOpenAuth={() => {}} />, freeRow);
    const a = (await screen.findByText(/secure checkout/)).closest('a')!;
    expect(a.href).toContain('pay.example.com/y');
    expect(a.href).toContain(encodeURIComponent(UID));
    expect(a.rel).toContain('noopener');
    expect(a.rel).toContain('noreferrer');
  });

  it('shows the waitlist when checkout is not configured', async () => {
    cfg.available = false;
    withEnt(<UpgradeDialog open onOpenChange={() => {}} user={user} onOpenAuth={() => {}} />, freeRow);
    expect(await screen.findByText('Join the Pro waitlist')).toBeTruthy();
  });

  it('never renders a non-https billing portal link', async () => {
    withEnt(<UpgradeDialog open onOpenChange={() => {}} user={user} onOpenAuth={() => {}} />, proRow);
    await screen.findByText(/You have Pro/);
    expect(screen.queryByText(/Manage billing/)).toBeNull();
    expect(document.body.innerHTML).not.toContain('javascript:');
  });
});

describe('Dashboard gating', () => {
  const history = Array.from({ length: 12 }, (_, i) => session(i + 1, i * 10));

  it('free: long ranges open the upgrade dialog, stay on 7 days, and Pro cards are teasers', async () => {
    const open = vi.fn();
    withEnt(<Dashboard history={history} userId={UID} />, freeRow, open);
    fireEvent.click(await screen.findByRole('button', { name: /30 days/ }));
    expect(open).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^7 days/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByTestId('pro-lock').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByTestId('pro-patterns')).toBeNull();
  });

  it('pro: long ranges work and the patterns and report render', async () => {
    withEnt(<Dashboard history={history} userId={UID} />, proRow);
    await screen.findByTestId('pro-patterns');
    fireEvent.click(screen.getByRole('button', { name: /All time/ }));
    expect(screen.getByRole('button', { name: /All time/ }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('weekly-report')).toBeTruthy();
    expect(screen.queryByTestId('pro-lock')).toBeNull();
  });

  it('a failed entitlement lookup means Free, never Pro', async () => {
    render(<EntitlementProvider userId={UID} openUpgrade={() => {}} client={{ rpc: () => Promise.reject(new Error('down')) }}><Dashboard history={history} /></EntitlementProvider>);
    await waitFor(() => expect(screen.getAllByTestId('pro-lock').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('pro-patterns')).toBeNull();
  });
});

describe('Sounds', () => {
  it('free: brown noise opens the upgrade dialog instead of playing', async () => {
    const open = vi.fn();
    withEnt(<Soundscapes activeSoundscape="none" onSelectPreset={() => {}} />, freeRow, open);
    fireEvent.click(await screen.findByRole('button', { name: /Brown Noise/ }));
    expect(open).toHaveBeenCalled();
    expect(engine.playPreset).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mix-builder')).toBeNull();
  });

  it('pro: brown noise plays and the mixer is shown', async () => {
    const sel = vi.fn();
    withEnt(<Soundscapes activeSoundscape="none" onSelectPreset={sel} />, proRow);
    await screen.findByTestId('mix-builder');
    fireEvent.click(screen.getByRole('button', { name: /Brown Noise/ }));
    expect(engine.playPreset).toHaveBeenCalledWith('brown', expect.any(Number));
  });
});

describe('MixBuilder', () => {
  it('plays a layered mix, limits layers to unique sounds, and renders saved names as text', async () => {
    const evil = '<img src=x onerror=alert(1)>';
    const chain: any = {
      select: () => chain, order: () => chain, limit: () => Promise.resolve({ data: [{ id: 'a'.repeat(8) + '-aaaa-4aaa-8aaa-' + 'a'.repeat(12), name: evil, layers: [{ preset: 'rain', volume: 0.5 }] }], error: null }),
    };
    const client: any = { from: () => chain };
    const onPlay = vi.fn();
    render(<MixBuilder userId={UID} masterVolume={0.5} onPlay={onPlay} client={client} />);
    fireEvent.click(screen.getByRole('button', { name: /Play mix/ }));
    expect(engine.playMix).toHaveBeenCalledWith([{ preset: 'rain', volume: 0.7 }, { preset: 'brown', volume: 0.4 }], 0.5);
    expect(onPlay).toHaveBeenCalled();
    // add until no sounds are left; duplicate presets are impossible
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByRole('button', { name: /Add layer/ }));
    const selects = screen.getAllByRole('combobox');
    expect(new Set(selects.map((s) => (s as HTMLSelectElement).value)).size).toBe(selects.length);
    expect(selects.length).toBe(6);
    await screen.findByText(evil); // shown literally
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });
});
