import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/RealTimeCollab',
  parameters: {
    docs: {
      description: {
        component: 'A real-time collaborative dashboard, showing multiple users editing widgets live (mocked for demo).',
      },
    },
  },
};

export const RealTimeCollab = () => {
  const [users] = useState([
    { id: 1, name: 'Alice', color: '#00ffa3' },
    { id: 2, name: 'Bob', color: '#0057ff' },
  ]);
  return (
    <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {users.map(u => (
          <span key={u.id} style={{ background: u.color, color: '#fff', borderRadius: 8, padding: '4px 12px', fontWeight: 700 }}>
            {u.name} (editing)
          </span>
        ))}
      </div>
      <Card>
        <h3>Live Collaboration</h3>
        <p>Multiple users are editing this dashboard in real time. (This is a mock, but can be wired to a real backend with WebSocket/CRDT.)</p>
      </Card>
    </div>
  );
};
