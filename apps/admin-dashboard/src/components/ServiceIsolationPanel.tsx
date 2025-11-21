import React from 'react';

export const ServiceIsolationPanel = () => (
  <div style={{ background: '#23272F', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', marginTop: 32 }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Service Isolation</h2>
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', color: '#00FFA3' }}>co_analytics:</span> Analytics Service
      </li>
      <li style={{ marginBottom: 8 }}>
        <span style={{ fontFamily: 'monospace', color: '#00FFA3' }}>co_market:</span> Market Data Service
      </li>
      <li>
        <span style={{ fontFamily: 'monospace', color: '#00FFA3' }}>co_auth:</span> Auth Service
      </li>
    </ul>
  </div>
); 