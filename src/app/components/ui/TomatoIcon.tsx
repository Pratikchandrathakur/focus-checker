import React from 'react';

export function TomatoIcon({ 
  size = 18, 
  className = '', 
  ...props 
}: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Plump tomato body */}
      <path d="M12 7c-1.3 0-2.5.2-3.6.7C4.8 9.2 2.5 12.6 2.5 16.5 2.5 20.2 6.8 23 12 23s9.5-2.8 9.5-6.5c0-3.9-2.3-7.3-5.9-8.8-1.1-.5-2.3-.7-3.6-.7z" />
      {/* Stem */}
      <path d="M12 5c-.3-1.6.2-2.7 1.2-3.5" />
      {/* Tomato star calyx / leaves on top */}
      <path d="M12 6.5c-1.5-1.5-3.5-1.2-4.5-.4.8.8 2 1.4 3.5 1.1" />
      <path d="M12 6.5c1.5-1.5 3.5-1.2 4.5-.4-.8.8-2 1.4-3.5 1.1" />
      <path d="M9.5 7.5c-1.3.5-2.2 1.8-1.8 2.6.9-.2 1.8-.8 2.2-1.8" />
      <path d="M14.5 7.5c1.3.5 2.2 1.8 1.8 2.6-.9-.2-1.8-.8-2.2-1.8" />
    </svg>
  );
}
