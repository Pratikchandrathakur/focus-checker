import React from 'react';

interface SprintIconProps {
  size?: number;
  className?: string;
  muted?: boolean;
}

/**
 * 25 · 5 Sprint Chronometer Icon.
 * Displays a tactile chronometer with the iconic 25-minute interval arc,
 * zero notch, and 25m target tick. Completely avoids trademark issues.
 */
export function SprintIcon({
  size = 20,
  className = '',
  muted = false,
}: SprintIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block select-none shrink-0 ${className}`}
      style={{
        opacity: muted ? 0.35 : 1,
        transition: 'opacity 200ms ease, transform 200ms ease',
      }}
      aria-hidden="true"
    >
      {/* Outer chronometer dial rim */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className="text-slate-300 dark:text-slate-700"
      />

      {/* 25-minute active interval arc (sweeping 150 degrees from 12 o'clock to 5 o'clock) */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="24.87 59.69"
        strokeDashoffset="0"
        strokeLinecap="round"
        className={muted ? 'text-slate-400' : 'text-rose-500 dark:text-rose-400'}
        transform="rotate(-90 12 12)"
      />

      {/* Top 12 o'clock zero notch */}
      <line
        x1="12"
        y1="2.2"
        x2="12"
        y2="4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={muted ? 'text-slate-400' : 'text-rose-500 dark:text-rose-400'}
      />

      {/* 25-minute marker tick at 150 degrees (5 o'clock) */}
      <circle
        cx="16.75"
        cy="20.22"
        r="1.2"
        fill="currentColor"
        className={muted ? 'text-slate-400' : 'text-amber-500'}
      />

      {/* Center hub */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="currentColor"
        className={muted ? 'text-slate-400' : 'text-rose-500 dark:text-rose-400'}
      />

      {/* Hand pointing to 25m */}
      <line
        x1="12"
        y1="12"
        x2="15.2"
        y2="17.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        className={muted ? 'text-slate-400' : 'text-rose-500 dark:text-rose-400'}
      />
    </svg>
  );
}
