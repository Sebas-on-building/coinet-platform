/**
 * Atomic CardMotion for Coinet Card system
 * Framer Motion wrapper for Card transitions and micro-interactions
 * Uses design tokens, ARIA, and full documentation
 */
import React from 'react';
import { motion, MotionProps } from 'framer-motion';

export interface CardMotionProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardMotion: React.FC<CardMotionProps> = ({ children, className, style, ...motionProps }) => (
  <motion.div
    className={['co-card-motion', className].filter(Boolean).join(' ')}
    style={{ ...style }}
    aria-label="Card motion"
    {...motionProps}
  >
    {children}
  </motion.div>
); 