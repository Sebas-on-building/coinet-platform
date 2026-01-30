"use client";

import { Suspense } from 'react';
import { BlockchainDataFeed } from "@/components/blockchain/BlockchainDataFeed";
import { RealTimeBlockchainFeed } from "@/components/blockchain/RealTimeBlockchainFeed";
import { MEVMonitor } from "@/components/blockchain/MEVMonitor";
import { SecurityMonitor } from "@/components/blockchain/SecurityMonitor";
import { MarketSentimentAnalyzer } from "@/components/blockchain/MarketSentimentAnalyzer";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

// Example BlockchainWidget (replace with your actual import)
import BlockchainWidget from '@/components/blockchain/BlockchainWidget';

export default function BlockchainPage() {
  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Blockchain page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Blockchain page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <FocusTrap>
          <BlockchainWidget />
        </FocusTrap>
      </Suspense>
    </div>
  );
}
