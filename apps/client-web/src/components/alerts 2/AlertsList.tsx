import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const alerts = [
  { id: 1, asset: 'BTC', status: 'active', condition: 'Price > $50,000' },
  { id: 2, asset: 'ETH', status: 'triggered', condition: 'Price < $2,000' },
  { id: 3, asset: 'SOL', status: 'muted', condition: 'Volume > 1M' },
];

const AlertsList = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {alerts.map((alert) => (
        <Card key={alert.id} style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...typography.body, fontWeight: 600 }}>{alert.asset}</div>
            <div style={{ ...typography.caption, color: colors.textSecondary }}>{alert.condition}</div>
          </div>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <span style={{ color: alert.status === 'active' ? colors.success : alert.status === 'triggered' ? colors.error : colors.warning, fontWeight: 700 }}>{alert.status}</span>
            <Button variant="secondary" size="sm">Edit</Button>
            <Button variant="error" size="sm">Delete</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default AlertsList; 