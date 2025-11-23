import React, { useState, Suspense } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useChapters } from '@/hooks/useChapters';
import { Button } from '@/components/ui/Button/Button';

const ChapterDetails = React.lazy(() => import('./ChapterDetails'));

const ChaptersList = React.memo(() => {
  const { data: chapters, isLoading, isError, refetch, bookmark, react } = useChapters();
  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) return <Spinner />;
  if (isError) return <div style={{ color: 'var(--color-error)' }}>Failed to load chapters. <Button onClick={() => refetch()}>Retry</Button></div>;
  if (!chapters || chapters.length === 0) return <div style={{ color: 'var(--color-text-secondary)' }}>No chapters found.</div>;

  const ChapterRow = React.memo(({ index, style, onClick }: { index: number; style: React.CSSProperties; onClick: (index: number) => void }) => {
    const chapter = chapters[index];
    return (
      <div style={{ ...style, padding: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => onClick(index)} style={{ flex: 1 }}>
          <strong>{chapter.title}</strong> <span>{chapter.timestamp}</span>
        </div>
        <Button size="xs" variant={chapter.bookmarked ? 'primary' : 'ghost'} aria-label="Bookmark" onClick={() => bookmark.mutate({ id: chapter.id })} style={{ marginLeft: 8 }}>
          {chapter.bookmarked ? '★' : '☆'}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Like" onClick={() => react.mutate({ id: chapter.id, reaction: 'like' })} style={{ marginLeft: 4 }}>
          👍 {chapter.reactions?.like ?? 0}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Love" onClick={() => react.mutate({ id: chapter.id, reaction: 'love' })} style={{ marginLeft: 2 }}>
          ❤️ {chapter.reactions?.love ?? 0}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Wow" onClick={() => react.mutate({ id: chapter.id, reaction: 'wow' })} style={{ marginLeft: 2 }}>
          😮 {chapter.reactions?.wow ?? 0}
        </Button>
      </div>
    );
  });

  return (
    <div>
      <List
        height={400}
        itemCount={chapters.length}
        itemSize={36}
        width={320}
      >
        {({ index, style }) => (
          <ChapterRow index={index} style={style} onClick={setSelected} />
        )}
      </List>
      {selected !== null && (
        <Suspense fallback={<Spinner />}>
          <ChapterDetails
            title={chapters[selected].title}
            timestamp={chapters[selected].timestamp}
            description={chapters[selected].description}
          />
        </Suspense>
      )}
    </div>
  );
});

export default ChaptersList; 