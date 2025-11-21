import React from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
// Placeholder for Chart component
const Chart = ({ title }: { title: string }) => <div style={{ height: 120, background: '#e0e7ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700 }}>{title}</div>;

const AlertsAnalytics = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 400 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Alert Analytics</div>
      <Chart title="Most Triggered Alerts" />
      <Chart title="Average Response Time" />
    </Card>
  );
};

export default AlertsAnalytics; 