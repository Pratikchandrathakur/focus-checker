import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import './tour.css';
import type { TourStep } from './types';
import { padBox, placeCard, isUsable, type Box, type Placement } from './geometry';

interface Props {
  steps: TourStep[];
  open: boolean;
  /** Called when a step needs the app to be somewhere (a tab, a phone screen). */
  onEnterStep?: (step: TourStep) => void;
  onClose: (reason: 'done' | 'skip') => void;
}

const SPOT_PAD = 8;

function visibleBox(el: Element | null): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === 'hidden' || cs.display === 'none') return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** First element matching the selector that is actually on screen (hidden desktop/phone twins are skipped). */
export function findVisible(selector: string, root: ParentNode = document): Element | null {
  let list: Element[] = [];
  try { list = Array.from(root.querySelectorAll(selector)); } catch { return null; }
  return list.find((el) => visibleBox(el)) ?? null;
}

const sameBox = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5);

export function Tour({ steps, open, onEnterStep, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [spot, setSpot] = useState<Box | null>(null);
  const [callBoxes, setCallBoxes] = useState<(Box | null)[]>([]);
  const [vp, setVp] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cardSize, setCardSize] = useState({ width: 330, height: 300 });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const scrolledFor = useRef<string>('');
  const titleId = useId();
  const bodyId = useId();

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  // Always start from the first step (before paint, so a re-opened tour never flashes its old last step).
  useLayoutEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Remember where focus was when the tour opens.
  useEffect(() => {
    if (!open) return;
    scrolledFor.current = '';
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => nextRef.current?.focus(), 60);
    return () => {
      window.clearTimeout(t);
      returnFocus.current?.focus?.();
    };
  }, [open]);

  // While the tour is open the app behind it is inert: no stray focus, clicks or screen-reader reading.
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById('root');
    root?.setAttribute('inert', '');
    return () => root?.removeAttribute('inert');
  }, [open]);

  // Take the app to the right place for this step.
  useEffect(() => {
    if (open && step) onEnterStep?.(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id]);

  // Follow the target every frame (covers scrolling, resizing, animations and late-mounting content).
  useEffect(() => {
    if (!open || !step) return;
    let raf = 0;
    // `undefined` = nothing sent to React yet for this step, so the first frame always syncs (even to "no box").
    let prevSpot: Box | null | undefined;
    let prevCalls: (Box | null)[] | undefined;
    const tick = () => {
      const el = step.target ? findVisible(step.target) : null;
      const box = visibleBox(el);
      if (el && box && scrolledFor.current !== step.id) {
        scrolledFor.current = step.id;
        if (box.top < 70 || box.top + box.height > window.innerHeight - 10) {
          const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
        }
      }
      const padded = box ? padBox(box, SPOT_PAD, { width: window.innerWidth, height: window.innerHeight }) : null;
      if (prevSpot === undefined || !sameBox(padded, prevSpot)) { prevSpot = padded; setSpot(padded); }

      const calls = (step.callouts ?? []).map((c) => visibleBox(findVisible(c.selector, el ?? document)));
      const changed = prevCalls === undefined || calls.length !== prevCalls.length || calls.some((b, i) => !sameBox(b, prevCalls![i]));
      if (changed) { prevCalls = calls; setCallBoxes(calls); }

      if (window.innerWidth !== vpRef.current.width || window.innerHeight !== vpRef.current.height) {
        vpRef.current = { width: window.innerWidth, height: window.innerHeight };
        setVp(vpRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    const vpRef = { current: { width: window.innerWidth, height: window.innerHeight } };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, step]);

  // Measure the card so placement can avoid the viewport edges.
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const el = cardRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setCardSize((s) => (Math.abs(s.width - r.width) > 1 || Math.abs(s.height - r.height) > 1 ? { width: r.width, height: r.height } : s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, step?.id]);

  const go = useCallback((n: number) => setIndex(Math.min(Math.max(n, 0), steps.length - 1)), [steps.length]);
  const next = useCallback(() => (last ? onClose('done') : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose('skip'); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); back(); }
      else if (e.key === 'Tab' && cardRef.current) {
        const f = Array.from(cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
        if (!f.length) return;
        const firstEl = f[0], lastEl = f[f.length - 1];
        if (!cardRef.current.contains(document.activeElement)) { e.preventDefault(); firstEl.focus(); }
        else if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, next, back, onClose]);

  const placement: Placement = useMemo(() => placeCard(isUsable(spot) ? spot : null, cardSize, vp), [spot, cardSize, vp]);

  if (!open || !step) return null;
  const Icon = step.icon;
  const found = (step.callouts ?? []).map((c, i) => ({ c, box: callBoxes[i] })).filter((x) => isUsable(x.box));
  const sheet = placement.side === 'sheet-top' || placement.side === 'sheet-bottom';
  const emptySpot: Box = { top: vp.height / 2, left: vp.width / 2, width: 0, height: 0 };

  return createPortal(
    <div className="tour-root" data-testid="tour" role="presentation">
      <div className="tour-block" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
      <div className="tour-spot" data-empty={!isUsable(spot)} style={{ ...(isUsable(spot) ? spot : emptySpot) }} data-testid="tour-spot" />
      {found.map(({ c, box }, i) => (
        <div key={c.selector + i} className="tour-callout" style={box!} data-testid="tour-callout">
          <span className="tour-callout-num">{i + 1}</span>
        </div>
      ))}

      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-side={placement.side}
        data-sheet={sheet}
        style={{ top: placement.top, left: placement.left }}
      >
        {placement.arrow !== null && (
          <span
            className="tour-card-arrow"
            style={placement.side === 'left' || placement.side === 'right' ? { top: placement.arrow } : { left: placement.arrow }}
            aria-hidden
          />
        )}
        <div className="tour-scroll">
        <div className="tour-body" key={step.id}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="tour-chip" aria-hidden><Icon size={19} /></span>
            <div>
              <div className="tour-step-label" aria-live="polite">Step {index + 1} of {steps.length}</div>
              <h2 className="tour-title" id={titleId}>{step.title}</h2>
            </div>
          </div>
          <p className="tour-text" id={bodyId}>{step.body}</p>
          {found.length > 0 && (
            <ul className="tour-legend">
              {found.map(({ c }, i) => (
                <li key={c.selector + i}><span className="n" aria-hidden>{i + 1}</span><span><b>{c.label}.</b> {c.text}</span></li>
              ))}
            </ul>
          )}
          {step.tip && <div className="tour-tip">{step.tip}</div>}
        </div>

        </div>
        <div className="tour-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} aria-label="Tour progress">
          <i style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="tour-dots">
          {steps.map((s, i) => (
            <button key={s.id} type="button" className="tour-dot" aria-label={`Go to step ${i + 1}: ${s.title}`} aria-current={i === index ? 'step' : undefined} onClick={() => go(i)} />
          ))}
        </div>

        <div className="tour-actions">
          <button type="button" className="tour-skip" onClick={() => onClose('skip')}>{last ? 'Close' : 'Skip tour'}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="tour-btn tour-btn-ghost" onClick={back} disabled={index === 0} aria-label="Previous step"><ArrowLeft size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /> Back</button>
            <button type="button" ref={nextRef} className="tour-btn tour-btn-primary" onClick={next}>
              {last ? <>Finish <Check size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /></> : <>Next <ArrowRight size={15} style={{ display: 'inline', verticalAlign: '-2px' }} /></>}
            </button>
          </div>
        </div>
        <div className="tour-kbd" aria-hidden>Tip: use <kbd>←</kbd> <kbd>→</kbd> to move, <kbd>Esc</kbd> to leave.</div>
      </div>
    </div>,
    document.body,
  );
}
