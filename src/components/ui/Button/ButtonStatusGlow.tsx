/**
 * ButtonStatusGlow – Atomic glow effect for status (Coinet)
 * Extensible, accessible, themeable
 */
import React from 'react';

export interface ButtonStatusGlowProps {
  status: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Atomic ButtonStatusGlow for glowing status indication
 */
export const ButtonStatusGlow: React.FC<ButtonStatusGlowProps> = ({
  status,
  className,
  style,
}) => (
  <span
    className={["co-btn-status-glow", className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: 16,
      height: 16,
      borderRadius: '50%',
      boxShadow: `0 0 8px 2px var(--color-status-${status})`,
      opacity: 0.7,
      pointerEvents: 'none',
      zIndex: 0,
      ...style,
    }}
    aria-hidden="true"
  />
); 