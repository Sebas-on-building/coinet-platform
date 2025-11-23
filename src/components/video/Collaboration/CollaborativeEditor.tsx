import React, { useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { sanitizeText } from '@/utils/sanitize';

const mockUsers = [
  { id: 1, name: 'Alice', color: '#FF6B6B' },
  { id: 2, name: 'Bob', color: '#4ECDC4' },
];

const CollaborativeEditor = React.memo(() => {
  const [content, setContent] = useState('Edit your video script or notes here...');
  const [users] = useState(mockUsers);
  const [comments, setComments] = useState([
    { id: 1, user: 'Alice', text: "Let's add an intro here." },
    { id: 2, user: 'Bob', text: 'Great idea!' },
  ]);
  return (
    <Card style={{ padding: 'var(--spacing-lg)', minWidth: 340, minHeight: 220, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {users.map(u => (
          <span key={u.id} style={{ background: u.color, color: '#fff', borderRadius: 12, padding: '2px 10px', fontWeight: 600 }}>{sanitizeText(u.name)}</span>
        ))}
      </div>
      <textarea
        value={content}
        onChange={e => setContent(sanitizeText(e.target.value))}
        style={{ width: '100%', minHeight: 80, borderRadius: 8, border: '1px solid var(--color-border)', padding: 8, fontSize: 16 }}
        aria-label="Collaborative Editor"
      />
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {comments.map(c => (
          <Card key={c.id} style={{ padding: 6, background: 'var(--color-bg-elevated)' }}>
            <strong>{sanitizeText(c.user)}:</strong> {sanitizeText(c.text)}
          </Card>
        ))}
      </div>
      <Button size="sm" variant="primary" style={{ alignSelf: 'flex-end' }}>Add Comment</Button>
    </Card>
  );
});

export default CollaborativeEditor; 