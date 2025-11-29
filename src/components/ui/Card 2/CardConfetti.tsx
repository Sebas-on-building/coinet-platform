/**
 * Atomic CardConfetti for Coinet Card system
 * Confetti burst for success/celebration
 * Uses Framer Motion, design tokens, ARIA, and motion preference
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CardConfettiProps {
  show: boolean;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const confettiColors = [
  'var(--color-accent-blue)',
  'var(--color-accent-purple)',
  'var(--color-accent-green)',
  'var(--color-accent-yellow)',
  'var(--color-accent-pink)',
];

export const CardConfetti: React.FC<CardConfettiProps> = ({ show, onComplete, className, style }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className={['co-card-confetti', className].filter(Boolean).join(' ')}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          ...style,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        aria-label="Card confetti"
        onAnimationComplete={onComplete}
      >
        {[...Array(18)].map((_, i) => (
          <motion.span
            key={i}
            style={{
              position: 'absolute',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 60 + 10}%`,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: confettiColors[i % confettiColors.length],
              boxShadow: '0 2px 8px 0 rgb(0 0 0 / 8%)',
            }}
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: Math.random() * 60 + 24, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 + Math.random() * 0.6, delay: i * 0.03 }}
          />
        ))}
      </motion.div>
    )}
  </AnimatePresence>
); 