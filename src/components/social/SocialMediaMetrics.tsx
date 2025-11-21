"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { SentimentData } from "@/services/api";
import {
  TrendingUp,
  TrendingDown,
  Twitter,
  MessageSquare,
  Newspaper,
  Users,
} from "lucide-react";

interface SocialMediaMetricsProps {
  data: SentimentData;
  symbol: string;
}

export function SocialMediaMetrics({ data, symbol }: SocialMediaMetricsProps) {
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

  const getSentimentTrend = (change: number) => {
    if (change >= 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const metrics = [
    {
      title: "Twitter",
      icon: <Twitter className="h-5 w-5 text-blue-500" />,
      value: formatNumber(data.social_metrics.twitter.followers),
      label: "Followers",
      secondary: `${data.social_metrics.twitter.engagement_rate.toFixed(1)}% Engagement`,
      sentiment: data.social_metrics.twitter.sentiment_score,
    },
    {
      title: "Reddit",
      icon: <MessageSquare className="h-5 w-5 text-orange-500" />,
      value: formatNumber(data.social_metrics.reddit.active_users),
      label: "Active Users",
      secondary: `${formatNumber(data.social_metrics.reddit.post_count_24h)} Posts (24h)`,
      sentiment: data.social_metrics.reddit.sentiment_score,
    },
    {
      title: "News",
      icon: <Newspaper className="h-5 w-5 text-gray-500" />,
      value: formatNumber(data.social_metrics.news.article_count_24h),
      label: "Articles (24h)",
      secondary: "Press Coverage",
      sentiment: data.social_metrics.news.sentiment_score,
    },
    {
      title: "Total Reach",
      icon: <Users className="h-5 w-5 text-purple-500" />,
      value: formatNumber(
        data.social_metrics.twitter.followers +
          data.social_metrics.reddit.active_users +
          data.social_metrics.news.article_count_24h * 1000, // Estimating readership
      ),
      label: "Community Size",
      secondary: `${data.overall_score}/100 Sentiment`,
      sentiment: data.overall_score,
    },
  ];

  return (
    <>
      {metrics.map((metric, index) => (
        <Card key={index} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                {metric.icon}
                <span className="font-medium ml-2">{metric.title}</span>
              </div>
              <div className="text-2xl font-bold mt-2">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.label}</div>
            </div>
            <div className="flex flex-col items-end">
              <div
                className={`text-sm font-medium ${getSentimentColor(metric.sentiment)}`}
              >
                {metric.sentiment}/100
              </div>
              <div className="flex items-center text-xs text-gray-500 mt-1">
                {getSentimentTrend(data.change_24h)}
                <span className="ml-1">{metric.secondary}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
