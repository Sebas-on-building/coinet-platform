/**
 * Atomic Grid component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';

export type GridColumns = number | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', number>>;

interface GridProps {
  /**
   * Number of columns or responsive columns object
   */
  columns?: GridColumns;
  /**
   * Gap between grid items (token or custom)
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
   * Wrap grid rows
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

function getGridTemplateColumns(columns?: GridColumns) {
  if (!columns) return undefined;
  if (typeof columns === 'number') {
    return `repeat(${columns}, minmax(0, 1fr))`;
  }
  // Responsive columns
  return undefined; // Handled by utility classes or media queries
}

/**
 * Atomic Grid component
 */
export const Grid: React.FC<GridProps> = ({
  columns = 2,
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
  const gridTemplateColumns = getGridTemplateColumns(columns);
  return (
    <Comp
      className={clsx(
        'co-grid',
        className
      )}
      style={{
        display: 'grid',
        gridTemplateColumns,
        gap,
        alignItems: align,
        justifyItems: justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}; 