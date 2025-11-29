import React, { useEffect, useState } from 'react';
import tokens from 'src/design-system/tokens';

export interface PluginSecurityReportProps {
  pluginId: string;
  theme?: 'light' | 'dark';
}

export const PluginSecurityReport: React.FC<PluginSecurityReportProps> = ({ pluginId, theme = 'light' }) => {
  const [security, setSecurity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/plugins/security/${pluginId}`)
      .then(r => r.json())
      .then(setSecurity)
      .catch(e => setError(e.message || 'Failed to load security report'))
      .finally(() => setLoading(false));
  }, [pluginId]);

  if (loading) return <div style={{ padding: tokens.spacing.md }}>Loading security report…</div>;
  if (error) return <div style={{ color: tokens.colors.error[theme], padding: tokens.spacing.md }}>{error}</div>;
  if (!security) return <div style={{ color: tokens.colors.textSecondary[theme], padding: tokens.spacing.md }}>No security report.</div>;

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ color: tokens.colors.text[theme], fontWeight: 700, marginBottom: tokens.spacing.sm }}>Security Report</h3>
      <div style={{ color: tokens.colors.text[theme] }}>
        <strong>Status:</strong> {security.status}<br />
        <strong>Details:</strong> {security.details}
      </div>
    </div>
  );
}; 