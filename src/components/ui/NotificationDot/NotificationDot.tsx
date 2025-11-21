import React from 'react';
import clsx from 'clsx';
import styles from './NotificationDot.module.css';

export interface NotificationDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  glow?: boolean;
  gradient?: boolean;
}

export const NotificationDot = React.forwardRef<HTMLSpanElement, NotificationDotProps>(
  ({ glow, gradient, className, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        styles.dot,
        { [styles.glow]: glow, [styles.gradient]: gradient },
        className
      )}
      aria-label={props['aria-label'] || 'Notification'}
      {...props}
    />
  )
);
NotificationDot.displayName = 'NotificationDot'; 