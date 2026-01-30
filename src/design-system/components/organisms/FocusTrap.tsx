"use client";

import React, { useRef, useEffect } from 'react';

export interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active = true, className, style }) => {
  const trapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !trapRef.current) return;
    const node = trapRef.current;
    const focusable = node.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return (
    <div ref={trapRef} className={className} style={style} tabIndex={-1}>
      {children}
    </div>
  );
}; 