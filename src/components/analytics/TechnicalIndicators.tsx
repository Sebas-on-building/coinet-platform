"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface IndicatorData {
  name: string;
  value: number;
  signal: "buy" | "sell" | "neutral";
  timeframe: string;
  strength: number;
  description: string;
  category: "trend" | "momentum" | "volatility" | "volume";
}

interface TechnicalLevel {
  price: number;
  type: "support" | "resistance";
  strength: number;
  timeframe: string;
  touches: number;
}

interface TechnicalIndicatorsProps {
  symbol: string;
  timeframe: string;
}

export const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  symbol,
  timeframe,
}) => {
  const [indicators, setIndicators] = useState<IndicatorData[]>([]);
  const [levels, setLevels] = useState<TechnicalLevel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "trend" | "momentum" | "volatility" | "volume"
  >("all");

  useEffect(() => {
    // In a real implementation, this would fetch data from an API
    const generateMockIndicators = (): IndicatorData[] => {
      const mockIndicators: IndicatorData[] = [
        {
          name: "RSI",
          value: 65.5,
          signal: "neutral",
          timeframe,
          strength: 0.7,
          description: "Relative Strength Index",
          category: "momentum",
        },
        {
          name: "MACD",
          value: 0.0023,
          signal: "buy",
          timeframe,
          strength: 0.85,
          description: "Moving Average Convergence Divergence",
          category: "trend",
        },
        {
          name: "Bollinger Bands",
          value: 0.75,
          signal: "sell",
          timeframe,
          strength: 0.6,
          description: "Bollinger Bands Width",
          category: "volatility",
        },
        {
          name: "OBV",
          value: 1250000,
          signal: "buy",
          timeframe,
          strength: 0.9,
          description: "On-Balance Volume",
          category: "volume",
        },
        {
          name: "ADX",
          value: 28.5,
          signal: "buy",
          timeframe,
          strength: 0.75,
          description: "Average Directional Index",
          category: "trend",
        },
        {
          name: "Stochastic",
          value: 82.3,
          signal: "sell",
          timeframe,
          strength: 0.65,
          description: "Stochastic Oscillator",
          category: "momentum",
        },
      ];

      return mockIndicators;
    };

    const generateMockLevels = (): TechnicalLevel[] => {
      const basePrice = 50000;
      return [
        {
          price: basePrice * 1.05,
          type: "resistance",
          strength: 0.8,
          timeframe,
          touches: 5,
        },
        {
          price: basePrice * 1.02,
          type: "resistance",
          strength: 0.6,
          timeframe,
          touches: 3,
        },
        {
          price: basePrice * 0.98,
          type: "support",
          strength: 0.75,
          timeframe,
          touches: 4,
        },
        {
          price: basePrice * 0.95,
          type: "support",
          strength: 0.85,
          timeframe,
          touches: 6,
        },
      ];
    };

    setIndicators(generateMockIndicators());
    setLevels(generateMockLevels());
  }, [symbol, timeframe]);

  const getSignalColor = (signal: "buy" | "sell" | "neutral"): string => {
    switch (signal) {
      case "buy":
        return "text-green-500";
      case "sell":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  const getSignalIcon = (signal: "buy" | "sell" | "neutral") => {
    switch (signal) {
      case "buy":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "sell":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const filteredIndicators = indicators.filter(
    (ind) => selectedCategory === "all" || ind.category === selectedCategory,
  );

  const overallSignal = indicators.reduce(
    (acc, ind) => {
      const signalValue =
        ind.signal === "buy" ? 1 : ind.signal === "sell" ? -1 : 0;
      acc.value += signalValue * ind.strength;
      acc.totalStrength += ind.strength;
      return acc;
    },
    { value: 0, totalStrength: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Overall Signal */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Technical Analysis Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-500">Overall Signal</div>
            <div
              className={`text-2xl font-bold ${
                overallSignal.value > 0.3
                  ? "text-green-500"
                  : overallSignal.value < -0.3
                    ? "text-red-500"
                    : "text-yellow-500"
              }`}
            >
              {overallSignal.value > 0.3
                ? "Strong Buy"
                : overallSignal.value > 0.1
                  ? "Buy"
                  : overallSignal.value < -0.3
                    ? "Strong Sell"
                    : overallSignal.value < -0.1
                      ? "Sell"
                      : "Neutral"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Signal Strength</div>
            <div className="text-2xl font-bold">
              {(
                (Math.abs(overallSignal.value) / overallSignal.totalStrength) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Timeframe</div>
            <div className="text-2xl font-bold">{timeframe}</div>
          </div>
        </div>
      </Card>

      {/* Category Filter */}
      <div className="flex space-x-2">
        {(["all", "trend", "momentum", "volatility", "volume"] as const).map(
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

      {/* Technical Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIndicators.map((indicator) => (
          <Card key={indicator.name} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{indicator.name}</div>
                <div className="text-sm text-gray-500">
                  {indicator.description}
                </div>
              </div>
              {getSignalIcon(indicator.signal)}
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Value</span>
                <span className="font-medium">
                  {indicator.value.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Signal</span>
                <span
                  className={`font-medium ${getSignalColor(indicator.signal)}`}
                >
                  {indicator.signal.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Strength</span>
                <span className="font-medium">
                  {(indicator.strength * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Support/Resistance Levels */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Key Price Levels</h3>
        <div className="space-y-4">
          {levels
            .sort((a, b) => b.price - a.price)
            .map((level, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div>
                  <div
                    className={`font-medium ${
                      level.type === "resistance"
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {level.type.charAt(0).toUpperCase() + level.type.slice(1)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Touches: {level.touches} | Strength:{" "}
                    {(level.strength * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-lg font-bold">
                  ${level.price.toLocaleString()}
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};
