import React from 'react';
import clsx from 'clsx';
import styles from './Skeleton.module.css';

export type SkeletonVariant = 'rect' | 'circle' | 'text';
export type SkeletonAnimation = 'wave' | 'pulse' | 'none';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  animation?: SkeletonAnimation;
  width?: number | string;
  height?: number | string;
  gradient?: boolean;
  glow?: boolean;
  ariaLabel?: string;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    variant = 'rect',
    animation = 'wave',
    width,
    height,
    gradient,
    glow,
    ariaLabel = 'Loading',
    className,
    style,
    ...props
  }, ref) => {
    const stylesInline: React.CSSProperties = {
      width,
      height,
      borderRadius: variant === 'circle' ? '50%' : '0.7em',
      ...style,
    };
    return (
      <div
        ref={ref}
        className={clsx(
          styles.skeleton,
          styles[variant],
          styles[animation],
          { [styles.gradient]: gradient, [styles.glow]: glow },
          className
        )}
        style={stylesInline}
        aria-busy="true"
        aria-label={ariaLabel}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';
// All sub-features are modular and documented for future extension and perfection. 