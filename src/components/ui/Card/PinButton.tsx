import React from 'react';
import { motion } from 'framer-motion';

export interface PinButtonProps {
  pinned: boolean;
  onToggle: () => void;
  ariaLabel?: string;
  className?: string;
}

export const PinButton: React.FC<PinButtonProps> = ({ pinned, onToggle, ariaLabel = 'Pin event', className }) => (
  <motion.button
    type="button"
    aria-pressed={pinned}
    aria-label={ariaLabel}
    onClick={e => { e.stopPropagation(); onToggle(); }}
    className={className}
    whileTap={{ scale: 0.88 }}
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      marginRight: 6,
      outline: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: 8,
      transition: 'background 0.18s',
      color: pinned ? 'var(--color-accent-yellow)' : 'var(--color-text-secondary)',
      boxShadow: pinned ? '0 2px 8px var(--color-accent-yellow-opaque)' : undefined,
    }}
    tabIndex={0}
  >
    <motion.svg
      width="22" height="22" viewBox="0 0 22 22" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={false}
      animate={{ rotate: pinned ? -20 : 0, scale: pinned ? 1.18 : 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      aria-hidden="true"
    >
      <motion.path
        d="M11 2l2.5 6H19l-5 4 2 6-5-4-5 4 2-6-5-4h5.5L11 2z"
        fill={pinned ? 'var(--color-accent-yellow)' : 'var(--color-border)'}
        stroke={pinned ? 'var(--color-accent-yellow-dark)' : 'var(--color-border)'}
        strokeWidth="1.2"
        style={{ filter: pinned ? 'drop-shadow(0 2px 8px var(--color-accent-yellow-opaque))' : undefined }}
      />
    </motion.svg>
    <span style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>{pinned ? 'Pinned' : 'Not pinned'}</span>
  </motion.button>
); 