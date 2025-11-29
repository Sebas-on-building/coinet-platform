import React from 'react';

const mockTraces = [
  { id: 'trace-1', service: 'API', latency: 32, hops: ['API', 'Portfolio', 'Redis'] },
  { id: 'trace-2', service: 'Auth', latency: 18, hops: ['Auth', 'Redis'] },
  { id: 'trace-3', service: 'Market', latency: 45, hops: ['Market', 'Redis', 'Kafka'] },
];

export const TracingPanel = () => (
  <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Distributed Tracing</h2>
    <table style={{ width: '100%', color: '#fff', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#00FFA3', textAlign: 'left' }}>
          <th>Trace ID</th>
          <th>Service</th>
          <th>Latency (ms)</th>
          <th>Hops</th>
        </tr>
      </thead>
      <tbody>
        {mockTraces.map((t, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #23272F' }}>
            <td style={{ fontFamily: 'monospace' }}>{t.id}</td>
            <td>{t.service}</td>
            <td>{t.latency}</td>
            <td>{t.hops.join(' → ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
); 