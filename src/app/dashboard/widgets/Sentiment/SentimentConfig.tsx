import React from 'react';
// =========================
// Sentiment Widget Config
// =========================
const SentimentConfig: React.FC<{ config: any; setConfig: (c: any) => void }> = ({ config, setConfig }) => {
  // Placeholder for future config options
  return (
    <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label>
        Sentiment Source:
        <select
          value={config.source || 'twitter'}
          onChange={e => setConfig({ ...config, source: e.target.value })}
          style={{ marginLeft: 8 }}
        >
          <option value="twitter">Twitter</option>
          <option value="reddit">Reddit</option>
          <option value="news">News</option>
        </select>
      </label>
    </form>
  );
};

export default SentimentConfig; 