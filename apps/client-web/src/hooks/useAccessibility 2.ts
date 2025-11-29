import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing focus trap within a component
 */
export function useFocusTrap(enabled: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [enabled]);

  return containerRef;
}

/**
 * Hook for announcing dynamic content to screen readers
 */
export function useAriaLive() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) return;
    
    announceRef.current.setAttribute('aria-live', priority);
    announceRef.current.textContent = message;
    
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce, announceRef };
}

/**
 * Hook for managing skip navigation links
 */
export function useSkipNavigation() {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent instanceof HTMLElement) {
      mainContent.tabIndex = -1;
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const nav = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (nav instanceof HTMLElement) {
      const firstLink = nav.querySelector('a, button');
      if (firstLink instanceof HTMLElement) {
        firstLink.focus();
      }
    }
  }, []);

  return { skipToContent, skipToNavigation };
}

/**
 * Hook for keyboard navigation shortcuts
 */
export function useKeyboardAccessibility() {
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Alt + K: Show keyboard shortcuts
      if (e.altKey && e.key === 'k') {
        e.preventDefault();
        toast({
          title: "Keyboard Shortcuts",
          description: "Press ? to see all available shortcuts",
        });
      }

      // Escape: Close modals/dialogs
      if (e.key === 'Escape') {
        const openDialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (openDialog) {
          const closeButton = openDialog.querySelector('[aria-label*="close" i]');
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [toast]);
}

/**
 * Hook for color contrast checking (WCAG AAA compliance)
 */
export function useColorContrast() {
  const checkContrast = useCallback((foreground: string, background: string) => {
    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(val => {
        const v = val / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const parseColor = (color: string): number[] => {
      const hex = color.replace('#', '');
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16)
      ];
    };

    const l1 = getLuminance(parseColor(foreground));
    const l2 = getLuminance(parseColor(background));
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      wcagAA: ratio >= 4.5,
      wcagAAA: ratio >= 7.0
    };
  }, []);

  return { checkContrast };
}

/**
 * Hook for reduced motion preferences
 */
export function useReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  return {
    prefersReducedMotion,
    animationDuration: prefersReducedMotion ? '0ms' : undefined,
    transitionDuration: prefersReducedMotion ? '0ms' : undefined
  };
}

/**
 * Hook for focus visible management
 */
export function useFocusVisible() {
  useEffect(() => {
    let hadKeyboardEvent = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        hadKeyboardEvent = true;
      }
    };

    const handleMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (hadKeyboardEvent) {
        target.classList.add('focus-visible');
      } else {
        target.classList.remove('focus-visible');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focus', handleFocus, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focus', handleFocus, true);
    };
  }, []);
}
