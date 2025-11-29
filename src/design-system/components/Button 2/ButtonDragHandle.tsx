/// <reference types="react" />
/**
 * Atomic ButtonDragHandle for Coinet
 * Drag handle for Button (for drag-and-drop, ARIA, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonDragHandleProps {
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonDragHandle: React.FC<ButtonDragHandleProps> = ({ className, style, 'aria-label': ariaLabel }) => (
  <span
    className={["co-btn-drag-handle", className].filter(Boolean).join(' ')}
    style={{ display: 'inline-flex', alignItems: 'center', cursor: 'grab', ...style }}
    role="button"
    tabIndex={0}
    aria-label={ariaLabel || 'Drag handle'}
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="4" r="1.5" fill="currentColor" />
      <circle cx="4" cy="8" r="1.5" fill="currentColor" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" />
      <circle cx="8" cy="4" r="1.5" fill="currentColor" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="4" r="1.5" fill="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  </span>
); 