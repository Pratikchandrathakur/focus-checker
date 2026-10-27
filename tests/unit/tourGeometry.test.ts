import { describe, it, expect } from 'vitest';
import { placeCard, padBox, isUsable, clamp, CARD_MARGIN } from '../../src/app/components/Tour/geometry';

const vp = { width: 1280, height: 800 };
const card = { width: 360, height: 260 };

describe('padBox', () => {
  it('grows a box and never leaves the viewport', () => {
    expect(padBox({ top: 100, left: 100, width: 50, height: 40 }, 8, vp)).toEqual({ top: 92, left: 92, width: 66, height: 56 });
    const edge = padBox({ top: 2, left: 2, width: 1278, height: 790 }, 10, vp);
    expect(edge.top).toBe(0); expect(edge.left).toBe(0);
    expect(edge.left + edge.width).toBeLessThanOrEqual(vp.width);
    expect(edge.top + edge.height).toBeLessThanOrEqual(vp.height);
  });
});

describe('isUsable', () => {
  it.each([[null], [undefined], [{ top: NaN, left: 0, width: 10, height: 10 }], [{ top: 0, left: 0, width: 0, height: 10 }]])('rejects %j', (b) => {
    expect(isUsable(b as never)).toBe(false);
  });
  it('accepts a real box', () => expect(isUsable({ top: 0, left: 0, width: 20, height: 20 })).toBe(true));
});

describe('placeCard (desktop)', () => {
  it('prefers below the target and points the arrow at its centre', () => {
    const p = placeCard({ top: 100, left: 500, width: 200, height: 60 }, card, vp);
    expect(p.side).toBe('bottom');
    expect(p.top).toBe(100 + 60 + 16);
    expect(p.left + p.arrow!).toBeCloseTo(600, 0);
  });
  it('goes above when there is no room below', () => {
    const p = placeCard({ top: 700, left: 500, width: 200, height: 60 }, card, vp);
    expect(p.side).toBe('top');
    expect(p.top + card.height).toBeLessThanOrEqual(700 - 16 + 0.001);
  });
  it('goes beside a tall target', () => {
    const p = placeCard({ top: 20, left: 40, width: 300, height: 760 }, card, vp);
    expect(p.side).toBe('right');
    expect(p.left).toBe(40 + 300 + 16);
  });
  it('always stays inside the viewport', () => {
    for (const t of [{ top: 0, left: 0, width: 50, height: 30 }, { top: 770, left: 1250, width: 30, height: 30 }, { top: 300, left: 1200, width: 80, height: 80 }, { top: 5, left: 1100, width: 170, height: 40 }]) {
      const p = placeCard(t, card, vp);
      expect(p.left).toBeGreaterThanOrEqual(CARD_MARGIN);
      expect(p.top).toBeGreaterThanOrEqual(CARD_MARGIN);
      expect(p.left + card.width).toBeLessThanOrEqual(vp.width - CARD_MARGIN + 0.001);
      expect(p.top + card.height).toBeLessThanOrEqual(vp.height - CARD_MARGIN + 0.001);
    }
  });
  it('centres when there is no target', () => {
    const p = placeCard(null, card, vp);
    expect(p.side).toBe('center');
    expect(p.left).toBe((1280 - 360) / 2);
  });
  it('docks in a bottom corner, inside the viewport, when nothing fits', () => {
    const p = placeCard({ top: 0, left: 300, width: 680, height: 800 }, card, vp);
    expect(p.side).toBe('float');
    expect(p.top + card.height).toBeLessThanOrEqual(vp.height - 12 + 0.001);
    expect(p.left).toBeGreaterThanOrEqual(12);
    expect(p.left + card.width).toBeLessThanOrEqual(vp.width);
  });
  it('docks away from the target: target on the left -> card on the right', () => {
    const p = placeCard({ top: 0, left: 0, width: 700, height: 800 }, card, vp);
    expect(p.left).toBeGreaterThan(vp.width / 2);
  });
});

describe('placeCard (phone sheet)', () => {
  const phone = { width: 390, height: 800 };
  it('docks at the bottom when the target is in the top half', () => {
    const p = placeCard({ top: 100, left: 20, width: 100, height: 100 }, { width: 366, height: 240 }, phone);
    expect(p.side).toBe('sheet-bottom');
    expect(p.top).toBe(800 - 240 - 12);
  });
  it('docks at the top when the target is in the bottom half', () => {
    const p = placeCard({ top: 650, left: 20, width: 100, height: 100 }, { width: 366, height: 240 }, phone);
    expect(p.side).toBe('sheet-top');
    expect(p.top).toBe(12);
  });
});

describe('clamp', () => {
  it('clamps and tolerates min > max', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(5, 10, 3)).toBe(10);
  });
});
