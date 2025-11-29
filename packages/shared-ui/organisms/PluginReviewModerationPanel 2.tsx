import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginReviewModerationPanelProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginReviewModerationPanel: React.FC<PluginReviewModerationPanelProps> = ({ pluginId, theme = 'light' }) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'flagged'>('pending');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/plugins/reviews/${pluginId}?status=${filter}`)
      .then(r => r.json())
      .then(setReviews)
      .catch(e => setError(e.message || 'Failed to load reviews'))
      .finally(() => setLoading(false));
  }, [pluginId, filter]);

  const moderate = async (id: string, status: 'approved' | 'rejected') => {
    await fetch(`/api/plugins/reviews/${pluginId}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user': 'moderator' },
      body: JSON.stringify({ id, status }),
    });
    setReviews(reviews => reviews.filter(r => r.id !== id));
  };

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading reviews…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (reviews.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No reviews to moderate.</div>;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: tokens.spacing.sm }}>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: tokens.spacing.xs, borderRadius: tokens.radius.sm }}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>
      {reviews.map((r, i) => (
        <div key={r.id || i} style={{ borderBottom: `1px solid ${tokens.colors.border[theme]}`, padding: `${tokens.spacing.sm} 0` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
            <span style={{ fontWeight: 600, color: tokens.colors.text[theme] }}>{r.author}</span>
            <span style={{ color: tokens.colors.textSecondary[theme], fontSize: tokens.typography.fontSize.xs }}>{new Date(r.date).toLocaleDateString()}</span>
            <span style={{ marginLeft: 'auto', color: tokens.colors.accent.blue[theme] }}>{'★'.repeat(r.rating)}</span>
          </div>
          <div style={{ color: tokens.colors.text[theme], marginTop: 2 }}>{r.text}</div>
          <div style={{ marginTop: tokens.spacing.xs, display: 'flex', gap: tokens.spacing.xs }}>
            <button onClick={() => moderate(r.id, 'approved')} style={{ background: tokens.colors.success[theme], color: tokens.colors.text[theme], border: 'none', borderRadius: tokens.radius.xs, padding: tokens.spacing.xs, cursor: 'pointer' }}>Approve</button>
            <button onClick={() => moderate(r.id, 'rejected')} style={{ background: tokens.colors.error[theme], color: tokens.colors.text[theme], border: 'none', borderRadius: tokens.radius.xs, padding: tokens.spacing.xs, cursor: 'pointer' }}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}; 