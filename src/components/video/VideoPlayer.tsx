import React, { Suspense } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Spinner } from '@/components/ui/Spinner/Spinner';

const Chapters = React.lazy(() => import('./Chapters/Chapters'));
const Overlays = React.lazy(() => import('./Overlays/Overlays'));
const AI = React.lazy(() => import('./AI/AI'));
const Accessibility = React.lazy(() => import('./Accessibility/Accessibility'));
const Analytics = React.lazy(() => import('./Analytics/Analytics'));
const Collaboration = React.lazy(() => import('./Collaboration/Collaboration'));
const Editor = React.lazy(() => import('./Editor/Editor'));
const Plugins = React.lazy(() => import('./Plugins/Plugins'));
const Resources = React.lazy(() => import('./Resources/Resources'));

const VideoPlayer = React.memo(() => (
  <Card style={{
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-xl)',
    boxShadow: 'var(--shadow-lg)',
    background: 'var(--color-bg-elevated)',
    overflow: 'hidden',
    minHeight: 600,
    position: 'relative',
  }}>
    {/* Main Video Area */}
    <div style={{ flex: 2, position: 'relative', background: 'black', borderRadius: 'var(--radius-lg)' }}>
      {/* Video element would go here */}
      <Suspense fallback={<Spinner />}>
        <Overlays />
      </Suspense>
    </div>
    {/* Sub-features below video */}
    <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
      <Suspense fallback={<Spinner />}><Chapters /></Suspense>
      <Suspense fallback={<Spinner />}><AI /></Suspense>
      <Suspense fallback={<Spinner />}><Accessibility /></Suspense>
      <Suspense fallback={<Spinner />}><Analytics /></Suspense>
      <Suspense fallback={<Spinner />}><Collaboration /></Suspense>
      <Suspense fallback={<Spinner />}><Editor /></Suspense>
      <Suspense fallback={<Spinner />}><Plugins /></Suspense>
      <Suspense fallback={<Spinner />}><Resources /></Suspense>
    </div>
  </Card>
));

export default VideoPlayer; 