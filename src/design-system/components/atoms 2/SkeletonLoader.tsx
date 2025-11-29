import React from 'react';
import clsx from 'clsx';

export interface SkeletonLoaderProps {
  variant?: 'rect' | 'circle' | 'text';
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
  theme?: 'light' | 'dark';
  'aria-label'?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'rect',
  width = '100%',
  height = 16,
  style,
  className,
  theme = 'light',
  'aria-label': ariaLabel = 'Loading',
}) => (
  <span
    className={clsx('co-skeleton', `co-skeleton-${variant}`, `co-skeleton-${theme}`, className)}
    style={{ width, height, ...style }}
    aria-busy="true"
    aria-label={ariaLabel}
    role="status"
  >
    <span className="co-skeleton-animated" />
  </span>
); 