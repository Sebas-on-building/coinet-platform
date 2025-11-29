"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface VolumeData {
  price: number;
  volume: number;
  type: "buy" | "sell";
}

interface VolumeProfileProps {
  symbol: string;
  timeframe?: "1h" | "4h" | "1d" | "1w";
}

export function VolumeProfile({
  symbol,
  timeframe = "1d",
}: VolumeProfileProps) {
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVolume: 0,
    buyPercentage: 0,
    sellPercentage: 0,
    valueArea: { low: 0, high: 0 },
    pointOfControl: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // In real implementation, fetch from API
      // const response = await api.get(`/market/volume-profile/${symbol}`, { timeframe });

      // Generate mock data
      setTimeout(() => {
        const basePrice =
          symbol === "BTC" ? 42000 : symbol === "ETH" ? 2200 : 100;
        const maxVolume =
          symbol === "BTC" ? 1000 : symbol === "ETH" ? 500 : 200;

        // Generate price levels with corresponding volumes
        const mockData: VolumeData[] = [];
        for (let i = 0; i < 50; i++) {
          const priceDelta = (Math.random() - 0.5) * basePrice * 0.1;
          const price = basePrice + priceDelta;

          // Volume follows normal distribution around the price
          const volumeMultiplier =
            1 - Math.pow(priceDelta / (basePrice * 0.1), 2);
          const randomFactor = 0.5 + Math.random() * 0.5;
          const volume = maxVolume * volumeMultiplier * randomFactor;

          // Randomly assign buy or sell
          const type = Math.random() > 0.5 ? "buy" : "sell";

          mockData.push({ price, volume, type });
        }

        // Sort by price
        mockData.sort((a, b) => a.price - b.price);

        // Calculate statistics
        const totalVolume = mockData.reduce(
          (sum, item) => sum + item.volume,
          0,
        );
        const buyVolume = mockData
          .filter((item) => item.type === "buy")
          .reduce((sum, item) => sum + item.volume, 0);
        const sellVolume = totalVolume - buyVolume;

        // Find point of control (highest volume level)
        const pointOfControl = mockData.reduce(
          (max, item) => (item.volume > max.volume ? item : max),
          mockData[0],
        ).price;

        // Calculate 70% value area
        const valueAreaVolume = totalVolume * 0.7;
        let cumulativeVolume = 0;
        let valueAreaLow = 0;
        let valueAreaHigh = 0;

        // Sort by volume in descending order
        const sortedByVolume = [...mockData].sort(
          (a, b) => b.volume - a.volume,
        );

        for (let i = 0; i < sortedByVolume.length; i++) {
          cumulativeVolume += sortedByVolume[i].volume;

          if (i === 0) {
            valueAreaLow = valueAreaHigh = sortedByVolume[i].price;
          } else {
            valueAreaLow = Math.min(valueAreaLow, sortedByVolume[i].price);
            valueAreaHigh = Math.max(valueAreaHigh, sortedByVolume[i].price);
          }

          if (cumulativeVolume >= valueAreaVolume) break;
        }

        setVolumeData(mockData);
        setStats({
          totalVolume,
          buyPercentage: (buyVolume / totalVolume) * 100,
          sellPercentage: (sellVolume / totalVolume) * 100,
          valueArea: { low: valueAreaLow, high: valueAreaHigh },
          pointOfControl,
        });

        setLoading(false);
      }, 500);
    };

    fetchData();
  }, [symbol, timeframe]);

  const maxVolume = volumeData.reduce(
    (max, item) => Math.max(max, item.volume),
    0,
  );

  const formatPrice = (price: number) => {
    return price > 1000 ? price.toLocaleString() : price.toFixed(2);
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
        <h3 className="text-lg font-medium">Volume Profile ({symbol})</h3>
        <div className="flex space-x-2">
          {["1h", "4h", "1d", "1w"].map((tf) => (
            <button
              key={tf}
              className={`px-2 py-1 text-xs rounded ${
                timeframe === tf
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700/50 text-gray-300"
              }`}
              onClick={() => {}}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Total Volume</div>
          <div className="text-lg font-semibold">
            {stats.totalVolume.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Buy/Sell Ratio</div>
          <div className="flex items-center space-x-2">
            <Badge variant="success">{stats.buyPercentage.toFixed(1)}%</Badge>
            <span>/</span>
            <Badge variant="danger">{stats.sellPercentage.toFixed(1)}%</Badge>
          </div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Value Area</div>
          <div className="text-sm">
            ${formatPrice(stats.valueArea.low)} - $
            {formatPrice(stats.valueArea.high)}
          </div>
        </div>
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="text-sm text-gray-400">Point of Control</div>
          <div className="text-lg font-semibold">
            ${formatPrice(stats.pointOfControl)}
          </div>
        </div>
      </div>

      <div className="flex h-64 items-end space-x-0.5 relative">
        {/* Value Area */}
        <div
          className="absolute inset-0 bg-blue-500/10 pointer-events-none"
          style={{
            left: `${((stats.valueArea.low - volumeData[0].price) / (volumeData[volumeData.length - 1].price - volumeData[0].price)) * 100}%`,
            right: `${100 - ((stats.valueArea.high - volumeData[0].price) / (volumeData[volumeData.length - 1].price - volumeData[0].price)) * 100}%`,
          }}
        ></div>

        {/* Point of Control */}
        <div
          className="absolute inset-y-0 w-px bg-yellow-500 pointer-events-none"
          style={{
            left: `${((stats.pointOfControl - volumeData[0].price) / (volumeData[volumeData.length - 1].price - volumeData[0].price)) * 100}%`,
          }}
        ></div>

        {/* Volume Bars */}
        {volumeData.map((item, index) => (
          <div
            key={index}
            className={`w-full ${item.type === "buy" ? "bg-green-500/60" : "bg-red-500/60"} hover:opacity-80 group relative`}
            style={{ height: `${(item.volume / maxVolume) * 100}%` }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 bg-gray-800 text-white text-xs p-1 rounded pointer-events-none transition-opacity">
              <div>Price: ${formatPrice(item.price)}</div>
              <div>Volume: {item.volume.toLocaleString()}</div>
              <div>Type: {item.type === "buy" ? "Buy" : "Sell"}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>${formatPrice(volumeData[0].price)}</span>
        <span>
          ${formatPrice(volumeData[Math.floor(volumeData.length / 2)].price)}
        </span>
        <span>${formatPrice(volumeData[volumeData.length - 1].price)}</span>
      </div>
    </Card>
  );
}
