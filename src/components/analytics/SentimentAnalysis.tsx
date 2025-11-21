"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  FaceSmileIcon,
  UserGroupIcon,
  HashtagIcon,
} from "@heroicons/react/24/solid";

interface SentimentData {
  score: number;
  change: number;
  volume: number;
  timeframe: string;
  sources: {
    twitter: number;
    reddit: number;
    news: number;
    telegram: number;
  };
  topics: Array<{
    topic: string;
    sentiment: number;
    volume: number;
  }>;
  influencers: Array<{
    username: string;
    platform: string;
    sentiment: number;
    followers: number;
    recentPost: string;
  }>;
}

interface SentimentAnalysisProps {
  symbol: string;
  timeframe?: "1h" | "24h" | "7d" | "30d";
}

export function SentimentAnalysis({
  symbol,
  timeframe = "24h",
}: SentimentAnalysisProps) {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // In a real implementation, fetch from API
      // const response = await api.get(`/sentiment/${symbol}`, { timeframe });

      // Mock data
      setTimeout(() => {
        const mockData: SentimentData = {
          score: Math.random() * 2 - 1, // -1 to 1
          change: (Math.random() * 2 - 1) * 0.3, // -0.3 to 0.3
          volume: Math.floor(Math.random() * 10000) + 5000,
          timeframe,
          sources: {
            twitter: Math.random() * 0.5 + 0.3, // 0.3 to 0.8
            reddit: Math.random() * 0.4 + 0.2, // 0.2 to 0.6
            news: Math.random() * 0.3 + 0.1, // 0.1 to 0.4
            telegram: Math.random() * 0.2 + 0.1, // 0.1 to 0.3
          },
          topics: [
            {
              topic: "price",
              sentiment: Math.random() * 2 - 1,
              volume: Math.random() * 1000 + 500,
            },
            {
              topic: "development",
              sentiment: Math.random() * 0.8,
              volume: Math.random() * 800 + 300,
            },
            {
              topic: "regulation",
              sentiment: Math.random() * 2 - 1,
              volume: Math.random() * 600 + 200,
            },
            {
              topic: "adoption",
              sentiment: Math.random() * 0.6,
              volume: Math.random() * 500 + 200,
            },
            {
              topic: "competition",
              sentiment: Math.random() * 2 - 1,
              volume: Math.random() * 400 + 100,
            },
          ],
          influencers: [
            {
              username: "crypto_analyst",
              platform: "twitter",
              sentiment: Math.random() * 0.6 + 0.2,
              followers: 245000,
              recentPost: `${symbol} looking strong with the new upgrades! Bullish for Q2 🚀`,
            },
            {
              username: "blockchain_guru",
              platform: "twitter",
              sentiment: Math.random() * 0.8 + 0.1,
              followers: 189000,
              recentPost: `Just analyzed ${symbol} fundamentals - solid technology and growing adoption!`,
            },
            {
              username: "defi_investor",
              platform: "reddit",
              sentiment: Math.random() * 2 - 1,
              followers: 120000,
              recentPost: `${symbol} needs to solve scaling before it can compete with newer projects.`,
            },
            {
              username: "coin_trader",
              platform: "telegram",
              sentiment: Math.random() * 2 - 1,
              followers: 95000,
              recentPost: `${symbol} breaking key resistance. Technical analysis suggests upside potential.`,
            },
            {
              username: "crypto_news",
              platform: "twitter",
              sentiment: Math.random() * 0.4,
              followers: 320000,
              recentPost: `BREAKING: Major partnership announced for ${symbol}, details inside!`,
            },
          ],
        };

        setSentimentData(mockData);
        setLoading(false);
      }, 500);
    };

    fetchData();
  }, [symbol, timeframe]);

  const getSentimentColor = (score: number) => {
    if (score > 0.5) return "text-green-500";
    if (score > 0.1) return "text-green-400";
    if (score > -0.1) return "text-gray-400";
    if (score > -0.5) return "text-red-400";
    return "text-red-500";
  };

  const getSentimentText = (score: number) => {
    if (score > 0.7) return "Very Bullish";
    if (score > 0.3) return "Bullish";
    if (score > 0.1) return "Slightly Bullish";
    if (score > -0.1) return "Neutral";
    if (score > -0.3) return "Slightly Bearish";
    if (score > -0.7) return "Bearish";
    return "Very Bearish";
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.1) return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
    if (score > -0.1)
      return <FaceSmileIcon className="h-5 w-5 text-gray-400" />;
    return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
  };

  if (loading || !sentimentData) {
    return (
      <Card className="p-4">
        <div className="animate-pulse h-96 w-full bg-gray-800/50 rounded-lg"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Social Sentiment ({symbol})</h3>
        <div className="flex space-x-2">
          {["1h", "24h", "7d", "30d"].map((tf) => (
            <button
              key={tf}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700/50 text-gray-300"
              }`}
              onClick={() => {}}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Overall Sentiment</div>
          <div className="flex items-center mt-1">
            <span
              className={`text-2xl font-bold ${getSentimentColor(sentimentData.score)}`}
            >
              {(sentimentData.score * 100).toFixed(1)}
            </span>
            <span className="ml-2 text-sm">
              {getSentimentText(sentimentData.score)}
            </span>
            <div className="ml-auto">
              {getSentimentIcon(sentimentData.score)}
            </div>
          </div>
          <div className="flex items-center mt-2 text-xs">
            <span className="text-gray-400">Change: </span>
            <span
              className={`ml-1 ${sentimentData.change >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {sentimentData.change >= 0 ? "+" : ""}
              {(sentimentData.change * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Volume</div>
          <div className="flex items-center mt-1">
            <span className="text-2xl font-bold">
              {sentimentData.volume.toLocaleString()}
            </span>
            <span className="ml-2 text-sm">Social mentions</span>
            <div className="ml-auto">
              <ChartBarIcon className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-blue-400">
                {Math.round(sentimentData.sources.twitter * 100)}%
              </span>
              <span className="text-gray-400">Twitter</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-orange-400">
                {Math.round(sentimentData.sources.reddit * 100)}%
              </span>
              <span className="text-gray-400">Reddit</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-green-400">
                {Math.round(sentimentData.sources.news * 100)}%
              </span>
              <span className="text-gray-400">News</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-cyan-400">
                {Math.round(sentimentData.sources.telegram * 100)}%
              </span>
              <span className="text-gray-400">Telegram</span>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Top Topics</div>
          <div className="space-y-2 mt-2">
            {sentimentData.topics.slice(0, 3).map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between"
              >
                <div className="flex items-center">
                  <HashtagIcon className="h-3 w-3 text-gray-400 mr-1" />
                  <span className="text-sm">{topic.topic}</span>
                </div>
                <Badge
                  variant={
                    topic.sentiment > 0.1
                      ? "success"
                      : topic.sentiment < -0.1
                        ? "danger"
                        : "secondary"
                  }
                >
                  {(topic.sentiment * 100).toFixed(0)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="influencers">Influencers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="bg-gray-800/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Sentiment Overview</h4>
            <div className="h-10 flex rounded overflow-hidden">
              <div
                className="bg-green-500 h-full"
                style={{
                  width: `${Math.max(0, ((sentimentData.score + 1) / 2) * 100)}%`,
                }}
              ></div>
              <div
                className="bg-red-500 h-full"
                style={{
                  width: `${Math.max(0, ((1 - sentimentData.score) / 2) * 100)}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-400">
              <span>Bearish</span>
              <span>Neutral</span>
              <span>Bullish</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-800/30 rounded p-2">
                <div className="text-xs text-gray-400">Positive Mentions</div>
                <div className="text-lg font-semibold">
                  {Math.round(
                    sentimentData.volume * ((sentimentData.score + 1) / 2),
                  ).toLocaleString()}
                </div>
              </div>
              <div className="bg-gray-800/30 rounded p-2">
                <div className="text-xs text-gray-400">Negative Mentions</div>
                <div className="text-lg font-semibold">
                  {Math.round(
                    sentimentData.volume * ((1 - sentimentData.score) / 2),
                  ).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <div className="bg-gray-800/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Topic Analysis</h4>
            <div className="space-y-3">
              {sentimentData.topics.map((topic) => (
                <div key={topic.topic} className="bg-gray-800/30 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <HashtagIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="font-medium">{topic.topic}</span>
                    </div>
                    <Badge
                      variant={
                        topic.sentiment > 0.1
                          ? "success"
                          : topic.sentiment < -0.1
                            ? "danger"
                            : "secondary"
                      }
                      icon={getSentimentIcon(topic.sentiment)}
                    >
                      {getSentimentText(topic.sentiment)}
                    </Badge>
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-gray-400">
                      Volume: {topic.volume.toLocaleString()} mentions
                    </span>
                    <span className={getSentimentColor(topic.sentiment)}>
                      Score: {(topic.sentiment * 100).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="influencers" className="space-y-4">
          <div className="bg-gray-800/20 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-3">Top Influencers</h4>
            <div className="space-y-3">
              {sentimentData.influencers.map((influencer) => (
                <div
                  key={influencer.username}
                  className="bg-gray-800/30 p-2 rounded"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium">
                          @{influencer.username}
                        </span>
                        <Badge
                          variant="secondary"
                          className="ml-2 px-1.5 py-0 text-xs"
                        >
                          {influencer.platform}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {influencer.followers.toLocaleString()} followers
                      </div>
                    </div>
                    <Badge
                      variant={
                        influencer.sentiment > 0.1
                          ? "success"
                          : influencer.sentiment < -0.1
                            ? "danger"
                            : "secondary"
                      }
                    >
                      {(influencer.sentiment * 100).toFixed(0)}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-300 italic">
                    "{influencer.recentPost}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
