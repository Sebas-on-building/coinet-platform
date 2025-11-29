import React from 'react';
import tokens from 'src/design-system/tokens';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface PluginAnalyticsRetentionProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

// Dummy retention data for now
export const PluginAnalyticsRetention: React.FC<PluginAnalyticsRetentionProps> = ({ pluginId, theme = 'light' }) => {
  // TODO: Fetch real retention data from backend
  const data = [
    { day: 0, retention: 100 },
    { day: 1, retention: 60 },
    { day: 2, retention: 45 },
    { day: 3, retention: 35 },
    { day: 4, retention: 30 },
    { day: 5, retention: 28 },
    { day: 6, retention: 25 },
  ];
  return (
    <div style={{ width: '100%', height: 240, background: tokens.colors.surface[theme], borderRadius: tokens.radius.md, padding: tokens.spacing.md, marginTop: tokens.spacing.md }}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <XAxis dataKey="day" stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <YAxis stroke={tokens.colors.textSecondary[theme]} fontSize={12} />
          <Tooltip contentStyle={{ background: tokens.colors.surface[theme], color: tokens.colors.text[theme], borderRadius: tokens.radius.xs, border: `1px solid ${tokens.colors.border[theme]}` }} />
          <Line type="monotone" dataKey="retention" stroke={tokens.colors.accent.blue[theme]} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 