/**
 * Atomic CardSkeleton for Coinet Card system
 * Loading state for Card, customizable for variants
 * Uses design tokens and ARIA best practices
 */
import React from 'react';

export interface CardSkeletonProps {
  variant?: 'default' | 'compact' | 'widget';
  className?: string;
  style?: React.CSSProperties;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ variant = 'default', className, style }) => (
  <div
    className={['co-card-skeleton', 'animate-pulse', className].filter(Boolean).join(' ')}
    style={{
      height: variant === 'compact' ? 64 : variant === 'widget' ? 96 : 120,
      background: 'var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      ...style,
    }}
    aria-label="Card loading"
    aria-busy="true"
  />
); 