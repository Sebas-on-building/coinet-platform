import React from 'react';
import { Card } from '../../../../../../src/components/ui/Card/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
const Chart = ({ title }: { title: string }) => <div style={{ height: 120, background: '#e0e7ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700 }}>{title}</div>;

const VideoAnalytics = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 400 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Video Analytics</div>
      <Chart title="Views Over Time" />
      <Chart title="Engagement" />
      <Chart title="Retention" />
    </Card>
  );
};
export default VideoAnalytics; 