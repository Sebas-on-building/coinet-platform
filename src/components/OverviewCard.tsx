import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';
import { Button } from '../../packages/shared-ui/atoms/Button';

interface OverviewCardProps {
  assets: { symbol: string; amount: number }[];
}

const OverviewCard: React.FC<OverviewCardProps> = ({ assets }) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const totalAssets = assets.length;
  // Stub: total value calculation
  const totalValue = assets.reduce((sum, a) => sum + a.amount * 1000, 0);
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        boxShadow: shadows.lg,
        padding: spacing.lg,
        minWidth: 320,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'box-shadow 0.2s',
      }}
      tabIndex={0}
      aria-label="Portfolio Overview"
    >
      <div style={{ marginBottom: spacing.md }}>
        <div style={{ ...typography.h2, color: colors.primary }}>Portfolio Overview</div>
        <div style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.xs }}>
          {totalAssets} assets
        </div>
      </div>
      <div style={{ ...typography.h1, color: colors.text, marginBottom: spacing.md }}>
        ${totalValue.toLocaleString()}
      </div>
      <Button variant="primary" fullWidth>View Portfolio</Button>
    </div>
  );
};

export default OverviewCard; 