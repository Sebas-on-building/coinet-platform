/**
 * ButtonStatusPulse – Atomic pulse animation for status (Coinet)
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonStatusPulseProps {
  status: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonStatusPulse for pulsing status indication
 */
export const ButtonStatusPulse: React.FC<ButtonStatusPulseProps> = ({
  status,
  className,
  style,
}) => (
  <span
    className={["co-btn-status-pulse", className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: `var(--color-status-${status})`,
      opacity: 0.5,
      animation: 'co-btn-status-pulse 1.2s infinite cubic-bezier(0.4,0,0.2,1)',
      zIndex: 0,
      ...style,
    }}
    aria-hidden="true"
  >
    <style>{`
      @keyframes co-btn-status-pulse {
        0% { transform: scale(1); opacity: 0.5; }
        70% { transform: scale(2.2); opacity: 0; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    `}</style>
  </span>
); 