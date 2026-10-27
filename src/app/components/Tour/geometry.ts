// Pure layout maths for the tour, kept separate so it can be unit-tested without a browser.
export interface Box { top: number; left: number; width: number; height: number }
export interface Viewport { width: number; height: number }
export type Side = 'top' | 'bottom' | 'left' | 'right' | 'center' | 'float' | 'sheet-top' | 'sheet-bottom';
export interface Placement { top: number; left: number; side: Side; arrow: number | null }

export const CARD_MARGIN = 12;
export const CARD_GAP = 16;
export const SHEET_BREAKPOINT = 640;

export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), Math.max(min, max));

/** Grow a box by `pad` on every side and keep it inside the viewport. */
export function padBox(b: Box, pad: number, vp: Viewport): Box {
  const top = Math.max(0, b.top - pad);
  const left = Math.max(0, b.left - pad);
  const right = Math.min(vp.width, b.left + b.width + pad);
  const bottom = Math.min(vp.height, b.top + b.height + pad);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

export function isUsable(b: Box | null | undefined): b is Box {
  return !!b && Number.isFinite(b.top) && Number.isFinite(b.left) && b.width > 1 && b.height > 1;
}

/**
 * Where to put the explanation card. Wide screens: beside the highlighted box on the side with the most
 * room (bottom, top, right, left in that preference), clamped inside the viewport, with an arrow offset
 * pointing at the box centre. Phones: a full-width sheet docked away from the highlighted box.
 */
export function placeCard(target: Box | null, card: { width: number; height: number }, vp: Viewport): Placement {
  if (vp.width < SHEET_BREAKPOINT) {
    const dockBottom = !target || target.top + target.height / 2 < vp.height / 2;
    return { top: dockBottom ? vp.height - card.height - CARD_MARGIN : CARD_MARGIN, left: CARD_MARGIN, side: dockBottom ? 'sheet-bottom' : 'sheet-top', arrow: null };
  }
  if (!isUsable(target)) {
    return { top: Math.max(CARD_MARGIN, (vp.height - card.height) / 2), left: Math.max(CARD_MARGIN, (vp.width - card.width) / 2), side: 'center', arrow: null };
  }
  const room = {
    bottom: vp.height - (target.top + target.height) - CARD_GAP - CARD_MARGIN,
    top: target.top - CARD_GAP - CARD_MARGIN,
    right: vp.width - (target.left + target.width) - CARD_GAP - CARD_MARGIN,
    left: target.left - CARD_GAP - CARD_MARGIN,
  };
  const fits = {
    bottom: room.bottom >= card.height,
    top: room.top >= card.height,
    right: room.right >= card.width,
    left: room.left >= card.width,
  };
  const order: ('bottom' | 'top' | 'right' | 'left')[] = ['bottom', 'top', 'right', 'left'];
  let side = order.find((s) => fits[s]);
  if (!side) {
    // Nothing fits cleanly (a very large target): dock in the bottom corner on the side away from the target's centre.
    const targetOnLeft = target.left + target.width / 2 < vp.width / 2;
    return {
      top: Math.max(CARD_MARGIN, vp.height - card.height - CARD_MARGIN),
      left: targetOnLeft ? Math.max(CARD_MARGIN, vp.width - card.width - CARD_MARGIN) : CARD_MARGIN,
      side: 'float',
      arrow: null,
    };
  }
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;
  let top: number, left: number, arrow: number;
  if (side === 'bottom' || side === 'top') {
    left = clamp(cx - card.width / 2, CARD_MARGIN, vp.width - card.width - CARD_MARGIN);
    top = side === 'bottom' ? target.top + target.height + CARD_GAP : target.top - CARD_GAP - card.height;
    arrow = clamp(cx - left, 20, card.width - 20);
  } else {
    top = clamp(cy - card.height / 2, CARD_MARGIN, vp.height - card.height - CARD_MARGIN);
    left = side === 'right' ? target.left + target.width + CARD_GAP : target.left - CARD_GAP - card.width;
    arrow = clamp(cy - top, 20, card.height - 20);
  }
  return { top, left, side, arrow };
}
