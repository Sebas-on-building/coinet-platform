import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';
import { Button } from '../../packages/shared-ui/atoms/Button';

const news = [
  { title: 'Bitcoin hits new all-time high', source: 'Coinet News', time: '2m ago' },
  { title: 'Ethereum ETF approved', source: 'Coinet News', time: '10m ago' },
  { title: 'Solana launches new DeFi protocol', source: 'Coinet News', time: '30m ago' },
];

const LatestNews: React.FC = () => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        boxShadow: shadows.md,
        padding: spacing.lg,
        minWidth: 320,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'box-shadow 0.2s',
      }}
      tabIndex={0}
      aria-label="Latest News"
    >
      <div style={{ ...typography.h3, color: colors.accent, marginBottom: spacing.sm }}>Latest News</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {news.map((item, i) => (
          <li key={i} style={{ marginBottom: spacing.sm }}>
            <div style={{ ...typography.body, color: colors.text }}>{item.title}</div>
            <div style={{ ...typography.caption, color: colors.textSecondary }}>{item.source} • {item.time}</div>
          </li>
        ))}
      </ul>
      <Button variant="ghost" fullWidth style={{ marginTop: spacing.md }}>See All News</Button>
    </div>
  );
};

export default LatestNews; 