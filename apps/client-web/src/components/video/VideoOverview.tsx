import React from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { useTheme } from '@/../packages/shared-ui/themes/useTheme';

const VideoOverview = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <div style={{ display: 'flex', gap: spacing.lg }}>
      <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 200 }}>
        <div style={{ ...typography.h3 }}>Recent Videos</div>
        <Button variant="primary" style={{ marginTop: spacing.md }}>Upload</Button>
      </Card>
      <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 200 }}>
        <div style={{ ...typography.h3 }}>Top Performer</div>
        <div style={{ ...typography.body }}>How to Trade BTC</div>
        <Button variant="secondary" style={{ marginTop: spacing.md }}>Watch</Button>
      </Card>
    </div>
  );
};
export default VideoOverview; 