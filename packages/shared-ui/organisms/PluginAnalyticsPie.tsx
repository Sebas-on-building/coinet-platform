import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export interface PluginAnalyticsPieProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

const COLORS = ['#2563eb', '#9333ea', '#22c55e', '#ec4899', '#eab308', '#f59e42', '#ef4444'];

export const PluginAnalyticsPie: React.FC<PluginAnalyticsPieProps> = ({ pluginId, theme = 'light' }) => {
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

  // Example: installs by device
  const installsByDevice = analytics.filter(a => a.event === 'install').reduce((acc, a) => {
    const device = a.data?.device || 'Unknown';
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const data = Object.entries(installsByDevice).map(([device, installs]) => ({ name: device, value: installs }));

  return (
    <div style={{ width: '100%', height: 240, background: tokens.colors.surface[theme], borderRadius: tokens.radius.md, padding: tokens.spacing.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: tokens.colors.surface[theme], color: tokens.colors.text[theme], borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border[theme]}` }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}; 