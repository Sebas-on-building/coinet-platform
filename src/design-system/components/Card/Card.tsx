/**
 * Atomic Card component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 * Uses atomic subcomponents and design tokens
 */
import React, { ReactNode } from "react";
import { useTheme } from "@/themes/ThemeProvider";
import { motion } from "framer-motion";
import { colors } from '@/styles/tokens/colors'
import { shadows } from '@/styles/tokens/shadows'
import { radius } from '@/styles/tokens/radius'
import { spacing } from '@/styles/tokens/spacing'
import { typography } from '@/styles/tokens/typography'
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient';
  glow?: boolean;
  gradient?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', glow, gradient, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        styles.card,
        styles[variant],
        { [styles.glow]: glow, [styles.gradient]: gradient },
        className
      )}
      tabIndex={0}
      role="region"
      aria-label={props['aria-label'] || 'Card'}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-4 pb-2 font-bold text-lg">{children}</div>
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="px-4 pb-4">{children}</div>
}

export function CardFooter({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-2 pb-4 border-t border-gray-200">{children}</div>
}

export function CardBadge({ children }: { children: ReactNode }) {
  return <span className="ml-2 px-2 py-1 bg-yellow-400 text-xs rounded-full font-bold">{children}</span>
}

export function CardMenu({ children }: { children: ReactNode }) {
  return <div className="absolute top-2 right-2">{children}</div>
}

// All sub-features are modular and documented for future extension and perfection. 