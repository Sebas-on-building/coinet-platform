/**
 * Atomic CardRipple for Coinet Card system
 * Ripple/tap/press feedback for clickable cards
 * Uses design tokens, ARIA, and motion preference
 */
import React, { useRef, useState } from 'react';

export interface CardRippleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const CardRipple: React.FC<CardRippleProps> = ({ children, className, style }) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; key: number }[]>([]);
  const rippleCount = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = (e: React.MouseEvent) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipples(ripples => [...ripples, { x, y, key: rippleCount.current++ }]);
    setTimeout(() => setRipples(ripples => ripples.slice(1)), 500);
  };

  return (
    <div
      ref={containerRef}
      className={['co-card-ripple', className].filter(Boolean).join(' ')}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      onMouseDown={createRipple}
      aria-label="Card ripple"
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.key}
          className="co-card-ripple-effect"
          style={{
            position: 'absolute',
            left: ripple.x - 24,
            top: ripple.y - 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--color-accent-blue, #3b82f6)',
            opacity: 0.18,
            pointerEvents: 'none',
            animation: 'co-card-ripple 0.5s linear',
          }}
        />
      ))}
      <style>{`
        @keyframes co-card-ripple {
          0% { transform: scale(0); opacity: 0.18; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}; 