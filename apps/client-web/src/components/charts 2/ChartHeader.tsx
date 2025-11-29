import React from 'react';

interface ChartHeaderProps {
  symbol?: string;
}

export const ChartHeader = ({ symbol }: ChartHeaderProps) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
    <div style={{ fontSize: 28, fontWeight: 700 }}>{symbol} Chart</div>
    <div>
      <button style={{ marginRight: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#0A84FF', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Add Alert</button>
      <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#30D158', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>Favorite</button>
    </div>
  </div>
); 