import React, { useState, useRef } from 'react';

export const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => { timeout.current = setTimeout(() => setVisible(true), 200); }}
      onMouseLeave={() => { if (timeout.current) clearTimeout(timeout.current); setVisible(false); }}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-describedby="tooltip"
    >
      {children}
      {visible && (
        <span
          id="tooltip"
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded bg-slate-800 text-white text-xs shadow-lg animate-fade-in"
        >
          {content}
        </span>
      )}
    </span>
  );
}; 