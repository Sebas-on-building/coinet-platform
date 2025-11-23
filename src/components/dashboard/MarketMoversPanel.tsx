import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";
import { FiTrendingUp, FiTrendingDown } from "react-icons/fi";

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  sparkline: number[];
  icon: string;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    let startTime: number | null = null;
    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setValue(progress * (target - start) + start);
      if (progress < 1) requestAnimationFrame(animate);
      else setValue(target);
    }
    requestAnimationFrame(animate);
  }, [target]);
  return value;
}

async function fetchMarketMovers(): Promise<{
  gainers: Asset[];
  losers: Asset[];
}> {
  // Replace with real API call
  const res = await fetch(
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true",
  );
  const data = await res.json();
  const sorted = [...data].sort(
    (a: any, b: any) =>
      b.price_change_percentage_24h - a.price_change_percentage_24h,
  );
  return {
    gainers: sorted.slice(0, 5).map((a: any) => ({
      symbol: a.symbol.toUpperCase(),
      name: a.name,
      price: a.current_price,
      change24h: a.price_change_percentage_24h,
      sparkline: a.sparkline_in_7d?.price?.slice(-24) || [],
      icon: a.image,
    })),
    losers: sorted
      .slice(-5)
      .reverse()
      .map((a: any) => ({
        symbol: a.symbol.toUpperCase(),
        name: a.name,
        price: a.current_price,
        change24h: a.price_change_percentage_24h,
        sparkline: a.sparkline_in_7d?.price?.slice(-24) || [],
        icon: a.image,
      })),
  };
}

export default function MarketMoversPanel() {
  const [gainers, setGainers] = useState<Asset[]>([]);
  const [losers, setLosers] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Always call useCountUp for 5 gainers/losers (fill with placeholders)
  const gainersFilled = [
    ...gainers,
    ...Array(5 - gainers.length).fill(null),
  ].slice(0, 5);
  const losersFilled = [
    ...losers,
    ...Array(5 - losers.length).fill(null),
  ].slice(0, 5);
  const animatedGainers = gainersFilled.map((asset, i) => {
    const animatedPrice = useCountUp(asset ? asset.price : 0);
    const animatedChange = useCountUp(asset ? asset.change24h : 0);
    return asset ? { ...asset, animatedPrice, animatedChange } : null;
  });
  const animatedLosers = losersFilled.map((asset, i) => {
    const animatedPrice = useCountUp(asset ? asset.price : 0);
    const animatedChange = useCountUp(asset ? asset.change24h : 0);
    return asset ? { ...asset, animatedPrice, animatedChange } : null;
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const { gainers, losers } = await fetchMarketMovers();
      setGainers(gainers);
      setLosers(losers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#23234d]/80 to-[#181836]/90 rounded-3xl p-8 shadow-2xl border border-blue-400/20 backdrop-blur-2xl max-w-3xl mx-auto my-10 transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_0_32px_#00ffa3cc] hover:border-[#00ffa3] group"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      whileHover={{
        scale: 1.025,
        boxShadow: "0 0 32px #00ffa3cc",
        borderColor: "#00ffa3",
      }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center gap-3 mb-6">
        <FiTrendingUp className="text-[#00ffa3] text-2xl" />
        <h2 className="text-2xl font-bold text-white">Market Movers</h2>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32 w-full animate-pulse">
          <div className="w-8 h-8 border-4 border-blue-300 border-t-transparent rounded-full animate-spin" />
          <span className="sr-only">Loading...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gainers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 font-bold">Top Gainers</span>
              <FiTrendingUp className="text-green-400" />
            </div>
            <ul className="space-y-3">
              <AnimatePresence>
                {animatedGainers.map((asset, i) =>
                  asset ? (
                    <motion.li
                      key={asset.symbol}
                      className="flex items-center gap-3 bg-[#23234d]/80 rounded-xl p-4 shadow border border-green-400/20 hover:shadow-2xl hover:border-green-400/60 hover:scale-[1.03] transition relative backdrop-blur-xl group"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: i * 0.07, type: "spring" }}
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 0 24px #00ffa3cc",
                        borderColor: "#00ffa3",
                      }}
                    >
                      <img
                        src={asset.icon}
                        alt={asset.symbol}
                        className="w-8 h-8 rounded-full bg-[#181836]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">
                            {asset.symbol}
                          </span>
                          <Tooltip content={asset.name}>
                            <span className="text-xs text-blue-300 cursor-help">
                              {asset.name}
                            </span>
                          </Tooltip>
                        </div>
                        <div className="text-xs text-blue-200">
                          $
                          {asset.animatedPrice.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <span className="font-bold text-green-400">
                        +{asset.animatedChange.toFixed(2)}%
                      </span>
                      {/* Mini sparkline */}
                      <svg width="60" height="24" className="ml-2">
                        <polyline
                          fill="none"
                          stroke="#00ffa3"
                          strokeWidth="2"
                          points={asset.sparkline
                            .map(
                              (v: number, idx: number, arr: number[]) =>
                                `${(idx / (arr.length - 1)) * 60},${24 - ((v - Math.min(...arr)) / (Math.max(...arr) - Math.min(...arr) || 1)) * 20}`,
                            )
                            .join(" ")}
                        />
                      </svg>
                    </motion.li>
                  ) : null,
                )}
              </AnimatePresence>
            </ul>
          </div>
          {/* Losers */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 font-bold">Top Losers</span>
              <FiTrendingDown className="text-red-400" />
            </div>
            <ul className="space-y-3">
              <AnimatePresence>
                {animatedLosers.map((asset, i) =>
                  asset ? (
                    <motion.li
                      key={asset.symbol}
                      className="flex items-center gap-3 bg-[#23234d]/80 rounded-xl p-4 shadow border border-red-400/20 hover:shadow-2xl hover:border-red-400/60 hover:scale-[1.03] transition relative backdrop-blur-xl group"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ delay: i * 0.07, type: "spring" }}
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 0 24px #ff4d4fcc",
                        borderColor: "#ff4d4f",
                      }}
                    >
                      <img
                        src={asset.icon}
                        alt={asset.symbol}
                        className="w-8 h-8 rounded-full bg-[#181836]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">
                            {asset.symbol}
                          </span>
                          <Tooltip content={asset.name}>
                            <span className="text-xs text-blue-300 cursor-help">
                              {asset.name}
                            </span>
                          </Tooltip>
                        </div>
                        <div className="text-xs text-blue-200">
                          $
                          {asset.animatedPrice.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                      <span className="font-bold text-red-400">
                        {asset.animatedChange.toFixed(2)}%
                      </span>
                      {/* Mini sparkline */}
                      <svg width="60" height="24" className="ml-2">
                        <polyline
                          fill="none"
                          stroke="#ff4d4f"
                          strokeWidth="2"
                          points={asset.sparkline
                            .map(
                              (v: number, idx: number, arr: number[]) =>
                                `${(idx / (arr.length - 1)) * 60},${24 - ((v - Math.min(...arr)) / (Math.max(...arr) - Math.min(...arr) || 1)) * 20}`,
                            )
                            .join(" ")}
                        />
                      </svg>
                    </motion.li>
                  ) : null,
                )}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  );
}
