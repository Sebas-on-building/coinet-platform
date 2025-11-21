import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default {
  title: 'Dashboard/NotificationCenter',
};

export const NotificationCenter = () => {
  const [open, setOpen] = useState(true);
  const notifications = [
    { id: 1, text: 'BTC price crossed $70,000', type: 'success' },
    { id: 2, text: 'Portfolio rebalanced', type: 'info' },
    { id: 3, text: 'New AI insight available', type: 'ai' },
  ];
  return (
    <div style={{ padding: 32, background: 'linear-gradient(120deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <Button onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'} Notifications</Button>
      {open && (
        <Card style={{ position: 'fixed', top: 32, right: 32, width: 360, zIndex: 100 }}>
          <h3>Notifications</h3>
          <ul>
            {notifications.map(n => (
              <li key={n.id} style={{ margin: '12px 0', color: n.type === 'success' ? '#00ffa3' : n.type === 'ai' ? '#0057ff' : '#23234d' }}>
                {n.text}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
