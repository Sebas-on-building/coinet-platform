import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

export const BranchProtectionNotificationBadge = ({ enabled }: { enabled: boolean }) => (
  <span
    style={{
      background: enabled ? colors.success : colors.muted,
      color: colors.surface,
      borderRadius: 8,
      padding: '2px 8px',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      letterSpacing: 0.5,
    }}
  >
    {enabled ? 'Notifications On' : 'Notifications Off'}
  </span>
); 