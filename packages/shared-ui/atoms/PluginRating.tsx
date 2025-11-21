import React from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginRatingProps {
  rating: number; // 0-5, can be half
  count?: number;
  theme?: 'light' | 'dark';
}

export const PluginRating: React.FC<PluginRatingProps> = ({ rating, count, theme = 'light' }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = rating >= i + 1 ? 1 : rating > i ? 0.5 : 0;
    return (
      <span
        key={i}
        style={{
          color: filled === 1 ? tokens.colors.accent.blue[theme] : tokens.colors.border[theme],
          fontSize: tokens.typography.fontSize.lg,
          transition: `color ${tokens.motion.duration.short}`,
          marginRight: 2,
        }}
        aria-hidden="true"
      >
        {filled === 1 ? '★' : filled === 0.5 ? '⯨' : '☆'}
      </span>
    );
  });
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
      }}
      title={`${rating} out of 5${count ? ` (${count} reviews)` : ''}`}
      aria-label={`Rated ${rating} out of 5${count ? `, ${count} reviews` : ''}`}
    >
      {stars}
      {count !== undefined && (
        <span style={{
          fontSize: tokens.typography.fontSize.sm,
          color: tokens.colors.textSecondary[theme],
          marginLeft: 4,
        }}>({count})</span>
      )}
    </span>
  );
}; 