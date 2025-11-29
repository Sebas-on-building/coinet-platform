import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BatchActionBarProps {
  selectedCount: number;
  onExport?: () => void;
  onFlag?: () => void;
  onReview?: () => void;
  onClear?: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({ selectedCount, onExport, onFlag, onReview, onClear }) => (
  <AnimatePresence>
    {selectedCount > 0 && (
      <motion.footer
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 48, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'var(--color-surface-glass)',
          boxShadow: '0 -2px 16px var(--color-shadow)',
          borderRadius: 'var(--radius-xl)',
          margin: 0,
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
        aria-label="Batch actions"
      >
        <span style={{ fontWeight: 700, fontSize: 16 }}>{selectedCount} selected</span>
        <button onClick={onExport} style={btnStyle} aria-label="Export selected">Export</button>
        <button onClick={onFlag} style={btnStyle} aria-label="Flag selected">Flag</button>
        <button onClick={onReview} style={btnStyle} aria-label="Mark selected as reviewed">Mark Reviewed</button>
        <button onClick={onClear} style={{ ...btnStyle, color: 'var(--color-accent-red)' }} aria-label="Clear selection">Clear</button>
      </motion.footer>
    )}
  </AnimatePresence>
);

const btnStyle: React.CSSProperties = {
  borderRadius: 8,
  padding: '8px 16px',
  fontWeight: 700,
  background: 'var(--color-surface)',
  color: 'var(--color-accent-blue)',
  border: '1px solid var(--color-border)',
  cursor: 'pointer',
  fontSize: 15,
  transition: 'background 0.2s, color 0.2s',
}; 