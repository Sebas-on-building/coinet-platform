import React from 'react';

// <OverviewCard>: Atomic, presentational, stateless. Receives data via props only.
interface OverviewCardProps {
  data: any;
}

export const OverviewCard = ({ data }: OverviewCardProps) => {
  if (!data) return <div style={{ padding: 32, borderRadius: 16, background: '#F2F2F7', minHeight: 120 }}>Loading...</div>;
  return (
    <div style={{ padding: 32, borderRadius: 16, background: '#F2F2F7', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', marginBottom: 32 }}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Portfolio Overview</div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 18, color: '#888' }}>Balance</div>
          <div style={{ fontSize: 32, fontWeight: 600 }}>{data.balance} USD</div>
        </div>
        <div>
          <div style={{ fontSize: 18, color: '#888' }}>PnL</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: data.pnl >= 0 ? '#30D158' : '#FF453A' }}>{data.pnl} USD</div>
        </div>
      </div>
    </div>
  );
}; 