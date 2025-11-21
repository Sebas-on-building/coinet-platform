import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const StrategyOverview = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <div style={{ display: 'flex', gap: spacing.lg }}>
      <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 200 }}>
        <div style={{ ...typography.h3 }}>Total Strategies</div>
        <div style={{ ...typography.display, color: colors.primary }}>12</div>
        <Button variant="primary" style={{ marginTop: spacing.md }}>Create New</Button>
      </Card>
      <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 200 }}>
        <div style={{ ...typography.h3 }}>Best Performer</div>
        <div style={{ ...typography.body }}>AlphaBot v2</div>
        <Button variant="secondary" style={{ marginTop: spacing.md }}>View</Button>
      </Card>
    </div>
  );
};
export default StrategyOverview; 