import React from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const AlertsOverview = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  // Example data
  const summary = [
    { label: 'Active Alerts', value: 8, color: colors.primary },
    { label: 'Triggered', value: 3, color: colors.success },
    { label: 'Muted', value: 2, color: colors.warning },
  ];
  return (
    <div style={{ display: 'flex', gap: spacing.lg }}>
      {summary.map((item) => (
        <Card key={item.label} style={{ background: item.color, color: colors.surface, borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 160 }}>
          <div style={{ ...typography.h3 }}>{item.value}</div>
          <div style={{ ...typography.body }}>{item.label}</div>
        </Card>
      ))}
    </div>
  );
};

export default AlertsOverview; 