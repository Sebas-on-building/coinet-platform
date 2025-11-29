"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import { api } from "@/services/api";
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
import { ErrorMessage } from '@/design-system/components/atoms/ErrorMessage';
import { FocusTrap } from '@/design-system/components/organisms/FocusTrap';
import { A11yAnnouncer } from '@/design-system/components/atoms/A11yAnnouncer';
import { NetworkStatusBanner } from '@/design-system/components/organisms/NetworkStatusBanner';

interface CryptoSocialData {
  symbol: string;
  name: string;
  logo?: string;
  sentiment_score: number;
  sentiment_change_24h: number;
  twitter_followers: number;
  reddit_subscribers: number;
  news_mentions_24h: number;
}

// Example SocialFeedWidget (replace with your actual import)
import SocialFeedWidget from '@/components/social/SocialFeedWidget';

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
      return <ErrorMessage message="Failed to load social feed." code={500} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

export default function SocialIndexPage() {
  const [cryptoList, setCryptoList] = useState<CryptoSocialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCryptoSocialData = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would fetch from the API
        // For now, we'll use mock data

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockData: CryptoSocialData[] = [
          {
            symbol: "BTC",
            name: "Bitcoin",
            sentiment_score: 75,
            sentiment_change_24h: 2.5,
            twitter_followers: 4800000,
            reddit_subscribers: 5200000,
            news_mentions_24h: 342,
          },
          {
            symbol: "ETH",
            name: "Ethereum",
            sentiment_score: 82,
            sentiment_change_24h: 4.2,
            twitter_followers: 3200000,
            reddit_subscribers: 1800000,
            news_mentions_24h: 256,
          },
          {
            symbol: "SOL",
            name: "Solana",
            sentiment_score: 68,
            sentiment_change_24h: -1.8,
            twitter_followers: 980000,
            reddit_subscribers: 520000,
            news_mentions_24h: 124,
          },
          {
            symbol: "DOGE",
            name: "Dogecoin",
            sentiment_score: 62,
            sentiment_change_24h: -3.4,
            twitter_followers: 3500000,
            reddit_subscribers: 2400000,
            news_mentions_24h: 98,
          },
          {
            symbol: "ADA",
            name: "Cardano",
            sentiment_score: 71,
            sentiment_change_24h: 0.8,
            twitter_followers: 1200000,
            reddit_subscribers: 680000,
            news_mentions_24h: 86,
          },
          {
            symbol: "DOT",
            name: "Polkadot",
            sentiment_score: 66,
            sentiment_change_24h: 1.2,
            twitter_followers: 780000,
            reddit_subscribers: 320000,
            news_mentions_24h: 62,
          },
          {
            symbol: "LINK",
            name: "Chainlink",
            sentiment_score: 74,
            sentiment_change_24h: 2.6,
            twitter_followers: 650000,
            reddit_subscribers: 210000,
            news_mentions_24h: 48,
          },
          {
            symbol: "XRP",
            name: "Ripple",
            sentiment_score: 58,
            sentiment_change_24h: -4.2,
            twitter_followers: 2100000,
            reddit_subscribers: 950000,
            news_mentions_24h: 112,
          },
        ];

        setCryptoList(mockData);
      } catch (error) {
        console.error("Error fetching social data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCryptoSocialData();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score <= 30) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "Bullish";
    if (score >= 60) return "Slightly Bullish";
    if (score <= 30) return "Bearish";
    if (score <= 40) return "Slightly Bearish";
    return "Neutral";
  };

  const filteredCryptos = cryptoList.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Social page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Social page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <ErrorBoundary>
          <FocusTrap>
            <SocialFeedWidget />
          </FocusTrap>
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}
