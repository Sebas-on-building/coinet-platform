import React from "react";
import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/Progress";
import { newsService } from "@/services/news";
import {
  NewspaperIcon,
  ChartBarIcon,
  ClockIcon,
  HashtagIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import type { NewsItem, NewsFilter } from "@/types/news";
import { InputValidator } from '@/lib/validation/InputValidator';

interface NewsPanelProps {
  symbol: string;
  onNewsSelect?: (news: NewsItem) => void;
}

const VerificationBadge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircleIcon className="w-4 h-4" />;
    if (score >= 0.5) return <QuestionMarkCircleIcon className="w-4 h-4" />;
    return <ExclamationTriangleIcon className="w-4 h-4" />;
  };

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded ${getColor(score)}`}
    >
      {getIcon(score)}
      <span>{Math.round(score * 100)}%</span>
    </div>
  );
};

export function NewsPanel({ symbol, onNewsSelect }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NewsFilter>({
    assets: [symbol],
    verifiedOnly: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minEngagement, setMinEngagement] = useState<number>(0);
  const [sentimentBias, setSentimentBias] = useState<
    "positive" | "negative" | "neutral" | null
  >(null);
  const [timeRange, setTimeRange] = useState<
    "1h" | "4h" | "12h" | "24h" | "7d"
  >("24h");

  useEffect(() => {
    newsService.subscribeToUpdates(symbol);
    fetchNews();

    const handleNewsUpdate = (newsItem: NewsItem) => {
      setNews((prev) => {
        const index = prev.findIndex((n) => n.id === newsItem.id);
        if (index === -1) {
          return [newsItem, ...prev];
        }
        const updated = [...prev];
        updated[index] = newsItem;
        return updated;
      });
    };

    const handleSocialUpdate = (update: {
      newsId: string;
      metrics: NewsItem["social_metrics"];
    }) => {
      setNews((prev) => {
        const index = prev.findIndex((n) => n.id === update.newsId);
        if (index === -1) return prev;
        const updated = [...prev];
        updated[index] = { ...updated[index], social_metrics: update.metrics };
        return updated;
      });
    };

    newsService.on("news", handleNewsUpdate);
    newsService.on("social_metrics", handleSocialUpdate);

    return () => {
      newsService.off("news", handleNewsUpdate);
      newsService.off("social_metrics", handleSocialUpdate);
      newsService.unsubscribeFromUpdates(symbol);
    };
  }, [symbol]);

  useEffect(() => {
    const updatedFilter: NewsFilter = {
      assets: [symbol],
      verifiedOnly: filter.verifiedOnly,
      categories:
        selectedCategories.length > 0 ? selectedCategories : undefined,
      socialMetrics: {
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        minEngagement: minEngagement > 0 ? minEngagement : undefined,
        sentimentBias: sentimentBias || undefined,
      },
      timeRange: {
        start: getTimeRangeStart(timeRange),
        end: new Date().toISOString(),
      },
    };
    setFilter(updatedFilter);
    fetchNews();
  }, [
    symbol,
    selectedCategories,
    selectedPlatforms,
    minEngagement,
    sentimentBias,
    timeRange,
    filter.verifiedOnly,
  ]);

  const getTimeRangeStart = (range: string): string => {
    const now = new Date();
    switch (range) {
      case "1h":
        return new Date(now.getTime() - 3600000).toISOString();
      case "4h":
        return new Date(now.getTime() - 14400000).toISOString();
      case "12h":
        return new Date(now.getTime() - 43200000).toISOString();
      case "24h":
        return new Date(now.getTime() - 86400000).toISOString();
      case "7d":
        return new Date(now.getTime() - 604800000).toISOString();
      default:
        return new Date(now.getTime() - 86400000).toISOString();
    }
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      const newsData = await newsService.getNews(filter);
      setNews(newsData);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewsClick = async (newsItem: NewsItem) => {
    setSelectedNews(newsItem);
    if (onNewsSelect) {
      onNewsSelect(newsItem);
    }
  };

  const categories = [
    "regulatory",
    "market",
    "technology",
    "adoption",
    "security",
    "partnership",
    "macroeconomic",
    "other",
  ];

  const platforms = ["twitter", "reddit", "telegram", "discord", "linkedin"];

  const getCategoryColor = (category: NewsItem["category"]) => {
    const colors = {
      regulatory: "bg-purple-500",
      market: "bg-blue-500",
      technology: "bg-green-500",
      adoption: "bg-yellow-500",
      security: "bg-red-500",
      partnership: "bg-indigo-500",
      macroeconomic: "bg-orange-500",
      other: "bg-gray-500",
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const getImpactBadge = (impact?: NewsItem["impact"]) => {
    if (!impact) {
      return <Badge variant="secondary">No Impact Data</Badge>;
    }
    
    if (impact.score > 0.5) {
      return (
        <Badge
          variant="success"
          icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
        >
          High Bullish Impact
        </Badge>
      );
    } else if (impact.score < -0.5) {
      return (
        <Badge
          variant="danger"
          icon={<ArrowTrendingDownIcon className="h-4 w-4" />}
        >
          High Bearish Impact
        </Badge>
      );
    }
    return <Badge variant="secondary">Moderate Impact</Badge>;
  };

  const renderFilters = () => (
    <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-4">
      <div className="space-y-2">
        <h4 className="font-medium">Categories</h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                setSelectedCategories((prev) =>
                  prev.includes(category)
                    ? prev.filter((c) => c !== category)
                    : [...prev, category],
                );
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedCategories.includes(category)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
                }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Social Platforms</h4>
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => {
                setSelectedPlatforms((prev) =>
                  prev.includes(platform)
                    ? prev.filter((p) => p !== platform)
                    : [...prev, platform],
                );
              }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${selectedPlatforms.includes(platform)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
                }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Minimum Engagement</h4>
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={minEngagement}
          onChange={(e) => setMinEngagement(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-gray-400">
          {minEngagement.toLocaleString()} interactions
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Sentiment Bias</h4>
        <div className="flex gap-2">
          {(["positive", "negative", "neutral"] as const).map((sentiment) => (
            <button
              key={sentiment}
              onClick={() =>
                setSentimentBias(sentimentBias === sentiment ? null : sentiment)
              }
              className={`px-3 py-1 rounded-md text-sm transition-colors ${sentimentBias === sentiment
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
                }`}
            >
              {sentiment}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Time Range</h4>
        <div className="flex gap-2">
          {(["1h", "4h", "12h", "24h", "7d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${timeRange === range
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
                }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNewsItem = (item: NewsItem) => (
    <Card
      key={item.id}
      variant="glass"
      className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={() => handleNewsClick(item)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="secondary"
              className={getCategoryColor(item.category)}
            >
              {item.category}
            </Badge>
            {item.verified && (
              <Badge
                variant="success"
                icon={<CheckBadgeIcon className="h-4 w-4" />}
              >
                Verified
              </Badge>
            )}
            {getImpactBadge(item.impact)}
          </div>
          <h3 className="text-lg font-medium mb-2">{item.title}</h3>
          <p className="text-gray-400 text-sm line-clamp-2">{item.summary}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {new Date(item.timestamp).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <HashtagIcon className="h-4 w-4" />
              {item.social_metrics?.total_engagement?.toLocaleString() || 
               item.social_metrics_details?.total_reach?.toLocaleString() || "0"}{" "}
              engagements
            </div>
            {item.social_metrics_details?.engagement_trend && item.social_metrics_details.engagement_trend > 0 && (
              <Badge
                variant="success"
                icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
              >
                +{item.social_metrics_details.engagement_trend.toFixed(1)}% trend
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  const renderNewsDetails = () => {
    if (!selectedNews) return null;

    return (
      <Dialog
        open={!!selectedNews}
        onClose={() => setSelectedNews(null)}
        title={selectedNews.title}
        size="lg"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-4 w-4" />
              {new Date(selectedNews.timestamp).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <NewspaperIcon className="h-4 w-4" />
              {selectedNews.source}
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-lg font-medium text-gray-300">
              {selectedNews.summary}
            </p>
            <div
              className="mt-4"
            >
              <SafeNewsContent content={selectedNews.content} />
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Impact Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Market Sentiment</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium">
                    {selectedNews.market_sentiment || "neutral"}
                  </span>
                  <Badge
                    variant={
                      selectedNews.market_sentiment === "bullish"
                        ? "success"
                        : selectedNews.market_sentiment === "bearish"
                          ? "danger"
                          : "secondary"
                    }
                  >
                    {selectedNews.impact ? (selectedNews.impact.score * 100).toFixed(1) : "0"}% Impact
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-400">Confidence</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-medium">
                    {selectedNews.impact ? (selectedNews.impact.confidence * 100).toFixed(1) : "0"}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Social Media Engagement</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-400">Twitter</p>
                <p className="text-lg font-medium">
                  {selectedNews.social_metrics_details?.twitter?.mentions?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-400">mentions</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Reddit</p>
                <p className="text-lg font-medium">
                  {selectedNews.social_metrics_details?.reddit?.mentions?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-400">mentions</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Telegram</p>
                <p className="text-lg font-medium">
                  {selectedNews.social_metrics_details?.telegram?.mentions?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-400">mentions</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Discord</p>
                <p className="text-lg font-medium">
                  {selectedNews.social_metrics_details?.discord?.mentions?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-400">mentions</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">LinkedIn</p>
                <p className="text-lg font-medium">
                  {selectedNews.social_metrics_details?.linkedin?.shares?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-gray-400">shares</p>
              </div>
            </div>

            {selectedNews.social_metrics_details?.twitter?.influential_mentions && 
             selectedNews.social_metrics_details.twitter.influential_mentions.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">Top Influencer Mentions</h5>
                <div className="space-y-2">
                  {selectedNews.social_metrics_details.twitter.influential_mentions.map(
                    (mention: {
                      username: string;
                      followers: number;
                      tweet_url: string;
                      tweet_text: string;
                      profile_image: string;
                    }, idx: number) => (
                      <div
                        key={mention.username}
                        className="flex items-center justify-between"
                      >
                        <span className="text-blue-400">
                          @{mention.username}
                        </span>
                        <span className="text-sm text-gray-400">
                          {mention.followers.toLocaleString()} followers
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Verification Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-semibold mb-2">
                  Source Credibility
                </h5>
                <Progress
                  value={
                    selectedNews.verification_metrics?.source_credibility
                      ? selectedNews.verification_metrics.source_credibility *
                      100
                      : 50
                  }
                  className="w-full"
                />
              </div>
              <div>
                <h5 className="text-sm font-semibold mb-2">AI Detection</h5>
                <Badge
                  variant={
                    selectedNews.verification_metrics?.ai_detection
                      ?.is_ai_generated
                      ? "danger"
                      : "default"
                  }
                >
                  {selectedNews.verification_metrics?.ai_detection
                    ?.is_ai_generated
                    ? "AI Generated"
                    : "Human Written"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Risk Indicators</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Badge
                  variant={
                    selectedNews.manipulation_indicators
                      ?.market_manipulation_risk?.level === "high"
                      ? "danger"
                      : "default"
                  }
                >
                  Market Risk:{" "}
                  {selectedNews.manipulation_indicators
                    ?.market_manipulation_risk?.level || "low"}
                </Badge>
              </div>
              <div>
                <Badge
                  variant={
                    selectedNews.manipulation_indicators?.bot_activity?.detected
                      ? "danger"
                      : "default"
                  }
                >
                  Bot Activity:{" "}
                  {selectedNews.manipulation_indicators?.bot_activity
                    ?.percentage || 0}
                  %
                </Badge>
              </div>
              <div>
                <Badge
                  variant={
                    selectedNews.manipulation_indicators
                      ?.sentiment_manipulation_score &&
                      selectedNews.manipulation_indicators
                        .sentiment_manipulation_score > 0.5
                      ? "danger"
                      : "default"
                  }
                >
                  Sentiment Manipulation:{" "}
                  {Math.round(
                    (selectedNews.manipulation_indicators
                      ?.sentiment_manipulation_score || 0) * 100,
                  )}
                  %
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Content Analysis</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Objectivity Score
                </span>
                <Progress
                  value={
                    (selectedNews.content_analysis?.objectivity_score || 0) *
                    100
                  }
                  className="w-full"
                />
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Technical Accuracy
                </span>
                <Progress
                  value={
                    (selectedNews.content_analysis?.technical_accuracy?.score ||
                      0) * 100
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Expert Reviews</h4>
            <div className="space-y-2">
              {selectedNews.verification_metrics?.expert_reviews?.map(
                (
                  review: {
                    expert_name: string;
                    credentials: string;
                    verification_status: string;
                    comments: string;
                  },
                  idx: number,
                ) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm font-medium">{review.expert_name}</p>
                    <p className="text-xs text-gray-600">
                      {review.credentials}
                    </p>
                    <Badge
                      variant={
                        review.verification_status === "verified"
                          ? "success"
                          : "danger"
                      }
                    >
                      {review.verification_status}
                    </Badge>
                    <p className="text-sm mt-1">{review.comments}</p>
                  </div>
                ),
              )}
            </div>
          </div>

          {selectedNews.verification_metrics?.blockchain_verification?.hash && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Blockchain Verification</h4>
              <div className="text-xs text-gray-600">
                <p>
                  Hash:{" "}
                  {
                    selectedNews.verification_metrics.blockchain_verification
                      .hash
                  }
                </p>
                <p>
                  Timestamp:{" "}
                  {new Date(
                    selectedNews.verification_metrics.blockchain_verification.timestamp,
                  ).toLocaleString()}
                </p>
                <p>
                  Platform:{" "}
                  {
                    selectedNews.verification_metrics.blockchain_verification
                      .platform
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Market News</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1 rounded-md text-sm bg-gray-800/30 text-gray-400 hover:bg-gray-800/50 transition-colors"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() =>
              setFilter({ ...filter, verifiedOnly: !filter.verifiedOnly })
            }
            className={`px-3 py-1 rounded-md text-sm transition-colors ${filter.verifiedOnly
                ? "bg-blue-500 text-white"
                : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
              }`}
          >
            Verified Only
          </button>
        </div>
      </div>

      {showFilters && renderFilters()}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-4">{news.map(renderNewsItem)}</div>
      )}

      {renderNewsDetails()}
    </div>
  );
}

const SafeNewsContent: React.FC<{ content: string }> = ({ content }) => {
  const sanitizedContent = useMemo(() =>
    InputValidator.sanitizeHTMLClient(content), [content]
  );

  return (
    <div className="news-content">
      {sanitizedContent}
    </div>
  );
};
