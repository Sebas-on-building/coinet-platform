/**
 * Atomic Spacer utility component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';

export type SpacerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | number | string;
export type SpacerAxis = 'vertical' | 'horizontal';

interface SpacerProps {
  /**
   * Size of the spacer (token, px, rem, or custom)
   */
  size?: SpacerSize;
  /**
   * Axis of the spacer (vertical or horizontal)
   */
  axis?: SpacerAxis;
  /**
   * Render as a different element (e.g. div, span)
   */
  as?: React.ElementType;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional style
   */
  style?: React.CSSProperties;
  /**
   * Any other props
   */
  [key: string]: any;
}

const sizeMap: Record<string, string> = {
  xs: 'var(--space-xs)',
  sm: 'var(--space-sm)',
  md: 'var(--space-md)',
  lg: 'var(--space-lg)',
  xl: 'var(--space-xl)',
  '2xl': 'var(--space-2xl)',
  '3xl': 'var(--space-3xl)',
  '4xl': 'var(--space-4xl)',
};

/**
 * Atomic Spacer component
 */
export const Spacer: React.FC<SpacerProps> = ({
  size = 'md',
  axis = 'vertical',
  as: Comp = 'div',
  className,
  style,
  ...rest
}) => {
  const dimension = typeof size === 'number' ? `${size}px` : sizeMap[size as string] || size;
  return (
    <Comp
      className={className}
      style={{
        display: 'block',
        width: axis === 'horizontal' ? dimension : '1px',
        height: axis === 'vertical' ? dimension : '1px',
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}; 