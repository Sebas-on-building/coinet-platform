import React from 'react';

export const RedisClusterStatus = () => {
  // Placeholder data
  const status = {
    nodes: [
      { id: '1', role: 'master', host: '10.0.0.1', port: 6379, status: 'online' },
      { id: '2', role: 'replica', host: '10.0.0.2', port: 6379, status: 'online' },
      { id: '3', role: 'replica', host: '10.0.0.3', port: 6379, status: 'offline' },
    ],
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', marginBottom: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Cluster Status</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {status.nodes.map((node) => (
          <div key={node.id} style={{ padding: 16, borderRadius: 12, background: '#1A1A1A', border: '1px solid #00FFA3' }}>
            <div style={{ fontWeight: 'bold' }}>{node.role}</div>
            <div>{node.host}:{node.port}</div>
            <div>Status: <span style={{ color: node.status === 'online' ? '#30D158' : '#FF453A' }}>{node.status}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}; 