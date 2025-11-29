import React, { useEffect, useState } from 'react';

export const WidgetMarketChart = () => {
  const [data, setData] = useState<{ time: string, price: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch('/api/analytics/market-ticks?symbol=BTCUSD&limit=100');
      const d = await res.json();
      setData(d.map((row: any) => ({ time: row.time, price: row.price })));
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24, minHeight: 320
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>BTCUSD Price Chart</h2>
      <svg width="100%" height="200">
        {/* Simple line chart */}
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke="#0A84FF"
            strokeWidth="2"
            points={data.map((d, i) => `${i * 3},${200 - (d.price / Math.max(...data.map(x => x.price))) * 180}`).join(' ')}
          />
        )}
      </svg>
    </div>
  );
}; 