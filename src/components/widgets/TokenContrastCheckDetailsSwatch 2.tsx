import React from 'react';

export const TokenContrastCheckDetailsSwatch: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ display: 'inline-block', width: 24, height: 24, borderRadius: 6, background: color, border: '1px solid #e5e7eb' }} aria-label={`Color swatch for ${color}`}></span>
  // TODO: Add animated transitions, accessibility, and extensibility for all sub-features
); 