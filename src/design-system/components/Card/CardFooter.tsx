/**
 * Atomic CardFooter for Coinet Card system
 * Footer area for actions, info, or summary
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className, style }) => (
  <footer
    className={['co-card-footer', className].filter(Boolean).join(' ')}
    style={{
      marginTop: 'var(--space-md)',
      fontSize: 'var(--font-size-sm)',
      color: 'var(--color-text-secondary)',
      ...style,
    }}
    aria-label="Card footer"
  >
    {children}
  </footer>
); 