/**
 * Atomic ButtonRipple for Coinet
 * Supports color, duration, ARIA, and world-class design
 */
import React from 'react';

export interface ButtonRippleProps {
  color?: string;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonRipple: React.FC<ButtonRippleProps> = ({ color = 'rgba(255,255,255,0.4)', duration = 600, className, style, ...rest }) => (
  <span
    className={["co-btn-ripple", className].filter(Boolean).join(' ')}
    style={{
      position: 'absolute',
      borderRadius: '50%',
      transform: 'scale(0)',
      animation: `ripple ${duration}ms linear`,
      background: color,
      pointerEvents: 'none',
      zIndex: 10,
      ...style,
    }}
    aria-label={rest['aria-label'] || 'Button ripple'}
  />
); 