"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TwitterFeed } from "@/components/social/TwitterFeed";
import { RedditFeed } from "./RedditFeed";
import { SocialSentimentOverview } from "./SocialSentimentOverview";
import { SocialMediaMetrics } from "./SocialMediaMetrics";
import { api } from "@/services/api";
import { SentimentData } from "@/services/api";

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
  timeframe?: "1h" | "24h" | "7d";
}

export function SocialMediaDashboard({
  symbol,
  timeframe = "24h",
}: SocialMediaDashboardProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [twitterData, setTwitterData] = useState<TwitterMetrics>({
    sentiment_score: 0,
    mention_count: 0,
    top_hashtags: [],
    top_posts: [],
    influential_users: [],
  });

  useEffect(() => {
    const fetchSentimentData = async () => {
      setLoading(true);
      try {
        const data = await api.getSentimentData(symbol, timeframe);
        setSentimentData(data);
      } catch (error) {
        console.error("Error fetching sentiment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSentimentData();
  }, [symbol, timeframe]);

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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700/50 rounded w-1/4"></div>
          <div className="h-32 bg-gray-700/50 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!sentimentData) {
    return (
      <Card className="p-6">
        <p className="text-gray-400">
          No social media data available for {symbol}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SocialMediaMetrics data={sentimentData} symbol={symbol} />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="twitter">Twitter/X</TabsTrigger>
          <TabsTrigger value="reddit">Reddit</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SocialSentimentOverview data={sentimentData} symbol={symbol} />
        </TabsContent>

        <TabsContent value="twitter" className="space-y-6">
          <TwitterFeed data={twitterData} symbol={symbol} />
        </TabsContent>

        <TabsContent value="reddit" className="space-y-6">
          <RedditFeed
            data={sentimentData.social_metrics.reddit}
            symbol={symbol}
          />
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Latest News</h3>
            <div className="space-y-4">
              {sentimentData.social_metrics.news.top_articles.map(
                (article, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex justify-between">
                      <h4 className="font-medium">{article.title}</h4>
                      <div
                        className={`text-sm font-medium ${
                          article.sentiment > 0.6
                            ? "text-green-500"
                            : article.sentiment < 0.4
                              ? "text-red-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {article.sentiment > 0.6
                          ? "Positive"
                          : article.sentiment < 0.4
                            ? "Negative"
                            : "Neutral"}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {article.source} •{" "}
                      {new Date(article.timestamp).toLocaleString()}
                    </div>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-blue-500 hover:text-blue-600"
                    >
                      Read more →
                    </a>
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              News sentiment score:{" "}
              {sentimentData.social_metrics.news.sentiment_score}/100
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
