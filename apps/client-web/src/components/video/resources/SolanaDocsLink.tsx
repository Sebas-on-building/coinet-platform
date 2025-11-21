import React from 'react';
import { useTheme } from '../../../../../../packages/shared-ui/themes/useTheme';

const SolanaDocsLink = () => {
  const { colors, typography, spacing } = useTheme();
  return (
    <a
      href="https://docs.solana.com/"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...typography.body,
        color: colors.primary,
        textDecoration: 'none',
        marginBottom: spacing.xs,
        display: 'block',
        fontWeight: 600,
      }}
    >
      Solana Documentation ↗
    </a>
  );
};
export default SolanaDocsLink; 