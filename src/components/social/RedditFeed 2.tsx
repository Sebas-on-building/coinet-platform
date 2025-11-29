"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp, TrendingDown, MessageCircle, ArrowUp } from "lucide-react";

interface RedditMetrics {
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
}

interface RedditFeedProps {
  data: RedditMetrics;
  symbol: string;
}

export function RedditFeed({ data, symbol }: RedditFeedProps) {
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 0.7) return "text-green-500";
    if (sentiment <= 0.3) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentIcon = (sentiment: number) => {
    if (sentiment >= 0.7)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (sentiment <= 0.3)
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment >= 0.7) return "Bullish";
    if (sentiment <= 0.3) return "Bearish";
    return "Neutral";
  };

  return (
    <div className="space-y-6">
      {/* Reddit Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">
          Reddit Metrics for {symbol}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Active Users</div>
            <div className="text-2xl font-bold">
              {formatNumber(data.active_users)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">24h Posts</div>
            <div className="text-2xl font-bold">
              {formatNumber(data.post_count_24h)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Sentiment Score</div>
            <div
              className={`text-2xl font-bold flex items-center ${getSentimentColor(data.sentiment_score / 100)}`}
            >
              {data.sentiment_score}/100
              {getSentimentIcon(data.sentiment_score / 100)}
            </div>
          </div>
        </div>
      </Card>

      {/* Top Reddit Posts */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Top Reddit Posts</h3>
        <div className="space-y-4">
          {data.top_posts.map((post, index) => (
            <div
              key={index}
              className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
            >
              <div className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <ArrowUp className="h-5 w-5 text-gray-400" />
                  <span className="font-medium">
                    {formatNumber(post.upvotes)}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{post.title}</h4>
                    <Badge
                      variant={
                        post.sentiment >= 0.7
                          ? "success"
                          : post.sentiment <= 0.3
                            ? "danger"
                            : "warning"
                      }
                    >
                      {getSentimentLabel(post.sentiment)}
                    </Badge>
                  </div>
                  <div className="flex items-center mt-2 text-sm text-gray-500">
                    <div className="flex items-center">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {formatNumber(post.comments)} comments
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-blue-500 hover:text-blue-600"
                    >
                      View Post →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <a
            href={`https://www.reddit.com/search/?q=${symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 font-medium"
          >
            View More Reddit Posts →
          </a>
        </div>
      </Card>

      {/* Sentiment Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Reddit Sentiment Breakdown</h3>
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="flex h-full">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${data.sentiment_score * 0.7}%` }}
            ></div>
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${data.sentiment_score * 0.2}%` }}
            ></div>
            <div
              className="bg-red-500 h-full"
              style={{ width: `${100 - data.sentiment_score * 0.9}%` }}
            ></div>
          </div>
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <div className="text-red-500">Bearish</div>
          <div className="text-yellow-500">Neutral</div>
          <div className="text-green-500">Bullish</div>
        </div>
      </Card>
    </div>
  );
}
