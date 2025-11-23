import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// Market Overview Widget
// =========================
const MarketOverviewWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const data = [
    { symbol: 'BTC', price: 67000, change: 2.1 },
    { symbol: 'ETH', price: 3200, change: -1.2 },
    { symbol: 'SOL', price: 150, change: 4.5 },
  ];
  return (
    <div style={{
      background: 'var(--widgetarea-bg)',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: 24,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Market Overview</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#888', fontSize: 14 }}>
            <th>Symbol</th>
            <th>Price</th>
            <th>24h Change</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.symbol} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 0', fontWeight: 600 }}>{row.symbol}</td>
              <td style={{ padding: '8px 0' }}>${row.price.toLocaleString()}</td>
              <td style={{ padding: '8px 0', color: row.change > 0 ? '#34C759' : '#FF3B30', fontWeight: 500 }}>
                {row.change > 0 ? '+' : ''}{row.change}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MarketOverviewWidget; 