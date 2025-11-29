import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const recentVideos = [
  { id: 1, title: 'BTC Scalping Masterclass', thumbnail: 'https://placehold.co/120x80/png' },
  { id: 2, title: 'ETH Options Deep Dive', thumbnail: 'https://placehold.co/120x80/png' },
];

const RecentVideos = () => {
  const { spacing, radii, shadows, typography } = useTheme();
  return (
    <Card style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, minWidth: 180 }}>
      <div style={{ ...typography.h4, marginBottom: spacing.sm }}>Recent Videos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {recentVideos.map(v => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <img src={v.thumbnail} alt={v.title} style={{ borderRadius: radii.sm, width: 48, height: 32, objectFit: 'cover' }} />
            <span style={{ ...typography.body }}>{v.title}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
export default RecentVideos; 