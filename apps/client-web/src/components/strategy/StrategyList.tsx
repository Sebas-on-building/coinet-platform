import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const strategies = [
  { id: 1, name: 'AlphaBot v2', status: 'active', performance: '+32%' },
  { id: 2, name: 'BetaTrader', status: 'draft', performance: '+12%' },
  { id: 3, name: 'GammaEdge', status: 'archived', performance: '-5%' },
];

const StrategyList = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {strategies.map((s) => (
        <Card key={s.id} style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...typography.body, fontWeight: 600 }}>{s.name}</div>
            <div style={{ ...typography.caption, color: colors.textSecondary }}>{s.performance}</div>
          </div>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <span style={{ color: s.status === 'active' ? colors.success : s.status === 'draft' ? colors.warning : colors.textSecondary, fontWeight: 700 }}>{s.status}</span>
            <Button variant="secondary" size="sm">Edit</Button>
            <Button variant="primary" size="sm">Backtest</Button>
            <Button variant="ghost" size="sm">Share</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
export default StrategyList; 