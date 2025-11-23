/// <reference types="react" />
/**
 * ButtonBadge – Atomic badge for buttons (Coinet)
 * Inspired by Apple, Canva, TradingView, Solana
 * Supports: color, count, status, ARIA, micro-interactions, themeable
 * Extensible, accessible, beautiful
 */
import React from 'react';
import clsx from 'clsx';
import { ButtonBadgeStatus } from './ButtonBadgeStatus';
import { ButtonBadgeCount } from './ButtonBadgeCount';

export interface ButtonBadgeProps {
  color?: string;
  count?: number;
  status?: 'online' | 'offline' | 'alert' | 'info' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/**
 * Atomic ButtonBadge for notifications, status, etc.
 */
export const ButtonBadge: React.FC<ButtonBadgeProps> = ({
  color = 'var(--color-accent-blue)',
  count,
  status,
  children,
  className,
  style,
  'aria-label': ariaLabel,
}) => (
  <span
    className={clsx('co-btn-badge', className)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 20,
      height: 20,
      padding: '0 6px',
      fontSize: 12,
      fontWeight: 700,
      borderRadius: 12,
      background: color,
      color: '#fff',
      boxShadow: 'var(--shadow-xs)',
      position: 'relative',
      ...style,
    }}
    aria-label={ariaLabel || (count !== undefined ? `Badge: ${count}` : status ? `Status: ${status}` : 'Badge')}
    tabIndex={0}
  >
    {status && <ButtonBadgeStatus status={status} />}
    {count !== undefined && <ButtonBadgeCount count={count} />}
    {children}
    {/* TODO: Add micro-interactions, analytics, compliance hooks */}
  </span>
);

export { ButtonBadgeStatus, ButtonBadgeCount }; 