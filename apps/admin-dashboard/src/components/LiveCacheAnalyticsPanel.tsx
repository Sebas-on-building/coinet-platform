import React from 'react';

const mockStats = {
  hitRate: 0.92,
  missRate: 0.08,
  evictions: 12,
  topKeys: [
    { key: 'portfolioVal:12345', hits: 120 },
    { key: 'symbol:BTCUSD', hits: 98 },
    { key: 'session:abc', hits: 77 },
  ],
  memoryTrend: [800, 900, 1200, 1500, 1700, 1900],
};

export const LiveCacheAnalyticsPanel = () => (
  <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Live Cache Analytics</h2>
    <div style={{ display: 'flex', gap: 32, marginBottom: 16 }}>
      <div>
        <div style={{ color: '#00FFA3', fontWeight: 600 }}>Hit Rate</div>
        <div style={{ fontSize: 24 }}>{(mockStats.hitRate * 100).toFixed(1)}%</div>
      </div>
      <div>
        <div style={{ color: '#FF453A', fontWeight: 600 }}>Miss Rate</div>
        <div style={{ fontSize: 24 }}>{(mockStats.missRate * 100).toFixed(1)}%</div>
      </div>
      <div>
        <div style={{ color: '#FFD60A', fontWeight: 600 }}>Evictions</div>
        <div style={{ fontSize: 24 }}>{mockStats.evictions}</div>
      </div>
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={{ color: '#00FFA3', fontWeight: 600, marginBottom: 8 }}>Top Keys</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {mockStats.topKeys.map((k, i) => (
          <li key={i} style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{k.key} <span style={{ color: '#FFD60A' }}>({k.hits} hits)</span></li>
        ))}
      </ul>
    </div>
    <div style={{ color: '#00FFA3', fontWeight: 600, marginBottom: 8 }}>Memory Usage Trend</div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {mockStats.memoryTrend.map((v, i) => (
        <div key={i} style={{ width: 16, height: v / 40, background: '#00FFA3', borderRadius: 4 }}></div>
      ))}
    </div>
  </div>
); 