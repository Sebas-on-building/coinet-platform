import React, { useEffect, useRef } from 'react';
import {
  themeColors,
  radii,
  shadows,
  spacing,
  motion,
} from '../../../styles/tokens/design-tokens';
import { useTheme } from "@/themes/ThemeProvider";
import { motion as framerMotion, AnimatePresence } from "framer-motion";
import clsx from 'clsx';
import styles from './Modal.module.css';

export type ModalTheme = keyof typeof themeColors;
export type ModalVariant = 'default' | 'tradingview' | 'solana' | 'apple' | 'canva';

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  glow?: boolean;
  gradient?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  theme?: ModalTheme;
  variant?: ModalVariant;
  width?: number | string;
  maxWidth?: number | string;
  minWidth?: number | string;
  hideCloseButton?: boolean;
  title?: string;
}

// =========================
// Sub-feature: Theme Styles
// =========================
const getModalStyles = (theme: ModalTheme, variant: ModalVariant) => {
  const c = themeColors[theme];
  let style: React.CSSProperties = {
    background: c.surface,
    borderRadius: radii.lg,
    boxShadow: shadows.lg,
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    color: c.text,
    transition: `box-shadow ${motion.normal}, background ${motion.normal}`,
  };
  if (variant === 'tradingview') {
    style.background = '#131722';
    style.color = '#D1D4DC';
    style.border = '1px solid #2A2E39';
  } else if (variant === 'solana') {
    style.background = 'linear-gradient(135deg, #000000, #1E1E1E)';
    style.color = '#00FFA3';
    style.border = '1px solid #333333';
  } else if (variant === 'apple') {
    style.background = '#FFFFFF';
    style.color = '#1A1A1A';
    style.border = '1px solid #E5E7EB';
  } else if (variant === 'canva') {
    style.background = '#FFFFFF';
    style.color = '#00C4CC';
    style.border = '1px solid #E5E7EB';
  }
  return style;
};

// =========================
// Main Modal Component
// =========================
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, glow, gradient, className, header, footer, children, theme = 'light', variant = 'default', width = 480, maxWidth = 560, minWidth = 320, hideCloseButton = false, title, ...props }, ref) => {
    const { colors } = useTheme();
    const modalRef = useRef<HTMLDivElement>(null);

    // =========================
    // Sub-feature: Focus Trap
    // =========================
    useEffect(() => {
      if (open && modalRef.current) {
        const previouslyFocused = document.activeElement as HTMLElement;
        modalRef.current.focus();
        return () => previouslyFocused && previouslyFocused.focus();
      }
    }, [open]);

    // =========================
    // Sub-feature: Escape Key Close
    // =========================
    useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    // =========================
    // Sub-feature: Backdrop
    // =========================
    const backdropStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(24,25,43,0.7)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    // =========================
    // Sub-feature: Modal Container
    // =========================
    const modalStyle: React.CSSProperties = {
      ...getModalStyles(theme, variant),
      minWidth,
      maxWidth,
      width: typeof width === 'number' ? `${width}px` : width,
      animation: `modalPopIn ${motion.normal}`,
      position: 'relative',
    };

    // =========================
    // Sub-feature: Header/Footer/Body
    // =========================
    const Section = ({ children, border }: { children: React.ReactNode; border?: 'top' | 'bottom' }) => (
      <div
        style={{
          padding: spacing.lg,
          ...(border === 'top' && { borderTop: `1px solid ${themeColors[theme].border}` }),
          ...(border === 'bottom' && { borderBottom: `1px solid ${themeColors[theme].border}` }),
        }}
      >
        {children}
      </div>
    );

    // =========================
    // Sub-feature: Close Button
    // =========================
    const CloseButton = () => (
      <button
        onClick={onClose}
        aria-label="Close modal"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 20,
          color: themeColors[theme].muted,
          marginLeft: 'auto',
          transition: `color ${motion.fast}`,
        }}
        onMouseOver={e => (e.currentTarget.style.color = themeColors[theme].primary)}
        onMouseOut={e => (e.currentTarget.style.color = themeColors[theme].muted)}
      >
        &times;
      </button>
    );

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            className={clsx(
              styles.overlay,
              { [styles.glow]: glow, [styles.gradient]: gradient },
              className
            )}
            style={backdropStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              ref={ref || modalRef}
              className={styles.modal}
              style={modalStyle}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={e => e.stopPropagation()}
              tabIndex={0}
              aria-modal="true"
              role="dialog"
              {...props}
            >
              {title && <h2 style={{ margin: 0, fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)" }}>{title}</h2>}
              {(header || !hideCloseButton) && (
                <Section border="bottom">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                    {header && <div>{header}</div>}
                    {!hideCloseButton && <CloseButton />}
                  </div>
                </Section>
              )}
              <div style={{ padding: spacing.lg, flex: 1 }}>{children}</div>
              {footer && <Section border="top">{footer}</Section>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);
Modal.displayName = 'Modal';

// All sub-features are modular and documented for future extension and perfection.

export function ModalHeader({ children }: { children: React.ReactNode }) {
  return <div className={styles.header}>{children}</div>;
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className={styles.footer}>{children}</div>;
}

export function ModalClose({ onClick }: { onClick: () => void }) {
  return (
    <button className={styles.close} aria-label="Close modal" onClick={onClick}>
      ×
    </button>
  );
} 