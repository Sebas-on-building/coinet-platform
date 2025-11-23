/**
 * Atomic CardDragHandle for Coinet Card system
 * Drag handle for drag-and-drop, with keyboard and pointer support
 * Uses design tokens, ARIA, and full documentation
 */
import React from 'react';

export interface CardDragHandleProps {
  onDragStart?: (e: React.DragEvent | React.KeyboardEvent) => void;
  onDragEnd?: (e: React.DragEvent | React.KeyboardEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CardDragHandle: React.FC<CardDragHandleProps> = ({ onDragStart, onDragEnd, className, style }) => (
  <button
    className={['co-card-drag-handle', className].filter(Boolean).join(' ')}
    style={{
      cursor: 'grab',
      background: 'none',
      border: 'none',
      padding: 'var(--space-xs)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--color-accent-blue)',
      transition: 'background 0.2s',
      ...style,
    }}
    tabIndex={0}
    aria-label="Drag card"
    draggable
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onKeyDown={e => {
      if (e.key === ' ' || e.key === 'Enter') onDragStart?.(e);
    }}
    onKeyUp={e => {
      if (e.key === ' ' || e.key === 'Enter') onDragEnd?.(e);
    }}
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="5" cy="5" r="1.5" fill="currentColor" /><circle cx="5" cy="10" r="1.5" fill="currentColor" /><circle cx="5" cy="15" r="1.5" fill="currentColor" /><circle cx="10" cy="5" r="1.5" fill="currentColor" /><circle cx="10" cy="10" r="1.5" fill="currentColor" /><circle cx="10" cy="15" r="1.5" fill="currentColor" /><circle cx="15" cy="5" r="1.5" fill="currentColor" /><circle cx="15" cy="10" r="1.5" fill="currentColor" /><circle cx="15" cy="15" r="1.5" fill="currentColor" /></svg>
  </button>
); 