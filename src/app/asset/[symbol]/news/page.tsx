import { NewsAggregator } from "@/components/news/NewsAggregator";
import { Metadata } from "next";
import {
  OnChainNewsService,
  VerifiedNews,
} from "@/services/onChainNewsService";
import { VerifiedNewsItem } from "@/components/news/VerifiedNewsItem";
import { ProjectNewsManager } from "@/components/news/ProjectNewsManager";
import React, { Suspense } from "react";
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

interface PageParams {
  params: {
    symbol: string;
  };
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  return {
    title: `${params.symbol.toUpperCase()} News | Coinet`,
    description: `Latest cryptocurrency news and updates for ${params.symbol.toUpperCase()} with sentiment analysis and real-time data`,
  };
}

async function getVerifiedNews() {
  try {
    const newsService = OnChainNewsService.getInstance();
    const news = await newsService.signNewsAnnouncement(
      "Title",
      "Content",
      "0xProjectAddress",
      "privateKey",
    );

    const verificationResult = await newsService.verifyNewsSignature(news);

    return {
      id: news.id,
      title: news.title,
      content: news.content,
      timestamp: news.timestamp,
      signature: news.signature,
      signerAddress: verificationResult.signerAddress,
      projectAddress: verificationResult.projectAddress,
      chainId: verificationResult.verificationDetails?.chainId || 1,
      txHash: verificationResult.verificationDetails?.txHash,
    } as VerifiedNews;
  } catch (error) {
    console.error("Error fetching verified news:", error);
    throw error;
  }
}

// ErrorBoundary for widgets
class ErrorBoundary extends React.Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default async function AssetNewsPage({ params }: PageParams) {
  const { symbol } = params;

  return (
    <div className="container mx-auto py-8 px-4" aria-label="Asset news page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message={`${symbol.toUpperCase()} news page loaded`} />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={200} />}>
        <FocusTrap>
          <NewsAggregator
            symbol={symbol.toUpperCase()}
            maxItems={20}
            showControls={true}
          />
        </FocusTrap>
      </Suspense>

      <ErrorBoundary
        fallback={<ErrorMessage message="Failed to load verified news" code={500} />}
      >
        <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={120} />}>
          <FocusTrap>
            <VerifiedNewsItem news={await getVerifiedNews()} />
          </FocusTrap>
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={<ErrorMessage message="Failed to load project news manager" code={500} />}
      >
        <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={120} />}>
          <FocusTrap>
            <ProjectNewsManager
              projectAddress="0xProjectAddress"
              privateKey="privateKey"
            />
          </FocusTrap>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
