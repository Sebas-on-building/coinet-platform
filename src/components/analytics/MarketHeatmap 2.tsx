"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

interface HeatmapItem {
  symbol: string;
  name: string;
  price: number;
  priceChange: number;
  marketCap: number;
  volume: number;
}

interface MarketHeatmapProps {
  sector?: "all" | "defi" | "nft" | "layer1" | "layer2";
  timeframe?: "1h" | "24h" | "7d" | "30d";
}

export function MarketHeatmap({
  sector = "all",
  timeframe = "24h",
}: MarketHeatmapProps) {
  const [data, setData] = useState<HeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // In a real implementation, fetch data from API
      // const response = await api.get('/market/heatmap', { sector, timeframe });

      // Mock data
      const mockData: HeatmapItem[] = [
        {
          symbol: "BTC",
          name: "Bitcoin",
          price: 42300,
          priceChange: 2.4,
          marketCap: 810000000000,
          volume: 23000000000,
        },
        {
          symbol: "ETH",
          name: "Ethereum",
          price: 2250,
          priceChange: 3.1,
          marketCap: 271000000000,
          volume: 12000000000,
        },
        {
          symbol: "BNB",
          name: "Binance Coin",
          price: 320,
          priceChange: -1.2,
          marketCap: 54000000000,
          volume: 1800000000,
        },
        {
          symbol: "SOL",
          name: "Solana",
          price: 105,
          priceChange: 5.3,
          marketCap: 43000000000,
          volume: 3200000000,
        },
        {
          symbol: "XRP",
          name: "Ripple",
          price: 0.52,
          priceChange: -0.8,
          marketCap: 27500000000,
          volume: 1200000000,
        },
        {
          symbol: "ADA",
          name: "Cardano",
          price: 0.48,
          priceChange: 1.5,
          marketCap: 17000000000,
          volume: 650000000,
        },
        {
          symbol: "AVAX",
          name: "Avalanche",
          price: 34.2,
          priceChange: 4.7,
          marketCap: 12000000000,
          volume: 750000000,
        },
        {
          symbol: "DOT",
          name: "Polkadot",
          price: 7.2,
          priceChange: -2.1,
          marketCap: 9500000000,
          volume: 420000000,
        },
        {
          symbol: "MATIC",
          name: "Polygon",
          price: 0.98,
          priceChange: 3.4,
          marketCap: 9200000000,
          volume: 550000000,
        },
        {
          symbol: "LINK",
          name: "Chainlink",
          price: 14.3,
          priceChange: 7.2,
          marketCap: 8100000000,
          volume: 620000000,
        },
        {
          symbol: "UNI",
          name: "Uniswap",
          price: 7.8,
          priceChange: -1.9,
          marketCap: 5900000000,
          volume: 310000000,
        },
        {
          symbol: "ATOM",
          name: "Cosmos",
          price: 9.4,
          priceChange: 2.7,
          marketCap: 3500000000,
          volume: 290000000,
        },
      ];

      setData(mockData);
      setLoading(false);
    };

    fetchData();
  }, [sector, timeframe]);

  const getColorIntensity = (percentChange: number) => {
    const absChange = Math.abs(percentChange);
    let opacity = 0;

    if (absChange >= 10) opacity = 1;
    else if (absChange >= 7) opacity = 0.9;
    else if (absChange >= 5) opacity = 0.8;
    else if (absChange >= 3) opacity = 0.7;
    else if (absChange >= 2) opacity = 0.6;
    else if (absChange >= 1) opacity = 0.5;
    else opacity = 0.4;

    return percentChange >= 0
      ? `bg-green-500/50 bg-opacity-${Math.round(opacity * 100)}`
      : `bg-red-500/50 bg-opacity-${Math.round(opacity * 100)}`;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toLocaleString()}`;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse h-96 w-full bg-gray-800/50 rounded-lg"></div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Market Heatmap</h3>
        <div className="flex gap-2 text-sm">
          {["1h", "24h", "7d", "30d"].map((tf) => (
            <button
              key={tf}
              className={`px-2 py-1 rounded ${
                timeframe === tf ? "bg-blue-600" : "bg-gray-700"
              }`}
              onClick={() => {}}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {data.map((item) => (
          <div
            key={item.symbol}
            className={`p-3 rounded-lg transition-all duration-300 hover:scale-[1.02] ${getColorIntensity(item.priceChange)}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium">{item.symbol}</div>
                <div className="text-xs text-gray-300">{item.name}</div>
              </div>
              <div
                className={`flex items-center ${item.priceChange >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {item.priceChange >= 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                )}
                <span className="text-sm">
                  {Math.abs(item.priceChange).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="mt-3 text-lg font-semibold">
              $
              {item.price < 1
                ? item.price.toFixed(3)
                : item.price.toLocaleString()}
            </div>

            <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-gray-400">
              <div>MCap: {formatMarketCap(item.marketCap)}</div>
              <div>Vol: {formatMarketCap(item.volume)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
