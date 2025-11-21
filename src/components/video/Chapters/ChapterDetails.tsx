import React from 'react';
import { Card } from '@/components/ui/Card/Card';

interface ChapterDetailsProps {
  title: string;
  timestamp: string;
  description?: string;
}

const ChapterDetails = React.memo(({ title, timestamp, description }: ChapterDetailsProps) => (
  <Card style={{ padding: 'var(--spacing-md)', minWidth: 220 }}>
    <h4 style={{ margin: 0 }}>{title}</h4>
    <div style={{ color: 'var(--color-text-secondary)' }}>{timestamp}</div>
    {description && <p style={{ marginTop: 'var(--spacing-sm)' }}>{description}</p>}
  </Card>
));

export default ChapterDetails; 