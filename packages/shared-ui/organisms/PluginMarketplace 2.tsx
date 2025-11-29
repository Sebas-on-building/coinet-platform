import React, { useState, useEffect } from 'react';
import { PluginList, PluginListProps } from './PluginList';
import tokens from 'src/design-system/tokens';

export interface PluginMarketplaceProps {
  fetchPlugins: () => Promise<PluginListProps['plugins']>;
  theme?: 'light' | 'dark';
}

export const PluginMarketplace: React.FC<PluginMarketplaceProps> = ({ fetchPlugins, theme = 'light' }) => {
  const [plugins, setPlugins] = useState<PluginListProps['plugins']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPlugins()
      .then(setPlugins)
      .catch(e => setError(e.message || 'Failed to load plugins'))
      .finally(() => setLoading(false));
  }, [fetchPlugins]);

  if (loading) return <div style={{ padding: tokens.spacing.lg, textAlign: 'center' }}>Loading plugins…</div>;
  if (error) return <div style={{ padding: tokens.spacing.lg, color: tokens.colors.error[theme], textAlign: 'center' }}>{error}</div>;
  if (plugins.length === 0) return <div style={{ padding: tokens.spacing.lg, textAlign: 'center', color: tokens.colors.textSecondary[theme] }}>No plugins found. Try adjusting your search or filters.</div>;

  return (
    <div style={{ width: '100%', minHeight: 400 }}>
      {/* Onboarding, analytics, reviews, etc. extensibility hooks here */}
      <PluginList plugins={plugins} theme={theme} />
    </div>
  );
}; 