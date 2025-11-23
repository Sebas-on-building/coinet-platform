import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

export const BranchStatusBadge = ({ status }: { status: 'active' | 'merged' | 'stale' | 'protected' }) => {
  const statusMap = {
    active: { color: colors.primary, label: 'Active' },
    merged: { color: colors.success, label: 'Merged' },
    stale: { color: colors.warning, label: 'Stale' },
    protected: { color: colors.accent, label: 'Protected' },
  };
  const { color, label } = statusMap[status];
  return (
    <span
      style={{
        background: color,
        color: colors.surface,
        borderRadius: 8,
        padding: '2px 8px',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: 0.5,
      }}
    >
      {label}
    </span>
  );
}; 