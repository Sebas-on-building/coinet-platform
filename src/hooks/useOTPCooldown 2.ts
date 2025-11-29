import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useOTPCooldown - Atomic hook for OTP resend cooldown logic.
 * @param {number} initialCooldown - Cooldown duration in seconds.
 * @param {() => void} [onCooldownEnd] - Optional callback when cooldown ends.
 * @returns { cooldown: number, isCooldown: boolean, startCooldown: () => void, resetCooldown: () => void }
 */
export function useOTPCooldown(initialCooldown: number = 60, onCooldownEnd?: () => void) {
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const startCooldown = useCallback(() => {
    setCooldown(initialCooldown);
  }, [initialCooldown]);

  const resetCooldown = useCallback(() => {
    setCooldown(0);
    if (timer.current) clearInterval(timer.current);
  }, []);

  useEffect(() => {
    if (cooldown === 0 && timer.current) {
      clearInterval(timer.current);
      timer.current = null;
      if (onCooldownEnd) onCooldownEnd();
      return;
    }
    if (cooldown > 0 && !timer.current) {
      timer.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (timer.current) clearInterval(timer.current);
            timer.current = null;
            if (onCooldownEnd) onCooldownEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [cooldown, onCooldownEnd]);

  return {
    cooldown,
    isCooldown: cooldown > 0,
    startCooldown,
    resetCooldown,
  };
} 