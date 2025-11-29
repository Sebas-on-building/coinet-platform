"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

interface RealTimeMarketDataProps {
  symbol: string;
}

interface PriceData {
  price: number;
  priceChange: number;
  percentChange: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: Date;
}

export function RealTimeMarketData({ symbol }: RealTimeMarketDataProps) {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);

      // In a real implementation, this would fetch from API
      // Would also set up a WebSocket connection for real-time updates

      // Mock data for demonstration
      setTimeout(() => {
        const mockData: PriceData = {
          price:
            symbol === "BTC"
              ? 42500 + Math.random() * 1000 - 500
              : symbol === "ETH"
                ? 2250 + Math.random() * 100 - 50
                : 100 + Math.random() * 10 - 5,
          priceChange: Math.random() * 200 - 100,
          percentChange: Math.random() * 6 - 3,
          high24h: symbol === "BTC" ? 43200 : symbol === "ETH" ? 2300 : 110,
          low24h: symbol === "BTC" ? 41800 : symbol === "ETH" ? 2200 : 95,
          volume24h:
            symbol === "BTC"
              ? 15000000000
              : symbol === "ETH"
                ? 8000000000
                : 500000000,
          updatedAt: new Date(),
        };

        setData(mockData);
        setLoading(false);
      }, 500);
    };

    fetchPriceData();

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (data) {
        const newPrice = data.price * (1 + (Math.random() * 0.002 - 0.001));
        const priceChange = newPrice - data.price;
        const percentChange = (priceChange / data.price) * 100;

        setData({
          ...data,
          price: newPrice,
          priceChange: data.priceChange + priceChange,
          percentChange: data.percentChange + percentChange,
          updatedAt: new Date(),
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [symbol]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value < 1 ? 4 : 2,
      maximumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  if (loading || !data) {
    return (
      <Card className="p-4">
        <div className="animate-pulse h-24 w-full bg-gray-800/50 rounded-lg"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-medium">{symbol} Price</h3>
          <div className="text-3xl font-bold mt-1">
            {formatCurrency(data.price)}
          </div>
          <div className="flex items-center mt-1">
            <span
              className={`${data.percentChange >= 0 ? "text-green-500" : "text-red-500"} flex items-center`}
            >
              {data.percentChange >= 0 ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(data.percentChange).toFixed(2)}%
            </span>
            <span className="text-gray-400 ml-2">
              ({formatCurrency(data.priceChange)})
            </span>
          </div>
        </div>

        <Badge variant={data.percentChange >= 0 ? "success" : "danger"}>
          Real-time
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <div>
          <div className="text-sm text-gray-400">24h High</div>
          <div className="font-medium">{formatCurrency(data.high24h)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">24h Low</div>
          <div className="font-medium">{formatCurrency(data.low24h)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">24h Volume</div>
          <div className="font-medium">{formatVolume(data.volume24h)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-4 text-right">
        Last updated: {data.updatedAt.toLocaleTimeString()}
      </div>
    </Card>
  );
}
