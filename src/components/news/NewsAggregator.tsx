"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NewspaperIcon,
  ChartBarIcon,
  ClockIcon,
  HashtagIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  LinkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { NewsItem } from "@/types/news";
import { newsAggregationService } from "@/services/newsAggregation";

interface NewsAggregatorProps {
  symbol?: string;
  maxItems?: number;
  showControls?: boolean;
}

export function NewsAggregator({
  symbol,
  maxItems = 10,
  showControls = true,
}: NewsAggregatorProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(60000); // 1 minute default
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    // Get available sources
    const sources = newsAggregationService.getAvailableSources();
    setAvailableSources(sources);
    setSources(sources.map((s) => s.id));

    fetchNews();

    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout | null = null;
    if (refreshInterval) {
      interval = setInterval(fetchNews, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [symbol, refreshInterval, sources, category]);

  const fetchNews = async () => {
    setLoading(true);
    try {
      let newsData: NewsItem[];

      // Fetch the appropriate news
      if (symbol) {
        newsData = await newsAggregationService.fetchAssetNews(symbol, {
          sources,
          deduplicate: true,
          enhanceWithSentiment: true,
        });
      } else if (activeTab === "trending") {
        newsData = await newsAggregationService.getTrendingNews(24, maxItems);
      } else if (category) {
        newsData = await newsAggregationService.getNewsByCategory(
          category as any,
          {
            sources,
            deduplicate: true,
            enhanceWithSentiment: true,
          },
        );
      } else {
        newsData = await newsAggregationService.fetchAggregatedNews({
          sources,
          maxItemsPerSource: Math.ceil(maxItems / sources.length),
          deduplicate: true,
          enhanceWithSentiment: true,
        });
      }

      setNews(newsData.slice(0, maxItems));
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching aggregated news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceToggle = (sourceId: string) => {
    setSources((prev) => {
      if (prev.includes(sourceId)) {
        return prev.filter((id) => id !== sourceId);
      } else {
        return [...prev, sourceId];
      }
    });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === "all") {
      setCategory(null);
    } else if (tab === "trending") {
      // Keep category as null for trending
      setCategory(null);
    } else {
      setCategory(tab);
    }
  };

  const handleRefresh = () => {
    fetchNews();
  };

  const toggleAutoRefresh = () => {
    setRefreshInterval((prev) => (prev ? null : 60000));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      regulatory: "bg-purple-500",
      market: "bg-blue-500",
      technology: "bg-green-500",
      adoption: "bg-yellow-500",
      security: "bg-red-500",
      partnership: "bg-indigo-500",
      macroeconomic: "bg-orange-500",
      other: "bg-gray-500",
    };
    return colors[category] || colors.other;
  };

  const getSourceImage = (source: string) => {
    const sourceObj = availableSources.find(
      (s) => s.id === source || s.name === source,
    );
    return sourceObj?.logoUrl || null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <NewspaperIcon className="h-6 w-6 mr-2" />
          {symbol ? `${symbol} News` : "Crypto News Aggregator"}
        </h2>

        {showControls && (
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Refresh news"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>

            <button
              onClick={toggleAutoRefresh}
              className={`p-2 rounded-full ${
                refreshInterval
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              title={refreshInterval ? "Auto-refresh on" : "Auto-refresh off"}
            >
              <ClockIcon className="h-5 w-5" />
            </button>

            <span className="text-sm text-gray-500">
              Last updated: {formatDate(lastRefresh.toISOString())}
            </span>
          </div>
        )}
      </div>

      {showControls && (
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="w-full overflow-x-auto flex">
            <TabsTrigger value="all">All News</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="technology">Technology</TabsTrigger>
            <TabsTrigger value="regulatory">Regulatory</TabsTrigger>
            <TabsTrigger value="adoption">Adoption</TabsTrigger>
            <TabsTrigger value="partnership">Partnerships</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {showControls && (
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="text-sm text-gray-500 mr-2 flex items-center">
            <FunnelIcon className="h-4 w-4 mr-1" />
            Sources:
          </div>
          {availableSources.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSourceToggle(source.id)}
              className={`px-3 py-1 rounded-full text-sm flex items-center ${
                sources.includes(source.id)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {source.logoUrl && (
                <img
                  src={source.logoUrl}
                  alt={source.name}
                  className="h-4 w-4 mr-1 rounded-full"
                />
              )}
              {source.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array(3)
            .fill(null)
            .map((_, i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 w-3/4 mb-2 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-1 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 w-full mb-3 rounded"></div>
                  <div className="flex justify-between">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/4 rounded"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/4 rounded"></div>
                  </div>
                </div>
              </Card>
            ))}
        </div>
      ) : (
        <div className="space-y-4">
          {news.length > 0 ? (
            news.map((item) => (
              <Card
                key={item.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-lg hover:text-blue-500 transition-colors flex items-center"
                    >
                      {item.title}
                      <LinkIcon className="h-4 w-4 ml-1 inline-block" />
                    </a>
                    <p className="text-gray-500 text-sm mt-1">{item.summary}</p>
                  </div>

                  {item.verified && (
                    <Badge variant="success" className="ml-2 flex-shrink-0">
                      <CheckBadgeIcon className="h-4 w-4 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    variant="primary"
                    className={`${getCategoryColor(item.category)} text-white`}
                  >
                    {item.category}
                  </Badge>

                  {item.impact && (
                    <Badge
                      variant={
                        item.impact.market_sentiment === "bullish"
                          ? "success"
                          : item.impact.market_sentiment === "bearish"
                            ? "danger"
                            : "secondary"
                      }
                    >
                      {item.impact.market_sentiment}
                    </Badge>
                  )}

                  {item.impact?.affected_assets.map((asset) => (
                    <Badge key={asset} variant="secondary">
                      {asset}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                  <div className="flex items-center">
                    {getSourceImage(item.source) ? (
                      <img
                        src={getSourceImage(item.source)}
                        alt={item.source}
                        className="h-4 w-4 mr-1 rounded-full"
                      />
                    ) : (
                      <NewspaperIcon className="h-4 w-4 mr-1" />
                    )}
                    {item.source}
                  </div>

                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(item.timestamp)}
                  </div>

                  {item.social_metrics && (
                    <div className="flex items-center">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      {item.social_metrics.total_engagement.toLocaleString()}{" "}
                      interactions
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-center">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-xl font-medium">No news found</h3>
              <p className="text-gray-500 mt-1">
                Try selecting different sources or categories
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Refresh
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
