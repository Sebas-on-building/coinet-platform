import React, { useState, useRef } from 'react';

export interface TimelineProps {
  items: TimelineItemProps[];
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface TimelineItemProps {
  id: string | number;
  label?: React.ReactNode;
  content?: React.ReactNode;
  markerColor?: string;
  active?: boolean;
  actions?: React.ReactNode;
  onPin?: (pinned: boolean) => void;
  pinned?: boolean;
}

export const Timeline: React.FC<TimelineProps> & {
  Item: typeof TimelineItem;
  Marker: typeof TimelineMarker;
  Label: typeof TimelineLabel;
  Content: typeof TimelineContent;
  Actions: typeof TimelineActions;
  ContextMenu: typeof TimelineContextMenu;
  ExportShare: typeof TimelineExportShare;
  PinButton: typeof TimelinePinButton;
  UndoRedo: typeof TimelineUndoRedo;
  EventLog: typeof TimelineEventLog;
} = ({ items, className, style, children }) => (
  <div className={["co-timeline", className].filter(Boolean).join(' ')} style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>
    {items.map((item, i) => (
      <TimelineItem key={item.id} {...item} />
    ))}
    {children}
  </div>
);

export const TimelineItem: React.FC<TimelineItemProps> = ({ id, label, content, markerColor = 'var(--color-primary)', active, actions, pinned, onPin }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', minHeight: 48, padding: '8px 0' }}>
    <TimelineMarker color={markerColor} active={active} />
    <div style={{ flex: 1, marginLeft: 16 }}>
      {label && <TimelineLabel>{label}</TimelineLabel>}
      {content && <TimelineContent>{content}</TimelineContent>}
      {actions && <TimelineActions>{actions}</TimelineActions>}
    </div>
    <TimelinePinButton pinned={pinned} onToggle={onPin} />
  </div>
);

export const TimelineMarker: React.FC<{ color?: string; active?: boolean }> = ({ color = 'var(--color-primary)', active }) => (
  <span style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: active ? '3px solid var(--color-success)' : '2px solid var(--color-border)', boxShadow: active ? '0 0 0 4px var(--color-success)' : 'none', display: 'inline-block', marginTop: 4, transition: 'all 0.2s' }} />
);

export const TimelineLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{children}</div>
);

export const TimelineContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 2 }}>{children}</div>
);

export const TimelineActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>{children}</div>
);

export const TimelineContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open timeline menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 15, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 20, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 90 }}>
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

export const TimelineExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export timeline" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share timeline" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 13, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const TimelinePinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin timeline' : 'Pin timeline'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 13, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const TimelineUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface TimelineEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const TimelineEventLog: React.FC<{ events: TimelineEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
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

Timeline.Item = TimelineItem;
Timeline.Marker = TimelineMarker;
Timeline.Label = TimelineLabel;
Timeline.Content = TimelineContent;
Timeline.Actions = TimelineActions;
Timeline.ContextMenu = TimelineContextMenu;
Timeline.ExportShare = TimelineExportShare;
Timeline.PinButton = TimelinePinButton;
Timeline.UndoRedo = TimelineUndoRedo;
Timeline.EventLog = TimelineEventLog; 