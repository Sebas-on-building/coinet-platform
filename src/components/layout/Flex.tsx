/**
 * Atomic Flex component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';

export type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

interface FlexProps {
  /**
   * Flex direction (row, column, etc.)
   */
  direction?: FlexDirection;
  /**
   * Gap between flex items (token or custom)
   */
  gap?: string;
  /**
   * Align items vertically
   */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /**
   * Justify items horizontally
   */
  justify?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';
  /**
   * Wrap flex items
   */
  wrap?: boolean;
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
 * Atomic Flex component
 */
export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  gap = 'var(--space-lg)',
  align = 'stretch',
  justify = 'stretch',
  wrap = true,
  as: Comp = 'div',
  children,
  className,
  style,
  ...rest
}) => {
  return (
    <Comp
      className={clsx('co-flex', className)}
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}; 