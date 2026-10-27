import React from 'react';

/**
 * FocusChecker mark: one breath cycle drawn as a timer dial.
 * An open ring (the cycle, with a gap where it begins), a dot marking "now",
 * and a solid orb in the middle (the breath you're focusing on).
 */
export function LogoMark({ size = 36, tile = true, className }: { size?: number; tile?: boolean; className?: string }) {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}r`} x1="22" y1="30" x2="106" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4cc3ff" />
          <stop offset="1" stopColor="#5fe3b0" />
        </linearGradient>
        <radialGradient id={`${id}o`} cx="0.36" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#e2fff4" />
          <stop offset="0.38" stopColor="#5fe3b0" />
          <stop offset="1" stopColor="#2a9fd6" />
        </radialGradient>
        <radialGradient id={`${id}t`} cx="0.3" cy="0.2" r="1">
          <stop offset="0" stopColor="#1b3650" />
          <stop offset="1" stopColor="#0c1a27" />
        </radialGradient>
      </defs>
      {tile && <rect width="128" height="128" rx="30" fill={`url(#${id}t)`} />}
      <path d="M96.17 37 A42 42 0 1 1 64 22" fill="none" stroke={`url(#${id}r)`} strokeWidth="7" strokeLinecap="round" />
      <circle cx="81.75" cy="25.9" r="3.4" fill="#e2fff4" />
      <circle cx="64" cy="64" r="19" fill={`url(#${id}o)`} />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`lp-display ${className}`} style={{ letterSpacing: '-0.03em' }}>
      <span style={{ fontWeight: 700 }}>Focus</span>
      <span style={{ fontWeight: 500, opacity: 0.88 }}>Checker</span>
    </span>
  );
}
