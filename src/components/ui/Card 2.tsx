/**
 * Atomic Card component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React from 'react';
import clsx from 'clsx';
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';
import { shadows } from 'src/styles/tokens/shadows';

interface CardProps {
  /**
   * Card header (title, icon, etc.)
   */
  header?: React.ReactNode;
  /**
   * Card footer (actions, info, etc.)
   */
  footer?: React.ReactNode;
  /**
   * Card actions (buttons, menus, etc.)
   */
  actions?: React.ReactNode;
  /**
   * Card status (badge, label, etc.)
   */
  status?: React.ReactNode;
  /**
   * Loading state (shows skeleton)
   */
  loading?: boolean;
  /**
   * Clickable card
   */
  clickable?: boolean;
  /**
   * Selectable card (shows selection state)
   */
  selectable?: boolean;
  /**
   * Selected state
   */
  selected?: boolean;
  /**
   * Glassmorphism effect
   */
  glass?: boolean;
  /**
   * Render as a different element (e.g. section, article)
   */
  as?: React.ElementType;
  /**
   * Children nodes (main content)
   */
  children: React.ReactNode;
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
 * Atomic CardHeader subcomponent
 */
const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="co-card-header" style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>{children}</div>
);

/**
 * Atomic CardFooter subcomponent
 */
const CardFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="co-card-footer" style={{ marginTop: 'var(--space-md)' }}>{children}</div>
);

/**
 * Atomic CardActions subcomponent
 */
const CardActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="co-card-actions" style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>{children}</div>
);

/**
 * Atomic CardStatus subcomponent
 */
const CardStatus: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="co-card-status" style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{children}</span>
);

/**
 * Atomic CardSkeleton subcomponent (for loading state)
 */
const CardSkeleton: React.FC = () => (
  <div className="co-card-skeleton animate-pulse" style={{ height: 120, background: 'var(--color-border)', borderRadius: 'var(--radius-lg)' }} />
);

/**
 * Atomic Card component
 */
export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader;
  Footer: typeof CardFooter;
  Actions: typeof CardActions;
  Status: typeof CardStatus;
  Skeleton: typeof CardSkeleton;
} = ({
  header,
  footer,
  actions,
  status,
  loading = false,
  clickable = false,
  selectable = false,
  selected = false,
  glass = false,
  as: Comp = 'section',
  children,
  className,
  style,
  ...rest
}) => {
    return (
      <Comp
        className={clsx(
          'co-card',
          glass ? 'co-card-glass' : 'co-card-surface',
          clickable && 'cursor-pointer hover:shadow-xl transition-shadow',
          selectable && 'co-card-selectable',
          selected && 'ring-2 ring-accent-blue',
          className
        )}
        style={{
          background: colors.glass.dark,
          borderRadius: spacing.borderRadius,
          boxShadow: shadows.card,
          padding: spacing.lg,
          border: `1px solid ${colors.dark.border}`,
          backdropFilter: 'blur(12px)',
          ...style,
        }}
        tabIndex={clickable ? 0 : undefined}
        aria-selected={selectable ? selected : undefined}
        {...rest}
      >
        {loading ? (
          <CardSkeleton />
        ) : (
          <>
            {(header || status) && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: header ? 'var(--space-md)' : 0 }}>
                {header && <CardHeader>{header}</CardHeader>}
                {status && <CardStatus>{status}</CardStatus>}
              </div>
            )}
            {children}
            {actions && <CardActions>{actions}</CardActions>}
            {footer && <CardFooter>{footer}</CardFooter>}
          </>
        )}
      </Comp>
    );
  };

Card.Header = CardHeader;
Card.Footer = CardFooter;
Card.Actions = CardActions;
Card.Status = CardStatus;
Card.Skeleton = CardSkeleton;

export * from './Card/Card';
