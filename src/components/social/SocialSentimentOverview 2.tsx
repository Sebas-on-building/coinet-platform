"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { SentimentData } from "@/services/api";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Twitter,
  MessageSquare,
  Newspaper,
} from "lucide-react";

interface SocialSentimentOverviewProps {
  data: SentimentData;
  symbol: string;
}

type PlatformType = "twitter" | "reddit" | "news";

export function SocialSentimentOverview({
  data,
  symbol,
}: SocialSentimentOverviewProps) {
  const formatChange = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getSentimentColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score <= 30) return "text-red-500";
    return "text-yellow-500";
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "Bullish";
    if (score >= 60) return "Slightly Bullish";
    if (score <= 30) return "Bearish";
    if (score <= 40) return "Slightly Bearish";
    return "Neutral";
  };

  const getPlatformStrength = (platform: PlatformType) => {
    switch (platform) {
      case "twitter":
        return data.social_metrics.twitter.sentiment_score;
      case "reddit":
        return data.social_metrics.reddit.sentiment_score;
      case "news":
        return data.social_metrics.news.sentiment_score;
      default:
        return 50;
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case "twitter":
        return <Twitter className="h-5 w-5" />;
      case "reddit":
        return <MessageSquare className="h-5 w-5" />;
      case "news":
        return <Newspaper className="h-5 w-5" />;
      default:
        return null;
    }
  };

  // Calculate which platform has the strongest sentiment
  const platforms: PlatformType[] = ["twitter", "reddit", "news"];
  const strongestPlatform = platforms.reduce((strongest, current) => {
    const currentScore = getPlatformStrength(current);
    const strongestScore = getPlatformStrength(strongest);
    return currentScore > strongestScore ? current : strongest;
  }, platforms[0]);

  // Generate random word cloud data if not provided
  const wordCloudItems =
    data.word_cloud ||
    Array(10)
      .fill(null)
      .map((_, i) => ({
        word: [
          "bull",
          "bear",
          "moon",
          "dip",
          "buy",
          "sell",
          "hodl",
          "pump",
          "dump",
          "trend",
        ][i],
        weight: Math.random(),
        sentiment: Math.random() * 2 - 1,
      }));

  return (
    <div className="space-y-6">
      {/* Overall Sentiment Card */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">
          {symbol} Social Sentiment Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 md:col-span-2">
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-500 mb-1">
                Overall Sentiment Score
              </div>
              <div
                className={`text-4xl font-bold ${getSentimentColor(data.overall_score)}`}
              >
                {data.overall_score}
              </div>
              <div className="text-lg mt-1 font-medium">
                {getSentimentLabel(data.overall_score)}
              </div>
              <div
                className={`flex items-center mt-2 ${data.change_24h >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {data.change_24h >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatChange(data.change_24h)} in 24h
              </div>
            </div>

            <div className="mt-6">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${data.overall_score >= 70 ? "bg-green-500" : data.overall_score <= 30 ? "bg-red-500" : "bg-yellow-500"}`}
                  style={{ width: `${data.overall_score}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <div>Very Bearish</div>
                <div>Neutral</div>
                <div>Very Bullish</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-gray-500 mb-3">Platform Breakdown</div>
            <div className="space-y-4">
              {platforms.map((platform) => {
                const score = getPlatformStrength(platform);
                return (
                  <div key={platform} className="flex items-center">
                    <div className="w-8">{getPlatformIcon(platform)}</div>
                    <div className="ml-2 w-24 capitalize">{platform}</div>
                    <div className="flex-1">
                      <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${score >= 70 ? "bg-green-500" : score <= 30 ? "bg-red-500" : "bg-yellow-500"}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-3 w-10 text-right">{score}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-sm">
              <span className="font-medium">Strongest signal:</span>{" "}
              {strongestPlatform.charAt(0).toUpperCase() +
                strongestPlatform.slice(1)}{" "}
              ({getPlatformStrength(strongestPlatform)})
            </div>
          </div>
        </div>
      </Card>

      {/* Market Impact Card */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Market Impact</h3>
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
            <span className="text-sm text-gray-500">Analysis</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-500 mb-1">Price Correlation</div>
            <div className="text-2xl font-bold">
              {(data.market_impact.price_correlation * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {data.market_impact.price_correlation > 0.5
                ? "Strong"
                : "Moderate"}{" "}
              correlation with price
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Volume Correlation</div>
            <div className="text-2xl font-bold">
              {(data.market_impact.volume_correlation * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {data.market_impact.volume_correlation > 0.5
                ? "Strong"
                : "Moderate"}{" "}
              correlation with volume
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">
              Predicted Price Impact
            </div>
            <div
              className={`text-2xl font-bold ${data.market_impact.predicted_impact >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {formatChange(data.market_impact.predicted_impact)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Potential{" "}
              {data.market_impact.predicted_impact >= 0
                ? "increase"
                : "decrease"}{" "}
              based on sentiment
            </div>
          </div>
        </div>
      </Card>

      {/* Word Cloud */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Trending Topics</h3>
          <div className="flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-500" />
            <span className="text-sm text-gray-500">Word Cloud</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center p-4">
          {wordCloudItems
            .sort((a, b) => b.weight - a.weight)
            .map((item, index) => (
              <div
                key={index}
                className={`m-2 p-2 rounded-lg font-medium ${
                  item.sentiment > 0.3
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : item.sentiment < -0.3
                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                }`}
                style={{
                  fontSize: `${Math.max(0.8, Math.min(2, 0.8 + item.weight))}rem`,
                }}
              >
                {item.word}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
