import { useEffect, useState } from 'react';

/**
 * useMotionPreference - Detects user's reduced motion preference for accessibility.
 * @returns {boolean} - True if user prefers reduced motion.
 */
export function useMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reducedMotion;
} 