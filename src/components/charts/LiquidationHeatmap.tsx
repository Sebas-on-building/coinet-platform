import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ScaleIcon,
  ClockIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { Tooltip } from "@/components/ui/tooltip";

interface LiquidationData {
  price: number;
  longLiquidations: number;
  shortLiquidations: number;
  totalLiquidations: number;
  timestamp: string;
  exchange: string;
  leverage: number;
}

interface PriceLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "neutral";
}

export function LiquidationHeatmap() {
  const [timeframe, setTimeframe] = useState("1D");
  const [liquidationData, setLiquidationData] = useState<LiquidationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredData, setHoveredData] = useState<LiquidationData | null>(null);
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLiquidationData();
    loadPriceLevels();
  }, [timeframe]);

  const loadLiquidationData = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      const response = await fetch(`/api/liquidations?timeframe=${timeframe}`);
      const data = await response.json();
      setLiquidationData(data);
    } catch (error) {
      console.error("Error loading liquidation data:", error);
      // Fallback to simulated data
      const data = generateSimulatedData();
      setLiquidationData(data);
    } finally {
      setLoading(false);
    }
  };

  const loadPriceLevels = async () => {
    try {
      // Replace with actual API call
      const response = await fetch(`/api/price-levels?timeframe=${timeframe}`);
      const data = await response.json();
      setPriceLevels(data);
    } catch (error) {
      console.error("Error loading price levels:", error);
      // Fallback to simulated price levels
      setPriceLevels(generateSimulatedPriceLevels());
    }
  };

  const generateSimulatedPriceLevels = (): PriceLevel[] => {
    const basePrice = 25000;
    return [
      { price: basePrice + 1000, label: "R1", type: "resistance" },
      { price: basePrice + 500, label: "R2", type: "resistance" },
      { price: basePrice, label: "Pivot", type: "neutral" },
      { price: basePrice - 500, label: "S1", type: "support" },
      { price: basePrice - 1000, label: "S2", type: "support" },
    ];
  };

  const generateSimulatedData = (): LiquidationData[] => {
    const data: LiquidationData[] = [];
    const now = Date.now();
    const interval = getIntervalInMs(timeframe);
    const points = getDataPoints(timeframe);
    const basePrice = 25000;
    const exchanges = ["Binance", "Bybit", "OKX", "Deribit"];

    for (let i = 0; i < points; i++) {
      const timestamp = new Date(now - (points - i) * interval);
      const price = basePrice + (Math.random() - 0.5) * 1000;
      const longLiquidations = Math.random() * 1000000;
      const shortLiquidations = Math.random() * 1000000;
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const leverage = Math.floor(Math.random() * 100) + 1;

      data.push({
        price,
        longLiquidations,
        shortLiquidations,
        totalLiquidations: longLiquidations + shortLiquidations,
        timestamp: timestamp.toISOString(),
        exchange,
        leverage,
      });
    }

    return data.sort((a, b) => a.price - b.price);
  };

  const getIntervalInMs = (timeframe: string): number => {
    switch (timeframe) {
      case "1H":
        return 1 * 60 * 1000; // 1 minute
      case "4H":
        return 5 * 60 * 1000; // 5 minutes
      case "1D":
        return 15 * 60 * 1000; // 15 minutes
      case "1W":
        return 30 * 60 * 1000; // 30 minutes
      case "1M":
        return 60 * 60 * 1000; // 1 hour
      default:
        return 15 * 60 * 1000;
    }
  };

  const getDataPoints = (timeframe: string): number => {
    switch (timeframe) {
      case "1H":
        return 60; // 1-minute intervals
      case "4H":
        return 48; // 5-minute intervals
      case "1D":
        return 96; // 15-minute intervals
      case "1W":
        return 336; // 30-minute intervals
      case "1M":
        return 720; // 1-hour intervals
      default:
        return 96;
    }
  };

  const getLiquidationColor = (value: number, maxValue: number): string => {
    const intensity = Math.min(value / maxValue, 1);
    const hue = value > 0 ? 0 : 240; // Red for long, blue for short
    return `hsl(${hue}, 100%, ${100 - intensity * 50}%)`;
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatLiquidation = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const renderPriceMarkers = (priceRange: { min: number; max: number }) => {
    return (
      <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between py-4">
        {priceLevels.map((level) => {
          const position =
            ((level.price - priceRange.min) /
              (priceRange.max - priceRange.min)) *
            100;
          return (
            <div
              key={level.label}
              className="absolute left-0 transform -translate-y-1/2"
              style={{ bottom: `${position}%` }}
            >
              <div className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    level.type === "support"
                      ? "bg-green-500"
                      : level.type === "resistance"
                        ? "bg-red-500"
                        : "bg-gray-500"
                  }`}
                />
                <span className="text-sm font-medium">
                  {formatPrice(level.price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTooltip = (data: LiquidationData) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">Price:</span>
            <span>{formatPrice(data.price)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Time:</span>
            <span>{new Date(data.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Long Liquidations:</span>
            <span className="text-red-500">
              {formatLiquidation(data.longLiquidations)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Short Liquidations:</span>
            <span className="text-green-500">
              {formatLiquidation(data.shortLiquidations)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Exchange:</span>
            <span>{data.exchange}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Avg. Leverage:</span>
            <span>{data.leverage}x</span>
          </div>
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    const maxLiquidation = Math.max(
      ...liquidationData.map((d) => d.totalLiquidations),
    );
    const priceRange = {
      min: Math.min(...liquidationData.map((d) => d.price)),
      max: Math.max(...liquidationData.map((d) => d.price)),
    };

    return (
      <div className="relative h-[400px] w-full" ref={containerRef}>
        {renderPriceMarkers(priceRange)}
        <div className="absolute left-20 right-0 top-0 bottom-0">
          {liquidationData.map((data, index) => (
            <Tooltip
              key={index}
              content={renderTooltip(data)}
              side="right"
              align="center"
            >
              <div
                className="absolute w-2 h-2 rounded-full cursor-pointer hover:scale-150 transition-transform"
                style={{
                  left: `${(index / liquidationData.length) * 100}%`,
                  bottom: `${((data.price - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                  backgroundColor: getLiquidationColor(
                    data.longLiquidations - data.shortLiquidations,
                    maxLiquidation,
                  ),
                  transform: "translate(-50%, 50%)",
                  opacity: data.totalLiquidations / maxLiquidation,
                }}
                onMouseEnter={() => setHoveredData(data)}
                onMouseLeave={() => setHoveredData(null)}
              />
            </Tooltip>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Liquidation Heatmap</h3>
          <p className="text-gray-500">BTC/USD</p>
        </div>

        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList>
            <TabsTrigger value="1H">1H</TabsTrigger>
            <TabsTrigger value="4H">4H</TabsTrigger>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mb-4 flex gap-4">
        <Badge variant="danger">
          <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
          Long Liquidations
        </Badge>
        <Badge variant="success">
          <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
          Short Liquidations
        </Badge>
        <Tooltip content="The heatmap shows liquidation clusters at different price levels. Red indicates long liquidations, blue indicates short liquidations. The intensity of the color represents the size of the liquidation.">
          <InformationCircleIcon className="w-5 h-5 text-gray-400 cursor-help" />
        </Tooltip>
      </div>

      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <ClockIcon className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          renderHeatmap()
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Total Liquidations</h4>
          <div className="text-2xl font-bold">
            {formatLiquidation(
              liquidationData.reduce(
                (sum, data) => sum + data.totalLiquidations,
                0,
              ),
            )}
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Largest Liquidation</h4>
          <div className="text-2xl font-bold">
            {formatLiquidation(
              Math.max(...liquidationData.map((d) => d.totalLiquidations)),
            )}
          </div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Active Exchanges</h4>
          <div className="text-2xl font-bold">
            {new Set(liquidationData.map((d) => d.exchange)).size}
          </div>
        </div>
      </div>
    </Card>
  );
}
