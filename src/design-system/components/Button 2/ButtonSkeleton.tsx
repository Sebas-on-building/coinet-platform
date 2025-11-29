/**
 * Atomic ButtonSkeleton for Coinet
 * Skeleton/loading state for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonSkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({ width = 100, height = 40, className, style }) => (
  <span
    className={["co-btn-skeleton", className].filter(Boolean).join(' ')}
    style={{
      display: 'inline-block',
      width,
      height,
      borderRadius: 8,
      background: 'linear-gradient(90deg, var(--color-surface) 25%, var(--color-border) 50%, var(--color-surface) 75%)',
      backgroundSize: '200% 100%',
      animation: 'btn-skeleton-shimmer 1.2s infinite',
      ...style,
    }}
    aria-busy="true"
    aria-label="Loading..."
  />
);

// Add keyframes for shimmer effect
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes btn-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
  document.head.appendChild(style);
} 