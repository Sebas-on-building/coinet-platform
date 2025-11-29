import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';
import { Button } from '../../packages/shared-ui/atoms/Button';

interface PortfolioTableProps {
  assets: { symbol: string; amount: number }[];
}

const PortfolioTable: React.FC<PortfolioTableProps> = ({ assets }) => {
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
      aria-label="Portfolio Table"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div style={{ ...typography.h3, color: colors.primary }}>Portfolio</div>
        <Button variant="accent">Add Asset</Button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: colors.textSecondary, ...typography.caption }}>
            <th align="left">Symbol</th>
            <th align="right">Amount</th>
            <th align="right">Value</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a, i) => (
            <tr key={a.symbol} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <td style={{ padding: `${spacing.xs}px 0`, ...typography.body }}>{a.symbol}</td>
              <td style={{ padding: `${spacing.xs}px 0`, textAlign: 'right', ...typography.body }}>{a.amount}</td>
              <td style={{ padding: `${spacing.xs}px 0`, textAlign: 'right', ...typography.body }}>${(a.amount * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PortfolioTable; 