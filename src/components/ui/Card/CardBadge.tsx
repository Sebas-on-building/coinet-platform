/**
 * Atomic CardBadge for Coinet Card system
 * Badge overlay for notification, live, new, etc.
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardBadgeProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardBadge: React.FC<CardBadgeProps> = ({ children, className, style }) => (
  <span
    className={['co-card-badge', className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      top: 'var(--space-xs)',
      right: 'var(--space-xs)',
      minWidth: 'var(--space-lg)',
      height: 'var(--space-lg)',
      borderRadius: '999px',
      background: 'var(--color-accent-purple)',
      color: '#fff',
      fontSize: 'var(--font-size-xs)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      zIndex: 2,
      boxShadow: '0 2px 8px 0 rgb(0 0 0 / 8%)',
      padding: '0 0.4em',
      transition: 'background 0.2s',
      ...style,
    }}
    aria-label="Card badge"
  >
    {children}
  </span>
); 