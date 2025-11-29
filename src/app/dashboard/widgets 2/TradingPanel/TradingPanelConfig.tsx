import React from 'react';
// =========================
// Trading Panel Widget Config
// =========================
const TradingPanelConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        Default Symbol:
        <select
          value={config.defaultSymbol || 'BTC'}
          onChange={e => setConfig({ ...config, defaultSymbol: e.target.value })}
          style={{ marginLeft: 8 }}
        >
          <option value="BTC">BTC</option>
          <option value="ETH">ETH</option>
          <option value="SOL">SOL</option>
        </select>
      </label>
    </form>
  );
};

export default TradingPanelConfig; 