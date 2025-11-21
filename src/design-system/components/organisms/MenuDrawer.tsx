import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';

export interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  items: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }[];
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({ open, onClose, items, theme = 'light', className, style }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      ref={drawerRef}
      className={clsx('co-menudrawer', `co-menudrawer-${theme}`, { 'co-menudrawer-open': open }, className)}
      style={{ ...style, display: open ? 'block' : 'none' }}
      tabIndex={-1}
      role="menu"
      aria-label="Main menu"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <button className="co-menudrawer-close" onClick={onClose} aria-label="Close menu">×</button>
      <ul className="co-menudrawer-list">
        {items.map((item, i) => (
          <li key={item.label} className={clsx('co-menudrawer-item', { 'co-menudrawer-item-active': item.active })}>
            <button onClick={item.onClick} aria-label={item.label} role="menuitem">
              <span className="co-menudrawer-icon" aria-hidden="true">{item.icon}</span>
              <span className="co-menudrawer-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}; 