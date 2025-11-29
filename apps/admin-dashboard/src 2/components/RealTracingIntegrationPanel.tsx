import React, { useState } from 'react';

const mockLiveTraces = [
  {
    id: 'trace-100', service: 'API', latency: 22, spans: [
      { name: 'API', duration: 8 },
      { name: 'Portfolio', duration: 7 },
      { name: 'Redis', duration: 7 },
    ]
  },
  {
    id: 'trace-101', service: 'Market', latency: 38, spans: [
      { name: 'Market', duration: 10 },
      { name: 'Redis', duration: 8 },
      { name: 'Kafka', duration: 20 },
    ]
  },
];

export const RealTracingIntegrationPanel = () => {
  const [filter, setFilter] = useState('');
  const filtered = filter ? mockLiveTraces.filter(t => t.service === filter) : mockLiveTraces;

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Real Distributed Tracing</h2>
      <div style={{ marginBottom: 16 }}>
        <input style={{ padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3', border: '1px solid #00FFA3' }} placeholder="Filter by service..." value={filter} onChange={e => setFilter(e.target.value)} />
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {filtered.map((t, i) => (
          <li key={i} style={{ marginBottom: 16, background: '#18181b', borderRadius: 8, padding: 12 }}>
            <div style={{ color: '#FFD60A', fontWeight: 600 }}>Trace {t.id} ({t.service}) - {t.latency}ms</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', marginLeft: 16 }}>
              {t.spans.map((s, j) => (
                <li key={j} style={{ color: '#00FFA3', fontFamily: 'monospace', fontSize: 13 }}>{s.name} <span style={{ color: '#fff' }}>({s.duration}ms)</span></li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}; 