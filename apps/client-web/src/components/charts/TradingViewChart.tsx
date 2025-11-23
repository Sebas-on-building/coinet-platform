import React from 'react';

interface TradingViewChartProps {
  data: any;
}

export const TradingViewChart = ({ data }: TradingViewChartProps) => (
  <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    {/* TODO: Integrate real TradingView widget */}
    <span style={{ color: '#888', fontSize: 18 }}>TradingView Chart Placeholder</span>
  </div>
); 