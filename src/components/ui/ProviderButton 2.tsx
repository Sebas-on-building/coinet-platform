/**
 * Atomic ProviderButton component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';

interface ProviderButtonProps {
  /**
   * Provider id (e.g. google, apple)
   */
  id: string;
  /**
   * Provider name (e.g. Google, Apple)
   */
  name: string;
  /**
   * Provider icon (JSX)
   */
  icon: React.ReactNode;
  /**
   * Loading state
   */
  loading?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * ARIA label
   */
  'aria-label'?: string;
  /**
   * Full width button
   */
  fullWidth?: boolean;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional style
   */
  style?: React.CSSProperties;
  /**
   * Any other props
   */
  [key: string]: any;
}

/**
 * Atomic ProviderButton component
 */
export const ProviderButton: React.FC<ProviderButtonProps> = ({
  id,
  name,
  icon,
  loading = false,
  onClick,
  'aria-label': ariaLabel,
  fullWidth = true,
  disabled = false,
  className,
  style,
  ...rest
}) => {
  return (
    <button
      type="button"
      className={clsx(
        'co-provider-btn',
        fullWidth && 'w-full',
        'flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-lg shadow-glass transition-all duration-200',
        className
      )}
      style={{
        background: 'var(--gradient-primary)',
        color: '#fff',
        minWidth: 44,
        minHeight: 44,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      aria-label={ariaLabel || `Sign in with ${name}`}
      onClick={onClick}
      disabled={disabled || loading}
      tabIndex={0}
      {...rest}
    >
      <span className="w-6 h-6 flex items-center justify-center">{icon}</span>
      {loading ? (
        <svg className="animate-spin ml-2" width="20" height="20" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none" opacity="0.2" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="white" strokeWidth="4" fill="none" />
        </svg>
      ) : (
        <span>{`Sign in with ${name}`}</span>
      )}
    </button>
  );
}; 