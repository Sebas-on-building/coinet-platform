import React from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../atoms/Button';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';

const publicStrategies = [
  { id: 1, name: 'MomentumX', author: 'TraderJoe' },
  { id: 2, name: 'MeanRevert', author: 'AlgoQueen' },
];

const StrategyMarketplace = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
      {publicStrategies.map((s) => (
        <Card key={s.id} style={{ borderRadius: radii.md, boxShadow: shadows.sm, padding: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...typography.body, fontWeight: 600 }}>{s.name}</div>
            <div style={{ ...typography.caption, color: colors.textSecondary }}>by {s.author}</div>
          </div>
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button variant="primary" size="sm">Import</Button>
            <Button variant="secondary" size="sm">Fork</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
export default StrategyMarketplace; 