/**
 * Atomic Button component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import { twMerge } from 'tailwind-merge';
import { ReactNode, ButtonHTMLAttributes, useRef, useState } from "react";
import { SoundFeedback } from "./SoundFeedback";
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';
import { shadows } from 'src/styles/tokens/shadows';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'
  | 'success'
  | 'warning'
  | 'glass';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  sound?: boolean;
  soundType?: "success" | "error" | "link";
  analyticsEvent?: string;
}

const variantMap: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--gradient-primary)',
    color: colors.light.text || '#fff',
    boxShadow: 'var(--shadow-md)',
  },
  secondary: {
    background: 'var(--color-surface)',
    color: colors.primary.dark,
    boxShadow: 'var(--shadow-xs)',
    border: '1.5px solid var(--color-primary)',
  },
  outline: {
    background: 'transparent',
    color: colors.primary.dark,
    border: '1.5px solid var(--color-primary)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'transparent',
    color: colors.primary.dark,
    boxShadow: 'none',
    border: '1.5px solid transparent',
  },
  link: {
    background: 'none',
    color: colors.primary.dark,
    boxShadow: 'none',
    border: 'none',
  },
  glass: {
    background: 'var(--glass-background)',
    color: colors.primary.dark,
    boxShadow: 'var(--glass-shadow)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: 'var(--glass-border)',
  },
  danger: {
    background: 'var(--gradient-error)',
    color: colors.light.text || '#fff',
    boxShadow: 'var(--shadow-md)',
  },
  success: {
    background: 'var(--gradient-success)',
    color: colors.light.text || '#fff',
    boxShadow: 'var(--shadow-md)',
  },
  warning: {
    background: colors.light.warning,
    color: colors.light.text || '#fff',
    boxShadow: 'var(--shadow-md)',
  },
};

const sizeMap: Record<ButtonSize, React.CSSProperties> = {
  xs: { fontSize: 'var(--font-size-xs)', padding: '0.25em 0.75em', borderRadius: 'var(--radius-sm)' },
  sm: { fontSize: 'var(--font-size-sm)', padding: '0.5em 1em', borderRadius: 'var(--radius-md)' },
  md: { fontSize: 'var(--font-size-base)', padding: '0.75em 1.5em', borderRadius: 'var(--radius-lg)' },
  lg: { fontSize: 'var(--font-size-lg)', padding: '1em 2em', borderRadius: 'var(--radius-xl)' },
  xl: { fontSize: 'var(--font-size-xl)', padding: '1.25em 2.5em', borderRadius: 'var(--radius-2xl)' },
};

/**
 * Atomic Button component
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      fullWidth = false,
      disabled = false,
      as: Comp = 'button',
      style,
      sound = false,
      soundType = "link",
      analyticsEvent,
      onClick,
      ...props
    },
    ref
  ) => {
    const btnRef = useRef<HTMLButtonElement>(null);
    const [playSound, setPlaySound] = useState(false);

    // Determine button styles based on variant
    const getVariantStyles = (variant: ButtonVariant) => {
      switch (variant) {
        case 'primary':
          return 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700';
        case 'secondary':
          return 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-500';
        case 'outline':
          return 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700';
        case 'ghost':
          return 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700';
        case 'link':
          return 'text-blue-600 dark:text-blue-400 hover:underline p-0 height-auto';
        case 'danger':
          return 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700';
        case 'success':
          return 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 dark:bg-green-500 dark:hover:bg-green-600 dark:active:bg-green-700';
        case 'warning':
          return 'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 dark:active:bg-yellow-700';
        case 'glass':
          return 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700';
        default:
          return 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700';
      }
    };

    // Determine button size styles
    const getSizeStyles = (size: ButtonSize) => {
      switch (size) {
        case 'xs':
          return 'text-xs px-2 py-1 rounded';
        case 'sm':
          return 'text-sm px-2.5 py-1.5 rounded-md';
        case 'lg':
          return 'text-lg px-5 py-2.5 rounded-lg';
        case 'xl':
          return 'text-xl px-6 py-3 rounded-xl';
        case 'md':
        default:
          return 'text-base px-4 py-2 rounded-md';
      }
    };

    // Ripple effect
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const button = btnRef.current;
      if (button) {
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.className = "ripple";
        button.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      }
      if (sound) {
        setPlaySound(false); // reset
        setTimeout(() => setPlaySound(true), 0);
      }
      if (analyticsEvent && (window as any)?.gtag) {
        (window as any).gtag("event", analyticsEvent, {
          label: props['aria-label'] || children?.toString(),
        });
      }
      if (onClick) onClick(e);
    };

    return (
      <Comp
        ref={ref}
        className={twMerge(
          'inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed',
          getVariantStyles(variant),
          getSizeStyles(size),
          fullWidth && 'w-full',
          isLoading && 'opacity-80 cursor-wait',
          className
        )}
        style={{
          background: variant === 'primary' ? colors.gradients.solana : colors.surface?.dark,
          color: variant === 'primary' ? colors.light.text || '#fff' : colors.primary.dark,
          borderRadius: spacing.borderRadius,
          boxShadow: shadows.card,
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.2s cubic-bezier(.4,2,.6,1)',
          ...variantMap[variant],
          ...style,
        }}
        aria-label={props['aria-label'] || (typeof children === 'string' ? children : undefined)}
        role="button"
        tabIndex={0}
        disabled={disabled || isLoading}
        onClick={handleClick}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
        {children && <span className="co-btn-label">{children}</span>}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
        {sound && <SoundFeedback type={soundType} play={playSound} />}
        {/* Ripple style */}
        <style jsx>{`
          .ripple {
            position: absolute;
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            background: rgba(255, 255, 255, 0.4);
            pointer-events: none;
            z-index: 10;
          }
          @keyframes ripple {
            to {
              transform: scale(2.5);
              opacity: 0;
            }
          }
        `}</style>
      </Comp>
    );
  }
);

Button.displayName = 'Button';

// =========================
// Coinet Atomic Button Exports
// World-class, extensible, atomic, inspired by Apple, Canva, TradingView, Solana
// Only existing subcomponents are exported. All others are commented as stubs for future perfection.
// Each sub-feature and sub-sub-feature will be coded to "divined perfectionality".
// =========================

// --- Atomic, implemented subcomponents ---
export * from './Button/ButtonGroup';
export * from './Button/ButtonIcon';
export * from './Button/ButtonLoader';
export * from './Button/ButtonRipple';
export * from './Button/ButtonConfetti';
export * from './Button/ButtonBadge';
export * from './Button/ButtonStatus';
export * from './Button/ButtonContextMenu';
export * from './Button/ButtonExportShare';
export * from './Button/ButtonUndoRedo';
export * from './Button/ButtonEventLog';
export * from './Button/ButtonErrorBoundary';
export * from './Button/ButtonAnalyticsProvider';
export * from './Button/ButtonComplianceProvider';
export * from './Button/ButtonTooltip';
export * from './Button/ButtonSkeleton';
export * from './Button/ButtonDragHandle';
export * from './Button/ButtonResizable';
export * from './Button/ButtonToggle';
export * from './Button/ButtonDropdown';
export * from './Button/ButtonSplit';
export * from './Button/ButtonMenu';

// --- TODO: Future subcomponents for divine extensibility ---
// export * from './Button/ButtonFloating'; // TODO: Floating action button, glassmorphic, animated, ARIA, micro-interactions
// export * from './Button/ButtonSticky'; // TODO: Sticky button for persistent actions, accessibility, motion preference
// export * from './Button/ButtonDocked'; // TODO: Docked button for toolbars, drag/drop, ARIA
// export * from './Button/ButtonBatch'; // TODO: Batch action button, multi-select, batch analytics, undo/redo
// export * from './Button/ButtonPin'; // TODO: Pin/star button, animated, accessible, analytics
// export * from './Button/ButtonExport'; // TODO: Dedicated export button, animated, compliance-ready
// export * from './Button/ButtonShare'; // TODO: Share button, Web Share API, modal, QR, social
// export * from './Button/ButtonUndo'; // TODO: Atomic undo button, keyboard shortcut, ARIA live
// export * from './Button/ButtonRedo'; // TODO: Atomic redo button, keyboard shortcut, ARIA live
// export * from './Button/ButtonEvent'; // TODO: Event trigger button, analytics, compliance
// export * from './Button/ButtonLog'; // TODO: Log button, event log, export, review
// export * from './Button/ButtonError'; // TODO: Error state button, error boundary integration
// export * from './Button/ButtonEdgeCase'; // TODO: Edge case demo button, for testing and docs
// export * from './Button/ButtonAccessibility'; // TODO: Accessibility demo button, focus, ARIA, color contrast
// export * from './Button/ButtonTest'; // TODO: Test button for E2E/unit test flows
// export * from './Button/ButtonDoc'; // TODO: Documentation button, usage/help
// export * from './Button/ButtonTheme'; // TODO: Theme switcher button, dark/light, glass, gradients
// export * from './Button/ButtonToken'; // TODO: Design token button, for design system integration
// export * from './Button/ButtonMotion'; // TODO: Motion preference button, reduced motion, animated
// export * from './Button/ButtonMicroInteraction'; // TODO: Micro-interaction demo button, haptics, sound
// export * from './Button/ButtonFocusRing'; // TODO: Focus ring demo, accessibility, color contrast
// export * from './Button/ButtonScreenReader'; // TODO: Screen reader demo button, ARIA live, announcements
// export * from './Button/ButtonTouchTarget'; // TODO: Touch target demo, 44x44px, mobile a11y
// export * from './Button/ButtonColorContrast'; // TODO: Color contrast demo button, WCAG AA/AAA
// export * from './Button/ButtonDarkLight'; // TODO: Dark/light mode toggle button
// export * from './Button/ButtonGlass'; // TODO: Glassmorphic button, animated, themeable
// export * from './Button/ButtonGradient'; // TODO: Gradient button, animated, themeable
// export * from './Button/ButtonOutline'; // TODO: Outlined button, themeable, focus/hover
// export * from './Button/ButtonGhost'; // TODO: Ghost button, minimal, themeable
// export * from './Button/ButtonText'; // TODO: Text button, minimal, themeable
// export * from './Button/ButtonDanger'; // TODO: Danger/alert button, animated, ARIA
// export * from './Button/ButtonSuccess'; // TODO: Success/confirmation button, animated, ARIA
// export * from './Button/ButtonWarning'; // TODO: Warning/caution button, animated, ARIA
// export * from './Button/ButtonInfo'; // TODO: Info/neutral button, animated, ARIA
// export * from './Button/ButtonLoading'; // TODO: Loading state button, animated, ARIA
// export * from './Button/ButtonDisabled'; // TODO: Disabled state button, ARIA, tooltip
