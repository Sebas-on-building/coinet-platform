/**
 * Atomic ButtonDropdown for Coinet
 * Dropdown menu for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React, { useState, useRef } from 'react';

export interface ButtonDropdownOption {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

export interface ButtonDropdownProps {
  options: ButtonDropdownOption[];
  onSelect: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonDropdown: React.FC<ButtonDropdownProps> = ({ options, onSelect, className, style, 'aria-label': ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className} ref={ref}>
      <button
        aria-label={ariaLabel || 'Open dropdown'}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 16, marginLeft: 2, cursor: 'pointer' }}
      >▼</button>
      {open && (
        <div style={{ position: 'absolute', top: 22, right: 0, background: 'var(--color-surface)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 100, minWidth: 120 }}>
          {options.map((opt, i) => (
            <button key={opt.value} onClick={() => { onSelect(opt.value); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', width: '100%', background: 'none', border: 'none', padding: '6px 12px', color: 'var(--color-text)', fontSize: 15, cursor: 'pointer' }}>
              {opt.icon && <span style={{ marginRight: 8 }}>{opt.icon}</span>}{opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 