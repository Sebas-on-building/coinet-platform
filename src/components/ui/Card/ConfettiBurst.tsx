import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ConfettiBurstProps {
  trigger: boolean;
  color?: string;
  ariaLabel?: string;
  onComplete?: () => void;
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ trigger, color = 'var(--color-accent-blue)', ariaLabel = 'Confetti burst', onComplete }) => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (trigger) {
      setShow(true);
      setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1200);
    }
  }, [trigger, onComplete]);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'fixed',
              left: 0, top: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-live="polite"
            aria-label={ariaLabel}
          >
            {[...Array(24)].map((_, i) => (
              <motion.span
                key={i}
                initial={{
                  x: 0,
                  y: 0,
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  x: 120 * Math.cos((i / 24) * 2 * Math.PI),
                  y: 80 * Math.sin((i / 24) * 2 * Math.PI),
                  rotate: 360 * Math.random(),
                  opacity: 0,
                }}
                transition={{ duration: 1, delay: 0.1 * Math.random() }}
                style={{
                  position: 'absolute',
                  width: 12,
                  height: 12,
                  borderRadius: 4,
                  background: color,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  filter: 'blur(0.5px)',
                  opacity: 0.85,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <span style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} aria-live="polite">{show ? ariaLabel : ''}</span>
    </>
  );
}; 