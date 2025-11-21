import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const featured = [
  { name: 'AI Anomaly Detector', desc: 'Detects anomalies in real-time data.', installed: false },
  { name: 'Advanced Alerting', desc: 'Custom alert rules and notifications.', installed: true },
  { name: 'Cache Visualizer', desc: 'Visualizes cache usage and trends.', installed: false },
];

export const PluginMarketplacePanel = () => {
  const [plugins, setPlugins] = useState(featured);

  const handleInstall = (name: string) => {
    setPlugins(plugins.map(p => p.name === name ? { ...p, installed: true } : p));
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Plugin Marketplace</h2>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {plugins.map((p, i) => (
          <li key={i} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#00FFA3', fontWeight: 600 }}>{p.name}</div>
              <div style={{ color: '#fff', fontSize: 13 }}>{p.desc}</div>
            </div>
            {p.installed ? (
              <span style={{ color: '#30D158', fontWeight: 600 }}>Installed</span>
            ) : (
              <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => handleInstall(p.name)}>Install</RedisSuiteButton>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}; 