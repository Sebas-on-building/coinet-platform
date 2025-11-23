import React, { useState, useRef } from 'react';

export interface ChipProps {
  children?: React.ReactNode;
  color?: string;
  selected?: boolean;
  removable?: boolean;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  onRemove?: () => void;
  onSelect?: (selected: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const Chip: React.FC<ChipProps> & {
  Removable: typeof ChipRemovable;
  Selectable: typeof ChipSelectable;
  Icon: typeof ChipIcon;
  Avatar: typeof ChipAvatar;
  ContextMenu: typeof ChipContextMenu;
  ExportShare: typeof ChipExportShare;
  PinButton: typeof ChipPinButton;
  UndoRedo: typeof ChipUndoRedo;
  EventLog: typeof ChipEventLog;
} = ({ children, color = 'var(--color-surface)', selected, removable, icon, avatar, onRemove, onSelect, className, style }) => {
  return (
    <span
      className={["co-chip", className, selected ? 'co-chip-selected' : ''].filter(Boolean).join(' ')}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, background: selected ? 'var(--color-primary)' : color, color: selected ? '#fff' : 'var(--color-text)', borderRadius: 16, fontWeight: 600, fontSize: 15, padding: '0 14px', height: 32, boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-xs)', cursor: 'pointer', userSelect: 'none', transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)', ...style,
      }}
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect?.(!selected)}
    >
      {avatar && <ChipAvatar>{avatar}</ChipAvatar>}
      {icon && <ChipIcon>{icon}</ChipIcon>}
      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{children}</span>
      {removable && <ChipRemovable onRemove={onRemove} />}
    </span>
  );
};

export const ChipRemovable: React.FC<{ onRemove?: () => void }> = ({ onRemove }) => (
  <button
    aria-label="Remove chip"
    onClick={e => { e.stopPropagation(); onRemove?.(); }}
    style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 18, marginLeft: 4, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
    tabIndex={0}
  >
    ×
  </button>
);

export const ChipSelectable: React.FC<{ selected?: boolean; onSelect?: (selected: boolean) => void; children: React.ReactNode }> = ({ selected, onSelect, children }) => (
  <span
    className={["co-chip-selectable", selected ? 'co-chip-selected' : ''].filter(Boolean).join(' ')}
    style={{ outline: selected ? '2px solid var(--color-primary)' : 'none', borderRadius: 16, transition: 'outline 0.18s' }}
    tabIndex={0}
    aria-pressed={selected}
    onClick={() => onSelect?.(!selected)}
  >
    {children}
  </span>
);

export const ChipIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 18, marginRight: 4 }}>{children}</span>
);

export const ChipAvatar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: 4 }}>{children}</span>
);

export const ChipContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open chip menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 18, marginLeft: 4, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 28, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 120 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '8px 16px', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 8 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const ChipExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 4, marginLeft: 4 }}>
    <button aria-label="Export chip" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 16, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share chip" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 16, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const ChipPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin chip' : 'Pin chip'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 18, marginLeft: 4, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const ChipUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 4 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 16, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 16, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface ChipEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const ChipEventLog: React.FC<{ events: ChipEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 8, marginTop: 8, maxHeight: 120, overflowY: 'auto', fontSize: 13 }}>
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

Chip.Removable = ChipRemovable;
Chip.Selectable = ChipSelectable;
Chip.Icon = ChipIcon;
Chip.Avatar = ChipAvatar;
Chip.ContextMenu = ChipContextMenu;
Chip.ExportShare = ChipExportShare;
Chip.PinButton = ChipPinButton;
Chip.UndoRedo = ChipUndoRedo;
Chip.EventLog = ChipEventLog; 