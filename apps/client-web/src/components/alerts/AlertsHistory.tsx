import React from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const history = [
  { id: 1, date: '2024-06-01', asset: 'BTC', action: 'Triggered' },
  { id: 2, date: '2024-06-02', asset: 'ETH', action: 'Muted' },
  { id: 3, date: '2024-06-03', asset: 'SOL', action: 'Triggered' },
];

const AlertsHistory = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 400 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Alert History</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: colors.textSecondary, ...typography.caption }}>
            <th align="left">Date</th>
            <th align="left">Asset</th>
            <th align="left">Action</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <td style={{ padding: `${spacing.xs}px 0`, ...typography.body }}>{h.date}</td>
              <td style={{ padding: `${spacing.xs}px 0`, ...typography.body }}>{h.asset}</td>
              <td style={{ padding: `${spacing.xs}px 0`, ...typography.body }}>{h.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default AlertsHistory; 