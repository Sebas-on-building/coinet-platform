/**
 * Atomic ButtonConfetti for Coinet
 * Supports trigger, color, ARIA, and world-class design
 */
import React from 'react';

export interface ButtonConfettiProps {
  trigger?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonConfetti: React.FC<ButtonConfettiProps> = ({ trigger = false, color = 'var(--color-accent-blue)', className, style, ...rest }) => {
  // TODO: Implement confetti animation (can use canvas or SVG)
  return trigger ? (
    <span
      className={["co-btn-confetti", className].filter(Boolean).join(' ')}
      style={{ color, ...style }}
      aria-label={rest['aria-label'] || 'Button confetti'}
    >
      🎉
    </span>
  ) : null;
}; 