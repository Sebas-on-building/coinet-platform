import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PluginReviews } from './PluginReviews';

// TODO: Extract each sub-feature into its own atomic component for maintainability and testability
const PLUGINS = [
  { key: 'chart-ai', name: 'Chart AI', desc: 'AI-powered charting tools', rating: 4.9, installed: false },
  { key: 'theme-pack', name: 'Theme Pack', desc: 'Premium themes (Apple, Solana, TradingView)', rating: 4.8, installed: false },
  { key: 'webhook-sync', name: 'Webhook Sync', desc: 'Sync with Figma, Sketch, and more', rating: 4.7, installed: false },
];

export const PluginMarketplace: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [plugins, setPlugins] = useState(PLUGINS);
  const [aiSuggestion] = useState('Try the Chart AI plugin for smarter analytics!');
  const filtered = plugins.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const handleInstall = (key: string) => {
    setPlugins(ps => ps.map(p => p.key === key ? { ...p, installed: true } : p));
  };
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 16 }}>🛒 Plugin Marketplace</h2>
      <Input label="Search Plugins" value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom: 24 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {filtered.map(p => (
          <div key={p.key} style={{ minWidth: 220, background: '#f3f4f6', borderRadius: 12, padding: 16, position: 'relative' }}>
            <h4 style={{ fontWeight: 600, fontSize: 18 }}>{p.name}</h4>
            <p style={{ color: '#64748b', fontSize: 14 }}>{p.desc}</p>
            <div style={{ fontSize: 13, color: '#f59e42', margin: '8px 0' }}>⭐ {p.rating}</div>
            <Button onClick={() => handleInstall(p.key)} disabled={p.installed} size="sm">
              {p.installed ? 'Installed' : 'Install'}
            </Button>
            <Button onClick={() => setSelected(p)} variant="secondary" size="sm" style={{ marginLeft: 8 }}>Details</Button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, background: '#e0f2fe', borderRadius: 8, padding: 16, fontSize: 15, color: '#0369a1' }}>
        <strong>AI Suggestion:</strong> {aiSuggestion}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        <h4>{selected?.name}</h4>
        <p>{selected?.desc}</p>
        <div style={{ fontSize: 13, color: '#f59e42', margin: '8px 0' }}>⭐ {selected?.rating}</div>
        <Button onClick={() => handleInstall(selected.key)} disabled={selected?.installed} size="sm">
          {selected?.installed ? 'Installed' : 'Install'}
        </Button>
        <PluginReviews pluginKey={selected?.key || ''} />
        {/* TODO: Add reviews, ratings, plugin details, AI suggestions, extensibility */}
      </Modal>
      {/* TODO: Add animated transitions, accessibility, and extensibility for all sub-features */}
    </div>
  );
}; 