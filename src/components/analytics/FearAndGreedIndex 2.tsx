"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Volume2,
  TrendingUpIcon,
  Zap,
  BarChart2,
} from "lucide-react";

interface SentimentSource {
  name: string;
  value: number;
  weight: number;
  change24h: number;
  description: string;
  category: "market" | "social" | "technical" | "derivatives";
  icon: React.ElementType;
}

interface HistoricalSentiment {
  timestamp: number;
  value: number;
}

interface FearAndGreedIndexProps {
  timeframe: string;
}

export const FearAndGreedIndex: React.FC<FearAndGreedIndexProps> = ({
  timeframe,
}) => {
  const [sentimentSources, setSentimentSources] = useState<SentimentSource[]>(
    [],
  );
  const [historicalData, setHistoricalData] = useState<HistoricalSentiment[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "market" | "social" | "technical" | "derivatives"
  >("all");

  useEffect(() => {
    // In a real implementation, this would fetch data from various APIs
    const generateMockData = (): SentimentSource[] => {
      return [
        {
          name: "Market Volatility",
          value: 35,
          weight: 0.25,
          change24h: -5,
          description:
            "Analysis of current market volatility compared to historical averages",
          category: "market",
          icon: Activity,
        },
        {
          name: "Market Momentum",
          value: 65,
          weight: 0.15,
          change24h: 8,
          description: "Price strength and trading volume analysis",
          category: "technical",
          icon: TrendingUpIcon,
        },
        {
          name: "Social Media Sentiment",
          value: 42,
          weight: 0.15,
          change24h: -3,
          description:
            "Aggregated sentiment from Twitter, Reddit, and other social platforms",
          category: "social",
          icon: Volume2,
        },
        {
          name: "Derivatives Data",
          value: 58,
          weight: 0.2,
          change24h: 2,
          description: "Options put/call ratio and futures funding rates",
          category: "derivatives",
          icon: BarChart2,
        },
        {
          name: "Trading Volume",
          value: 71,
          weight: 0.15,
          change24h: 12,
          description:
            "Analysis of current trading volumes vs historical averages",
          category: "market",
          icon: Zap,
        },
        {
          name: "News Sentiment",
          value: 45,
          weight: 0.1,
          change24h: -7,
          description: "Sentiment analysis of crypto news articles",
          category: "social",
          icon: AlertTriangle,
        },
      ];
    };

    const generateHistoricalData = (): HistoricalSentiment[] => {
      const data: HistoricalSentiment[] = [];
      const now = Date.now();
      const periods = timeframe === "1d" ? 24 : timeframe === "1w" ? 7 : 30;
      const interval =
        timeframe === "1d" ? 3600000 : timeframe === "1w" ? 86400000 : 86400000;

      for (let i = 0; i < periods; i++) {
        data.push({
          timestamp: now - (periods - i) * interval,
          value: 25 + Math.random() * 50, // Random value between 25 and 75
        });
      }

      return data.sort((a, b) => a.timestamp - b.timestamp);
    };

    setSentimentSources(generateMockData());
    setHistoricalData(generateHistoricalData());
  }, [timeframe]);

  const getIndexCategory = (
    value: number,
  ): {
    label: string;
    color: string;
    icon: React.ReactNode;
  } => {
    if (value >= 75)
      return {
        label: "Extreme Greed",
        color: "text-green-600",
        icon: <TrendingUp className="w-6 h-6" />,
      };
    if (value >= 60)
      return {
        label: "Greed",
        color: "text-green-500",
        icon: <TrendingUp className="w-6 h-6" />,
      };
    if (value >= 45)
      return {
        label: "Neutral",
        color: "text-yellow-500",
        icon: <AlertTriangle className="w-6 h-6" />,
      };
    if (value >= 30)
      return {
        label: "Fear",
        color: "text-red-500",
        icon: <TrendingDown className="w-6 h-6" />,
      };
    return {
      label: "Extreme Fear",
      color: "text-red-600",
      icon: <TrendingDown className="w-6 h-6" />,
    };
  };

  const overallIndex = sentimentSources.reduce(
    (acc, source) => acc + source.value * source.weight,
    0,
  );

  const filteredSources = sentimentSources.filter(
    (source) =>
      selectedCategory === "all" || source.category === selectedCategory,
  );

  return (
    <div className="space-y-6">
      {/* Main Index Display */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Fear & Greed Index</h3>
            <div className="flex items-center space-x-4">
              <div className="text-4xl font-bold">
                {Math.round(overallIndex)}
              </div>
              <div>
                <div
                  className={`text-xl font-medium ${getIndexCategory(overallIndex).color}`}
                >
                  {getIndexCategory(overallIndex).label}
                </div>
                <div className="text-sm text-gray-500">
                  Updated {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className={getIndexCategory(overallIndex).color}>
                {getIndexCategory(overallIndex).icon}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">Historical Trend</h3>
            <div className="h-20 flex items-end space-x-1">
              {historicalData.map((data, index) => (
                <div
                  key={index}
                  className="flex-1"
                  style={{
                    height: `${data.value}%`,
                    backgroundColor: getIndexCategory(data.value)
                      .color.replace("text-", "bg-")
                      .replace("-600", "-200")
                      .replace("-500", "-200"),
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-500">
              <span>
                {new Date(historicalData[0]?.timestamp).toLocaleDateString()}
              </span>
              <span>
                {new Date(
                  historicalData[historicalData.length - 1]?.timestamp,
                ).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Category Filter */}
      <div className="flex space-x-2">
        {(["all", "market", "social", "technical", "derivatives"] as const).map(
          (category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded ${
                selectedCategory === category
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* Sentiment Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => (
          <Card key={source.name} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{source.name}</div>
                <div className="text-sm text-gray-500">
                  {source.description}
                </div>
              </div>
              <source.icon className="w-5 h-5 text-gray-400" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Current Value</span>
                <span
                  className={`font-medium ${getIndexCategory(source.value).color}`}
                >
                  {source.value}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">24h Change</span>
                <span
                  className={`font-medium ${
                    source.change24h > 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {source.change24h > 0 ? "+" : ""}
                  {source.change24h}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Weight</span>
                <span className="font-medium">
                  {(source.weight * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-full rounded-full ${getIndexCategory(source.value).color.replace("text-", "bg-")}`}
                style={{ width: `${source.value}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Index Explanation */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Understanding the Index</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { value: 20, label: "Extreme Fear" },
            { value: 35, label: "Fear" },
            { value: 50, label: "Neutral" },
            { value: 65, label: "Greed" },
            { value: 80, label: "Extreme Greed" },
          ].map((level) => (
            <div key={level.label} className="text-center">
              <div
                className={`text-lg font-medium ${getIndexCategory(level.value).color}`}
              >
                {level.label}
              </div>
              <div className="text-sm text-gray-500">
                {level.value - 15}-{level.value + 15}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
