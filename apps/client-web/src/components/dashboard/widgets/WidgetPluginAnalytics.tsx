import React, { useState } from 'react';
import { Button } from 'packages/shared-ui/atoms/Button';

export const WidgetPluginAnalytics = () => {
  const [pluginId, setPluginId] = useState('');
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    const res = await fetch('/api/analytics/plugin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pluginId, params: {} }),
    });
    setResult(await res.json());
  };

  return (
    <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', padding: 24 }}>
      <h2 style={{ fontWeight: 700, fontSize: 24 }}>Plugin Analytics</h2>
      <input value={pluginId} onChange={e => setPluginId(e.target.value)} placeholder="Plugin ID" style={{ borderRadius: 8, border: '1px solid #E5E5EA', padding: 8 }} />
      <Button onClick={run}>Run Plugin</Button>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}; 