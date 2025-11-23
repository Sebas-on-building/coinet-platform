/**
 * Atomic Section component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';

interface SectionProps {
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
   * Padding (token or custom)
   */
  padding?: string;
  /**
   * Margin (token or custom)
   */
  margin?: string;
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
 * Atomic Section component
 */
export const Section: React.FC<SectionProps> = ({
  background = 'var(--color-surface)',
  radius = 'var(--radius-xl)',
  shadow = 'var(--shadow-md)',
  padding = 'var(--space-2xl)',
  margin = '0 0 var(--space-2xl) 0',
  as: Comp = 'section',
  children,
  className,
  style,
  ...rest
}) => {
  return (
    <Comp
      className={clsx('co-section', className)}
      style={{
        background,
        borderRadius: radius,
        boxShadow: shadow,
        padding,
        margin,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}; 