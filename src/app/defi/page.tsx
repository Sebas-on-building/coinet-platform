import { Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example DeFiWidget (replace with your actual import)
import DeFiWidget from '@/components/defi/DeFiWidget';

export default function DeFiPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="DeFi page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="DeFi page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <FocusTrap>
          <DeFiWidget />
        </FocusTrap>
      </Suspense>
    </div>
  );
}
