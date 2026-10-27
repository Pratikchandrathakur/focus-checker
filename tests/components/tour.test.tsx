import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Compass } from 'lucide-react';
import { Tour, findVisible } from '../../src/app/components/Tour/Tour';
import { TOUR_STEPS } from '../../src/app/components/Tour/steps';
import type { TourStep } from '../../src/app/components/Tour/types';

const steps: TourStep[] = [
  { id: 'a', title: 'First', body: 'Intro body', icon: Compass },
  { id: 'b', title: 'Second', body: 'Has a target', icon: Compass, target: '#t', tab: 'sound',
    callouts: [{ selector: '#c1', label: 'One', text: 'does one' }, { selector: '#missing', label: 'Ghost', text: 'not on screen' }] },
  { id: 'c', title: 'Third', body: 'Last', icon: Compass },
];

function mockRect(el: Element, r: { top: number; left: number; width: number; height: number }) {
  el.getBoundingClientRect = () => ({ ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top, toJSON: () => r }) as DOMRect;
}

let host: HTMLElement;
beforeEach(() => {
  host = document.createElement('div');
  host.id = 'root';
  document.body.appendChild(host);
  window.matchMedia = window.matchMedia ?? ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }) as MediaQueryList);
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
});
afterEach(() => { host.remove(); vi.unstubAllGlobals(); });

function mount(props: Partial<React.ComponentProps<typeof Tour>> = {}) {
  const t = document.createElement('div'); t.id = 't'; mockRect(t, { top: 100, left: 200, width: 300, height: 80 });
  const c1 = document.createElement('button'); c1.id = 'c1'; mockRect(c1, { top: 110, left: 210, width: 80, height: 40 });
  t.appendChild(c1); document.body.appendChild(t);
  const onClose = vi.fn(), onEnterStep = vi.fn();
  const utils = render(<Tour steps={steps} open onClose={onClose} onEnterStep={onEnterStep} {...props} />);
  return { ...utils, onClose, onEnterStep, cleanup: () => t.remove() };
}
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });

describe('Tour', () => {
  it('shows step 1 with progress and no Back', async () => {
    const m = mount(); await flush();
    expect(screen.getByRole('dialog', { name: 'First' })).toBeTruthy();
    expect(screen.getByText(/Step 1 of 3/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Previous step' }) as HTMLButtonElement).disabled).toBe(true);
    m.cleanup();
  });

  it('Next / Back move through steps and ask the app to navigate', async () => {
    const m = mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: /Next/ })); await flush();
    expect(screen.getByRole('dialog', { name: 'Second' })).toBeTruthy();
    expect(m.onEnterStep).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'b', tab: 'sound' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' })); await flush();
    expect(screen.getByRole('dialog', { name: 'First' })).toBeTruthy();
    m.cleanup();
  });

  it('boxes the target and lists only the callouts that are actually on screen', async () => {
    const m = mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: /Next/ })); await flush();
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); await new Promise((r) => setTimeout(r, 40)); });
    expect(screen.getByTestId('tour-spot').getAttribute('data-empty')).toBe('false');
    expect(screen.getAllByTestId('tour-callout')).toHaveLength(1);
    expect(screen.getByText(/does one/)).toBeTruthy();
    expect(screen.queryByText(/not on screen/)).toBeNull();
    m.cleanup();
  });

  it('falls back to a centred card when the target is not on screen', async () => {
    const m = mount({ steps: [{ ...steps[1], target: '#nope', callouts: [] }, steps[2]] }); await flush();
    expect(screen.getByTestId('tour-spot').getAttribute('data-empty')).toBe('true');
    expect(screen.getByRole('dialog').getAttribute('data-side')).toBe('center');
    m.cleanup();
  });

  it('Finish reports done; Skip and Esc report skip', async () => {
    const a = mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: /Next/ })); fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }));
    expect(a.onClose).toHaveBeenCalledWith('done');
    a.unmount(); a.cleanup();

    const b = mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(b.onClose).toHaveBeenCalledWith('skip');
    b.onClose.mockClear();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(b.onClose).toHaveBeenCalledWith('skip');
    b.cleanup();
  });

  it('arrow keys navigate', async () => {
    const m = mount(); await flush();
    fireEvent.keyDown(window, { key: 'ArrowRight' }); await flush();
    expect(screen.getByRole('dialog', { name: 'Second' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' }); await flush();
    expect(screen.getByRole('dialog', { name: 'First' })).toBeTruthy();
    m.cleanup();
  });

  it('progress dots jump to a step', async () => {
    const m = mount(); await flush();
    fireEvent.click(screen.getByRole('button', { name: /Go to step 3: Third/ })); await flush();
    expect(screen.getByRole('dialog', { name: 'Third' })).toBeTruthy();
    m.cleanup();
  });

  it('makes the app behind inert while open and restores it on close', async () => {
    const m = mount(); await flush();
    expect(host.hasAttribute('inert')).toBe(true);
    m.rerender(<Tour steps={steps} open={false} onClose={m.onClose} />); await flush();
    expect(host.hasAttribute('inert')).toBe(false);
    m.cleanup();
  });

  it('a re-opened tour starts again at step 1', async () => {
    const m = mount(); await flush();
    fireEvent.keyDown(window, { key: 'ArrowRight' }); fireEvent.keyDown(window, { key: 'ArrowRight' }); await flush();
    m.rerender(<Tour steps={steps} open={false} onClose={m.onClose} />); await flush();
    m.rerender(<Tour steps={steps} open onClose={m.onClose} />); await flush();
    expect(screen.getByRole('dialog', { name: 'First' })).toBeTruthy();
    m.cleanup();
  });

  it('renders nothing when closed', () => {
    render(<Tour steps={steps} open={false} onClose={() => {}} />);
    expect(screen.queryByTestId('tour')).toBeNull();
  });
});

describe('findVisible', () => {
  it('skips hidden twins and invalid selectors', () => {
    const a = document.createElement('div'); a.className = 'twin'; mockRect(a, { top: 0, left: 0, width: 0, height: 0 });
    const b = document.createElement('div'); b.className = 'twin'; mockRect(b, { top: 0, left: 0, width: 50, height: 50 });
    document.body.append(a, b);
    expect(findVisible('.twin')).toBe(b);
    expect(findVisible('###bad[[')).toBeNull();
    a.remove(); b.remove();
  });
});

describe('tour content', () => {
  it('has unique ids, ends with a closing step, and every text is non-empty', () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOUR_STEPS[0].id).toBe('welcome');
    expect(TOUR_STEPS.at(-1)!.id).toBe('done');
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.body.length).toBeGreaterThan(20);
      for (const c of s.callouts ?? []) { expect(c.label).toBeTruthy(); expect(c.text).toBeTruthy(); }
    }
  });
  it('only targets selectors that exist in the app source (guards against renamed anchors)', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const src = walk('src/app').filter((f) => /\.tsx$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
    const attrs = new Set<string>();
    for (const s of TOUR_STEPS) {
      for (const m of (s.target ?? '').matchAll(/data-tour="([^"]+)"/g)) attrs.add(`data-tour="${m[1]}"`);
      for (const c of s.callouts ?? []) for (const m of c.selector.matchAll(/data-tour-item="([^"]+)"/g)) attrs.add(`data-tour-item="${m[1]}"`);
    }
    for (const a of attrs) {
      const tabItem = a.match(/data-tour-item="tab-(.+)"/);
      if (tabItem) { expect(src).toContain('data-tour-item={`tab-${item.id}`}'); continue; }
      expect(src, `anchor ${a} is not rendered anywhere`).toContain(a);
    }
  });
});
