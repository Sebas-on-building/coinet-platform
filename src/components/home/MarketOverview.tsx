import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FiArrowUp,
  FiArrowDown,
  FiStar,
  FiTrendingUp,
  FiTrendingDown,
} from "react-icons/fi";
import { marketDataService } from "../../services/market/MarketDataService";

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: number;
  source: string;
}

export const MarketOverview: React.FC = () => {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [sortBy, setSortBy] = useState<"volume" | "change">("volume");
  const [view, setView] = useState<"list" | "grid">("list");
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [marketSummary, setMarketSummary] = useState({
    totalMarketCap: 0,
    totalVolume24h: 0,
    btcDominance: 0,
  });

  useEffect(() => {
    // Subscribe to real-time market data updates
    const handleMarketData = (data: MarketData[]) => {
      setMarketData(data);
      updateMarketSummary(data);
    };

    marketDataService.subscribe(handleMarketData);

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    return () => {
      marketDataService.unsubscribe(handleMarketData);
    };
  }, []);

  const updateMarketSummary = (data: MarketData[]) => {
    const totalMarketCap = data.reduce((sum, coin) => sum + coin.marketCap, 0);
    const totalVolume24h = data.reduce((sum, coin) => sum + coin.volume24h, 0);
    const btcData = data.find((coin) => coin.symbol === "BTC");
    const btcDominance = btcData
      ? (btcData.marketCap / totalMarketCap) * 100
      : 0;

    setMarketSummary({
      totalMarketCap,
      totalVolume24h,
      btcDominance,
    });
  };

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify(Array.from(newFavorites)));
  };

  const formatNumber = (
    num: number,
    type: "price" | "volume" | "marketCap" = "price",
  ) => {
    if (type === "price") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    if (type === "volume" || type === "marketCap") {
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
      return `$${num.toFixed(2)}`;
    }
    return num.toString();
  };

  const sortedData = [...marketData].sort((a, b) => {
    if (sortBy === "volume") {
      return b.volume24h - a.volume24h;
    }
    return Math.abs(b.change24h) - Math.abs(a.change24h);
  });

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Market Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Real-time cryptocurrency prices and market data
            </p>
          </div>

          {/* Controls */}
          <div className="mt-4 md:mt-0 flex flex-wrap gap-4">
            {/* Timeframe selector */}
            <div className="flex rounded-lg bg-white dark:bg-gray-800 p-1 shadow-sm">
              {(["24h", "7d", "30d"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    timeframe === tf
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg bg-white dark:bg-gray-800 p-1 shadow-sm">
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === "list"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView("grid")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  view === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                Grid
              </button>
            </div>
          </div>
        </div>

        {/* Market data table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Asset
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Price
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    24h Change
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    24h Volume
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Market Cap
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedData.map((coin) => (
                  <motion.tr
                    key={coin.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          {coin.symbol.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {coin.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatNumber(coin.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          coin.change24h >= 0
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {coin.change24h >= 0 ? (
                          <FiArrowUp className="mr-1" />
                        ) : (
                          <FiArrowDown className="mr-1" />
                        )}
                        {Math.abs(coin.change24h).toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(coin.volume24h, "volume")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                      {formatNumber(coin.marketCap, "marketCap")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleFavorite(coin.id)}
                        className={`text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors ${
                          favorites.has(coin.id)
                            ? "text-yellow-500 dark:text-yellow-400"
                            : ""
                        }`}
                      >
                        <FiStar className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Market Cap
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(marketSummary.totalMarketCap, "marketCap")}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  24h Volume
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatNumber(marketSummary.totalVolume24h, "volume")}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FiTrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  BTC Dominance
                </p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                  {marketSummary.btcDominance.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FiTrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
