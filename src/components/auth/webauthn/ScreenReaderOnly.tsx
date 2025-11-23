import React from 'react';

export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="sr-only" aria-live="polite">{children}</span>
); 