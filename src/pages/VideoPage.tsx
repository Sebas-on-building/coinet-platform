import React, { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner/Spinner';

const VideoPlayer = React.lazy(() => import('@/components/video/VideoPlayer'));

const VideoPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', minHeight: '100vh', background: 'var(--color-bg)' }}>
    <Suspense fallback={<Spinner />}>
      <VideoPlayer />
    </Suspense>
  </div>
);

export default VideoPage; 