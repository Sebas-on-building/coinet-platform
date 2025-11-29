import React, { useRef, useEffect } from 'react';

export const FocusTrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const trapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = trapRef.current;
    if (!node) return;
    const focusable = node.querySelectorAll<HTMLElement>(
      'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, []);
  return (
    <div ref={trapRef} tabIndex={-1} className="outline-none">
      {children}
    </div>
  );
}; 