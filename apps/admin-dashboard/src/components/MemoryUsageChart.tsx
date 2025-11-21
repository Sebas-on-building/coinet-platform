import React from 'react';

export const MemoryUsageChart = () => {
  // Placeholder data
  const data = [
    { timestamp: '10:00', usedMemory: 800 },
    { timestamp: '10:05', usedMemory: 1200 },
    { timestamp: '10:10', usedMemory: 1500 },
    { timestamp: '10:15', usedMemory: 1700 },
    { timestamp: '10:20', usedMemory: 1900 },
  ];

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Memory Usage</h2>
      <div style={{ width: '100%', height: 200, background: '#18181b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00FFA3', fontWeight: 600 }}>
        {/* Placeholder for chart - replace with Recharts or similar */}
        {data.map((point, idx) => (
          <span key={idx} style={{ margin: '0 8px' }}>{point.usedMemory}MB</span>
        ))}
      </div>
    </div>
  );
}; 