/**
 * ButtonStatusTooltip – Atomic tooltip for status (Coinet)
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonStatusTooltipProps {
  status: string;
  tooltip: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonStatusTooltip for accessible tooltips
 */
export const ButtonStatusTooltip: React.FC<ButtonStatusTooltipProps> = ({
  status,
  tooltip,
  className,
  style,
}) => (
  <span
    className={["co-btn-status-tooltip", className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: 8,
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      borderRadius: 6,
      boxShadow: 'var(--shadow-md)',
      padding: '4px 10px',
      fontSize: 13,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      zIndex: 10,
      ...style,
    }}
    role="tooltip"
    aria-label={tooltip}
  >
    {tooltip}
  </span>
); 