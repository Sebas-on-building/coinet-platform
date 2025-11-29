import React from 'react';
import { useTheme } from '../../../packages/shared-ui/themes/useTheme';

const shimmer = {
  background: 'linear-gradient(90deg, #23272f 25%, #2c5364 50%, #23272f 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s infinite',
};

const SettingsSkeleton: React.FC = () => {
  const { colors, radii, spacing, shadows } = useTheme();
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: radii.lg,
        boxShadow: shadows.md,
        padding: spacing.lg,
        maxWidth: 480,
        margin: '40px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
      }}
      aria-label="Loading settings form"
    >
      <div style={{ width: 120, height: 28, borderRadius: radii.md, ...shimmer, marginBottom: spacing.sm }} />
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ width: '100%', height: 36, borderRadius: radii.md, ...shimmer }} />
      ))}
      <div style={{ width: 160, height: 40, borderRadius: radii.md, ...shimmer, marginTop: spacing.md }} />
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default SettingsSkeleton; 