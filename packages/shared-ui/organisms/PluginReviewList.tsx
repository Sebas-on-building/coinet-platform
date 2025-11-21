import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginReview {
  rating: number;
  text: string;
  author: string;
  date: string;
}

export interface PluginReviewListProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginReviewList: React.FC<PluginReviewListProps> = ({ pluginId, theme = 'light' }) => {
  const [reviews, setReviews] = useState<PluginReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/plugins/reviews/${pluginId}`)
      .then(r => r.json())
      .then(setReviews)
      .catch(e => setError(e.message || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [pluginId]);

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading reviews…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (reviews.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No reviews yet.</div>;

  return (
    <div style={{ width: '100%' }}>
      {reviews.map((r, i) => (
        <div key={i} style={{
          borderBottom: `1px solid ${tokens.colors.border[theme]}`,
          padding: `${tokens.spacing.sm} 0`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            <span style={{ fontWeight: 600, color: tokens.colors.text[theme] }}>{r.author}</span>
            <span style={{ color: tokens.colors.textSecondary[theme], fontSize: tokens.typography.fontSize.xs }}>{new Date(r.date).toLocaleDateString()}</span>
            <span style={{ marginLeft: 'auto', color: tokens.colors.accent.blue[theme] }}>{'★'.repeat(r.rating)}</span>
          </div>
          <div style={{ color: tokens.colors.text[theme], marginTop: 2 }}>{r.text}</div>
        </div>
      ))}
    </div>
  );
}; 