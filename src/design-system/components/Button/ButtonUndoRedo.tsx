/**
 * Atomic ButtonUndoRedo for Coinet
 * Undo/redo actions for Button (with ARIA, accessibility, etc.)
 * Extensible, accessible, and beautiful
 */
import React from 'react';

export interface ButtonUndoRedoProps {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ButtonUndoRedo: React.FC<ButtonUndoRedoProps> = ({ canUndo, canRedo, onUndo, onRedo, className, style }) => (
  <span style={{ display: 'inline-flex', gap: 1, marginLeft: 2, ...style }} className={className}>
    <button aria-label="Undo" onClick={e => { e.stopPropagation(); onUndo?.(); }} disabled={!canUndo} style={{ background: 'none', border: 'none', color: canUndo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canUndo ? 'pointer' : 'not-allowed' }}>↺</button>
    <button aria-label="Redo" onClick={e => { e.stopPropagation(); onRedo?.(); }} disabled={!canRedo} style={{ background: 'none', border: 'none', color: canRedo ? 'var(--color-primary)' : 'var(--color-border)', fontSize: 13, cursor: canRedo ? 'pointer' : 'not-allowed' }}>↻</button>
  </span>
); 