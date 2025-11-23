import React from 'react';
import tokens from 'src/design-system/tokens';

export type PluginSecurityStatus = 'safe' | 'warning' | 'critical';

export interface PluginSecurityBadgeProps {
  status: PluginSecurityStatus;
  details?: string;
}

const statusMap = {
  safe: {
    color: tokens.colors.success,
    icon: '🛡️',
    label: 'Safe',
  },
  warning: {
    color: tokens.colors.warning,
    icon: '⚠️',
    label: 'Warning',
  },
  critical: {
    color: tokens.colors.danger,
    icon: '⛔',
    label: 'Critical',
  },
};

export const PluginSecurityBadge: React.FC<PluginSecurityBadgeProps> = ({ status, details }) => (
  <span
    style={{
      background: statusMap[status].color + '22',
      color: statusMap[status].color,
      borderRadius: tokens.radius.xs,
      padding: `0 ${tokens.spacing.xs}`,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: 600,
      marginLeft: 8,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      lineHeight: 1.4,
    }}
    title={details || statusMap[status].label}
    aria-label={`Security status: ${statusMap[status].label}${details ? `, ${details}` : ''}`}
  >
    <span style={{ marginRight: 2 }}>{statusMap[status].icon}</span>
    {statusMap[status].label}
  </span>
); 