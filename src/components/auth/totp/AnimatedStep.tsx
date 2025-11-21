import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedStepProps {
  index: number;
  activeIndex: number;
  children: React.ReactNode;
  className?: string;
}

export const AnimatedStep: React.FC<AnimatedStepProps> = ({ index, activeIndex, children, className }) => (
  <AnimatePresence mode="wait">
    {index === activeIndex && (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className={className}
        aria-live="polite"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export default AnimatedStep; 