/**
 * Atomic Modal component for Coinet
 * Inspired by Apple, Canva, TradingView, Solana
 * All props are documented and extensible
 */
import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { colors } from 'src/styles/tokens/colors';
import { spacing } from 'src/styles/tokens/spacing';
import { shadows } from 'src/styles/tokens/shadows';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /**
   * Open state
   */
  open: boolean;
  /**
   * Close handler
   */
  onClose: () => void;
  /**
   * Modal title
   */
  title?: React.ReactNode;
  /**
   * Modal size
   */
  size?: ModalSize;
  /**
   * Show close button
   */
  closeButton?: boolean;
  /**
   * Show overlay
   */
  overlay?: boolean;
  /**
   * Animation (fade, slide, scale)
   */
  animation?: 'fade' | 'slide' | 'scale';
  /**
   * ARIA label
   */
  'aria-label'?: string;
  /**
   * Children nodes
   */
  children?: React.ReactNode;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional style
   */
  style?: React.CSSProperties;
  /**
   * Actions
   */
  actions?: React.ReactNode;
  /**
   * Footer
   */
  footer?: React.ReactNode;
  /**
   * Pinned state
   */
  pinned?: boolean;
  /**
   * Pin handler
   */
  onPin?: (pinned: boolean) => void;
}

const sizeMap: Record<ModalSize, React.CSSProperties> = {
  sm: { maxWidth: '24rem' },
  md: { maxWidth: '32rem' },
  lg: { maxWidth: '40rem' },
  xl: { maxWidth: '56rem' },
};

export const ModalHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 0 24px', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>{children}</div>
);

export const ModalTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 800, fontSize: 20, flex: 1 }}>{children}</div>
);

export const ModalContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '20px 24px', fontSize: 16, color: 'var(--color-text-secondary)' }}>{children}</div>
);

export const ModalFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ padding: '0 24px 18px 24px', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>{children}</div>
);

export const ModalActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '0 24px 12px 24px' }}>{children}</div>
);

export const ModalClose: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <button
    aria-label="Close modal"
    onClick={e => { e.stopPropagation(); onClose(); }}
    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 20, marginLeft: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    tabIndex={0}
  >
    ×
  </button>
);

export const ModalBackdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,27,0.44)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
);

export const ModalContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open modal menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 18, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 120 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 8 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ModalExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export modal" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 15, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share modal" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 15, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const ModalPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin modal' : 'Pin modal'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 18, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const ModalUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface ModalEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const ModalEventLog: React.FC<{ events: ModalEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 8, marginTop: 8, maxHeight: 90, overflowY: 'auto', fontSize: 13 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 13, cursor: 'pointer' }}>Clear</button>
    </div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(e.timestamp).toLocaleTimeString()}:</span> {e.type}
        </li>
      ))}
    </ul>
  </div>
);

export const ModalComponent: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  size = 'md',
  closeButton = true,
  overlay = true,
  animation = 'fade',
  children,
  className,
  style,
  actions,
  footer,
  pinned,
  onPin,
  ...rest
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  React.useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  // Escape key to close
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const variants = {
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    scale: { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 } },
    slide: { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 40 } },
  };

  return (
    <ModalBackdrop>
      <div
        className={clsx(
          'co-modal-overlay',
          overlay && 'fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm',
          className,
          pinned ? 'co-modal-pinned' : ''
        )}
        style={{
          ...style,
          zIndex: 9998,
        }}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        aria-label={rest['aria-label'] || (typeof title === 'string' ? title : 'Modal')}
      >
        <motion.div
          ref={modalRef}
          className={clsx(
            'co-modal',
            'relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8 w-full',
            animation
          )}
          style={{
            outline: 'none',
            ...sizeMap[size],
          }}
          tabIndex={0}
          initial={variants[animation]?.initial || variants.fade.initial}
          animate={variants[animation]?.animate || variants.fade.animate}
          exit={variants[animation]?.exit || variants.fade.exit}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        >
          <ModalHeader>
            {title && <ModalTitle>{title}</ModalTitle>}
            <ModalPinButton pinned={pinned} onToggle={onPin} />
            {closeButton && (
              <ModalClose onClose={onClose} />
            )}
          </ModalHeader>
          <ModalContent>{children}</ModalContent>
          {actions && <ModalActions>{actions}</ModalActions>}
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </motion.div>
      </div>
    </ModalBackdrop>
  );
};

export const Modal = ModalComponent as React.FC<ModalProps> & {
  Header: typeof ModalHeader;
  Title: typeof ModalTitle;
  Content: typeof ModalContent;
  Footer: typeof ModalFooter;
  Actions: typeof ModalActions;
  Close: typeof ModalClose;
  Backdrop: typeof ModalBackdrop;
  ContextMenu: typeof ModalContextMenu;
  ExportShare: typeof ModalExportShare;
  PinButton: typeof ModalPinButton;
  UndoRedo: typeof ModalUndoRedo;
  EventLog: typeof ModalEventLog;
};

Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Content = ModalContent;
Modal.Footer = ModalFooter;
Modal.Actions = ModalActions;
Modal.Close = ModalClose;
Modal.Backdrop = ModalBackdrop;
Modal.ContextMenu = ModalContextMenu;
Modal.ExportShare = ModalExportShare;
Modal.PinButton = ModalPinButton;
Modal.UndoRedo = ModalUndoRedo;
Modal.EventLog = ModalEventLog;
