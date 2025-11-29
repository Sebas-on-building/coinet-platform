/**
 * ButtonBadgeStatus – Atomic status badge for buttons (Coinet)
 * Supports: online, offline, alert, info, success, warning, error
 * Extensible, accessible, beautiful
 */
import React from 'react';

export interface ButtonBadgeStatusProps {
  status: 'online' | 'offline' | 'alert' | 'info' | 'success' | 'warning' | 'error';
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

const statusColor: Record<string, string> = {
  online: 'var(--color-success)',
  offline: 'var(--color-border)',
  alert: 'var(--color-error)',
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
};

/**
 * Atomic ButtonBadgeStatus for status indication
 */
export const ButtonBadgeStatus: React.FC<ButtonBadgeStatusProps> = ({
  status,
  className,
  style,
  'aria-label': ariaLabel,
}) => (
  <span
    className={['co-btn-badge-status', className].filter(Boolean).join(' ')}
    style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: statusColor[status],
      marginRight: 4,
      boxShadow: '0 0 0 2px #fff',
      ...style,
    }}
    aria-label={ariaLabel || `Status: ${status}`}
    tabIndex={0}
  />
); 