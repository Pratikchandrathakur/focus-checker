import React from 'react';
import { SprintIcon } from './SprintIcon';

/**
 * Re-exports SprintIcon for backwards compatibility, completely
 * replacing trademarked tomato artwork with the custom 25·5 Chronometer.
 */
export function TomatoIcon({
  size = 18,
  className = '',
  muted = false,
}: { size?: number; className?: string; muted?: boolean }) {
  return <SprintIcon size={size} className={className} muted={muted} />;
}
