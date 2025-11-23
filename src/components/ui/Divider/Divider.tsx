import React from 'react';
import clsx from 'clsx';
import styles from './Divider.module.css';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  text?: string;
  icon?: React.ReactNode;
  gradient?: boolean;
  animated?: boolean;
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ text, icon, gradient, animated, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(styles.divider, { [styles.gradient]: gradient, [styles.animated]: animated }, className)}
      role="separator"
      {...props}
    >
      <span className={styles.line} />
      {(icon || text) && (
        <span className={styles.content}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {text && <span className={styles.text}>{text}</span>}
        </span>
      )}
      <span className={styles.line} />
    </div>
  )
);
Divider.displayName = 'Divider';
// All sub-features are modular and documented for future extension and perfection. 