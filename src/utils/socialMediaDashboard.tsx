import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { TwitterFeed } from "@/components/social/TwitterFeed";

// Define the proper types
interface TwitterPost {
  id: string;
  username: string;
  handle: string;
  content: string;
  timestamp: number;
  likes: number;
  retweets: number;
  sentiment: number;
  verified: boolean;
  followers: number;
}

interface TwitterMetrics {
  sentiment_score: number;
  mention_count: number;
  top_hashtags: Array<{ tag: string; count: number }>;
  top_posts: TwitterPost[];
  influential_users: Array<{
    username: string;
    followers: number;
    engagement: number;
  }>;
}

interface SocialMediaDashboardProps {
  symbol: string;
  timeframe?: string;
}

export function SocialMediaDashboard({
  symbol,
  timeframe = "1d",
}: SocialMediaDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [twitterData, setTwitterData] = useState<TwitterMetrics>({
    sentiment_score: 0,
    mention_count: 0,
    top_hashtags: [],
    top_posts: [],
    influential_users: [],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Mockup data for demonstration
        const mockData: TwitterMetrics = {
          sentiment_score: 65,
          mention_count: 2543,
          top_hashtags: [
            { tag: "crypto", count: 245 },
            { tag: "bitcoin", count: 187 },
            { tag: "trading", count: 112 },
          ],
          top_posts: [
            {
              id: "1",
              username: "CryptoAnalyst",
              handle: "crypto_analyst",
              content: `${symbol} is showing strong support at the current level. Watch for a breakout pattern in the next few days.`,
              timestamp: Date.now() - 3600000,
              likes: 243,
              retweets: 56,
              sentiment: 0.8,
              verified: true,
              followers: 25400,
            },
            {
              id: "2",
              username: "TradingExpert",
              handle: "trading_pro",
              content: `Just bought more ${symbol}. The technical indicators are very promising!`,
              timestamp: Date.now() - 7200000,
              likes: 187,
              retweets: 34,
              sentiment: 0.9,
              verified: true,
              followers: 34500,
            },
          ],
          influential_users: [
            { username: "CryptoWhale", followers: 1250000, engagement: 3.2 },
            { username: "TradingGuru", followers: 850000, engagement: 4.5 },
          ],
        };

        setTwitterData(mockData);
      } catch (error) {
        console.error("Error fetching social media data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [symbol]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Social Media Analysis</h2>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <TwitterFeed data={twitterData} symbol={symbol} />
      )}
    </div>
  );
}
