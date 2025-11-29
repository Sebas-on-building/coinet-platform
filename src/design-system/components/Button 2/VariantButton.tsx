import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import { VariantOptions, useVariant } from '@/hooks/useVariant';
import { twMerge } from 'tailwind-merge';
import { motion } from '@/lib/motion';

export interface VariantButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Button content
   */
  children: React.ReactNode;

  /**
   * Visual variant options
   */
  variant?: VariantOptions;

  /**
   * Button size
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether the button should take full width
   */
  fullWidth?: boolean;

  /**
   * Button state
   */
  isLoading?: boolean;
  isDisabled?: boolean;

  /**
   * Optional start and end icons
   */
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;

  /**
   * Apply animated entrance
   */
  animate?: boolean;

  /**
   * Optional tooltip text
   */
  tooltip?: string;

  /**
   * External class name to merge with generated classes
   */
  className?: string;
}

/**
 * Advanced Button component with visual variants
 * 
 * This component provides a customizable button with different visual styles
 * (frosted, neon, minimal) and various options for customization.
 * 
 * @example
 * ```jsx
 * <VariantButton 
 *   variant={{ type: 'neon', intensity: 'normal', color: 'primary' }}
 *   size="md"
 *   startIcon={<PlusIcon className="w-4 h-4" />}
 *   onClick={handleClick}
 * >
 *   Create New
 * </VariantButton>
 * ```
 */
export const VariantButton = forwardRef<HTMLButtonElement, VariantButtonProps>(({
  children,
  variant = { type: 'default' },
  size = 'md',
  fullWidth = false,
  isLoading = false,
  isDisabled = false,
  startIcon,
  endIcon,
  animate = false,
  tooltip,
  className,
  ...rest
}, ref) => {
  // Use the variant hook to generate classes
  const { classes, isDark } = useVariant(variant);

  // Size classes
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-lg'
  };

  // Loading spinner element
  const LoadingSpinner = () => (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  // Add specific styling based on variant type
  let variantSpecificStyles = '';

  switch (variant.type) {
    case 'frosted':
      variantSpecificStyles = 'backdrop-blur-md text-gray-800 dark:text-white';
      break;

    case 'neon':
      variantSpecificStyles = 'text-white';
      break;

    case 'minimal':
      variantSpecificStyles = 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200';
      break;

    default:
      variantSpecificStyles = 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700';
      break;
  }

  // Animation props
  const animationProps = animate ? {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2 }
  } : {};

  // Neon glow effect for the button (if applicable)
  const neonGlowClass = variant.type === 'neon' && variant.glow !== 'none'
    ? (variant.glow === 'subtle'
      ? 'shadow-neon-sm'
      : variant.glow === 'medium'
        ? 'shadow-neon-md'
        : 'shadow-neon-lg animate-glow-pulse')
    : '';

  // For neon buttons, add a glowing hover effect
  const neonHoverClass = variant.type === 'neon'
    ? 'hover:shadow-neon-lg hover:scale-105 active:scale-100 active:shadow-neon-sm'
    : '';

  // Button component
  const ButtonComponent = animate ? motion.button : 'button';

  return (
    <ButtonComponent
      ref={ref}
      disabled={isDisabled || isLoading}
      className={twMerge(
        // Base styles
        'relative inline-flex items-center justify-center font-medium transition-all duration-200 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        'rounded-lg',

        // Size
        sizeClasses[size],

        // Width
        fullWidth ? 'w-full' : '',

        // Variant classes
        classes.container,
        classes.text,
        classes.interactive,

        // Custom styles for each variant type
        variantSpecificStyles,

        // Neon glow classes
        neonGlowClass,
        neonHoverClass,

        // Disabled state
        (isDisabled || isLoading) && 'opacity-60 cursor-not-allowed',

        // External class
        className
      )}
      title={tooltip}
      {...animationProps}
      {...rest}
    >
      {/* Loading spinner */}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner />
        </span>
      )}

      {/* Button content with optional icons */}
      <span className={`flex items-center ${isLoading ? 'invisible' : ''}`}>
        {startIcon && <span className="mr-2">{startIcon}</span>}
        {children}
        {endIcon && <span className="ml-2">{endIcon}</span>}
      </span>
    </ButtonComponent>
  );
});

VariantButton.displayName = 'VariantButton';

export default VariantButton; 