import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card/Card';
import ChaptersList from './ChaptersList';

const chapters = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  title: `Chapter ${i + 1}`,
  timestamp: `${i * 5}:00`,
}));

const ChapterRow = React.memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
  const chapter = chapters[index];
  return (
    <div style={{ ...style, padding: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border)' }}>
      <strong>{chapter.title}</strong> <span>{chapter.timestamp}</span>
    </div>
  );
});

const Chapters = React.memo(() => {
  const itemData = useMemo(() => chapters, []);
  return (
    <Card style={{ minWidth: 220, maxHeight: 400, overflow: 'hidden', flex: 1 }}>
      <h3 style={{ margin: 0, fontWeight: 600 }}>Chapters</h3>
      <ChaptersList />
    </Card>
  );
});

export default Chapters; 