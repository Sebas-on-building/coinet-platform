import React from 'react';
import { useTheme } from '../../packages/shared-ui/themes/useTheme';

interface MiniChartProps {
  chart: { symbol: string } | null;
}

const MiniChart: React.FC<MiniChartProps> = ({ chart }) => {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        boxShadow: shadows.md,
        padding: spacing.lg,
        minWidth: 320,
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'box-shadow 0.2s',
      }}
      tabIndex={0}
      aria-label={`Mini chart for ${chart?.symbol || 'N/A'}`}
    >
      <div style={{ ...typography.h3, color: colors.info, marginBottom: spacing.sm }}>
        {chart?.symbol || 'No Symbol'}
      </div>
      <div style={{ width: '100%', height: 60, background: colors.background, borderRadius: radii.md, marginBottom: spacing.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Stub SVG chart */}
        <svg width="100%" height="60" viewBox="0 0 120 60">
          <polyline points="0,50 20,40 40,30 60,35 80,20 100,25 120,10" fill="none" stroke={colors.primary} strokeWidth="3" />
        </svg>
      </div>
      <div style={{ ...typography.body, color: colors.success }}>+5.2% today</div>
    </div>
  );
};

export default MiniChart; 