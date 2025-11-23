import React, { forwardRef, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { VariantOptions, useVariant } from '@/hooks/useVariant';
import { motion, AnimatePresence, HTMLMotionProps } from '@/lib/motion';

export interface VariantCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrag'> {
  /**
   * Card content
   */
  children: ReactNode;

  /**
   * Card title
   */
  title?: string;

  /**
   * Card subtitle
   */
  subtitle?: string;

  /**
   * Optional header content (right side)
   */
  headerRight?: ReactNode;

  /**
   * Optional footer content
   */
  footer?: ReactNode;

  /**
   * Optional icon to display in the header
   */
  icon?: ReactNode;

  /**
   * Visual variant options
   */
  variant?: VariantOptions;

  /**
   * If true, card will have padding
   * @default true
   */
  withPadding?: boolean;

  /**
   * If true, card will have header with title and subtitle
   * @default true if title or subtitle provided
   */
  withHeader?: boolean;

  /**
   * If true, card will animate in when mounted
   * @default false
   */
  animate?: boolean;

  /**
   * Optional external classname for container
   */
  className?: string;

  /**
   * Optional external classname for body 
   */
  bodyClassName?: string;

  /**
   * If set, the card becomes a clickable element with onClick handler
   */
  onClick?: () => void;
}

/**
 * Advanced Card component with support for visual variants
 * 
 * This component provides a flexible card container with support for
 * multiple visual styles (frosted, neon, minimal) and customization options.
 * 
 * @example
 * ```jsx
 * <VariantCard 
 *   title="Dashboard Overview" 
 *   subtitle="Your performance at a glance"
 *   variant={{ type: 'frosted', intensity: 'normal', glow: 'subtle' }}
 *   icon={<ChartPieIcon className="w-5 h-5" />}
 * >
 *   <p>Card content goes here</p>
 * </VariantCard>
 * ```
 */
export const VariantCard = forwardRef<HTMLDivElement, VariantCardProps>(({
  children,
  title,
  subtitle,
  headerRight,
  footer,
  icon,
  variant = { type: 'default' },
  withPadding = true,
  withHeader,
  animate = false,
  className,
  bodyClassName,
  onClick,
  ...rest
}, ref) => {
  // Use the variant hook to generate classes
  const { classes } = useVariant(variant);

  // Determine if header should be shown
  const showHeader = withHeader !== undefined ? withHeader : !!(title || subtitle);

  // Define animation variants if animation is enabled
  const motionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Determine if the card is interactive
  const isInteractive = !!onClick;

  // Create the base component props
  const componentProps = {
    ref,
    className: twMerge(
      classes.container,
      isInteractive && 'cursor-pointer',
      isInteractive && classes.interactive,
      className
    ),
    onClick,
    ...rest
  };

  // If animation is enabled, return a motion.div
  if (animate) {
    return (
      <motion.div
        {...componentProps}
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={motionVariants}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {renderCardContent()}
      </motion.div>
    );
  }

  // Otherwise, return a standard div
  return <div {...componentProps}>{renderCardContent()}</div>;

  // Shared function to render card content
  function renderCardContent() {
    return (
      <>
        {showHeader && (
          <div className={twMerge(
            'flex items-center justify-between',
            withPadding && 'px-4 pt-4 pb-2',
            !withPadding && 'p-2'
          )}>
            <div className="flex items-center gap-2">
              {icon && (
                <div className={twMerge('text-primary-500', classes.icon)}>
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className={twMerge(
                    'font-medium text-base',
                    classes.text
                  )}>
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className={twMerge(
                    'text-sm opacity-75',
                    classes.text
                  )}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {headerRight && (
              <div>{headerRight}</div>
            )}
          </div>
        )}

        <div className={twMerge(
          withPadding && (!showHeader ? 'p-4' : 'px-4 pb-4'),
          bodyClassName
        )}>
          {children}
        </div>

        {footer && (
          <div className={twMerge(
            'border-t',
            classes.border,
            withPadding && 'px-4 py-3'
          )}>
            {footer}
          </div>
        )}
      </>
    );
  }
});

VariantCard.displayName = 'VariantCard';

export default VariantCard; 