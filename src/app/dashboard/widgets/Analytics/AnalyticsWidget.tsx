import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// Analytics/Backtesting Widget
// =========================
const AnalyticsWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const results = [
    { strategy: 'Momentum', return: 12.5, sharpe: 1.2 },
    { strategy: 'Mean Reversion', return: 8.3, sharpe: 0.9 },
    { strategy: 'Arbitrage', return: 5.1, sharpe: 0.7 },
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
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Analytics / Backtesting</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#888', fontSize: 14 }}>
            <th>Strategy</th>
            <th>Return (%)</th>
            <th>Sharpe Ratio</th>
          </tr>
        </thead>
        <tbody>
          {results.map(row => (
            <tr key={row.strategy} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 0', fontWeight: 600 }}>{row.strategy}</td>
              <td style={{ padding: '8px 0' }}>{row.return}%</td>
              <td style={{ padding: '8px 0' }}>{row.sharpe}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AnalyticsWidget; 