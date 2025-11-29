import React from 'react';

export const PortfolioHeader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
    <div style={{ fontSize: 28, fontWeight: 700 }}>Portfolio</div>
    <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0A84FF', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Add Asset</button>
  </div>
); 