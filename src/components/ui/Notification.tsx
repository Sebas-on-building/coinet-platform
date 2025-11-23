import React, { useState, useRef } from 'react';

export interface NotificationProps {
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

export const Notification: React.FC<NotificationProps> & {
  Icon: typeof NotificationIcon;
  Title: typeof NotificationTitle;
  Message: typeof NotificationMessage;
  Actions: typeof NotificationActions;
  Close: typeof NotificationClose;
  ContextMenu: typeof NotificationContextMenu;
  ExportShare: typeof NotificationExportShare;
  PinButton: typeof NotificationPinButton;
  UndoRedo: typeof NotificationUndoRedo;
  EventLog: typeof NotificationEventLog;
} = ({ icon, title, message, actions, onClose, color = 'var(--color-surface)', pinned, onPin, className, style }) => {
  return (
    <div
      className={["co-notification", className, pinned ? 'co-notification-pinned' : ''].filter(Boolean).join(' ')}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, background: color, color: 'var(--color-text)', borderRadius: 16, boxShadow: pinned ? 'var(--shadow-lg)' : 'var(--shadow-md)', padding: '16px 20px', minWidth: 320, maxWidth: 420, position: 'relative', ...style,
      }}
      role="alert"
      aria-live="polite"
    >
      {icon && <NotificationIcon>{icon}</NotificationIcon>}
      <div style={{ flex: 1 }}>
        {title && <NotificationTitle>{title}</NotificationTitle>}
        {message && <NotificationMessage>{message}</NotificationMessage>}
        {actions && <NotificationActions>{actions}</NotificationActions>}
      </div>
      <NotificationClose onClose={onClose} />
    </div>
  );
};

export const NotificationIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 22, marginRight: 8 }}>{children}</span>
);

export const NotificationTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{children}</div>
);

export const NotificationMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{children}</div>
);

export const NotificationActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>{children}</div>
);

export const NotificationClose: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <button
    aria-label="Close notification"
    onClick={e => { e.stopPropagation(); onClose?.(); }}
    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 18, marginLeft: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'absolute', top: 10, right: 10 }}
    tabIndex={0}
  >
    ×
  </button>
);

export const NotificationContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open notification menu"
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

export const NotificationExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export notification" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 15, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share notification" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 15, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const NotificationPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin notification' : 'Pin notification'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 18, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const NotificationUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 15, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 15, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface NotificationEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const NotificationEventLog: React.FC<{ events: NotificationEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
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

Notification.Icon = NotificationIcon;
Notification.Title = NotificationTitle;
Notification.Message = NotificationMessage;
Notification.Actions = NotificationActions;
Notification.Close = NotificationClose;
Notification.ContextMenu = NotificationContextMenu;
Notification.ExportShare = NotificationExportShare;
Notification.PinButton = NotificationPinButton;
Notification.UndoRedo = NotificationUndoRedo;
Notification.EventLog = NotificationEventLog; 