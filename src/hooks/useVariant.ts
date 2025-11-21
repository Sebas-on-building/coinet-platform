import { useState, useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { variants } from '@/styles/tokens/variants';

export type VariantType = 'frosted' | 'neon' | 'minimal' | 'default';
export type VariantIntensity = 'light' | 'normal' | 'strong';
export type VariantGlow = 'none' | 'subtle' | 'medium' | 'strong';
export type VariantAnimation = 'none' | 'subtle' | 'normal' | 'intense';

export interface VariantOptions {
  type: VariantType;
  intensity?: VariantIntensity;
  glow?: VariantGlow;
  animation?: VariantAnimation;
  color?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  interactive?: boolean;
  preserveColors?: boolean;
}

export interface VariantClasses {
  container: string;
  text: string;
  border: string;
  icon: string;
  interactive: string;
}

/**
 * Custom hook for managing design system variants
 * 
 * This hook generates the appropriate Tailwind classes for different
 * variant styles (frosted, neon, minimal, default) with various options
 * for customizing intensity, glow, animations, etc.
 * 
 * Usage:
 * ```
 * const { classes, setVariant, variant } = useVariant({
 *   type: 'frosted',
 *   intensity: 'normal',
 *   glow: 'subtle',
 *   interactive: true
 * });
 * 
 * return (
 *   <div className={classes.container}>
 *     <h2 className={classes.text}>Title</h2>
 *     <p>Content</p>
 *   </div>
 * );
 * ```
 */
export const useVariant = (initialOptions: VariantOptions) => {
  const [options, setOptions] = useState<VariantOptions>(initialOptions);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Update variant through a function
  const setVariant = (newOptions: Partial<VariantOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  };

  // Generate appropriate classes based on variant options
  const classes = useMemo<VariantClasses>(() => {
    const { type, intensity = 'normal', glow = 'none', animation = 'none', color = 'primary', interactive = false, preserveColors = false } = options;

    let containerClasses = '';
    let textClasses = '';
    let borderClasses = '';
    let iconClasses = '';
    let interactiveClasses = '';

    // Base classes based on variant type
    switch (type) {
      case 'frosted':
        containerClasses = intensity === 'light'
          ? 'frosted-panel-sm'
          : intensity === 'strong'
            ? 'frosted-panel-lg'
            : 'frosted-panel';

        if (glow !== 'none') {
          containerClasses += ' ' + (glow === 'subtle'
            ? 'shadow-frosted-xs'
            : glow === 'medium'
              ? 'shadow-frosted-md'
              : 'shadow-frosted-glow');
        }

        if (!preserveColors) {
          textClasses = isDark ? 'text-white/90' : 'text-gray-800';
        }

        if (animation !== 'none') {
          containerClasses += ' ' + (animation === 'subtle'
            ? 'animate-frost-reveal'
            : animation === 'normal'
              ? 'animate-frost-reveal animate-float'
              : 'animate-frost-reveal animate-subtle-tilt');
        }

        // Add highlight effect for strong intensity
        if (intensity === 'strong') {
          containerClasses += ' frosted-top-highlight';
        }

        if (interactive) {
          interactiveClasses = 'transition-all duration-300 hover:-translate-y-1 hover:shadow-frosted-lg active:translate-y-0 active:shadow-frosted-sm';
        }

        break;

      case 'neon':
        containerClasses = 'neon-card';

        if (color !== 'primary') {
          containerClasses += ` neon-card-${color}`;
        }

        if (glow !== 'none') {
          containerClasses += ' ' + (glow === 'subtle'
            ? 'neon-glow opacity-70'
            : glow === 'medium'
              ? 'neon-glow'
              : `neon-glow-${color} animate-glow-pulse`);
        }

        if (!preserveColors) {
          textClasses = 'text-white';
        }

        if (animation !== 'none') {
          containerClasses += ' ' + (animation === 'subtle'
            ? 'animate-fade-in'
            : animation === 'normal'
              ? 'animate-border-flow'
              : 'animate-color-shift');
        }

        // Gradient text for strong intensity
        if (intensity === 'strong' && !preserveColors) {
          textClasses = `neon-text ${color !== 'primary' ? `neon-text-${color}` : ''}`;
        }

        if (interactive) {
          interactiveClasses = 'transition-transform duration-300 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100';
        }

        iconClasses = `text-${color}-400`;

        break;

      case 'minimal':
        containerClasses = 'minimal-card';

        if (glow !== 'none') {
          containerClasses += ' ' + (glow === 'subtle'
            ? 'shadow-minimal-xs'
            : glow === 'medium'
              ? 'shadow-minimal-md'
              : 'shadow-minimal-lg');
        }

        if (!preserveColors) {
          textClasses = isDark ? 'text-white/85' : 'text-gray-700';
        }

        if (animation !== 'none') {
          containerClasses += ' ' + (animation === 'subtle'
            ? 'animate-fade-in'
            : animation === 'normal'
              ? 'animate-slide-up'
              : 'animate-scale-in');
        }

        if (interactive) {
          containerClasses += ' minimal-card-interactive';
          interactiveClasses = '';
        }

        borderClasses = isDark ? 'border-white/5' : 'border-black/5';

        break;

      default: // Default variant
        containerClasses = isDark
          ? 'bg-surface-dark-400 border border-surface-dark-300'
          : 'bg-white border border-gray-200';

        if (glow !== 'none') {
          containerClasses += ' ' + (glow === 'subtle'
            ? 'shadow-sm'
            : glow === 'medium'
              ? 'shadow-md'
              : 'shadow-lg');
        }

        if (interactive) {
          interactiveClasses = 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm';
        }

        if (!preserveColors) {
          textClasses = isDark ? 'text-white' : 'text-gray-900';
        }

        break;
    }

    // Add rounded corners to all variants
    containerClasses += ' rounded-lg';

    // Return the constructed class strings
    return {
      container: containerClasses,
      text: textClasses,
      border: borderClasses,
      icon: iconClasses,
      interactive: interactiveClasses
    };
  }, [options, isDark]);

  return {
    classes,
    setVariant,
    variant: options,
    isDark
  };
};

export default useVariant; 