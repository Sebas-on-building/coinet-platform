import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface PluginAnalyticsChartProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginAnalyticsChart: React.FC<PluginAnalyticsChartProps> = ({ pluginId, theme = 'light' }) => {
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

  // Aggregate installs by date
  const installsByDate = analytics.filter(a => a.event === 'install').reduce((acc, a) => {
    const date = a.date.split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const data = Object.entries(installsByDate).map(([date, installs]) => ({ date, installs }));

  return (
    <div style={{ width: '100%', height: 240, background: tokens.colors.surface[theme], borderRadius: tokens.radius.md, padding: tokens.spacing.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <XAxis dataKey="date" stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <YAxis stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <Tooltip contentStyle={{ background: tokens.colors.surface[theme], color: tokens.colors.text[theme], borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border[theme]}` }} />
          <Line type="monotone" dataKey="installs" stroke={tokens.colors.accent.blue[theme]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 