import React from 'react';
// =========================
// News Feed Widget Config
// =========================
const NewsFeedConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        News Source:
        <select
          value={config.source || 'all'}
          onChange={e => setConfig({ ...config, source: e.target.value })}
          style={{ marginLeft: 8 }}
        >
          <option value="all">All</option>
          <option value="coindesk">CoinDesk</option>
          <option value="theblock">The Block</option>
          <option value="decrypt">Decrypt</option>
        </select>
      </label>
    </form>
  );
};

export default NewsFeedConfig; 