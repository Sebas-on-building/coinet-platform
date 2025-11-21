import React, { useState, Suspense } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useComments } from '@/hooks/useComments';
import { Button } from '@/components/ui/Button/Button';

const CommentDetails = React.lazy(() => import('./CommentDetails'));

const Comments = React.memo(() => {
  const { data: comments, isLoading, isError, refetch, bookmark, react } = useComments();
  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) return <Spinner />;
  if (isError) return <div style={{ color: 'var(--color-error)' }}>Failed to load comments. <Button onClick={() => refetch()}>Retry</Button></div>;
  if (!comments || comments.length === 0) return <div style={{ color: 'var(--color-text-secondary)' }}>No comments found.</div>;

  const CommentRow = React.memo(({ index, style, onClick }: { index: number; style: React.CSSProperties; onClick: (index: number) => void }) => {
    const comment = comments[index];
    return (
      <div style={{ ...style, padding: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => onClick(index)} style={{ flex: 1 }}>
          <strong>{comment.user}:</strong> <span>{comment.text}</span>
        </div>
        <Button size="xs" variant={comment.bookmarked ? 'primary' : 'ghost'} aria-label="Bookmark" onClick={() => bookmark.mutate({ id: comment.id })} style={{ marginLeft: 8 }}>
          {comment.bookmarked ? '★' : '☆'}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Like" onClick={() => react.mutate({ id: comment.id, reaction: 'like' })} style={{ marginLeft: 4 }}>
          👍 {comment.reactions?.like ?? 0}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Love" onClick={() => react.mutate({ id: comment.id, reaction: 'love' })} style={{ marginLeft: 2 }}>
          ❤️ {comment.reactions?.love ?? 0}
        </Button>
        <Button size="xs" variant="ghost" aria-label="Wow" onClick={() => react.mutate({ id: comment.id, reaction: 'wow' })} style={{ marginLeft: 2 }}>
          😮 {comment.reactions?.wow ?? 0}
        </Button>
      </div>
    );
  });

  return (
    <div>
      <List
        height={180}
        itemCount={comments.length}
        itemSize={36}
        width={320}
      >
        {({ index, style }) => (
          <CommentRow index={index} style={style} onClick={setSelected} />
        )}
      </List>
      {selected !== null && (
        <Suspense fallback={<Spinner />}>
          <CommentDetails
            user={comments[selected].user}
            text={comments[selected].text}
            timestamp={comments[selected].timestamp}
          />
        </Suspense>
      )}
    </div>
  );
});

export default Comments; 