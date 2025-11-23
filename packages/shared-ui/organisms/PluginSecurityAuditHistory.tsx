import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginSecurityAuditHistoryProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginSecurityAuditHistory: React.FC<PluginSecurityAuditHistoryProps> = ({ pluginId, theme = 'light' }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/plugins/security/${pluginId}/history`)
      .then(r => r.json())
      .then(setHistory)
      .catch(e => setError(e.message || 'Failed to load audit history'))
      .finally(() => setLoading(false));
  }, [pluginId]);

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading audit history…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (history.length === 0) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No audit history.</div>;

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Security Audit History</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {history.map((h, i) => (
          <li key={i} style={{ color: tokens.colors.text[theme], marginBottom: tokens.spacing.xs }}>
            <strong>{new Date(h.date).toLocaleString()}:</strong> {h.status} - {h.details}
          </li>
        ))}
      </ul>
    </div>
  );
}; 