"use client";

import React, { useState, useEffect } from "react";
import {
  NewsItem,
  NewsFilter,
  NewsSource,
  TrendingTopic,
  NewsEvent,
} from "@/types/news";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  ShareIcon,
  FunnelIcon,
  ChartBarIcon,
  CalendarIcon,
  LightBulbIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  TagIcon,
} from "@heroicons/react/24/outline";

// Import service
import { NewsAggregationService } from "@/services/news/NewsAggregationService";

// Get service instance
const newsService = NewsAggregationService.getInstance();

/**
 * NewsItem component to display a single news item
 */
const NewsItemCard: React.FC<{
  item: NewsItem;
  isDetailed?: boolean;
  onSelect?: (item: NewsItem) => void;
}> = ({ item, isDetailed = false, onSelect }) => {
  const sentiment = item.sentiment_analysis.score;
  const sentimentColor =
    sentiment > 0.3
      ? "text-green-500"
      : sentiment < -0.3
        ? "text-red-500"
        : "text-gray-500";

  const handleClick = () => {
    if (onSelect) onSelect(item);
  };

  return (
    <Card
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isDetailed ? "mb-6" : "mb-2"}`}
      onClick={handleClick}
    >
      <div className="flex flex-col md:flex-row">
        {item.image_url && (
          <div
            className={`${isDetailed ? "md:w-1/4" : "md:w-1/5"} mb-3 md:mb-0 md:mr-4`}
          >
            <img
              src={item.image_url}
              alt={item.title}
              className="rounded-md object-cover w-full h-full max-h-32"
            />
          </div>
        )}

        <div
          className={`${item.image_url ? (isDetailed ? "md:w-3/4" : "md:w-4/5") : "w-full"}`}
        >
          <div className="flex items-start justify-between mb-2">
            <h3
              className={`font-medium ${isDetailed ? "text-xl" : "text-base"}`}
            >
              {item.title}
            </h3>
            {item.verified && (
              <CheckBadgeIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
            )}
          </div>

          <div className="text-sm text-gray-500 mb-2 flex items-center space-x-3">
            <span>{new Date(item.published_at).toLocaleString()}</span>
            <span>•</span>
            <span>{item.source}</span>
            <span>•</span>
            <span className={sentimentColor}>
              {sentiment > 0.3
                ? "Bullish"
                : sentiment < -0.3
                  ? "Bearish"
                  : "Neutral"}
            </span>
          </div>

          <p
            className={`text-gray-700 dark:text-gray-300 ${isDetailed ? "" : "line-clamp-2"}`}
          >
            {isDetailed ? item.content : item.summary}
          </p>

          {isDetailed && (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.related_assets.map((asset) => (
                  <Badge key={asset.symbol} variant="secondary">
                    {asset.symbol}
                  </Badge>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Impact</h4>
                  <div className="text-sm">
                    Score:{" "}
                    <span className={sentimentColor}>
                      {item.impact.score.toFixed(2)}
                    </span>
                    <br />
                    Confidence: {(item.impact.confidence * 100).toFixed(0)}%
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium">Social Engagement</h4>
                  <div className="text-sm">
                    {item.social_metrics.total_engagement.toLocaleString()}{" "}
                    interactions
                    <br />
                    {item.social_metrics.engagement_trend > 0 ? "+" : ""}
                    {item.social_metrics.engagement_trend.toFixed(1)}% trend
                  </div>
                </div>

                {item.trading_signals && (
                  <div>
                    <h4 className="text-sm font-medium">Trading Signal</h4>
                    <div className="text-sm">
                      <span
                        className={
                          item.trading_signals.direction === "buy"
                            ? "text-green-500"
                            : item.trading_signals.direction === "sell"
                              ? "text-red-500"
                              : "text-gray-500"
                        }
                      >
                        {item.trading_signals.direction.toUpperCase()}
                      </span>
                      <br />
                      Confidence:{" "}
                      {(item.trading_signals.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex space-x-4">
                <Button variant="ghost" size="sm">
                  <BookmarkIcon className="h-4 w-4 mr-1" />
                  Save
                </Button>

                <Button variant="ghost" size="sm">
                  <ShareIcon className="h-4 w-4 mr-1" />
                  Share
                </Button>

                {item.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.url, "_blank")}
                  >
                    <GlobeAltIcon className="h-4 w-4 mr-1" />
                    Read Original
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

/**
 * TrendingTopic component
 */
const TrendingTopicCard: React.FC<{ topic: TrendingTopic }> = ({ topic }) => {
  const sentimentColor =
    topic.sentiment > 0.3
      ? "text-green-500"
      : topic.sentiment < -0.3
        ? "text-red-500"
        : "text-gray-500";

  return (
    <Card className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{topic.name}</h3>
        <Badge variant={topic.momentum > 30 ? "primary" : "secondary"}>
          {topic.momentum > 0 ? "+" : ""}
          {topic.momentum.toFixed(0)}%
        </Badge>
      </div>

      <div className="text-sm text-gray-500 mt-1">
        {topic.volume.toLocaleString()} mentions •
        <span className={sentimentColor}>
          {" "}
          {topic.sentiment > 0.3
            ? "Positive"
            : topic.sentiment < -0.3
              ? "Negative"
              : "Neutral"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {topic.related_assets.map((asset) => (
          <Badge key={asset.symbol} variant="secondary" className="text-xs">
            {asset.symbol}
          </Badge>
        ))}
      </div>
    </Card>
  );
};

/**
 * EventCard component
 */
const EventCard: React.FC<{ event: NewsEvent }> = ({ event }) => {
  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const daysUntil = Math.ceil(
    (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Card className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex justify-between items-start">
        <h3 className="font-medium">{event.title}</h3>
        <Badge variant={daysUntil < 7 ? "primary" : "secondary"}>
          {daysUntil > 0 ? `${daysUntil} days` : "Today"}
        </Badge>
      </div>

      <div className="text-sm text-gray-500 mt-1">
        {formatDate(startDate)}
        {endDate && ` - ${formatDate(endDate)}`}
        {event.location && ` • ${event.location}`}
      </div>

      <p className="text-sm mt-2 line-clamp-2">{event.description}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {event.affected_assets.map((asset) => (
            <Badge key={asset} variant="secondary" className="text-xs">
              {asset}
            </Badge>
          ))}
        </div>

        <div className="text-xs">
          <span
            className={
              event.expected_impact.direction === "positive"
                ? "text-green-500"
                : event.expected_impact.direction === "negative"
                  ? "text-red-500"
                  : "text-gray-500"
            }
          >
            {event.expected_impact.direction} impact
          </span>
        </div>
      </div>
    </Card>
  );
};

/**
 * FilterPanel component
 */
const FilterPanel: React.FC<{
  filter: NewsFilter;
  sources: NewsSource[];
  onFilterChange: (filter: NewsFilter) => void;
}> = ({ filter, sources, onFilterChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (category: string) => {
    const newCategories = filter.categories?.includes(category)
      ? filter.categories.filter((c) => c !== category)
      : [...(filter.categories || []), category];

    onFilterChange({
      ...filter,
      categories: newCategories,
    });
  };

  const handleSourceChange = (sourceId: string) => {
    const newSources = filter.sources?.includes(sourceId)
      ? filter.sources.filter((s) => s !== sourceId)
      : [...(filter.sources || []), sourceId];

    onFilterChange({
      ...filter,
      sources: newSources,
    });
  };

  const handleVerifiedChange = (checked: boolean) => {
    onFilterChange({
      ...filter,
      verifiedOnly: checked,
    });
  };

  return (
    <div className="mb-4">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="mb-2 w-full md:w-auto"
      >
        <FunnelIcon className="h-4 w-4 mr-2" />
        Filters
        <Badge variant="secondary" className="ml-2">
          {(filter.categories?.length || 0) +
            (filter.sources?.length || 0) +
            (filter.verifiedOnly ? 1 : 0)}
        </Badge>
      </Button>

      {isOpen && (
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium mb-2">Categories</h3>
              <div className="space-y-2">
                {[
                  "regulatory",
                  "market",
                  "technology",
                  "adoption",
                  "security",
                  "partnership",
                  "macroeconomic",
                ].map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filter.categories?.includes(category) || false}
                      onCheckedChange={(checked: boolean) =>
                        handleCategoryChange(category)
                      }
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="text-sm cursor-pointer"
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Sources</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${source.id}`}
                      checked={filter.sources?.includes(source.id) || false}
                      onCheckedChange={(checked: boolean) =>
                        handleSourceChange(source.id)
                      }
                    />
                    <label
                      htmlFor={`source-${source.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {source.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Options</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="verified-only"
                    checked={filter.verifiedOnly || false}
                    onCheckedChange={(checked: boolean) =>
                      handleVerifiedChange(checked)
                    }
                  />
                  <label
                    htmlFor="verified-only"
                    className="text-sm cursor-pointer"
                  >
                    Verified News Only
                  </label>
                </div>

                <div>
                  <label className="text-sm block mb-1">Time Range</label>
                  <Select
                    value={filter.timeRange?.start ? "custom" : "24h"}
                    onChange={(e) => {
                      const value = e.target.value;
                      const now = new Date();
                      let start: Date | null = null;

                      switch (value) {
                        case "1h":
                          start = new Date(now.getTime() - 60 * 60 * 1000);
                          break;
                        case "6h":
                          start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
                          break;
                        case "24h":
                          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                          break;
                        case "7d":
                          start = new Date(
                            now.getTime() - 7 * 24 * 60 * 60 * 1000,
                          );
                          break;
                        case "30d":
                          start = new Date(
                            now.getTime() - 30 * 24 * 60 * 60 * 1000,
                          );
                          break;
                      }

                      onFilterChange({
                        ...filter,
                        timeRange: start
                          ? {
                              start: start.toISOString(),
                              end: now.toISOString(),
                            }
                          : undefined,
                      });
                    }}
                  >
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="custom">Custom...</option>
                  </Select>
                </div>

                <div>
                  <label className="text-sm block mb-1">Sort By</label>
                  <Select
                    value={filter.sortBy || "date"}
                    onChange={(e) => {
                      onFilterChange({
                        ...filter,
                        sortBy: e.target.value as any,
                      });
                    }}
                  >
                    <option value="date">Latest First</option>
                    <option value="relevance">Relevance</option>
                    <option value="impact">Impact</option>
                    <option value="popularity">Popularity</option>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-2">
            <Button
              variant="ghost"
              onClick={() =>
                onFilterChange({
                  categories: [],
                  sources: [],
                  verifiedOnly: false,
                  sortBy: "date",
                })
              }
            >
              Reset
            </Button>

            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

/**
 * NewsHub component - main component for the news section
 */
export function NewsHub() {
  const [activeTab, setActiveTab] = useState("latest");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [events, setEvents] = useState<NewsEvent[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<NewsFilter>({
    verifiedOnly: false,
    categories: [],
    sources: [],
    sortBy: "date",
  });

  // Fetch news with current filter
  const fetchNews = async () => {
    setLoading(true);
    try {
      let result: NewsItem[];

      if (activeTab === "trending") {
        result = await newsService.getTrendingNews(24, 20);
      } else if (activeTab === "search" && searchQuery) {
        result = await newsService.searchNews(searchQuery, filter);
      } else {
        result = await newsService.fetchNews(filter);
      }

      setNews(result);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending topics
  const fetchTrendingTopics = async () => {
    try {
      const topics = await newsService.getTrendingTopics("24h");
      setTrendingTopics(topics);
    } catch (error) {
      console.error("Error fetching trending topics:", error);
    }
  };

  // Fetch upcoming events
  const fetchEvents = async () => {
    try {
      const upcomingEvents = await newsService.getUpcomingEvents(30);
      setEvents(upcomingEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  // Fetch available sources
  const fetchSources = async () => {
    try {
      const availableSources = newsService.getAvailableSources();
      // Convert adapter sources to match the NewsSource type
      const convertedSources: NewsSource[] = availableSources.map((source) => ({
        id: source.id,
        name: source.name,
        url:
          source.id === "cryptocompare"
            ? "https://cryptocompare.com"
            : "https://coindesk.com",
        logo_url:
          source.id === "cryptocompare"
            ? "https://www.cryptocompare.com/media/20562/favicon.png"
            : "https://www.coindesk.com/favicon.ico",
        category: source.category,
        reliability_score: source.reliability,
        sentiment_accuracy: 0.8, // Default value
        coverage_metrics: {
          article_count_24h: 0,
          article_count_7d: 0,
          average_sentiment: 0,
          bias_score: 0,
          favorites_count: 0,
        },
        supported_assets: source.capabilities.supportedCategories || [],
        supported_languages: source.capabilities.supportsLanguages || [],
        average_daily_articles: 0,
        subscription_required: false,
        api_integration_level: source.capabilities.supportsFullContentAccess
          ? "full"
          : "partial",
      }));
      setSources(convertedSources);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setActiveTab("search");
      fetchNews();
    }
  };

  // Effect for initial data loading
  useEffect(() => {
    fetchSources();
    fetchTrendingTopics();
    fetchEvents();
    fetchNews();

    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(
      () => {
        fetchNews();
        fetchTrendingTopics();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(refreshInterval);
  }, []);

  // Effect for fetching news when filter or tab changes
  useEffect(() => {
    fetchNews();
  }, [filter, activeTab]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Crypto News Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive crypto news aggregated from professional sources,
          enhanced with sentiment analysis and market impact metrics.
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex space-x-2 mb-6">
        <div className="relative flex-grow">
          <Input
            type="text"
            placeholder="Search news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
        </div>
        <Button onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
        <Button variant="ghost" onClick={fetchNews}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="latest">
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            Latest News
          </TabsTrigger>
          <TabsTrigger value="trending">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="topics">
            <TagIcon className="h-4 w-4 mr-2" />
            Hot Topics
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Upcoming Events
          </TabsTrigger>
        </TabsList>

        {/* Latest News Tab */}
        <TabsContent value="latest">
          {/* Filter Panel */}
          <FilterPanel
            filter={filter}
            sources={sources}
            onFilterChange={setFilter}
          />

          {/* News Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className={`${selectedNews ? "hidden md:block md:col-span-1" : "col-span-full"}`}
            >
              <div className="space-y-4">
                {loading ? (
                  <p className="text-center py-12">Loading news...</p>
                ) : news.length === 0 ? (
                  <Card className="p-12 text-center">
                    <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No news found</h3>
                    <p className="text-gray-500">
                      Try adjusting your filters or search terms.
                    </p>
                  </Card>
                ) : (
                  news.map((item) => (
                    <NewsItemCard
                      key={item.id}
                      item={item}
                      onSelect={setSelectedNews}
                    />
                  ))
                )}
              </div>
            </div>

            {selectedNews && (
              <div className="md:col-span-2">
                <Card className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">{selectedNews.title}</h2>
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedNews(null)}
                    >
                      &times;
                    </Button>
                  </div>
                  <NewsItemCard item={selectedNews} isDetailed />
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Trending Tab */}
        <TabsContent value="trending">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-medium">Trending News</h2>
            <Button variant="ghost" size="sm" onClick={fetchNews}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <p className="text-center py-12">Loading trending news...</p>
            ) : news.length === 0 ? (
              <Card className="p-12 text-center">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  No trending news found
                </h3>
                <p className="text-gray-500">
                  Check back later for trending stories.
                </p>
              </Card>
            ) : (
              news.map((item) => (
                <NewsItemCard
                  key={item.id}
                  item={item}
                  onSelect={setSelectedNews}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-medium">Hot Topics</h2>
            <Button variant="ghost" size="sm" onClick={fetchTrendingTopics}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingTopics.length === 0 ? (
              <Card className="p-12 text-center col-span-full">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  No trending topics found
                </h3>
                <p className="text-gray-500">
                  Check back later for trending topics.
                </p>
              </Card>
            ) : (
              trendingTopics.map((topic) => (
                <TrendingTopicCard key={topic.id} topic={topic} />
              ))
            )}
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-xl font-medium">Upcoming Events</h2>
            <Button variant="ghost" size="sm" onClick={fetchEvents}>
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.length === 0 ? (
              <Card className="p-12 text-center col-span-full">
                <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  No upcoming events found
                </h3>
                <p className="text-gray-500">
                  Check back later for upcoming events.
                </p>
              </Card>
            ) : (
              events.map((event) => <EventCard key={event.id} event={event} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
