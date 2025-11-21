/// <reference types="react" />
/**
 * Atomic ButtonMenu for Coinet
 * Menu for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React, { useState, useRef } from 'react';

export interface ButtonMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export interface ButtonMenuProps {
  items: ButtonMenuItem[];
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonMenu: React.FC<ButtonMenuProps> = ({ items, className, style, 'aria-label': ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className} ref={ref}>
      <button
        aria-label={ariaLabel || 'Open menu'}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >☰</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 120 }}>
          {items.map((item, i) => (
            <button key={i} onClick={item.onClick} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer' }}>
              {item.icon && <span style={{ marginRight: 8 }}>{item.icon}</span>}{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 