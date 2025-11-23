import React from 'react';
import { Card } from '@/components/ui/Card/Card';

interface CommentDetailsProps {
  user: string;
  text: string;
  timestamp?: string;
}

const CommentDetails = React.memo(({ user, text, timestamp }: CommentDetailsProps) => (
  <Card style={{ padding: 'var(--spacing-md)', minWidth: 220 }}>
    <h4 style={{ margin: 0 }}>{user}</h4>
    {timestamp && <div style={{ color: 'var(--color-text-secondary)' }}>{timestamp}</div>}
    <p style={{ marginTop: 'var(--spacing-sm)' }}>{text}</p>
  </Card>
));

export default CommentDetails; 