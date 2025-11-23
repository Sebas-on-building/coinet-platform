import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';
import { Button } from '../../packages/shared-ui/atoms/Button';

interface Alert {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface AlertsListProps {
  alerts: Alert[];
}

const AlertsList: React.FC<AlertsListProps> = ({ alerts }) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        boxShadow: shadows.md,
        padding: spacing.lg,
        minWidth: 480,
        minHeight: 240,
        transition: 'box-shadow 0.2s',
      }}
      tabIndex={0}
      aria-label="Alerts List"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div style={{ ...typography.h3, color: colors.warning }}>Alerts</div>
        <Button variant="ghost">Mark All as Read</Button>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {alerts.map((alert) => (
          <li key={alert.id} style={{
            marginBottom: spacing.sm,
            background: alert.read ? 'transparent' : colors.background,
            borderRadius: radii.md,
            padding: spacing.sm,
            boxShadow: alert.read ? 'none' : shadows.sm,
            color: alert.read ? colors.textSecondary : colors.text,
            ...typography.body,
          }}>
            <strong style={{ color: colors.accent }}>{alert.type.toUpperCase()}</strong>: {alert.message}
            <span style={{ float: 'right', ...typography.caption, color: colors.textSecondary }}>{new Date(alert.createdAt).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AlertsList; 