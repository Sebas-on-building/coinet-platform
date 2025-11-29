import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockPlugins = [
  { id: 1, name: 'Trading Bot', desc: 'Automate your trades', installed: false, rating: 4.8 },
  { id: 2, name: 'Dark Theme', desc: 'Beautiful dark mode', installed: true, rating: 4.9 },
];

const PluginCard = React.memo(({ p, onInstall }: { p: any; onInstall: (id: number) => void }) => (
  <Card style={{ padding: 16, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <strong>{p.name}</strong>
      <div style={{ color: 'var(--color-text-secondary)' }}>{p.desc}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Rating: {p.rating}</div>
    </div>
    <Button size="sm" variant={p.installed ? 'secondary' : 'primary'} onClick={() => onInstall(p.id)} disabled={p.installed}>
      {p.installed ? 'Installed' : 'Install'}
    </Button>
  </Card>
));

const PluginMarketplacePage = React.memo(() => {
  const [plugins, setPlugins] = useState(mockPlugins);
  const onInstall = (id: number) => setPlugins(ps => ps.map(p => p.id === id ? { ...p, installed: true } : p));
  return (
    <Card style={{ maxWidth: 600, margin: '40px auto', padding: 32 }}>
      <h2>Plugin Marketplace</h2>
      {plugins.map(p => <PluginCard key={p.id} p={p} onInstall={onInstall} />)}
      {plugins.length === 0 && <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No plugins found</div>}
    </Card>
  );
});

export default PluginMarketplacePage; 