import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginAuthorProps {
  author: string;
  maxLength?: number;
  theme?: 'light' | 'dark';
}

export const PluginAuthor: React.FC<PluginAuthorProps> = ({ author, maxLength = 24, theme = 'light' }) => {
  const displayAuthor = author.length > maxLength ? author.slice(0, maxLength - 1) + '…' : author;
  return (
    <span
      style={{
        fontWeight: 400,
        fontSize: tokens.typography.fontSize.sm,
        color: tokens.colors.textSecondary[theme],
        letterSpacing: 0.01,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 120,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      title={author.length > maxLength ? author : undefined}
      aria-label={`Plugin author: ${author}`}
    >
      {displayAuthor}
    </span>
  );
}; 