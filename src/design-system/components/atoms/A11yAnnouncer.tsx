import React, { useEffect, useRef } from 'react';

export interface A11yAnnouncerProps {
  message: string;
  mode?: 'polite' | 'assertive';
  theme?: 'light' | 'dark';
}

export const A11yAnnouncer: React.FC<A11yAnnouncerProps> = ({ message, mode = 'polite', theme = 'light' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = '';
      setTimeout(() => {
        if (ref.current) ref.current.textContent = message;
      }, 100);
    }
  }, [message]);
  return (
    <div
      ref={ref}
      className={`co-a11y-announcer co-a11y-announcer-${theme}`}
      aria-live={mode}
      aria-atomic="true"
      style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }}
    />
  );
}; 