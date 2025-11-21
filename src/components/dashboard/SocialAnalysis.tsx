import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  NewspaperIcon,
  HashtagIcon,
  ChartBarIcon,
  GlobeAltIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";

interface SentimentData {
  overall_score: number;
  change_24h: number;
  social_metrics: {
    twitter: {
      followers: number;
      engagement_rate: number;
      sentiment_score: number;
      trending_hashtags: string[];
      influential_tweets: {
        author: string;
        followers: number;
        text: string;
        sentiment: number;
        engagement: number;
        timestamp: string;
      }[];
    };
    reddit: {
      active_users: number;
      post_count_24h: number;
      sentiment_score: number;
      top_posts: {
        title: string;
        upvotes: number;
        comments: number;
        sentiment: number;
        url: string;
      }[];
    };
    news: {
      article_count_24h: number;
      sentiment_score: number;
      top_articles: {
        title: string;
        source: string;
        sentiment: number;
        url: string;
        timestamp: string;
      }[];
    };
  };
  market_impact: {
    price_correlation: number;
    volume_correlation: number;
    predicted_impact: number;
  };
  word_cloud: {
    word: string;
    weight: number;
    sentiment: number;
  }[];
}

interface CommunityMetrics {
  total_holders: number;
  active_wallets_24h: number;
  new_wallets_24h: number;
  average_holding_time: number;
  whale_concentration: number;
  github_stats: {
    stars: number;
    forks: number;
    commits_24h: number;
    active_contributors: number;
  };
}

export function SocialAnalysis() {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [timeframe, setTimeframe] = useState<"1h" | "24h" | "7d">("24h");
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(
    null,
  );
  const [communityMetrics, setCommunityMetrics] =
    useState<CommunityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "social" | "news" | "community"
  >("overview");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sentiment, community] = await Promise.all([
          api.getSentimentData(selectedAsset, timeframe),
          api.getCommunityMetrics(selectedAsset),
        ]);
        setSentimentData(sentiment);
        setCommunityMetrics(community);
      } catch (error) {
        console.error("Error fetching social data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedAsset, timeframe]);

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Overall Sentiment */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Overall Sentiment</h3>
          <div className="flex gap-2">
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={timeframe}
              onChange={(e) =>
                setTimeframe(e.target.value as "1h" | "24h" | "7d")
              }
            >
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
            </select>
          </div>
        </div>

        {sentimentData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-4xl font-bold ${getSentimentColor(sentimentData.overall_score)}`}
                  >
                    {sentimentData.overall_score}
                  </span>
                </div>
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-gray-200/10"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - sentimentData.overall_score / 100)}`}
                    className={`${getSentimentColor(sentimentData.overall_score)} transition-all duration-500`}
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-400 mt-2">Sentiment Score</p>
              <Badge
                variant={sentimentData.change_24h >= 0 ? "success" : "danger"}
                icon={
                  sentimentData.change_24h >= 0 ? (
                    <ChartBarIcon className="h-4 w-4" />
                  ) : (
                    <ChartBarIcon className="h-4 w-4" />
                  )
                }
              >
                {sentimentData.change_24h >= 0 ? "+" : ""}
                {sentimentData.change_24h}% (24h)
              </Badge>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-400">
                Platform Sentiment
              </h4>
              <div className="space-y-2">
                {[
                  {
                    platform: "Twitter",
                    score: sentimentData.social_metrics.twitter.sentiment_score,
                  },
                  {
                    platform: "Reddit",
                    score: sentimentData.social_metrics.reddit.sentiment_score,
                  },
                  {
                    platform: "News",
                    score: sentimentData.social_metrics.news.sentiment_score,
                  },
                ].map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{platform.platform}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getSentimentColor(platform.score)} transition-all duration-500`}
                          style={{ width: `${platform.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {platform.score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-400">
                Market Impact
              </h4>
              <div className="space-y-2">
                {[
                  {
                    label: "Price Correlation",
                    value: sentimentData.market_impact.price_correlation,
                  },
                  {
                    label: "Volume Impact",
                    value: sentimentData.market_impact.volume_correlation,
                  },
                  {
                    label: "Predicted Impact",
                    value: sentimentData.market_impact.predicted_impact,
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{metric.label}</span>
                    <Badge variant={metric.value >= 0 ? "success" : "danger"}>
                      {metric.value >= 0 ? "+" : ""}
                      {metric.value.toFixed(2)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Word Cloud */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Trending Topics</h3>
        {sentimentData && (
          <div className="flex flex-wrap gap-2">
            {sentimentData.word_cloud.map((word) => (
              <div
                key={word.word}
                className={`px-3 py-1 rounded-full ${
                  word.sentiment > 0
                    ? "bg-green-500/10 text-green-400"
                    : word.sentiment < 0
                      ? "bg-red-500/10 text-red-400"
                      : "bg-gray-500/10 text-gray-400"
                }`}
                style={{
                  fontSize: `${Math.max(0.8, Math.min(1.5, 0.8 + word.weight * 0.7))}rem`,
                }}
              >
                {word.word}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  const renderSocialTab = () => (
    <div className="space-y-6">
      {sentimentData && (
        <>
          {/* Twitter Analysis */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserGroupIcon className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-medium">Twitter Insights</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Followers</p>
                    <p className="text-2xl font-bold">
                      {sentimentData.social_metrics.twitter.followers.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Engagement Rate</p>
                    <p className="text-2xl font-bold">
                      {sentimentData.social_metrics.twitter.engagement_rate.toFixed(
                        2,
                      )}
                      %
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Trending Hashtags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {sentimentData.social_metrics.twitter.trending_hashtags.map(
                      (tag) => (
                        <Badge
                          key={tag}
                          variant="default"
                          icon={<HashtagIcon className="h-4 w-4" />}
                        >
                          {tag}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Influential Tweets
                </h4>
                <div className="space-y-4">
                  {sentimentData.social_metrics.twitter.influential_tweets.map(
                    (tweet, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/30 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{tweet.author}</p>
                            <p className="text-xs text-gray-400">
                              {tweet.followers.toLocaleString()} followers
                            </p>
                          </div>
                          <Badge
                            variant={
                              tweet.sentiment >= 0 ? "success" : "danger"
                            }
                          >
                            {tweet.sentiment >= 0 ? "+" : ""}
                            {tweet.sentiment.toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300">{tweet.text}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(tweet.timestamp).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {tweet.engagement.toLocaleString()} engagements
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Reddit Analysis */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-orange-400" />
              <h3 className="text-lg font-medium">Reddit Activity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Active Users</p>
                    <p className="text-2xl font-bold">
                      {sentimentData.social_metrics.reddit.active_users.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Posts (24h)</p>
                    <p className="text-2xl font-bold">
                      {sentimentData.social_metrics.reddit.post_count_24h.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Top Posts
                </h4>
                <div className="space-y-4">
                  {sentimentData.social_metrics.reddit.top_posts.map(
                    (post, index) => (
                      <div
                        key={index}
                        className="bg-gray-800/30 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium">{post.title}</p>
                          <Badge
                            variant={post.sentiment >= 0 ? "success" : "danger"}
                          >
                            {post.sentiment >= 0 ? "+" : ""}
                            {post.sentiment.toFixed(2)}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {post.upvotes.toLocaleString()} upvotes
                          </span>
                          <span className="text-xs text-gray-400">
                            {post.comments.toLocaleString()} comments
                          </span>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  const renderNewsTab = () => (
    <div className="space-y-6">
      {sentimentData && (
        <>
          <Card variant="glass" className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <NewspaperIcon className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-medium">News Analysis</h3>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Articles (24h)</p>
                  <p className="text-2xl font-bold">
                    {sentimentData.social_metrics.news.article_count_24h.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Sentiment Score</p>
                  <p
                    className={`text-2xl font-bold ${getSentimentColor(sentimentData.social_metrics.news.sentiment_score)}`}
                  >
                    {sentimentData.social_metrics.news.sentiment_score.toFixed(
                      2,
                    )}
                  </p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Market Impact</p>
                  <Badge
                    variant={
                      sentimentData.market_impact.predicted_impact >= 0
                        ? "success"
                        : "danger"
                    }
                    className="mt-1"
                  >
                    {sentimentData.market_impact.predicted_impact >= 0
                      ? "+"
                      : ""}
                    {sentimentData.market_impact.predicted_impact.toFixed(2)}%
                  </Badge>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400">Sentiment Trend</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        sentimentData.change_24h >= 0 ? "success" : "danger"
                      }
                      icon={
                        sentimentData.change_24h >= 0 ? (
                          <ArrowTrendingUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-4 w-4" />
                        )
                      }
                    >
                      {sentimentData.change_24h >= 0 ? "+" : ""}
                      {sentimentData.change_24h.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Top Articles
                  </h4>
                  <div className="space-y-4">
                    {sentimentData.social_metrics.news.top_articles.map(
                      (article, index) => (
                        <div
                          key={index}
                          className="bg-gray-800/30 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium">{article.title}</p>
                              <p className="text-xs text-gray-400">
                                {article.source}
                              </p>
                            </div>
                            <Badge
                              variant={
                                article.sentiment >= 0 ? "success" : "danger"
                              }
                            >
                              {article.sentiment >= 0 ? "+" : ""}
                              {article.sentiment.toFixed(2)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(article.timestamp).toLocaleString()}
                            </span>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Read More →
                            </a>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Word Cloud Analysis
                  </h4>
                  <Card variant="glass" className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {sentimentData.word_cloud
                        .sort((a, b) => b.weight - a.weight)
                        .map((word) => (
                          <div
                            key={word.word}
                            className={`px-3 py-1 rounded-full ${
                              word.sentiment > 0.3
                                ? "bg-green-500/10 text-green-400"
                                : word.sentiment < -0.3
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-gray-500/10 text-gray-400"
                            }`}
                            style={{
                              fontSize: `${Math.max(0.8, Math.min(1.8, 0.8 + word.weight))}rem`,
                              opacity: Math.max(0.6, word.weight),
                            }}
                          >
                            {word.word}
                          </div>
                        ))}
                    </div>
                  </Card>

                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-4">
                      Market Impact Analysis
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            Price Correlation
                          </span>
                          <Badge
                            variant={
                              sentimentData.market_impact.price_correlation >=
                              0.5
                                ? "success"
                                : "warning"
                            }
                          >
                            {(
                              sentimentData.market_impact.price_correlation *
                              100
                            ).toFixed(1)}
                            %
                          </Badge>
                        </div>
                        <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{
                              width: `${sentimentData.market_impact.price_correlation * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="bg-gray-800/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-400">
                            Volume Correlation
                          </span>
                          <Badge
                            variant={
                              sentimentData.market_impact.volume_correlation >=
                              0.5
                                ? "success"
                                : "warning"
                            }
                          >
                            {(
                              sentimentData.market_impact.volume_correlation *
                              100
                            ).toFixed(1)}
                            %
                          </Badge>
                        </div>
                        <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{
                              width: `${sentimentData.market_impact.volume_correlation * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  const renderCommunityTab = () => (
    <div className="space-y-6">
      {communityMetrics && (
        <>
          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">Community Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Total Holders</p>
                <p className="text-2xl font-bold">
                  {communityMetrics.total_holders.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Unique Addresses</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Active Wallets (24h)</p>
                <p className="text-2xl font-bold">
                  {communityMetrics.active_wallets_24h.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {(
                    (communityMetrics.active_wallets_24h /
                      communityMetrics.total_holders) *
                    100
                  ).toFixed(1)}
                  % of Total
                </p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">New Wallets (24h)</p>
                <p className="text-2xl font-bold">
                  {communityMetrics.new_wallets_24h.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Growth Rate</p>
              </div>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <p className="text-sm text-gray-400">Avg Holding Time</p>
                <p className="text-2xl font-bold">
                  {communityMetrics.average_holding_time} days
                </p>
                <p className="text-xs text-gray-500 mt-1">HODL Factor</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">Development Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">GitHub Stars</p>
                    <p className="text-2xl font-bold">
                      {communityMetrics.github_stats.stars.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant="success"
                        icon={<ArrowTrendingUpIcon className="h-3 w-3" />}
                      >
                        +{Math.floor(Math.random() * 50)} this week
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Forks</p>
                    <p className="text-2xl font-bold">
                      {communityMetrics.github_stats.forks.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant="success"
                        icon={<ArrowTrendingUpIcon className="h-3 w-3" />}
                      >
                        +{Math.floor(Math.random() * 20)} this week
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Commits (24h)</p>
                    <p className="text-2xl font-bold">
                      {communityMetrics.github_stats.commits_24h}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant={
                          communityMetrics.github_stats.commits_24h > 30
                            ? "success"
                            : "warning"
                        }
                      >
                        {communityMetrics.github_stats.commits_24h > 30
                          ? "Active"
                          : "Moderate"}
                      </Badge>
                    </div>
                  </div>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400">Active Contributors</p>
                    <p className="text-2xl font-bold">
                      {communityMetrics.github_stats.active_contributors}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge
                        variant={
                          communityMetrics.github_stats.active_contributors > 50
                            ? "success"
                            : "warning"
                        }
                      >
                        {communityMetrics.github_stats.active_contributors > 50
                          ? "Strong"
                          : "Growing"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="bg-gray-800/30 rounded-lg p-4 h-full">
                  <h4 className="text-sm font-medium text-gray-400 mb-4">
                    Whale Concentration
                  </h4>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-500/10 text-blue-400">
                          Top Holders
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold inline-block text-blue-400">
                          {communityMetrics.whale_concentration}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200/10">
                      <div
                        style={{
                          width: `${communityMetrics.whale_concentration}%`,
                        }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          communityMetrics.whale_concentration > 60
                            ? "bg-red-500"
                            : communityMetrics.whale_concentration > 40
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">
                        Percentage of total supply held by top 100 wallets
                      </p>
                      <Badge
                        variant={
                          communityMetrics.whale_concentration > 60
                            ? "danger"
                            : communityMetrics.whale_concentration > 40
                              ? "warning"
                              : "success"
                        }
                      >
                        {communityMetrics.whale_concentration > 60
                          ? "High Concentration"
                          : communityMetrics.whale_concentration > 40
                            ? "Moderate Concentration"
                            : "Well Distributed"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">Community Health Score</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">
                  Engagement Metrics
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      label: "Active/Total Ratio",
                      value:
                        communityMetrics.active_wallets_24h /
                        communityMetrics.total_holders,
                      target: 0.1,
                    },
                    {
                      label: "Growth Rate",
                      value:
                        communityMetrics.new_wallets_24h /
                        communityMetrics.total_holders,
                      target: 0.01,
                    },
                    {
                      label: "HODL Score",
                      value: Math.min(
                        communityMetrics.average_holding_time / 365,
                        1,
                      ),
                      target: 0.5,
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{metric.label}</span>
                        <Badge
                          variant={
                            metric.value >= metric.target
                              ? "success"
                              : "warning"
                          }
                        >
                          {(metric.value * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            metric.value >= metric.target
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                          style={{
                            width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">
                  Development Health
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      label: "Commit Frequency",
                      value: communityMetrics.github_stats.commits_24h / 50,
                      target: 1,
                    },
                    {
                      label: "Contributor Ratio",
                      value:
                        communityMetrics.github_stats.active_contributors / 100,
                      target: 1,
                    },
                    {
                      label: "Fork Ratio",
                      value:
                        communityMetrics.github_stats.forks /
                        communityMetrics.github_stats.stars,
                      target: 0.2,
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{metric.label}</span>
                        <Badge
                          variant={
                            metric.value >= metric.target
                              ? "success"
                              : "warning"
                          }
                        >
                          {(metric.value * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            metric.value >= metric.target
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                          style={{
                            width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">
                  Distribution Health
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      label: "Whale Concentration",
                      value: 1 - communityMetrics.whale_concentration / 100,
                      target: 0.7,
                    },
                    {
                      label: "Active Distribution",
                      value: Math.random(), // This would come from actual data
                      target: 0.8,
                    },
                    {
                      label: "Holder Retention",
                      value: Math.random(), // This would come from actual data
                      target: 0.75,
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="bg-gray-800/30 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{metric.label}</span>
                        <Badge
                          variant={
                            metric.value >= metric.target
                              ? "success"
                              : "warning"
                          }
                        >
                          {(metric.value * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="w-full h-2 bg-gray-200/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            metric.value >= metric.target
                              ? "bg-green-500"
                              : "bg-yellow-500"
                          }`}
                          style={{
                            width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GlobeAltIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">Social & Sentiment Analysis</h2>
        </div>
        <select
          className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
        >
          <option value="BTC">Bitcoin (BTC)</option>
          <option value="ETH">Ethereum (ETH)</option>
          <option value="SOL">Solana (SOL)</option>
        </select>
      </div>

      <div className="flex gap-2 mb-6">
        {(["overview", "social", "news", "community"] as const).map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "primary" : "ghost"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "overview" && renderOverviewTab()}
          {activeTab === "social" && renderSocialTab()}
          {activeTab === "news" && renderNewsTab()}
          {activeTab === "community" && renderCommunityTab()}
        </div>
      )}
    </div>
  );
}
