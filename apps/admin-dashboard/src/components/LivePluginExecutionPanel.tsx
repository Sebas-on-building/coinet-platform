import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockPlugins = [
  { name: 'AI Anomaly Detector', code: '// AI code here', logs: ['Started', 'Analyzing...', 'No anomaly detected'], output: 'OK', error: '' },
  { name: 'Cache Visualizer', code: '// Visualization code', logs: ['Started', 'Rendering...'], output: 'Chart rendered', error: '' },
];

export const LivePluginExecutionPanel = () => {
  const [selected, setSelected] = useState('');
  const [code, setCode] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const handleSelect = (name: string) => {
    const plugin = mockPlugins.find(p => p.name === name);
    setSelected(name);
    setCode(plugin?.code || '');
    setLogs(plugin?.logs || []);
    setOutput(plugin?.output || '');
    setError(plugin?.error || '');
  };

  const handleRun = () => {
    // Placeholder: simulate execution
    setLogs([...logs, 'Running...']);
    setTimeout(() => {
      setLogs([...logs, 'Running...', 'Execution complete']);
      setOutput('Result: Success');
      setError('');
    }, 1000);
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Live Plugin Execution</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <select style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={selected} onChange={e => handleSelect(e.target.value)}>
          <option value="">Select plugin...</option>
          {mockPlugins.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
        </select>
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleRun}>Run</RedisSuiteButton>
      </div>
      <textarea style={{ width: '100%', minHeight: 80, background: '#18181b', color: '#00FFA3', borderRadius: 8, marginBottom: 16, padding: 8 }} value={code} onChange={e => setCode(e.target.value)} />
      <div style={{ marginBottom: 8, color: '#FFD60A', fontWeight: 600 }}>Logs</div>
      <div style={{ background: '#18181b', borderRadius: 8, padding: 8, minHeight: 40, color: '#fff', fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div style={{ marginBottom: 8, color: '#00FFA3', fontWeight: 600 }}>Output</div>
      <div style={{ background: '#18181b', borderRadius: 8, padding: 8, minHeight: 40, color: '#30D158', fontFamily: 'monospace', fontSize: 13, marginBottom: 16 }}>{output}</div>
      {error && <div style={{ color: '#FF453A', fontWeight: 600 }}>Error: {error}</div>}
    </div>
  );
}; 