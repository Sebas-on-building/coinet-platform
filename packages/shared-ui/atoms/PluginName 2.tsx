import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginNameProps {
  name: string;
  maxLength?: number;
  theme?: 'light' | 'dark';
}

export const PluginName: React.FC<PluginNameProps> = ({ name, maxLength = 32, theme = 'light' }) => {
  const displayName = name.length > maxLength ? name.slice(0, maxLength - 1) + '…' : name;
  return (
    <span
      style={{
        fontWeight: 700,
        fontSize: tokens.typography.fontSize.lg,
        color: tokens.colors.text[theme],
        letterSpacing: 0.01,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 180,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      title={name.length > maxLength ? name : undefined}
      aria-label={name}
    >
      {displayName}
    </span>
  );
}; 