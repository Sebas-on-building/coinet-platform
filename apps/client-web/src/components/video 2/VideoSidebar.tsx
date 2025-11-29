import React from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

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
      <div style={{ ...typography.h3, margin: `${spacing.lg}px 0 ${spacing.md}px` }}>Chapters</div>
      <div style={{ ...typography.body, marginBottom: spacing.xs }}>1. Introduction</div>
      <div style={{ ...typography.body, marginBottom: spacing.xs }}>2. Main Content</div>
      <div style={{ ...typography.body, marginBottom: spacing.xs }}>3. Q&A</div>
      <div style={{ ...typography.h3, margin: `${spacing.lg}px 0 ${spacing.md}px` }}>Resources</div>
      <div style={{ ...typography.body, marginBottom: spacing.xs }}>TradingView Chart</div>
      <div style={{ ...typography.body, marginBottom: spacing.xs }}>Solana Docs</div>
    </Card>
  );
};
export default VideoSidebar; 