/**
 * Atomic ButtonLoader for Coinet
 * Supports size, color, ARIA, and world-class design
 */
import React from 'react';

export interface ButtonLoaderProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonLoader: React.FC<ButtonLoaderProps> = ({ size = 20, color = 'currentColor', className, style, ...rest }) => (
  <span
    className={["co-btn-loader", className].filter(Boolean).join(' ')}
    style={{ display: 'inline-flex', alignItems: 'center', fontSize: size, color, ...style }}
    aria-label={rest['aria-label'] || 'Button loading'}
    aria-busy="true"
  >
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke={color} strokeWidth="4" fill="none" />
    </svg>
  </span>
); 