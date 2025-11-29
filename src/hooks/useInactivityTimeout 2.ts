import { useEffect, useRef } from 'react';

export function useInactivityTimeout(onTimeout: () => void, timeoutMs: number = 15 * 60 * 1000) {
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(onTimeout, timeoutMs);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [onTimeout, timeoutMs]);
} 