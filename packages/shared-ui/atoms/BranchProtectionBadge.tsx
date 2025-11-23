import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

export const BranchProtectionBadge = ({ level }: { level: 'none' | 'basic' | 'strict' | 'custom' }) => {
  const levelMap = {
    none: { color: colors.muted, label: 'Unprotected' },
    basic: { color: colors.warning, label: 'Basic' },
    strict: { color: colors.error, label: 'Strict' },
    custom: { color: colors.accent, label: 'Custom' },
  };
  const { color, label } = levelMap[level];
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