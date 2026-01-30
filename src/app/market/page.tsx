import { Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example MarketOverviewWidget (replace with your actual import)
import MarketOverviewWidget from '@/components/dashboard/widgets/MarketOverviewWidget';

export default function MarketPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Market page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Market page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <FocusTrap>
          <MarketOverviewWidget />
        </FocusTrap>
      </Suspense>
    </div>
  );
}
