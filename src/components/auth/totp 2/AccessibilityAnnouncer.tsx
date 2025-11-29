import React, { useEffect, useRef } from 'react';

interface AccessibilityAnnouncerProps {
  message: string;
  mode?: 'polite' | 'assertive';
}

export const AccessibilityAnnouncer: React.FC<AccessibilityAnnouncerProps> = ({ message, mode = 'polite' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = '';
      setTimeout(() => {
        if (ref.current) ref.current.textContent = message;
      }, 50);
    }
  }, [message]);
  return (
    <div
      ref={ref}
      aria-live={mode}
      aria-atomic="true"
      className="sr-only"
      role="status"
    />
  );
};

export default AccessibilityAnnouncer; 