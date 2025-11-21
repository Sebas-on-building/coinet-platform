import React from 'react';

export const TokenContrastCheckDetailsWCAG: React.FC<{ wcag: string }> = ({ wcag }) => (
  <span style={{ color: wcag === 'AA' ? '#059669' : '#f59e42', fontWeight: 600 }}>WCAG: {wcag}</span>
  // TODO: Add animated transitions, accessibility, and extensibility for all sub-features
); 