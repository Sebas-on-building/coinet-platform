import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const mockUsers = [
  { name: 'Alice', color: '#00FFA3' },
  { name: 'Bob', color: '#FFD60A' },
  { name: 'Eve', color: '#FF453A' },
];
const mockChat = [
  { user: 'Alice', message: "Let's add a new cache widget!" },
  { user: 'Bob', message: 'Great idea!' },
];
const mockWidgets = ['Cluster Status', 'Memory Usage', 'Cache Analytics'];

export const CollaborativeDashboardPanel = () => {
  const [chat, setChat] = useState(mockChat);
  const [msg, setMsg] = useState('');
  const [widgets, setWidgets] = useState(mockWidgets);
  const [selected, setSelected] = useState('');

  const handleSend = () => {
    if (!msg) return;
    setChat([...chat, { user: 'You', message: msg }]);
    setMsg('');
  };
  const handleAddWidget = () => {
    if (selected && !widgets.includes(selected)) setWidgets([...widgets, selected]);
  };
  const handleRemoveWidget = (w: string) => setWidgets(widgets.filter(x => x !== w));

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Collaborative Dashboard</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {mockUsers.map((u, i) => (
          <span key={i} style={{ background: u.color, color: '#18181b', borderRadius: 8, padding: '4px 12px', fontWeight: 600, marginRight: 8 }}>{u.name}</span>
        ))}
        <span style={{ color: '#00FFA3', fontWeight: 600 }}>(You)</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Add widget...</option>
          {['Cluster Status', 'Memory Usage', 'Cache Analytics', 'Tracing', 'Plugin Marketplace', 'Pub/Sub Manager'].filter(w => !widgets.includes(w)).map((w, i) => <option key={i} value={w}>{w}</option>)}
        </select>
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleAddWidget}>Add</RedisSuiteButton>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        {widgets.map((w, i) => (
          <li key={i} style={{ background: '#18181b', color: '#00FFA3', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {w}
            <span style={{ cursor: 'pointer', color: '#FF453A', marginLeft: 8 }} onClick={() => handleRemoveWidget(w)}>&times;</span>
          </li>
        ))}
      </ul>
      <div style={{ background: '#18181b', borderRadius: 8, padding: 12, minHeight: 60, marginBottom: 8, maxHeight: 120, overflowY: 'auto' }}>
        {chat.map((c, i) => (
          <div key={i} style={{ color: '#fff', fontFamily: 'monospace', fontSize: 13 }}><span style={{ color: '#FFD60A', fontWeight: 600 }}>{c.user}:</span> {c.message}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} placeholder="Type a message..." value={msg} onChange={e => setMsg(e.target.value)} />
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleSend}>Send</RedisSuiteButton>
      </div>
    </div>
  );
};
