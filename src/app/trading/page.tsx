'use client';

import React, { Suspense } from 'react';
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';
import { MarketTickerCard } from "@/components/trading/MarketTickerCard";
import dynamic from 'next/dynamic';

// Import styles for the animation tokens
import '@/styles/tokens/animations.css';

// Dynamic import with loading state
const EnhancedTradingDashboard = dynamic(
  () => import('@/components/trading/EnhancedTradingDashboard').then(mod => mod.default || mod),
  {
    loading: () => <SkeletonLoader variant="rect" width="100%" height={400} />,
    ssr: false
  }
);

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
      return <ErrorMessage message="Failed to load trading panel." code={500} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

/**
 * Trading Dashboard Page
 * 
 * This page provides a comprehensive trading interface with advanced
 * visual styles and professional trading tools.
 */
export default function TradingPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Trading dashboard" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Trading dashboard loaded" />
      <div className="flex flex-wrap mb-6 gap-4">
        <MarketTickerCard symbol="BTCUSDT" className="flex-1 min-w-[240px]" />
        <MarketTickerCard symbol="ETHUSDT" className="flex-1 min-w-[240px]" />
        <MarketTickerCard symbol="SOLUSDT" className="flex-1 min-w-[240px]" />
      </div>
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <ErrorBoundary>
          <EnhancedTradingDashboard />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
