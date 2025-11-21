import React from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

const shimmer = {
  background: 'linear-gradient(90deg, #23272f 25%, #2c5364 50%, #23272f 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s infinite',
};

const ChartWidgetSkeleton: React.FC = () => {
  const { colors, radii, spacing, shadows } = useTheme();
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
      aria-label="Loading chart widget"
    >
      <div style={{ width: 80, height: 28, borderRadius: radii.md, ...shimmer, marginBottom: spacing.sm }} />
      <div style={{ width: '100%', height: 60, borderRadius: radii.md, ...shimmer, marginBottom: spacing.md }} />
      <div style={{ width: 60, height: 20, borderRadius: radii.sm, ...shimmer }} />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default ChartWidgetSkeleton; 