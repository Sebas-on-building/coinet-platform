import React, { useState, Suspense } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useAnalyticsEvents } from '@/hooks/useAnalyticsEvents';
import { Button } from '@/components/ui/Button/Button';

const AnalyticsEventDetails = React.lazy(() => import('./AnalyticsEventDetails'));

const AnalyticsEvents = React.memo(() => {
  const { data: events, isLoading, isError, refetch, exportData, share } = useAnalyticsEvents();
  const [selected, setSelected] = useState<number | null>(null);

  if (isLoading) return <Spinner />;
  if (isError) return <div style={{ color: 'var(--color-error)' }}>Failed to load analytics events. <Button onClick={() => refetch()}>Retry</Button></div>;
  if (!events || events.length === 0) return <div style={{ color: 'var(--color-text-secondary)' }}>No analytics events found.</div>;

  const EventRow = React.memo(({ index, style, onClick }: { index: number; style: React.CSSProperties; onClick: (index: number) => void }) => {
    const event = events[index];
    return (
      <div style={{ ...style, padding: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => onClick(index)} style={{ flex: 1 }}>
          <strong>{event.type}</strong> <span>{event.timestamp}</span>
        </div>
      </div>
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
        <Button size="sm" variant="primary" onClick={() => exportData.mutate()}>Export</Button>
        <Button size="sm" variant="secondary" onClick={() => share.mutate()}>Share</Button>
      </div>
      <List
        height={200}
        itemCount={events.length}
        itemSize={32}
        width={320}
      >
        {({ index, style }) => (
          <EventRow index={index} style={style} onClick={setSelected} />
        )}
      </List>
      {selected !== null && (
        <Suspense fallback={<Spinner />}>
          <AnalyticsEventDetails
            type={events[selected].type}
            timestamp={events[selected].timestamp}
            details={events[selected].details}
          />
        </Suspense>
      )}
    </div>
  );
});

export default AnalyticsEvents; 