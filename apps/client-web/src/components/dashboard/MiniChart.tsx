import React from 'react';

// <MiniChart>: Atomic, presentational, stateless. Receives data via props only.
interface MiniChartProps {
  data: number[];
}

export const MiniChart = ({ data }: MiniChartProps) => {
  if (!data || data.length === 0) return <div style={{ height: 80, background: '#F2F2F7', borderRadius: 12 }}>Loading...</div>;
  const width = 320;
  const height = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / (max - min || 1)) * height}`).join(' ');
  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: 16, marginTop: 24 }}>
      <svg width={width} height={height} style={{ display: 'block', width: '100%' }}>
        <polyline fill="none" stroke="#0A84FF" strokeWidth={3} points={points} />
      </svg>
    </div>
  );
}; 