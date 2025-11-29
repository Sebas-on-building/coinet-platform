import React from 'react';
import styled, { css } from 'styled-components';

const variants = {
  primary: css`
    background: linear-gradient(90deg, #00ffa3 0%, #0057ff 100%);
    color: #fff;
    box-shadow: 0 2px 16px #00ffa355;
    &:hover { filter: brightness(1.08); }
  `,
  secondary: css`
    background: #fff;
    color: #0057ff;
    border: 2px solid #00ffa3;
    &:hover { background: #f0f8ff; }
  `,
  ghost: css`
    background: transparent;
    color: var(--color-primary);
    &:hover { background: #00ffa311; }
  `,
};

const sizes = {
  sm: css`font-size: 14px; padding: 6px 16px; border-radius: 8px;`,
  md: css`font-size: 16px; padding: 10px 24px; border-radius: 12px;`,
  lg: css`font-size: 18px; padding: 14px 32px; border-radius: 16px;`,
};

type Variant = keyof typeof variants;
type Size = keyof typeof sizes;

interface StyledButtonProps {
  $variant: Variant;
  $size: Size;
  disabled?: boolean;
}

const StyledButton = styled.button<StyledButtonProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
  border: none;
  outline: none;
  transition: all 0.18s cubic-bezier(.4,0,.2,1);
  ${({ $variant }) => variants[$variant]};
  ${({ $size }) => sizes[$size]};
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};
`;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, ...props }, ref) => (
    <StyledButton
      ref={ref}
      $variant={variant}
      $size={size}
      aria-busy={loading}
      aria-disabled={props.disabled || loading}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="spinner" aria-label="Loading..." style={{ marginRight: 8 }} />
      ) : icon ? (
        <span style={{ marginRight: 8 }}>{icon}</span>
      ) : null}
      {children}
    </StyledButton>
  )
);
Button.displayName = 'Button'; 