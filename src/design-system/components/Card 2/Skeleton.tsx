import React, { useState, useRef } from 'react';

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> & {
  Rect: typeof SkeletonRect;
  Circle: typeof SkeletonCircle;
  Text: typeof SkeletonText;
  Avatar: typeof SkeletonAvatar;
  Card: typeof SkeletonCard;
  ContextMenu: typeof SkeletonContextMenu;
  ExportShare: typeof SkeletonExportShare;
  PinButton: typeof SkeletonPinButton;
  UndoRedo: typeof SkeletonUndoRedo;
  EventLog: typeof SkeletonEventLog;
} = ({ className, style, children }) => (
  <div className={["co-skeleton", className].filter(Boolean).join(' ')} style={{ background: 'var(--color-border)', borderRadius: 8, minHeight: 16, ...style, animation: 'pulse-fast 1.2s infinite alternate' }} aria-busy="true">
    {children}
  </div>
);

export const SkeletonRect: React.FC<SkeletonProps & { width?: number | string; height?: number | string }> = ({ width = '100%', height = 16, className, style }) => (
  <div className={className} style={{ width, height, background: 'var(--color-border)', borderRadius: 8, ...style, animation: 'pulse-fast 1.2s infinite alternate' }} aria-busy="true" />
);

export const SkeletonCircle: React.FC<SkeletonProps & { size?: number }> = ({ size = 40, className, style }) => (
  <div className={className} style={{ width: size, height: size, borderRadius: '50%', background: 'var(--color-border)', ...style, animation: 'pulse-fast 1.2s infinite alternate' }} aria-busy="true" />
);

export const SkeletonText: React.FC<SkeletonProps & { lines?: number; width?: string | number }> = ({ lines = 2, width = '100%', className, style }) => (
  <div className={className} style={{ ...style }} aria-busy="true">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} style={{ width: typeof width === 'string' ? width : `${100 - i * 8}%`, height: 14, background: 'var(--color-border)', borderRadius: 6, marginBottom: 6, animation: 'pulse-fast 1.2s infinite alternate' }} />
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<SkeletonProps & { size?: number }> = ({ size = 40, className, style }) => (
  <SkeletonCircle size={size} className={className} style={style} />
);

export const SkeletonCard: React.FC<SkeletonProps & { width?: number | string; height?: number | string }> = ({ width = 320, height = 120, className, style }) => (
  <div className={className} style={{ width, height, borderRadius: 16, background: 'var(--color-border)', boxShadow: 'var(--shadow-md)', ...style, animation: 'pulse-fast 1.2s infinite alternate' }} aria-busy="true" />
);

export const SkeletonContextMenu: React.FC<{ actions?: { label: string; onClick: () => void; icon?: React.ReactNode }[] }> = ({ actions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={ref}>
      <button
        aria-label="Open skeleton menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >⋮</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 100 }}>
          {actions.map((a, i) => (
            <button key={i} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: 'var(--color-text)', fontSize: 14, cursor: 'pointer' }}>
              {a.icon && <span style={{ marginRight: 8 }}>{a.icon}</span>}{a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const SkeletonExportShare: React.FC<{ onExport?: () => void; onShare?: () => void }> = ({ onExport, onShare }) => (
  <span style={{ display: 'inline-flex', gap: 2, marginLeft: 2 }}>
    <button aria-label="Export skeleton" onClick={e => { e.stopPropagation(); onExport?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-info)', fontSize: 14, cursor: 'pointer' }}>⤓</button>
    <button aria-label="Share skeleton" onClick={e => { e.stopPropagation(); onShare?.(); }} style={{ background: 'none', border: 'none', color: 'var(--color-accent-blue)', fontSize: 14, cursor: 'pointer' }}>🔗</button>
  </span>
);

export const SkeletonPinButton: React.FC<{ pinned?: boolean; onToggle?: (pinned: boolean) => void }> = ({ pinned, onToggle }) => (
  <button
    aria-label={pinned ? 'Unpin skeleton' : 'Pin skeleton'}
    onClick={e => { e.stopPropagation(); onToggle?.(!pinned); }}
    style={{ background: 'none', border: 'none', color: pinned ? 'var(--color-warning)' : 'var(--color-text-secondary)', fontSize: 14, marginLeft: 2, cursor: 'pointer', transition: 'color 0.2s' }}
  >
    {pinned ? '📌' : '📍'}
  </button>
);

export const SkeletonUndoRedo: React.FC<{ canUndo?: boolean; canRedo?: boolean; onUndo?: () => void; onRedo?: () => void }> = ({ canUndo, canRedo, onUndo, onRedo }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2 }}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
);

export interface SkeletonEvent {
  type: string;
  timestamp: number;
  meta?: any;
}

export const SkeletonEventLog: React.FC<{ events: SkeletonEvent[]; onClear?: () => void }> = ({ events, onClear }) => (
  <div style={{ background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-xs)', padding: 6, marginTop: 6, maxHeight: 80, overflowY: 'auto', fontSize: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
      <span style={{ fontWeight: 700 }}>Event Log</span>
      <button aria-label="Clear event log" onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-error)', fontSize: 12, cursor: 'pointer' }}>Clear</button>
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

Skeleton.Rect = SkeletonRect;
Skeleton.Circle = SkeletonCircle;
Skeleton.Text = SkeletonText;
Skeleton.Avatar = SkeletonAvatar;
Skeleton.Card = SkeletonCard;
Skeleton.ContextMenu = SkeletonContextMenu;
Skeleton.ExportShare = SkeletonExportShare;
Skeleton.PinButton = SkeletonPinButton;
Skeleton.UndoRedo = SkeletonUndoRedo;
Skeleton.EventLog = SkeletonEventLog; 