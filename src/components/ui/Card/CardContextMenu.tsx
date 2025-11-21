/**
 * Atomic CardContextMenu for Coinet Card system
 * Context menu for right-click or keyboard, with custom menu items
 * Uses design tokens, ARIA, and full documentation
 */
import React, { useRef, useState } from 'react';

export interface CardContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export interface CardContextMenuProps {
  items: CardContextMenuItem[];
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onAction?: (item: CardContextMenuItem) => void;
}

export const CardContextMenu: React.FC<CardContextMenuProps> = ({ items, children, className, style, onAction }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
    document.addEventListener('mousedown', handleClickOutside);
  };
  const handleClickOutside = (e: MouseEvent) => {
    if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    document.removeEventListener('mousedown', handleClickOutside);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      setPos({ x: 40, y: 40 });
      setOpen(true);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div
      className={['co-card-context-menu-wrapper', className].filter(Boolean).join(' ')}
      style={{ position: 'relative', ...style }}
      tabIndex={0}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      aria-label="Card context menu"
    >
      {children}
      {open && (
        <div
          ref={menuRef}
          className="co-card-context-menu"
          style={{
            position: 'fixed',
            top: pos.y,
            left: pos.x,
            minWidth: 180,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 24px 0 rgb(0 0 0 / 12%)',
            zIndex: 1000,
            padding: 'var(--space-xs) 0',
          }}
          role="menu"
          tabIndex={-1}
        >
          {items.map((item, i) => (
            <button
              key={i}
              className={['co-card-context-menu-item', item.danger && 'text-red-600'].filter(Boolean).join(' ')}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 'var(--space-sm) var(--space-lg)',
                fontSize: 'var(--font-size-base)',
                color: item.disabled ? 'var(--color-border)' : 'var(--color-text)',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
                fontWeight: 500,
                gap: 10,
                transition: 'background 0.2s',
              }}
              role="menuitem"
              tabIndex={item.disabled ? -1 : 0}
              disabled={item.disabled}
              aria-disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick?.();
                  onAction?.(item);
                  setOpen(false);
                }
              }}
            >
              {item.icon && <span style={{ marginRight: 8 }}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 