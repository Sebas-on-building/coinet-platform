import React from 'react';

const mockRecommendations = [
  { type: 'cache', message: 'Increase TTL for static symbol data to reduce DB load.' },
  { type: 'plugin', message: 'Install AI Anomaly Detector for proactive monitoring.' },
  { type: 'security', message: 'Enable 2FA for all admin users.' },
  { type: 'performance', message: 'Consider scaling Redis cluster for higher throughput.' },
];

export const AIRecommendationsPanel = () => (
  <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>AI Recommendations</h2>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {mockRecommendations.map((rec, i) => (
        <li key={i} style={{ color: rec.type === 'security' ? '#FFD60A' : rec.type === 'performance' ? '#00FFA3' : rec.type === 'plugin' ? '#30D158' : '#FF453A', marginBottom: 12, fontWeight: 500 }}>
          {rec.message}
        </li>
      ))}
    </ul>
  </div>
); 