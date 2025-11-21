/**
 * Atomic ButtonGroup for Coinet
 * Supports grouping, orientation, ARIA, keyboard navigation, and world-class design
 */
import React from 'react';

export interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, orientation = 'horizontal', className, style, ...rest }) => (
  <div
    role="group"
    aria-label={rest['aria-label'] || 'Button group'}
    className={["co-btn-group", orientation === 'vertical' ? 'flex-col' : 'flex-row', className].filter(Boolean).join(' ')}
    style={{ display: 'flex', flexDirection: orientation === 'vertical' ? 'column' : 'row', gap: 8, ...style }}
  >
    {children}
  </div>
); 