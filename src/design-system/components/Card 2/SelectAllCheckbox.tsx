import React from 'react';
import { motion } from 'framer-motion';

export interface SelectAllCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
  className?: string;
}

export const SelectAllCheckbox: React.FC<SelectAllCheckboxProps> = ({ checked, indeterminate, onChange, ariaLabel = 'Select all events', className }) => (
  <motion.button
    type="button"
    aria-checked={checked}
    aria-label={ariaLabel}
    role="checkbox"
    tabIndex={0}
    className={className}
    whileTap={{ scale: 0.92 }}
    onClick={e => { e.stopPropagation(); onChange(!checked); }}
    style={{
      width: 22,
      height: 22,
      borderRadius: 6,
      border: '2px solid var(--color-border)',
      background: checked ? 'var(--color-accent-blue)' : 'var(--color-surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: checked ? '0 2px 8px var(--color-accent-blue-opaque)' : undefined,
      transition: 'background 0.18s, border 0.18s',
      outline: 'none',
      marginRight: 8,
      cursor: 'pointer',
      position: 'relative',
    }}
  >
    {indeterminate ? (
      <motion.div
        layoutId="indeterminate-bar"
        style={{ width: 12, height: 2, borderRadius: 1, background: 'var(--color-accent-blue)', margin: 'auto' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        exit={{ scaleX: 0 }}
        transition={{ duration: 0.18 }}
      />
    ) : checked ? (
      <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
        <motion.path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    ) : null}
  </motion.button>
); 