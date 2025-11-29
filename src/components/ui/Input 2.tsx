/**
 * Atomic Input component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  error?: boolean;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
          ref={ref}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: spacing.borderRadius,
            border: `1.5px solid ${colors.dark.border}`,
            background: colors.dark.surface,
            color: colors.dark.text,
            fontSize: 16,
            outline: 'none',
            boxShadow: 'none',
            transition: 'border 0.2s',
          }}
          onFocus={e => (e.target.style.border = `1.5px solid ${colors.dark.primary}`)}
          onBlur={e => (e.target.style.border = `1.5px solid ${colors.dark.border}`)}
          className={twMerge(
            "w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-md transition-colors",
            error
              ? "border-red-500 dark:border-red-400 focus:ring-red-500/20 focus:border-red-500"
              : "border-gray-300 dark:border-gray-600 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400",
            "focus:outline-none focus:ring-4",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        />
        {helperText && (
          <p
            className={twMerge(
              "text-xs",
              error ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
