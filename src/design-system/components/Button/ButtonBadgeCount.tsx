/**
 * ButtonBadgeCount – Atomic count badge for buttons (Coinet)
 * Supports: count, max, ARIA, accessible, extensible
 */
import React from 'react';

export interface ButtonBadgeCountProps {
  count: number;
  max?: number;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/**
 * Atomic ButtonBadgeCount for notification counts, etc.
 */
export const ButtonBadgeCount: React.FC<ButtonBadgeCountProps> = ({
  count,
  max = 99,
  className,
  style,
  'aria-label': ariaLabel,
}) => (
  <span
    className={['co-btn-badge-count', className].filter(Boolean).join(' ')}
    style={{
      display: 'inline-block',
      minWidth: 16,
      padding: '0 4px',
      fontSize: 12,
      fontWeight: 700,
      borderRadius: 8,
      background: 'var(--color-accent-blue)',
      color: '#fff',
      textAlign: 'center',
      ...style,
    }}
    aria-label={ariaLabel || `Count: ${count}`}
    tabIndex={0}
  >
    {count > max ? `${max}+` : count}
  </span>
); 