import React from 'react';
import { colors } from '../../../packages/design-tokens/tokens/colors';
import { typography } from '../../../packages/design-tokens/tokens/typography';

export const BranchActionButton = ({
  action, onClick, disabled = false
}: {
  action: 'merge' | 'delete' | 'protect' | 'create' | string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    style={{
      background: colors.primary,
      color: colors.surface,
      borderRadius: 8,
      padding: '6px 16px',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: 'none',
      transition: 'background 0.2s',
    }}
    onClick={onClick}
    disabled={disabled}
  >
    {action.charAt(0).toUpperCase() + action.slice(1)}
  </button>
); 