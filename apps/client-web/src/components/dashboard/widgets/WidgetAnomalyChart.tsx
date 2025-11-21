import React, { useEffect, useState } from 'react';

export const WidgetAnomalyChart = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/analytics/anomalies?symbol=BTCUSD&from=2024-01-01&to=2024-06-01')
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Anomaly Detection</h2>
      <svg width="100%" height="200">
        {data.map((d, i) => (
          <circle key={i} cx={i * 3} cy={200 - d.price} r={d.anomaly ? 6 : 2} fill={d.anomaly ? '#FF375F' : '#0A84FF'} />
        ))}
      </svg>
    </div>
  );
}; 