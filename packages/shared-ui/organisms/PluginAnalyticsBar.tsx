import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface PluginAnalyticsBarProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginAnalyticsBar: React.FC<PluginAnalyticsBarProps> = ({ pluginId, theme = 'light' }) => {
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

  // Example: installs by country
  const installsByCountry = analytics.filter(a => a.event === 'install').reduce((acc, a) => {
    const country = a.data?.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const data = Object.entries(installsByCountry).map(([country, installs]) => ({ country, installs }));

  return (
    <div style={{ width: '100%', height: 240, background: tokens.colors.surface[theme], borderRadius: tokens.radius.md, padding: tokens.spacing.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <XAxis dataKey="country" stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <YAxis stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <Tooltip contentStyle={{ background: tokens.colors.surface[theme], color: tokens.colors.text[theme], borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border[theme]}` }} />
          <Bar dataKey="installs" fill={tokens.colors.accent.blue[theme]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}; 