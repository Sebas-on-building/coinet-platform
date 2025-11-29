import React from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
const Chart = ({ title }: { title: string }) => <div style={{ height: 120, background: '#e0e7ff', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', fontWeight: 700 }}>{title}</div>;

const StrategyBacktest = () => {
  const { colors, spacing, radii, typography, shadows } = useTheme();
  return (
    <Card style={{ borderRadius: radii.lg, boxShadow: shadows.md, padding: spacing.lg, minWidth: 400 }}>
      <div style={{ ...typography.h3, marginBottom: spacing.md }}>Backtest Results</div>
      <Chart title="Equity Curve" />
      <Chart title="Drawdown" />
      <div style={{ ...typography.body, marginTop: spacing.md }}>Logs: No errors found.</div>
    </Card>
  );
};
export default StrategyBacktest; 