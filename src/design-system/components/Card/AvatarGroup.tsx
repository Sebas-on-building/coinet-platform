import React, { useState, useRef } from 'react';
import { Avatar } from './Avatar';

export interface AvatarGroupProps {
  avatars: { src?: string; alt?: string; status?: 'online' | 'offline' | 'busy' | 'away'; badge?: React.ReactNode }[];
  max?: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  onReorder?: (newOrder: number[]) => void;
  badge?: React.ReactNode;
  status?: string;
  children?: React.ReactNode;
}

export const AvatarGroup: React.FC<AvatarGroupProps> & {
  Overflow: typeof AvatarGroupOverflow;
  DragHandle: typeof AvatarGroupDragHandle;
  Status: typeof AvatarGroupStatus;
  Badge: typeof AvatarGroupBadge;
  ContextMenu: typeof AvatarGroupContextMenu;
  ExportShare: typeof AvatarGroupExportShare;
  PinButton: typeof AvatarGroupPinButton;
  UndoRedo: typeof AvatarGroupUndoRedo;
  EventLog: typeof AvatarGroupEventLog;
} = ({ avatars, max = 5, size = 40, className, style, badge, status, onReorder, children }) => {
  const [order, setOrder] = useState(avatars.map((_, i) => i));
  const overflow = avatars.length > max;
  const visible = order.slice(0, max);
  const overflowCount = avatars.length - max;
  return (
    <div className={["co-avatar-group", className].filter(Boolean).join(' ')} style={{ display: 'flex', alignItems: 'center', ...style }}>
      {visible.map((i, idx) => (
        <span key={i} style={{ marginLeft: idx === 0 ? 0 : -size * 0.28, zIndex: 10 - idx, position: 'relative' }}>
          <Avatar {...avatars[i]} size={size} status={avatars[i].status} />
        </span>
      ))}
      {overflow && <AvatarGroupOverflow count={overflowCount} avatars={avatars.slice(max)} size={size} />}
      {badge && <AvatarGroupBadge>{badge}</AvatarGroupBadge>}
      {status && <AvatarGroupStatus status={status} />}
      {children}
    </div>
  );
};

export const AvatarGroupOverflow: React.FC<{ count: number; avatars: any[]; size: number }> = ({ count, avatars, size }) => {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ marginLeft: -size * 0.28, zIndex: 1, position: 'relative' }}>
      <button
        aria-label={`Show ${count} more`}
        style={{ width: size, height: size, borderRadius: '50%', background: 'var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 700, fontSize: size * 0.44, border: 'none', cursor: 'pointer' }}
        onClick={() => setOpen(v => !v)}
      >
        +{count}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: size + 8, left: 0, background: 'var(--color-surface)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 12, zIndex: 100 }}>
          {avatars.map((a, i) => <Avatar key={i} {...a} size={size} />)}
        </div>
      )}
    </span>
  );
};

export const AvatarGroupDragHandle: React.FC = () => (
  <span style={{ cursor: 'grab', marginLeft: 4, color: 'var(--color-border)' }} aria-label="Drag to reorder">≡</span>
);

export const AvatarGroupStatus: React.FC<{ status: string }> = ({ status }) => (
  <span style={{ marginLeft: 8, color: 'var(--color-accent-green)', fontWeight: 600 }}>{status}</span>
);

export const AvatarGroupBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ marginLeft: 8, background: 'var(--color-accent-blue)', color: '#fff', borderRadius: 8, padding: '2px 8px', fontSize: 13, fontWeight: 700, boxShadow: 'var(--shadow-md)' }}>{children}</span>
);

export const AvatarGroupContextMenu: React.FC = () => null; // TODO: Implement context menu
export const AvatarGroupExportShare: React.FC = () => null; // TODO: Implement export/share
export const AvatarGroupPinButton: React.FC = () => null; // TODO: Implement pin button
export const AvatarGroupUndoRedo: React.FC = () => null; // TODO: Implement undo/redo
export const AvatarGroupEventLog: React.FC = () => null; // TODO: Implement event log

AvatarGroup.Overflow = AvatarGroupOverflow;
AvatarGroup.DragHandle = AvatarGroupDragHandle;
AvatarGroup.Status = AvatarGroupStatus;
AvatarGroup.Badge = AvatarGroupBadge;
AvatarGroup.ContextMenu = AvatarGroupContextMenu;
AvatarGroup.ExportShare = AvatarGroupExportShare;
AvatarGroup.PinButton = AvatarGroupPinButton;
AvatarGroup.UndoRedo = AvatarGroupUndoRedo;
AvatarGroup.EventLog = AvatarGroupEventLog; 