import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

export const PluginPanel = () => {
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    axios.get('/api/redis/plugins').then(res => setPlugins(res.data.plugins));
  }, []);

  const handleAddPlugin = async () => {
    // Show modal to upload or select plugin
    // For demo, just add a sample plugin
    await axios.post('/api/redis/plugins', { plugin: { name: 'SamplePlugin' } });
    const res = await axios.get('/api/redis/plugins');
    setPlugins(res.data.plugins);
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Plugins</h2>
      <ul>
        {plugins.map((p, i) => (
          <li key={i} style={{ color: '#00FFA3', fontFamily: 'monospace', marginBottom: 8 }}>{p}</li>
        ))}
      </ul>
      <RedisSuiteButton onClick={handleAddPlugin}>+ Add Plugin</RedisSuiteButton>
    </div>
  );
}; 