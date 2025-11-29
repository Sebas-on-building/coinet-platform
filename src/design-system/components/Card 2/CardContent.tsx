/**
 * Atomic CardContent for Coinet Card system
 * Main content area of the Card
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardContent: React.FC<CardContentProps> = ({ children, className, style }) => (
  <div
    className={['co-card-content', className].filter(Boolean).join(' ')}
    style={{
      fontSize: 'var(--font-size-base)',
      color: 'var(--color-text)',
      ...style,
    }}
    aria-label="Card content"
  >
    {children}
  </div>
); 