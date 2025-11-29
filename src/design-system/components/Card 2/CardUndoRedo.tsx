/**
 * Atomic CardUndoRedo for Coinet Card system
 * Undo/redo button group for Card actions, with keyboard shortcuts
 * Uses design tokens, ARIA, analytics, and compliance hooks
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCardAnalytics } from './CardAnalytics';
import { useCardCompliance } from './CardCompliance';

export interface CardUndoRedoProps {
  cardId?: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const CardUndoRedo: React.FC<CardUndoRedoProps> = ({ cardId, onUndo, onRedo, canUndo = true, canRedo = true, className, style }) => {
  const { track } = useCardAnalytics();
  const { log } = useCardCompliance();
  const undoRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      onUndo?.();
      log?.({ type: 'custom', name: 'undo', cardId });
      track?.({ type: 'custom', name: 'undo', cardId });
    }
  }, [canUndo, onUndo, log, track, cardId]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      onRedo?.();
      log?.({ type: 'custom', name: 'redo', cardId });
      track?.({ type: 'custom', name: 'redo', cardId });
    }
  }, [canRedo, onRedo, log, track, cardId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className={["co-card-undo-redo", className].filter(Boolean).join(' ')} style={{ display: 'flex', gap: 8, ...style }}>
      <button
        ref={undoRef}
        aria-label="Undo"
        onClick={handleUndo}
        disabled={!canUndo}
        style={{ background: 'none', border: 'none', cursor: canUndo ? 'pointer' : 'not-allowed', opacity: canUndo ? 1 : 0.5 }}
      >
        <svg width="20" height="20" fill="none" aria-hidden="true"><path d="M15 10H6.5M6.5 10l3.5-3.5M6.5 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <button
        ref={redoRef}
        aria-label="Redo"
        onClick={handleRedo}
        disabled={!canRedo}
        style={{ background: 'none', border: 'none', cursor: canRedo ? 'pointer' : 'not-allowed', opacity: canRedo ? 1 : 0.5 }}
      >
        <svg width="20" height="20" fill="none" aria-hidden="true"><path d="M5 10h8.5M13.5 10l-3.5-3.5M13.5 10l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}; 