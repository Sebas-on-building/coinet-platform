import React from 'react';
import { Card } from '@/components/ui/Card/Card';

const mockUsers = [
  { id: 1, name: 'Alice', color: '#FF6B6B' },
  { id: 2, name: 'Bob', color: '#4ECDC4' },
  { id: 3, name: 'Eve', color: '#FFD93D' },
];

const CollabPresenceBar = React.memo(() => (
  <Card style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 8, background: 'var(--color-bg-elevated)' }}>
    {mockUsers.map(u => (
      <span key={u.id} style={{ background: u.color, color: '#fff', borderRadius: 16, padding: '4px 14px', fontWeight: 600 }}>{u.name}</span>
    ))}
  </Card>
));

export default CollabPresenceBar; 