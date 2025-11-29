import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockPlugins = [
  { name: 'Real-Time Alert Bot', desc: 'Sends alerts to Slack in real-time.', code: '// Slack alert code...', trending: true, new: false, recommended: true },
  { name: 'Redis Key Cleaner', desc: 'Auto-cleans expired keys.', code: '// Key cleaner code...', trending: false, new: true, recommended: false },
  { name: 'Performance Profiler', desc: 'Profiles Redis command latency.', code: '// Profiler code...', trending: true, new: true, recommended: true },
];

export const PluginCodeMarketplacePanel = () => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<null | typeof mockPlugins[0]>(null);

  const filtered = mockPlugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Plugin Code Marketplace</h2>
      <input style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 8, border: '1px solid #00FFA3', background: '#18181b', color: '#00FFA3' }} placeholder="Search plugins..." value={search} onChange={e => setSearch(e.target.value)} />
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {filtered.map((p, i) => (
          <li key={i} style={{ marginBottom: 16, background: selected?.name === p.name ? '#23272F' : '#18181b', borderRadius: 8, padding: 12, cursor: 'pointer', border: selected?.name === p.name ? '1px solid #00FFA3' : 'none' }} onClick={() => setSelected(p)}>
            <div style={{ color: '#00FFA3', fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: '#fff', fontSize: 13 }}>{p.desc}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {p.trending && <span style={{ color: '#FFD60A', marginRight: 8 }}>Trending</span>}
              {p.new && <span style={{ color: '#30D158', marginRight: 8 }}>New</span>}
              {p.recommended && <span style={{ color: '#00FFA3' }}>Recommended</span>}
            </div>
          </li>
        ))}
      </ul>
      {selected && (
        <div style={{ marginTop: 24, background: '#18181b', borderRadius: 8, padding: 16 }}>
          <div style={{ color: '#FFD60A', fontWeight: 600, marginBottom: 8 }}>Preview: {selected.name}</div>
          <pre style={{ color: '#fff', background: '#23272F', borderRadius: 8, padding: 12, fontSize: 13, overflowX: 'auto' }}>{selected.code}</pre>
          <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px', marginTop: 8 }}>Install</RedisSuiteButton>
        </div>
      )}
    </div>
  );
}; 