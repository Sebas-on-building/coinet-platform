/**
 * Atomic ButtonContextMenu for Coinet
 * Context menu for Button (actions, ARIA, keyboard, etc.)
 * Extensible, accessible, and beautiful
 */
import React, { useState, useRef } from 'react';

export interface ButtonContextMenuAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface ButtonContextMenuProps {
  actions?: ButtonContextMenuAction[];
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonContextMenu: React.FC<ButtonContextMenuProps> = ({ actions = [], className, style }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className} ref={ref}>
      <button
        aria-label="Open button context menu"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
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