import React from 'react';
// =========================
// Market Overview Widget Config
// =========================
const MarketOverviewConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        Show Top N Assets:
        <input
          type="number"
          value={config.topN || 3}
          min={1}
          max={20}
          onChange={e => setConfig({ ...config, topN: Number(e.target.value) })}
          style={{ marginLeft: 8, width: 60 }}
        />
      </label>
    </form>
  );
};

export default MarketOverviewConfig; 