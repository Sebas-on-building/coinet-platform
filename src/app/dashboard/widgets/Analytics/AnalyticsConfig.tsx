import React from 'react';
// =========================
// Analytics/Backtesting Widget Config
// =========================
const AnalyticsConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        Strategy:
        <select
          value={config.strategy || 'momentum'}
          onChange={e => setConfig({ ...config, strategy: e.target.value })}
          style={{ marginLeft: 8 }}
        >
          <option value="momentum">Momentum</option>
          <option value="mean-reversion">Mean Reversion</option>
          <option value="arbitrage">Arbitrage</option>
        </select>
      </label>
    </form>
  );
};

export default AnalyticsConfig; 