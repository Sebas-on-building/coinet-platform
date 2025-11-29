import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// Sentiment Widget
// =========================
const SentimentWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const sentiment = [
    { symbol: 'BTC', score: 0.8 },
    { symbol: 'ETH', score: 0.6 },
    { symbol: 'SOL', score: 0.9 },
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
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Sentiment</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#888', fontSize: 14 }}>
            <th>Asset</th>
            <th>Sentiment</th>
          </tr>
        </thead>
        <tbody>
          {sentiment.map(row => (
            <tr key={row.symbol} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 0', fontWeight: 600 }}>{row.symbol}</td>
              <td style={{ padding: '8px 0' }}>{(row.score * 100).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SentimentWidget; 