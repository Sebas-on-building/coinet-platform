"use client";

import { Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example NewsFeedWidget (replace with your actual import)
import NewsFeedWidget from '@/components/news/NewsFeedWidget';

export default function NewsPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="News page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="News page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <FocusTrap>
          <NewsFeedWidget />
        </FocusTrap>
      </Suspense>
    </div>
  );
}
