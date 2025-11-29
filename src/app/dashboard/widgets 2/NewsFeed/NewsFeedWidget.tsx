import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// News Feed Widget
// =========================
const NewsFeedWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const news = [
    { title: 'Bitcoin hits new all-time high', source: 'CoinDesk', time: '2h ago' },
    { title: 'Ethereum 2.0 launches', source: 'The Block', time: '4h ago' },
    { title: 'Solana ecosystem growth', source: 'Decrypt', time: '6h ago' },
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
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>News Feed</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {news.map((item, i) => (
          <li key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{item.title}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{item.source} • {item.time}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NewsFeedWidget; 