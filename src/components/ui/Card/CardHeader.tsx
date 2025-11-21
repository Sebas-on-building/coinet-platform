/**
 * Atomic CardHeader for Coinet Card system
 * Supports icon, title, subtitle, and actions as children
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className, style }) => (
  <header
    className={['co-card-header', className].filter(Boolean).join(' ')}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      fontWeight: 700,
      fontSize: 'var(--font-size-lg)',
      marginBottom: 'var(--space-md)',
      ...style,
    }}
    aria-label="Card header"
  >
    {children}
  </header>
); 