import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockDevices = [
  { id: 1, name: 'MacBook Air', location: 'Berlin, DE', lastActive: '2m ago', current: true },
  { id: 2, name: 'iPhone 15', location: 'Munich, DE', lastActive: '1h ago', current: false },
  { id: 3, name: 'iPad Pro', location: 'Zurich, CH', lastActive: '3d ago', current: false },
];

const DeviceManagementPage = React.memo(() => {
  const [devices, setDevices] = useState(mockDevices);
  const onRevoke = (id: number) => setDevices(ds => ds.filter(d => d.id !== id));
  return (
    <Card style={{ maxWidth: 520, margin: '40px auto', padding: 32 }}>
      <h2>Active Devices</h2>
      {devices.map(d => (
        <Card key={d.id} style={{ marginBottom: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: d.current ? 'var(--color-primary-fade)' : 'var(--color-bg-elevated)' }}>
          <div>
            <strong>{d.name}</strong>
            <div style={{ color: 'var(--color-text-secondary)' }}>{d.location}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Last active: {d.lastActive}</div>
            {d.current && <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Current Device</span>}
          </div>
          {!d.current && <Button size="sm" variant="danger" onClick={() => onRevoke(d.id)}>Revoke</Button>}
        </Card>
      ))}
      {devices.length === 0 && <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No active devices</div>}
    </Card>
  );
});

export default DeviceManagementPage; 