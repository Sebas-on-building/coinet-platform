import React from 'react';
import { useDashboardTheme } from '../../DashboardThemeProvider';
// =========================
// Social Feed Widget
// =========================
const SocialFeedWidget: React.FC<{ config?: any }> = ({ config }) => {
  const { theme } = useDashboardTheme();
  // Placeholder data
  const posts = [
    { user: 'Alice', content: 'Bullish on BTC!', time: '1h ago' },
    { user: 'Bob', content: 'ETH to the moon 🚀', time: '2h ago' },
    { user: 'Carol', content: 'SOL is underrated.', time: '3h ago' },
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
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Social Feed</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {posts.map((post, i) => (
          <li key={i} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{post.user}</div>
            <div style={{ margin: '4px 0' }}>{post.content}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{post.time}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SocialFeedWidget; 