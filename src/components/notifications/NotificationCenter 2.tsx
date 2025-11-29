import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockNotifications = [
  { id: 1, type: 'alert', title: 'Price Alert', message: 'BTC crossed $70,000', read: false, time: '1m ago' },
  { id: 2, type: 'news', title: 'Market News', message: 'ETH ETF approved', read: true, time: '10m ago' },
];

const NotificationCard = React.memo(({ n, onRead }: { n: any; onRead: (id: number) => void }) => (
  <Card style={{ padding: 12, background: n.read ? 'var(--color-bg-elevated)' : 'var(--color-primary-fade)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <strong>{n.title}</strong>
      <div style={{ color: 'var(--color-text-secondary)' }}>{n.message}</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{n.time}</div>
    </div>
    {!n.read && <Button size="xs" variant="primary" onClick={() => onRead(n.id)}>Mark as read</Button>}
  </Card>
));

const NotificationCenter = React.memo(() => {
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState(mockNotifications);
  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const onRead = (id: number) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  return (
    <Card style={{ position: 'fixed', top: 64, right: 24, width: 340, zIndex: 1000, maxHeight: 500, overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Button size="xs" variant={filter === 'all' ? 'primary' : 'ghost'} onClick={() => setFilter('all')}>All</Button>
        <Button size="xs" variant={filter === 'alert' ? 'primary' : 'ghost'} onClick={() => setFilter('alert')}>Alerts</Button>
        <Button size="xs" variant={filter === 'news' ? 'primary' : 'ghost'} onClick={() => setFilter('news')}>News</Button>
      </div>
      {filtered.map(n => <NotificationCard key={n.id} n={n} onRead={onRead} />)}
      {filtered.length === 0 && <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 32 }}>No notifications</div>}
    </Card>
  );
});

export default NotificationCenter; 