import { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { useTheme } from '@/contexts/ThemeContext';

export default function PluginMarketplace({ plugins }) {
  const { tokens } = useTheme();
  const [search, setSearch] = useState('');
  const filtered = plugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{ padding: '32px' }} aria-label="Plugin Marketplace" role="region">
      <input
        style={{
          padding: '12px',
          borderRadius: tokens.borderRadius.md,
          border: `1px solid ${tokens.colors.primary}`,
          marginBottom: 24,
          width: '100%',
          fontSize: 18,
        }}
        placeholder="Search plugins…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search plugins"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {filtered.map(plugin => (
          <Card key={plugin.id} style={{ minHeight: 180 }} aria-label={plugin.name}>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{plugin.name}</div>
            <div style={{ color: tokens.colors.textMuted, margin: '8px 0' }}>{plugin.meta.description}</div>
            <button
              style={{
                background: tokens.colors.primary,
                color: '#fff',
                border: 'none',
                borderRadius: tokens.borderRadius.sm,
                padding: '8px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: 12,
              }}
              onClick={() => window.dispatchEvent(new CustomEvent('plugin:activate', { detail: plugin.id }))}
              aria-label={`Activate ${plugin.name}`}
            >
              Activate
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
} 