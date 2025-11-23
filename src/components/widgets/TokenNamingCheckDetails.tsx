import React from 'react';

export const TokenNamingCheckDetails: React.FC<{ name: string; pass: boolean }> = ({ name, pass }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
    <span style={{ fontFamily: 'monospace', fontSize: 14 }}>{name}</span>
    <span style={{ color: pass ? '#059669' : '#f59e42', fontWeight: 600 }}>{pass ? 'Pass' : 'Warn'}</span>
    {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
  </div>
); 