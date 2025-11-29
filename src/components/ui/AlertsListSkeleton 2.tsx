import React from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

const shimmer = {
  background: 'linear-gradient(90deg, #23272f 25%, #2c5364 50%, #23272f 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s infinite',
};

const AlertsListSkeleton: React.FC = () => {
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
      aria-label="Loading alerts list"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div style={{ width: 120, height: 28, borderRadius: radii.md, ...shimmer, marginBottom: spacing.sm }} />
        <div style={{ width: 100, height: 36, borderRadius: radii.md, ...shimmer }} />
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {[...Array(5)].map((_, i) => (
          <li key={i} style={{ marginBottom: spacing.sm }}>
            <div style={{ width: '100%', height: 32, borderRadius: radii.md, ...shimmer }} />
          </li>
        ))}
      </ul>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default AlertsListSkeleton; 