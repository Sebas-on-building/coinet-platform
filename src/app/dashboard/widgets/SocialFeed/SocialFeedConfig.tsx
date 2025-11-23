import React from 'react';
// =========================
// Social Feed Widget Config
// =========================
const SocialFeedConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        Social Source:
        <select
          value={config.source || 'all'}
          onChange={e => setConfig({ ...config, source: e.target.value })}
          style={{ marginLeft: 8 }}
        >
          <option value="all">All</option>
          <option value="twitter">Twitter</option>
          <option value="reddit">Reddit</option>
        </select>
      </label>
    </form>
  );
};

export default SocialFeedConfig; 