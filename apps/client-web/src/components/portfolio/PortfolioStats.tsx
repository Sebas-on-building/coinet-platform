import React from 'react';

interface PortfolioStatsProps {
  data: any;
}

export const PortfolioStats = ({ data }: PortfolioStatsProps) => {
  if (!data) return <div style={{ padding: 32, borderRadius: 16, background: '#F2F2F7', minHeight: 80 }}>Loading...</div>;
  return (
    <div style={{ padding: 32, borderRadius: 16, background: '#F2F2F7', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Portfolio Stats</div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 18, color: '#888' }}>Total Value</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{data.totalValue} USD</div>
        </div>
        <div>
          <div style={{ fontSize: 18, color: '#888' }}>Gain/Loss</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: data.gainLoss >= 0 ? '#30D158' : '#FF453A' }}>{data.gainLoss} USD</div>
        </div>
      </div>
    </div>
  );
}; 