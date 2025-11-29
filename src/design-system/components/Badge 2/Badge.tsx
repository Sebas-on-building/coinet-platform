import React from 'react';
import clsx from 'clsx';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  glow?: boolean;
  gradient?: boolean;
  notificationDot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ color = 'primary', glow, gradient, notificationDot, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={clsx(
        styles.badge,
        styles[color],
        { [styles.glow]: glow, [styles.gradient]: gradient },
        className
      )}
      aria-label={props['aria-label'] || 'Badge'}
      {...props}
    >
      {children}
      {notificationDot && <span className={styles['notification-dot']} aria-label="New notification" />}
    </span>
  )
);
Badge.displayName = 'Badge'; 