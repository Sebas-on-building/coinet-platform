import React from 'react';

export const TokenContrastCheckDetailsContrast: React.FC<{ contrast: number }> = ({ contrast }) => (
  <span style={{ color: '#64748b', fontSize: 13 }}>Contrast: {contrast.toFixed(2)}</span>
  // TODO: Add animated transitions, accessibility, and extensibility for all sub-features
); 