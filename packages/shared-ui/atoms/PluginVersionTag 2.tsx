import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginVersionTagProps {
  version: string;
}

export const PluginVersionTag: React.FC<PluginVersionTagProps> = ({ version }) => (
  <span
    style={{
      background: tokens.colors.surfaceAlt,
      color: tokens.colors.textSubtle,
      borderRadius: tokens.radius.xs,
      padding: `0 ${tokens.spacing.xs}`,
      fontSize: tokens.typography.fontSize.xs,
      fontWeight: 500,
      marginLeft: 8,
      letterSpacing: 0.01,
      verticalAlign: 'middle',
      display: 'inline-block',
      lineHeight: 1.4,
    }}
    title={`Version: ${version}`}
    aria-label={`Plugin version: ${version}`}
  >
    v{version}
  </span>
); 