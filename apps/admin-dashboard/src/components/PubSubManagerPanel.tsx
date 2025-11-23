import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockChannels = [
  { type: 'alert', channel: 'alerts:BTCUSD', messages: ['BTCUSD above 40000 for user 12345'] },
  { type: 'event', channel: 'event:portfolio:update', messages: ['{"userId":12345,"portfolioId":1}'] },
];

export const PubSubManagerPanel = () => {
  const [channels, setChannels] = useState(mockChannels);
  const [newMsg, setNewMsg] = useState('');
  const [selected, setSelected] = useState('');

  const handlePublish = () => {
    if (!selected || !newMsg) return;
    setChannels(channels.map(c => c.channel === selected ? { ...c, messages: [...c.messages, newMsg] } : c));
    setNewMsg('');
  };

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Pub/Sub Manager</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <select style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select channel...</option>
          {channels.map((c, i) => <option key={i} value={c.channel}>{c.channel}</option>)}
        </select>
        <input style={{ flex: 2, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} placeholder="Message..." value={newMsg} onChange={e => setNewMsg(e.target.value)} />
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handlePublish}>Publish</RedisSuiteButton>
      </div>
      <div style={{ maxHeight: 180, overflowY: 'auto', background: '#18181b', borderRadius: 8, padding: 12 }}>
        {channels.map((c, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ color: '#FFD60A', fontWeight: 600 }}>{c.channel}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {c.messages.map((m, j) => <li key={j} style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}>{m}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}; 