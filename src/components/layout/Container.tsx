/**
 * Atomic Container component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const sizeMap: Record<ContainerSize, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'w-full',
};

interface ContainerProps {
  /**
   * Size of the container (responsive max-width)
   */
  size?: ContainerSize;
  /**
   * Center the container horizontally
   */
  center?: boolean;
  /**
   * Make the container fluid (full width)
   */
  fluid?: boolean;
  /**
   * Background color (token or custom)
   */
  background?: string;
  /**
   * Border radius (token or custom)
   */
  radius?: string;
  /**
   * Box shadow (token or custom)
   */
  shadow?: string;
  /**
   * Render as a different element (e.g. section, main)
   */
  as?: React.ElementType;
  /**
   * Children nodes
   */
  children: React.ReactNode;
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

/**
 * Atomic Container component
 */
export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  center = false,
  fluid = false,
  background = 'var(--color-surface)',
  radius = 'var(--radius-xl)',
  shadow = 'var(--shadow-lg)',
  as: Comp = 'div',
  children,
  className,
  style,
  ...rest
}) => {
  return (
    <Comp
      className={clsx(
        'co-container',
        sizeMap[size],
        center && 'mx-auto',
        fluid && 'w-full',
        className
      )}
      style={{
        background,
        borderRadius: radius,
        boxShadow: shadow,
        padding: 'var(--space-2xl)',
        ...style,
      }}
      tabIndex={0}
      aria-label={rest['aria-label'] || 'Container'}
      {...rest}
    >
      {children}
    </Comp>
  );
}; 