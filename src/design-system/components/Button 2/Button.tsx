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
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  badge?: number;
  notificationDot?: boolean;
  glow?: boolean;
  gradient?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', badge, notificationDot, glow, gradient, className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        { [styles.glow]: glow, [styles.gradient]: gradient },
        className
      )}
      aria-busy={props.disabled ? 'true' : undefined}
      aria-live="polite"
      {...props}
    >
      {notificationDot && <span className={styles['notification-dot']} aria-label="New notification" />}
      {children}
      {badge !== undefined && <span className={styles.badge} aria-label={`Badge: ${badge}`}>{badge}</span>}
    </button>
  )
);
Button.displayName = 'Button';

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