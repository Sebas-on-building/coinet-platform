import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

export const BranchProtectionRuleTemplateBadge = ({ type }: { type: 'review' | 'status-check' | 'commit-lint' | 'custom' }) => {
  const typeMap = {
    review: { color: colors.primary, label: 'Required Review' },
    'status-check': { color: colors.success, label: 'Status Checks' },
    'commit-lint': { color: colors.warning, label: 'Commit Linting' },
    custom: { color: colors.accent, label: 'Custom Rule' },
  };
  const { color, label } = typeMap[type];
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