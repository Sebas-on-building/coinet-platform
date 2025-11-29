import React from 'react';
import clsx from 'clsx';
import styles from './Progress.module.css';

export type ProgressVariant = 'linear' | 'circular';
export type ProgressState = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  label?: string;
  icon?: React.ReactNode;
  indeterminate?: boolean;
  variant?: ProgressVariant;
  state?: ProgressState;
  gradient?: boolean;
  glow?: boolean;
}

const ProgressLabel = ({ label, icon }: { label?: string; icon?: React.ReactNode }) => (
  <span className={styles.label}>{icon}{label}</span>
);

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    value = 0,
    max = 100,
    label,
    icon,
    indeterminate,
    variant = 'linear',
    state = 'default',
    gradient,
    glow,
    className,
    ...props
  }, ref) => {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));
    return (
      <div
        ref={ref}
        className={clsx(
          styles.progress,
          styles[variant],
          styles[state],
          { [styles.gradient]: gradient, [styles.glow]: glow, [styles.indeterminate]: indeterminate },
          className
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        {...props}
      >
        {label && <ProgressLabel label={label} icon={icon} />}
        {variant === 'linear' && (
          <div className={styles.track}>
            <div
              className={styles.bar}
              style={{ width: indeterminate ? '100%' : `${percent}%` }}
              aria-hidden="true"
            />
          </div>
        )}
        {variant === 'circular' && (
          <svg className={styles.circle} viewBox="0 0 40 40" aria-hidden="true">
            <circle className={styles.bg} cx="20" cy="20" r="18" fill="none" strokeWidth="4" />
            <circle
              className={styles.fg}
              cx="20"
              cy="20"
              r="18"
              fill="none"
              strokeWidth="4"
              strokeDasharray={113}
              strokeDashoffset={indeterminate ? 56 : 113 - (percent / 100) * 113}
            />
          </svg>
        )}
      </div>
    );
  }
);
Progress.displayName = 'Progress';
// All sub-features are modular and documented for future extension and perfection. 