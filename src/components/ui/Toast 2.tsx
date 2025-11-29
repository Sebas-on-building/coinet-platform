import React, { useState, useRef } from 'react';

export interface ToastProps {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  message?: React.ReactNode;
  actions?: React.ReactNode;
  onClose?: () => void;
  color?: string;
  pinned?: boolean;
  onPin?: (pinned: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Toast: React.FC<ToastProps> & {
  Icon: typeof ToastIcon;
  Title: typeof ToastTitle;
  Message: typeof ToastMessage;
  Actions: typeof ToastActions;
  Close: typeof ToastClose;
  ContextMenu: typeof ToastContextMenu;
  ExportShare: typeof ToastExportShare;
  PinButton: typeof ToastPinButton;
  UndoRedo: typeof ToastUndoRedo;
  EventLog: typeof ToastEventLog;
} = ({ icon, title, message, actions, onClose, color = 'var(--color-surface)', pinned, onPin, className, style }) => {
  return (
    <div
      className={["co-toast", className, pinned ? 'co-toast-pinned' : ''].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, background: color, color: 'var(--color-text)', borderRadius: 14, boxShadow: pinned ? 'var(--shadow-lg)' : 'var(--shadow-md)', padding: '14px 18px', minWidth: 260, maxWidth: 360, position: 'relative', ...style,
      }}
      role="status"
      aria-live="polite"
    >
      {icon && <ToastIcon>{icon}</ToastIcon>}
      <div style={{ flex: 1 }}>
        {title && <ToastTitle>{title}</ToastTitle>}
        {message && <ToastMessage>{message}</ToastMessage>}
        {actions && <ToastActions>{actions}</ToastActions>}
      </div>
      <ToastClose onClose={onClose} />
    </div>
  );
};

export const ToastIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 20, marginRight: 8 }}>{children}</span>
);

export const ToastTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{children}</div>
);

export const ToastMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{children}</div>
);

export const ToastActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>{children}</div>
);

export const ToastClose: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <button
    aria-label="Close toast"
    onClick={e => { e.stopPropagation(); onClose?.(); }}
    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 16, marginLeft: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'absolute', top: 8, right: 8 }}
    tabIndex={0}
  >
    ×
  </button>
);

export const ToastContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open toast menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 18, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 90 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '5px 10px', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 7 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ToastExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export toast" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share toast" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 13, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const ToastPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin toast' : 'Pin toast'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 13, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const ToastUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface ToastEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const ToastEventLog: React.FC<{ events: ToastEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 5, marginTop: 5, maxHeight: 70, overflowY: 'auto', fontSize: 11 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 11, cursor: 'pointer' }}>Clear</button>
    </div>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {events.map((e, i) => (
        <li key={i} style={{ marginBottom: 1 }}>
          <span style={{ color: 'var(--color-text-secondary)' }}>{new Date(e.timestamp).toLocaleTimeString()}:</span> {e.type}
        </li>
      ))}
    </ul>
  </div>
);

Toast.Icon = ToastIcon;
Toast.Title = ToastTitle;
Toast.Message = ToastMessage;
Toast.Actions = ToastActions;
Toast.Close = ToastClose;
Toast.ContextMenu = ToastContextMenu;
Toast.ExportShare = ToastExportShare;
Toast.PinButton = ToastPinButton;
Toast.UndoRedo = ToastUndoRedo;
Toast.EventLog = ToastEventLog; 