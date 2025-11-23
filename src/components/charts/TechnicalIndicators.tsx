import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ChartPieIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface Indicator {
  name: string;
  value: number;
  signal: "buy" | "sell" | "neutral";
  description: string;
}

interface TechnicalIndicatorsProps {
  asset: string;
  timeframe: string;
}

export function TechnicalIndicators({
  asset,
  timeframe,
}: TechnicalIndicatorsProps) {
  const [activeTab, setActiveTab] = useState("momentum");
  const [indicators, setIndicators] = useState<Record<string, Indicator[]>>({
    momentum: [
      {
        name: "RSI",
        value: 65,
        signal: "neutral",
        description: "Relative Strength Index",
      },
      {
        name: "MACD",
        value: 0.5,
        signal: "buy",
        description: "Moving Average Convergence Divergence",
      },
      {
        name: "Stochastic",
        value: 75,
        signal: "sell",
        description: "Stochastic Oscillator",
      },
    ],
    trend: [
      {
        name: "MA20",
        value: 25000,
        signal: "buy",
        description: "20-day Moving Average",
      },
      {
        name: "MA50",
        value: 24800,
        signal: "buy",
        description: "50-day Moving Average",
      },
      {
        name: "MA200",
        value: 24500,
        signal: "buy",
        description: "200-day Moving Average",
      },
    ],
    volume: [
      {
        name: "OBV",
        value: 1500000,
        signal: "buy",
        description: "On-Balance Volume",
      },
      {
        name: "Volume MA",
        value: 1200000,
        signal: "neutral",
        description: "Volume Moving Average",
      },
      {
        name: "Volume Ratio",
        value: 1.25,
        signal: "buy",
        description: "Volume Ratio (Current/MA)",
      },
    ],
    volatility: [
      {
        name: "Bollinger Bands",
        value: 0.8,
        signal: "neutral",
        description: "Bollinger Bands Width",
      },
      {
        name: "ATR",
        value: 1200,
        signal: "neutral",
        description: "Average True Range",
      },
      {
        name: "Volatility",
        value: 0.15,
        signal: "neutral",
        description: "Historical Volatility",
      },
    ],
  });

  const renderIndicatorCard = (indicator: Indicator) => (
    <div key={indicator.name} className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium">{indicator.name}</h4>
          <p className="text-sm text-gray-500">{indicator.description}</p>
        </div>
        <Badge
          variant={
            indicator.signal === "buy"
              ? "success"
              : indicator.signal === "sell"
                ? "danger"
                : "secondary"
          }
        >
          {indicator.signal === "buy" ? (
            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
          ) : indicator.signal === "sell" ? (
            <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
          ) : (
            <ScaleIcon className="w-4 h-4 mr-1" />
          )}
          {indicator.signal.toUpperCase()}
        </Badge>
      </div>
      <div className="text-2xl font-bold">
        {typeof indicator.value === "number" && indicator.value < 1000
          ? indicator.value.toFixed(2)
          : indicator.value.toLocaleString()}
      </div>
    </div>
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Technical Indicators</h3>
        <p className="text-gray-500">
          {asset.toUpperCase()} - {timeframe}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="momentum">Momentum</TabsTrigger>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="volatility">Volatility</TabsTrigger>
        </TabsList>

        <TabsContent value="momentum">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indicators.momentum.map(renderIndicatorCard)}
          </div>
        </TabsContent>

        <TabsContent value="trend">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indicators.trend.map(renderIndicatorCard)}
          </div>
        </TabsContent>

        <TabsContent value="volume">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indicators.volume.map(renderIndicatorCard)}
          </div>
        </TabsContent>

        <TabsContent value="volatility">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {indicators.volatility.map(renderIndicatorCard)}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
