import * as React from 'react';
import { cn } from './utils';

type Accent = 'sky' | 'amber' | 'emerald' | 'indigo' | 'rose';

interface RangeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  accent?: Accent;
}

/**
 * Native <input type="range"> (keeps free keyboard + touch + screen-reader support)
 * with a consistent filled track in light and dark mode. See `.fc-range` in theme.css.
 */
export function RangeInput({ accent = 'sky', className, style, value, min = 0, max = 100, ...rest }: RangeInputProps) {
  const lo = Number(min);
  const hi = Number(max);
  const pct = hi > lo ? ((Number(value) - lo) / (hi - lo)) * 100 : 0;
  return (
    <input
      {...rest}
      type="range"
      min={min}
      max={max}
      value={value}
      data-accent={accent}
      className={cn('fc-range', className)}
      style={{ ...style, ['--pct' as string]: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  );
}
