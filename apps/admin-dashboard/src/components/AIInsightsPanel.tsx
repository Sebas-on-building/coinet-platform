import React, { useEffect, useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

export const AIInsightsPanel = () => {
  const [insights, setInsights] = useState([
    { type: 'anomaly', message: 'Unusual spike in memory usage detected on node 2.' },
    { type: 'alert', message: 'Node 3 is offline. Immediate action required.' },
    { type: 'ai', message: 'Predicted failover risk for node 1 in next 24h: 2%.' }
  ]);

  // Placeholder for real AI/anomaly/alerting integration
  useEffect(() => {
    // Fetch or subscribe to AI insights here
  }, []);

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>AI Insights & Alerts</h2>
      <ul>
        {insights.map((insight, i) => (
          <li key={i} style={{ color: insight.type === 'alert' ? '#FF453A' : insight.type === 'anomaly' ? '#FFD60A' : '#00FFA3', marginBottom: 12, fontWeight: 500 }}>
            {insight.message}
          </li>
        ))}
      </ul>
      <RedisSuiteButton>View Details</RedisSuiteButton>
    </div>
  );
}; 