/**
 * Atomic CardStatus for Coinet Card system
 * Status area for badge, label, or status icon
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardStatusProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardStatus: React.FC<CardStatusProps> = ({ children, className, style }) => (
  <span
    className={['co-card-status', className].filter(Boolean).join(' ')}
    style={{
      marginLeft: 'auto',
      fontSize: 'var(--font-size-xs)',
      fontWeight: 600,
      color: 'var(--color-accent-blue)',
      ...style,
    }}
    aria-label="Card status"
  >
    {children}
  </span>
); 