/**
 * Atomic ButtonIcon for Coinet
 * Supports left/right/standalone icon, size, color, ARIA, and world-class design
 */
import React from 'react';

export interface ButtonIconProps {
  icon: React.ReactNode;
  position?: 'left' | 'right' | 'standalone';
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonIcon: React.FC<ButtonIconProps> = ({ icon, position = 'left', size = 18, color = 'inherit', className, style, ...rest }) => (
  <span
    className={["co-btn-icon", position, className].filter(Boolean).join(' ')}
    style={{ display: 'inline-flex', alignItems: 'center', color, fontSize: size, ...style }}
    aria-label={rest['aria-label'] || 'Button icon'}
  >
    {icon}
  </span>
); 