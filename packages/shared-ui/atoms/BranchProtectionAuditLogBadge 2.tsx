import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

const iconMap = {
  created: '🟢',
  updated: '🟡',
  deleted: '🔴',
  'rule-applied': '🔒',
  'notification-sent': '📣',
};

export const BranchProtectionAuditLogBadge = ({ type }: { type: 'created' | 'updated' | 'deleted' | 'rule-applied' | 'notification-sent' }) => {
  const colorMap = {
    created: colors.success,
    updated: colors.warning,
    deleted: colors.error,
    'rule-applied': colors.accent,
    'notification-sent': colors.primary,
  };
  return (
    <span
      style={{
        background: colorMap[type],
        color: colors.surface,
        borderRadius: 8,
        padding: '2px 8px',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: 0.5,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span style={{ marginRight: 4 }}>{iconMap[type]}</span>
      {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
}; 