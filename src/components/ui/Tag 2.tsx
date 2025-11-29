import React, { useState, useRef } from 'react';

export interface TagProps {
  children?: React.ReactNode;
  color?: string;
  selected?: boolean;
  removable?: boolean;
  icon?: React.ReactNode;
  onRemove?: () => void;
  onSelect?: (selected: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Tag: React.FC<TagProps> & {
  Removable: typeof TagRemovable;
  Selectable: typeof TagSelectable;
  Icon: typeof TagIcon;
  Color: typeof TagColor;
  ContextMenu: typeof TagContextMenu;
  ExportShare: typeof TagExportShare;
  PinButton: typeof TagPinButton;
  UndoRedo: typeof TagUndoRedo;
  EventLog: typeof TagEventLog;
} = ({ children, color = 'var(--color-border)', selected, removable, icon, onRemove, onSelect, className, style }) => {
  return (
    <span
      className={["co-tag", className, selected ? 'co-tag-selected' : ''].filter(Boolean).join(' ')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, background: selected ? 'var(--color-primary)' : color, color: selected ? '#fff' : 'var(--color-text)', borderRadius: 12, fontWeight: 600, fontSize: 14, padding: '0 12px', height: 28, boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-xs)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)', ...style,
      }}
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect?.(!selected)}
    >
      {icon && <TagIcon>{icon}</TagIcon>}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{children}</span>
      {removable && <TagRemovable onRemove={onRemove} />}
    </span>
  );
};

export const TagRemovable: React.FC<{ onRemove?: () => void }> = ({ onRemove }) => (
  <button
    aria-label="Remove tag"
    onClick={e => { e.stopPropagation(); onRemove?.(); }}
    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 16, marginLeft: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    tabIndex={0}
  >
    ×
  </button>
);

export const TagSelectable: React.FC<{ selected?: boolean; onSelect?: (selected: boolean) => void; children: React.ReactNode }> = ({ selected, onSelect, children }) => (
  <span
    className={["co-tag-selectable", selected ? 'co-tag-selected' : ''].filter(Boolean).join(' ')}
    style={{ outline: selected ? '2px solid var(--color-primary)' : 'none', borderRadius: 12, transition: 'outline 0.18s' }}
    tabIndex={0}
    aria-pressed={selected}
    onClick={() => onSelect?.(!selected)}
  >
    {children}
  </span>
);

export const TagIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 16, marginRight: 4 }}>{children}</span>
);

export const TagColor: React.FC<{ color: string; onChange?: (color: string) => void }> = ({ color, onChange }) => {
  const colors = [
    'var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent-blue)', 'var(--color-accent-purple)', 'var(--color-accent-green)', 'var(--color-accent-pink)', 'var(--color-accent-yellow)', 'var(--color-error)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-info)'
  ];
  return (
    <span style={{ display: 'inline-flex', gap: 2, marginLeft: 4 }}>
      {colors.map(c => (
        <button key={c} aria-label={`Pick color ${c}`} style={{ width: 14, height: 14, borderRadius: 4, background: c, border: c === color ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); onChange?.(c); }} />
      ))}
    </span>
  );
};

export const TagContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open tag menu"
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

export const TagExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export tag" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 13, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share tag" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 13, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const TagPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin tag' : 'Pin tag'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 13, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const TagUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 12, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface TagEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const TagEventLog: React.FC<{ events: TagEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
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

Tag.Removable = TagRemovable;
Tag.Selectable = TagSelectable;
Tag.Icon = TagIcon;
Tag.Color = TagColor;
Tag.ContextMenu = TagContextMenu;
Tag.ExportShare = TagExportShare;
Tag.PinButton = TagPinButton;
Tag.UndoRedo = TagUndoRedo;
Tag.EventLog = TagEventLog; 