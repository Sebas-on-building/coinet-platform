import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'icon' | 'text' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  animated?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  ripple?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  animated = false,
  leftIcon,
  rightIcon,
  ripple = true,
  className,
  style,
  children,
  ...rest
}) => {
  return (
    <button
      type="button"
      className={clsx(
        'co-btn',
        `co-btn-${variant}`,
        `co-btn-${size}`,
        fullWidth && 'co-btn-fullwidth',
        animated && 'co-btn-animated',
        loading && 'co-btn-loading',
        disabled && 'co-btn-disabled',
        className
      )}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="co-btn-spinner" aria-hidden="true" />}
      {leftIcon && <span className="co-btn-icon co-btn-icon-left">{leftIcon}</span>}
      <span className="co-btn-content">{children}</span>
      {rightIcon && <span className="co-btn-icon co-btn-icon-right">{rightIcon}</span>}
      {/* Ripple effect (optional, can be implemented with JS or CSS) */}
      {ripple && <span className="co-btn-ripple" aria-hidden="true" />}
    </button>
  );
}; 