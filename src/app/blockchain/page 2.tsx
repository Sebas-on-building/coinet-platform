"use client";

import React, { Suspense } from 'react';
import { BlockchainDataFeed } from "@/components/blockchain/BlockchainDataFeed";
import { RealTimeBlockchainFeed } from "@/components/blockchain/RealTimeBlockchainFeed";
import { MEVMonitor } from "@/components/blockchain/MEVMonitor";
import { SecurityMonitor } from "@/components/blockchain/SecurityMonitor";
import { MarketSentimentAnalyzer } from "@/components/blockchain/MarketSentimentAnalyzer";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example BlockchainWidget (replace with your actual import)
import BlockchainWidget from '@/components/blockchain/BlockchainWidget';

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
      return <ErrorMessage message="Failed to load blockchain data." code={500} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

export default function BlockchainPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Blockchain page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Blockchain page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <ErrorBoundary>
          <FocusTrap>
            <BlockchainWidget />
          </FocusTrap>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
