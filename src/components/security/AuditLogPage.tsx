import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';

const mockLogs = [
  { id: 1, action: 'Login', time: '2025-05-29 10:00', device: 'MacBook Air', location: 'Berlin, DE' },
  { id: 2, action: 'Trade Executed', time: '2025-05-29 09:45', device: 'iPhone 15', location: 'Munich, DE' },
  { id: 3, action: 'Settings Changed', time: '2025-05-28 18:20', device: 'iPad Pro', location: 'Zurich, CH' },
];

const AuditLogPage = React.memo(() => {
  const [filter, setFilter] = useState('all');
  const logs = filter === 'all' ? mockLogs : mockLogs.filter(l => l.action === filter);
  const actions = ['all', ...Array.from(new Set(mockLogs.map(l => l.action)))];
  return (
    <Card style={{ maxWidth: 600, margin: '40px auto', padding: 32 }}>
      <h2>Audit Log</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {actions.map(a => (
          <Button key={a} size="xs" variant={filter === a ? 'primary' : 'ghost'} onClick={() => setFilter(a)}>{a}</Button>
        ))}
      </div>
      {logs.map(l => (
        <Card key={l.id} style={{ marginBottom: 10, padding: 10, background: 'var(--color-bg-elevated)' }}>
          <strong>{l.action}</strong> <span style={{ color: 'var(--color-text-secondary)' }}>{l.time}</span>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{l.device} • {l.location}</div>
        </Card>
      ))}
      {logs.length === 0 && <div style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>No log entries</div>}
    </Card>
  );
});

export default AuditLogPage; 