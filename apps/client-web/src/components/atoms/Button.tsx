import React from 'react';
import { tokens } from 'design-tokens/tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  children,
  ...props
}) => (
  <button
    {...props}
    className={`co-btn co-btn-${variant} co-btn-${size}${fullWidth ? ' co-btn-full' : ''}`}
    style={{
      padding: tokens.spacing[size],
      borderRadius: tokens.radius.md,
      background: tokens.colors[variant],
      color: tokens.colors.text,
      fontWeight: 600,
      fontSize: tokens.typography.fontSize[size],
      boxShadow: tokens.shadows.md,
      transition: tokens.motion.normal,
      width: fullWidth ? '100%' : undefined,
      ...props.style,
    }}
    aria-label={typeof children === 'string' ? children : undefined}
    disabled={isLoading || props.disabled}
  >
    {isLoading ? <span className="spinner" /> : leftIcon}
    {children}
    {rightIcon}
  </button>
); 