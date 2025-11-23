/**
 * Atomic CardActions for Coinet Card system
 * Action area for buttons, menus, or icons
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardActionsProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardActions: React.FC<CardActionsProps> = ({ children, className, style }) => (
  <div
    className={['co-card-actions', className].filter(Boolean).join(' ')}
    style={{
      display: 'flex',
      gap: 'var(--space-sm)',
      marginTop: 'var(--space-sm)',
      ...style,
    }}
    aria-label="Card actions"
    role="group"
  >
    {children}
  </div>
); 