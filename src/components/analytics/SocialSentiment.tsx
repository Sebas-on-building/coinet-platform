"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AdvancedChart } from '@/components/charts/AdvancedChart';
import { analyticsService } from '@/services/analytics';
import {
  ChatBubbleLeftRightIcon,
  HashtagIcon,
  ChartBarIcon,
  NewspaperIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import type { EnhancedSocialMetrics, TopicAnalysis, InfluencerMetrics } from '@/types/analytics';

interface SocialSentimentProps {
  symbol: string;
}

export function SocialSentiment({ symbol }: SocialSentimentProps) {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [socialMetrics, setSocialMetrics] = useState<EnhancedSocialMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'topics' | 'influencers' | 'news'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const metrics = await analyticsService.getSocialMetrics(symbol);
        setSocialMetrics(metrics);
      } catch (error) {
        console.error('Error fetching social metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const getSentimentColor = (score: number | unknown) => {
    // Ensure score is a number
    const numScore = typeof score === 'number' ? score : 0;

    if (numScore >= 0.6) return 'text-green-500';
    if (numScore <= 0.4) return 'text-red-500';
    return 'text-yellow-500';
  };

  // Helper function to safely access nested properties
  const getSafeValue = (obj: any, path: string, defaultValue: any = 0) => {
    const value = path.split('.').reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
    return value !== undefined ? value : defaultValue;
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Sentiment Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Overall Sentiment</p>
              <p className={`text-2xl font-bold ${getSentimentColor(getSafeValue(socialMetrics, 'sentiment_analysis.overall_score'))}`}>
                {((getSafeValue(socialMetrics, 'sentiment_analysis.overall_score') as number) * 100).toFixed(1)}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="mt-2">
            <Badge
              variant={getSafeValue(socialMetrics, 'sentiment_analysis.change_24h', 0) >= 0 ? 'success' : 'danger'}
              icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
            >
              {getSafeValue(socialMetrics, 'sentiment_analysis.change_24h', 0) >= 0 ? '+' : ''}
              {getSafeValue(socialMetrics, 'sentiment_analysis.change_24h', 0).toFixed(1)}%
            </Badge>
          </div>
        </Card>

        {/* Platform Breakdown */}
        {Object.entries(getSafeValue(socialMetrics, 'sentiment_analysis.sources', {})).map(([platform, score]) => (
          <Card key={platform} variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
                <p className={`text-2xl font-bold ${getSentimentColor(score)}`}>
                  {(score as number * 100).toFixed(1)}%
                </p>
              </div>
              <GlobeAltIcon className="h-8 w-8 text-gray-400" />
            </div>
          </Card>
        ))}
      </div>

      {/* Correlation Analysis */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Market Impact Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Price Correlation</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {getSafeValue(socialMetrics, 'correlation_analysis.price_correlation', 0).toFixed(2)}
              </span>
              <Badge variant="secondary">
                {getSafeValue(socialMetrics, 'correlation_analysis.price_correlation', 0) >= 0.5 ? 'Strong' : 'Weak'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Volume Correlation</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {getSafeValue(socialMetrics, 'correlation_analysis.volume_correlation', 0).toFixed(2)}
              </span>
              <Badge variant="secondary">
                {getSafeValue(socialMetrics, 'correlation_analysis.volume_correlation', 0) >= 0.5 ? 'Strong' : 'Weak'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Sentiment Lead/Lag</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {getSafeValue(socialMetrics, 'correlation_analysis.sentiment_lead_lag', 0).toFixed(1)}h
              </span>
              <Badge variant="secondary">
                {getSafeValue(socialMetrics, 'correlation_analysis.sentiment_lead_lag', 0) >= 0 ? 'Leading' : 'Lagging'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTopicsTab = () => (
    <div className="space-y-4">
      {socialMetrics?.topic_modeling?.map((topic: TopicAnalysis) => (
        <Card key={topic.topic} variant="glass" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HashtagIcon className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">{topic.topic}</h3>
            </div>
            <Badge
              variant={topic.trending_score > 0.7 ? 'success' : 'secondary'}
              icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
            >
              Trend Score: {(topic.trending_score * 100).toFixed(0)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Sentiment</p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${getSentimentColor(topic.sentiment)}`}>
                  {(typeof topic.sentiment === 'number' ? topic.sentiment * 100 : 0).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Volume</p>
              <span className="text-lg font-semibold">{topic.volume.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-gray-400 mb-1">Key Terms</p>
            <div className="flex flex-wrap gap-2">
              {topic.key_terms.map((term) => (
                <Badge key={term} variant="secondary">
                  {term}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderInfluencersTab = () => (
    <div className="space-y-4">
      {socialMetrics?.influencer_tracking.map((influencer: InfluencerMetrics) => (
        <Card key={influencer.user} variant="glass" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <UserGroupIcon className="h-6 w-6 text-blue-500" />
              <div>
                <h3 className="font-medium">{influencer.user}</h3>
                <p className="text-sm text-gray-400">{influencer.platform}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {influencer.followers.toLocaleString()} followers
              </Badge>
              <Badge variant={influencer.reliability_score > 0.7 ? 'success' : 'warning'}>
                {(influencer.reliability_score * 100).toFixed(0)}% reliable
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            {influencer.recent_posts.map((post, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-3">
                <p className="text-sm mb-2">{post.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-4">
                    <span>❤️ {post.engagement.likes.toLocaleString()}</span>
                    <span>💬 {post.engagement.comments.toLocaleString()}</span>
                    <span>🔄 {post.engagement.shares.toLocaleString()}</span>
                  </div>
                  <Badge
                    variant={post.price_impact >= 0 ? 'success' : 'danger'}
                    icon={<ArrowTrendingUpIcon className="h-3 w-3" />}
                  >
                    {post.price_impact >= 0 ? '+' : ''}{post.price_impact.toFixed(2)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: ChartBarIcon },
          { id: 'topics', label: 'Topics', icon: HashtagIcon },
          { id: 'influencers', label: 'Influencers', icon: UserGroupIcon },
          { id: 'news', label: 'News', icon: NewspaperIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`
              py-3 px-4 text-sm font-medium rounded-t-lg transition-colors
              ${selectedTab === tab.id
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'}
            `}
          >
            <tab.icon className="h-5 w-5 inline-block mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on selected tab */}
      <div className="mt-6">
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'topics' && renderTopicsTab()}
        {selectedTab === 'influencers' && renderInfluencersTab()}
        {selectedTab === 'news' && (
          <p className="text-gray-400">News content would be displayed here.</p>
        )}
      </div>
    </div>
  );
}