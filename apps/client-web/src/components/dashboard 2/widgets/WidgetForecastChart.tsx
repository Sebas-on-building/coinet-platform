import React, { useEffect, useState } from 'react';

export const WidgetForecastChart = () => {
  const [forecast, setForecast] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/analytics/forecast?symbol=BTCUSD&from=2024-01-01&to=2024-06-01')
      .then(res => res.json())
      .then(data => setForecast(data.forecast));
  }, []);

  return (
    <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Forecast</h2>
      <svg width="100%" height="200">
        {forecast.map((f, i) => (
          <circle key={i} cx={i * 40 + 400} cy={200 - f} r={6} fill="#30D158" />
        ))}
      </svg>
    </div>
  );
}; 