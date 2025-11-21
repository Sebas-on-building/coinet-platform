import React, { useRef, useState } from 'react';
import { ExportButton } from '../EventExport';
import type { CardEvent } from '../CardEventLog';
import { motion } from 'framer-motion';
import { ConfettiBurst } from '../ConfettiBurst';
import { triggerHaptic } from '../HapticFeedback';

export const ActionBar: React.FC<{
  event: CardEvent;
  note: string;
  setNote: (n: string) => void;
  onExport?: (event: CardEvent) => void;
  onShare?: (event: CardEvent) => void;
  onFlag?: (event: CardEvent) => void;
  onAddNote?: (event: CardEvent, note: string) => void;
  onMarkReviewed?: (event: CardEvent) => void;
}> = ({ event, note, setNote, onExport, onShare, onFlag, onAddNote, onMarkReviewed }) => {
  const rippleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [confetti, setConfetti] = useState(false);

  const handleRipple = (i: number, e: React.MouseEvent) => {
    const ripple = rippleRefs.current[i];
    if (ripple) {
      ripple.classList.remove('show');
      void ripple.offsetWidth; // force reflow
      ripple.classList.add('show');
    }
  };

  const handleExport = () => {
    setConfetti(true);
    triggerHaptic('medium');
    onExport?.(event);
  };
  const handleMarkReviewed = () => {
    setConfetti(true);
    triggerHaptic('heavy');
    onMarkReviewed?.(event);
  };

  return (
    <footer style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'var(--color-surface-glass)', borderRadius: 16, padding: 16, boxShadow: 'var(--shadow-md)', position: 'relative' }} aria-label="Event actions">
      <ConfettiBurst trigger={confetti} onComplete={() => setConfetti(false)} />
      <ExportButton onClick={handleExport} aria-label="Export event" />
      {['Share', 'Flag', 'Mark Reviewed'].map((label, i) => (
        <motion.button
          key={label}
          whileTap={{ scale: 0.93 }}
          onClick={e => {
            handleRipple(i, e);
            if (label === 'Share') onShare?.(event);
            if (label === 'Flag') onFlag?.(event);
            if (label === 'Mark Reviewed') handleMarkReviewed();
          }}
          aria-label={`${label.toLowerCase()} event`}
          style={actionBtnStyle}
        >
          {label}
          <span ref={el => { rippleRefs.current[i] = el; }} className="ripple" style={rippleStyle} />
        </motion.button>
      ))}
      <form onSubmit={e => { e.preventDefault(); onAddNote?.(event, note); }} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add note" aria-label="Add note" style={{ borderRadius: 8, padding: '4px 8px', fontSize: 14, border: '1px solid var(--color-border)' }} />
        <motion.button type="submit" whileTap={{ scale: 0.93 }} style={actionBtnStyle}>
          Add
          <span className="ripple" style={rippleStyle} />
        </motion.button>
      </form>
    </footer>
  );
};

const actionBtnStyle: React.CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
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

const rippleStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  borderRadius: 'inherit',
  background: 'radial-gradient(circle, var(--color-accent-blue) 0%, transparent 70%)',
  opacity: 0,
  transition: 'opacity 0.4s',
  zIndex: 1,
};

// Add ripple effect via CSS
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `.ripple.show { opacity: 0.18 !important; animation: ripple-fade 0.4s linear; }
  @keyframes ripple-fade { from { opacity: 0.18; } to { opacity: 0; } }`;
  document.head.appendChild(style);
} 