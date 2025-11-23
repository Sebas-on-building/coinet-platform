import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
import ChapterList from '../chapters/ChapterList';
import ResourcesPanel from '../resources/ResourcesPanel';

const relatedVideos = [
  { id: 1, title: 'BTC Price Action', duration: '12:34' },
  { id: 2, title: 'ETH Fundamentals', duration: '8:21' },
];

const VideoSidebar = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 240 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Related Videos</div>
      {relatedVideos.map(v => (
        <div key={v.id} style={{ ...typography.body, marginBottom: spacing.xs }}>
          {v.title} <span style={{ color: colors.textSecondary }}>({v.duration})</span>
        </div>
      ))}
      <ChapterList />
      <ResourcesPanel />
    </Card>
  );
};
export default VideoSidebar; 