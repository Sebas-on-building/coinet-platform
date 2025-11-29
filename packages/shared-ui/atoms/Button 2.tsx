import React from 'react';
import { useTheme } from '../themes/useTheme';
import { colors, radii, typography } from '../../design-tokens/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  disabled,
  size = 'md',
  ...props
}) => {
  const { spacing, shadows } = useTheme();

  const styles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: typography.fontFamily,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize[size],
    borderRadius: radii.md,
    padding: '12px 24px',
    minHeight: 40,
    minWidth: 40,
    boxShadow: shadows.md,
    border: 'none',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
    background: variant === 'primary' ? colors.primary : colors.surface,
    color: variant === 'primary' ? colors.surface : colors.primary,
  };

  return (
    <button
      style={styles}
      aria-disabled={disabled}
      disabled={disabled}
      tabIndex={0}
      {...props}
      onFocus={e => {
        e.currentTarget.style.boxShadow = `${shadows.lg}, 0 0 0 3px ${colors.primary}`;
        props.onFocus?.(e);
      }}
      onBlur={e => {
        e.currentTarget.style.boxShadow = variant === 'primary' || variant === 'accent' ? shadows.lg : shadows.md;
        props.onBlur?.(e);
      }}
    >
      {children}
    </button>
  );
}; 