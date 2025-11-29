import React from 'react';
import clsx from 'clsx';
import styles from './Spinner.module.css';

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  gradient?: boolean;
  glow?: boolean;
  ariaLabel?: string;
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ size = 'md', color, gradient, glow, ariaLabel = 'Loading', className, style, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(styles.spinner, styles[size], { [styles.gradient]: gradient, [styles.glow]: glow }, className)}
      style={{ ...style, ...(color ? { borderColor: color, borderTopColor: '#fff' } : {}) }}
      role="status"
      aria-label={ariaLabel}
      {...props}
    />
  )
);
Spinner.displayName = 'Spinner';
// All sub-features are modular and documented for future extension and perfection. 