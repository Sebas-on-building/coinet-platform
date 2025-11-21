import React, { useState } from 'react';
import { RedisSuiteButton } from 'src/design-system/components/Button/RedisSuiteButton';

const availableWidgets = [
  'Cluster Status',
  'Memory Usage',
  'Cache Analytics',
  'Tracing',
  'Plugin Marketplace',
  'Pub/Sub Manager',
];

export const CustomUserDashboardPanel = () => {
  const [widgets, setWidgets] = useState(['Cluster Status', 'Memory Usage']);
  const [selected, setSelected] = useState('');

  const handleAdd = () => {
    if (selected && !widgets.includes(selected)) setWidgets([...widgets, selected]);
  };
  const handleRemove = (w: string) => setWidgets(widgets.filter(x => x !== w));

  return (
    <div style={{ background: '#23272F', borderRadius: 16, padding: 24, marginTop: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Custom User Dashboard</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <select style={{ flex: 1, padding: 8, borderRadius: 8, background: '#18181b', color: '#00FFA3' }} value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Add widget...</option>
          {availableWidgets.filter(w => !widgets.includes(w)).map((w, i) => <option key={i} value={w}>{w}</option>)}
        </select>
        <RedisSuiteButton style={{ fontSize: 12, padding: '4px 12px' }} onClick={handleAdd}>Add</RedisSuiteButton>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {widgets.map((w, i) => (
          <li key={i} style={{ background: '#18181b', color: '#00FFA3', borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            {w}
            <span style={{ cursor: 'pointer', color: '#FF453A', marginLeft: 8 }} onClick={() => handleRemove(w)}>&times;</span>
          </li>
        ))}
      </ul>
    </div>
  );
}; 