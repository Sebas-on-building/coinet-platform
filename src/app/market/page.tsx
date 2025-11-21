import React, { Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example MarketOverviewWidget (replace with your actual import)
import MarketOverviewWidget from '@/components/dashboard/widgets/MarketOverviewWidget';

// ErrorBoundary for widgets
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <ErrorMessage message="Failed to load market data." code={500} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

export default function MarketPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Market page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Market page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <ErrorBoundary>
          <FocusTrap>
            <MarketOverviewWidget />
          </FocusTrap>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
