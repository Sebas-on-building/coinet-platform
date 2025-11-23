import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockCache = [
  { type: 'query', key: 'portfolioVal:12345', value: '{...}', ttl: 3 },
  { type: 'static', key: 'symbol:BTCUSD', value: '{...}', ttl: null },
  { type: 'session', key: 'session:abc', value: '{...}', ttl: 1200 },
  { type: 'rate', key: 'rate:user:12345', value: '7', ttl: 30 },
  { type: 'blacklist', key: 'blacklist:jwt:xyz', value: '1', ttl: 3500 },
];

export const CacheManagerPanel = () => {
  const [search, setSearch] = useState('');
  const [cache, setCache] = useState(mockCache);

  const filtered = cache.filter(c => c.key.includes(search));

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Cache Manager</h2>
      <input
        style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 8, border: '1px solid #00FFA3', background: '#18181b', color: '#00FFA3' }}
        placeholder="Search cache key..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#00FFA3', textAlign: 'left' }}>
            <th>Type</th>
            <th>Key</th>
            <th>Value</th>
            <th>TTL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #23272F' }}>
              <td>{c.type}</td>
              <td style={{ fontFamily: 'monospace' }}>{c.key}</td>
              <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</td>
              <td>{c.ttl !== null ? `${c.ttl}s` : '∞'}</td>
              <td>
                <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }}>Invalidate</RedisSuiteButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 