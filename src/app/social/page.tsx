"use client";

import { useState, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import { api } from "@/services/api";
import { SkeletonLoader } from '@/design-system/components/atoms/SkeletonLoader';
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

export default function SocialIndexPage() {
  const [cryptoList, setCryptoList] = useState<CryptoSocialData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCryptoSocialData = async () => {
      setLoading(true);
      try {
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

  return (
    <div className="container px-4 py-8 mx-auto" aria-label="Social page" role="main">
      <NetworkStatusBanner />
      <A11yAnnouncer message="Social page loaded" />
      <Suspense fallback={<SkeletonLoader variant="rect" width="100%" height={400} />}>
        <FocusTrap>
          <SocialFeedWidget />
        </FocusTrap>
      </Suspense>
    </div>
  );
}
