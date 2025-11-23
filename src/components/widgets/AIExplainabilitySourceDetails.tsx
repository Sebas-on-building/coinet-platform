import React from 'react';

export const AIExplainabilitySourceDetails: React.FC<{ type: string; description: string }> = ({ type, description }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
    <span style={{ fontWeight: 600 }}>{type}</span>
    <span style={{ color: '#64748b', fontSize: 13 }}>{description}</span>
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </div>
); 