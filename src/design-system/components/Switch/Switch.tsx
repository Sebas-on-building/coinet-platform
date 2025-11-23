import React from 'react';
import clsx from 'clsx';
import styles from './Switch.module.css';

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  glow?: boolean;
  gradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, icon, checked, disabled, glow, gradient, size = 'md', className, ...props }, ref) => (
    <label className={clsx(styles.switchWrapper, styles[size], { [styles.glow]: glow, [styles.gradient]: gradient, [styles.disabled]: disabled }, className)}>
      <input
        ref={ref}
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        aria-disabled={disabled}
        {...props}
      />
      <span className={styles.track}>
        <span className={styles.thumb}>{icon}</span>
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  )
);
Switch.displayName = 'Switch';
// All sub-features are modular and documented for future extension and perfection. 