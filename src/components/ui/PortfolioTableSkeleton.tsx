import React from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

const shimmer = {
  background: 'linear-gradient(90deg, #23272f 25%, #2c5364 50%, #23272f 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s infinite',
};

const PortfolioTableSkeleton: React.FC = () => {
  const { colors, radii, spacing, shadows } = useTheme();
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
      aria-label="Loading portfolio table"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div style={{ width: 120, height: 28, borderRadius: radii.md, ...shimmer, marginBottom: spacing.sm }} />
        <div style={{ width: 100, height: 36, borderRadius: radii.md, ...shimmer }} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th><div style={{ width: 60, height: 16, borderRadius: radii.sm, ...shimmer }} /></th>
            <th><div style={{ width: 60, height: 16, borderRadius: radii.sm, ...shimmer }} /></th>
            <th><div style={{ width: 60, height: 16, borderRadius: radii.sm, ...shimmer }} /></th>
          </tr>
        </thead>
        <tbody>
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              <td><div style={{ width: 60, height: 18, borderRadius: radii.sm, ...shimmer, margin: '8px 0' }} /></td>
              <td><div style={{ width: 60, height: 18, borderRadius: radii.sm, ...shimmer, margin: '8px 0' }} /></td>
              <td><div style={{ width: 60, height: 18, borderRadius: radii.sm, ...shimmer, margin: '8px 0' }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default PortfolioTableSkeleton; 