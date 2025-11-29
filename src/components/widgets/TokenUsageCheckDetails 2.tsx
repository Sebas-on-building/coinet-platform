import React from 'react';

export const TokenUsageCheckDetails: React.FC<{ name: string; used: boolean }> = ({ name, used }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
    <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{name}</span>
    <span style={{ color: used ? '#059669' : '#ef4444', fontWeight: 600 }}>{used ? 'Pass' : 'Fail'}</span>
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </div>
); 