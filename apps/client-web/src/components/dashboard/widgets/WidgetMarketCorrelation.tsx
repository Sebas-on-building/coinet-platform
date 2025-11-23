import React, { useState } from 'react';
import { Button } from 'packages/shared-ui/atoms/Button';

export const WidgetMarketCorrelation = () => {
  const [symbolA, setSymbolA] = useState('BTCUSD');
  const [symbolB, setSymbolB] = useState('ETHUSD');
  const [correlation, setCorrelation] = useState<number | null>(null);

  const fetchCorrelation = async () => {
    const res = await fetch(`/api/analytics/correlation?symbolA=${symbolA}&symbolB=${symbolB}&from=2024-01-01&to=2024-06-01`);
    const data = await res.json();
    setCorrelation(data[0]?.correlation ?? null);
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24, minHeight: 320
    }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Cross-Market Correlation</h2>
      <div style={{ margin: '16px 0', display: 'flex', gap: 8 }}>
        <input value={symbolA} onChange={e => setSymbolA(e.target.value)} style={{ borderRadius: 8, border: '1px solid #E5E5EA', padding: 8 }} />
        <span style={{ alignSelf: 'center' }}>vs</span>
        <input value={symbolB} onChange={e => setSymbolB(e.target.value)} style={{ borderRadius: 8, border: '1px solid #E5E5EA', padding: 8 }} />
        <Button onClick={fetchCorrelation}>Analyze</Button>
      </div>
      {correlation !== null && (
        <div style={{ fontSize: 32, fontWeight: 600, color: '#0A84FF', marginTop: 16 }}>
          Correlation: {correlation.toFixed(4)}
        </div>
      )}
    </div>
  );
}; 