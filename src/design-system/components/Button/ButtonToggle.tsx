/// <reference types="react" />

/**
 * Atomic ButtonToggle for Coinet
 * Toggle/switch for Button (ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  'aria-label'?: string;
}

export const ButtonToggle: React.FC<ButtonToggleProps> = ({ checked, onChange, className, style, 'aria-label': ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel || 'Toggle'}
    className={["co-btn-toggle", checked ? 'checked' : '', className].filter(Boolean).join(' ')}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 40,
      height: 24,
      borderRadius: 12,
      background: checked ? 'var(--color-success)' : 'var(--color-border)',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.2s',
      ...style,
    }}
    onClick={() => onChange(!checked)}
  >
    <span style={{
      display: 'inline-block',
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-xs)',
      transform: checked ? 'translateX(16px)' : 'translateX(0)',
      transition: 'transform 0.2s',
    }} />
  </button>
); 