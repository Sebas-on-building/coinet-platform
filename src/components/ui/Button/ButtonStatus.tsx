/// <reference types="react" />
/**
 * ButtonStatus – Atomic status indicator for buttons (Coinet)
 * Inspired by Apple, Canva, TradingView, Solana
 * Supports: status, ARIA, micro-interactions, themeable, extensible
 * Sub-features: Pulse, Glow, Tooltip, Icon, EventLog
 */
import React from 'react';
import clsx from 'clsx';
import { ButtonStatusPulse } from './ButtonStatusPulse';
import { ButtonStatusGlow } from './ButtonStatusGlow';
import { ButtonStatusTooltip } from './ButtonStatusTooltip';
import { ButtonStatusIcon } from './ButtonStatusIcon';
import { ButtonStatusEventLog } from './ButtonStatusEventLog';

export interface ButtonStatusProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'loading' | 'custom';
  message?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  glow?: boolean;
  tooltip?: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

/**
 * Atomic ButtonStatus for status indication
 */
export const ButtonStatus: React.FC<ButtonStatusProps> = ({
  status,
  message,
  icon,
  pulse = false,
  glow = false,
  tooltip,
  className,
  style,
  'aria-label': ariaLabel,
}) => (
  <span
    className={clsx('co-btn-status', `co-btn-status--${status}`, className)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      background: `var(--color-status-${status})`,
      color: '#fff',
      fontWeight: 700,
      fontSize: 12,
      boxShadow: glow ? '0 0 8px 2px var(--color-status-glow)' : 'var(--shadow-xs)',
      position: 'relative',
      ...style,
    }}
    aria-label={ariaLabel || message || status}
    tabIndex={0}
  >
    {pulse && <ButtonStatusPulse status={status} />}
    {icon && <ButtonStatusIcon status={status} icon={icon} />}
    {tooltip && <ButtonStatusTooltip status={status} tooltip={tooltip} />}
    {message}
    {/* TODO: Add analytics, compliance, event log hooks */}
  </span>
);

export { ButtonStatusPulse, ButtonStatusGlow, ButtonStatusTooltip, ButtonStatusIcon, ButtonStatusEventLog }; 