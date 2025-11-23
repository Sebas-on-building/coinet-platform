import React from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";
import { colors } from '@/styles/tokens/colors'
import { shadows } from '@/styles/tokens/shadows'
import { radius } from '@/styles/tokens/radius'
import { spacing } from '@/styles/tokens/spacing'
import { typography } from '@/styles/tokens/typography'
import clsx from 'clsx';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    className={`co-btn co-btn-${variant} co-btn-${size}${fullWidth ? ' co-btn-full' : ''} ${className}`}
    style={{
      padding: `var(--spacing-${size}, 16px)`,
      borderRadius: 'var(--radii-md)',
      background: `var(--color-${variant}, var(--color-primary))`,
      color: 'var(--color-text)',
      fontWeight: 600,
      fontSize: `var(--typography-body-fontSize, 16px)`,
      boxShadow: 'var(--shadow-md)',
      transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
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

export function IconButton(props: ButtonProps) {
  return <Button variant="icon" {...props} />;
}

export function SplitButton({ options, ...props }: { options: { label: React.ReactNode; onClick: () => void }[] }) {
  return (
    <div className="inline-flex rounded-[8px] shadow-md overflow-hidden">
      {options.map((opt, i) => (
        <Button key={i} {...props} onClick={opt.onClick}>
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function DragHandle() {
  return <span className="cursor-grab select-none mr-2">≡</span>;
} 