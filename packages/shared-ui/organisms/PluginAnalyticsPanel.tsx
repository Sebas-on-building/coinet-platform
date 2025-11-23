import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginAnalyticsPanelProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginAnalyticsPanel: React.FC<PluginAnalyticsPanelProps> = ({ pluginId, theme = 'light' }) => {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/plugins/analytics/${pluginId}`)
      .then(r => r.json())
      .then(setAnalytics)
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [pluginId]);

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading analytics…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (analytics.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No analytics yet.</div>;

  // Example: show event counts
  const eventCounts = analytics.reduce((acc, a) => {
    acc[a.event] = (acc[a.event] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Analytics</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {Object.entries(eventCounts).map(([event, count]) => (
          <li key={event} style={{ color: tokens.colors.text[theme], marginBottom: tokens.spacing.xs }}>
            <strong>{event}:</strong> {count}
          </li>
        ))}
      </ul>
    </div>
  );
}; 