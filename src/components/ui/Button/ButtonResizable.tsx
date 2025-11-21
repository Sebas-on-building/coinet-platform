/**
 * Atomic ButtonResizable for Coinet
 * Resizable handle for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonResizableProps {
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonResizable: React.FC<ButtonResizableProps> = ({ className, style, 'aria-label': ariaLabel }) => (
  <span
    className={["co-btn-resizable", className].filter(Boolean).join(' ')}
    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'nwse-resize', ...style }}
    role="button"
    tabIndex={0}
    aria-label={ariaLabel || 'Resizable handle'}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="12" width="8" height="2" rx="1" fill="currentColor" />
      <rect x="12" y="4" width="2" height="8" rx="1" fill="currentColor" />
    </svg>
  </span>
); 