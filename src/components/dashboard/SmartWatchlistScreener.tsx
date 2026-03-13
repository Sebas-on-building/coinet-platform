import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiStar, FiBell, FiBarChart2, FiRefreshCw } from "react-icons/fi";

const DEFAULT_IDS = [
  { id: "bitcoin",      symbol: "BTC",  sector: "L1" },
  { id: "ethereum",     symbol: "ETH",  sector: "L1" },
  { id: "solana",       symbol: "SOL",  sector: "L1" },
  { id: "dogecoin",     symbol: "DOGE", sector: "Memecoin" },
  { id: "avalanche-2",  symbol: "AVAX", sector: "L1" },
];

interface Asset {
  symbol: string;
  price: number;
  sentiment: number;
  starred: boolean;
  sector: string;
  volume: number;
  change24h: number;
}

function useLiveAssets() {
  const [assets, setAssets] = useState<Asset[]>(() =>
    DEFAULT_IDS.map(({ symbol, sector }) => ({
      symbol, sector, price: 0, sentiment: 0.5, starred: false, volume: 0, change24h: 0,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const ids = DEFAULT_IDS.map(d => d.id).join(",");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data: any[] = await res.json();

      setAssets(prev =>
        DEFAULT_IDS.map(({ id, symbol, sector }) => {
          const coin = data.find(c => c.id === id);
          const prevAsset = prev.find(a => a.symbol === symbol);
          if (!coin) return prevAsset ?? { symbol, sector, price: 0, sentiment: 0.5, starred: false, volume: 0, change24h: 0 };
          const pct = coin.price_change_percentage_24h ?? 0;
          // Derive a sentiment proxy: map [-10%, +10%] → [0, 1]
          const sentiment = Math.min(1, Math.max(0, (pct + 10) / 20));
          return {
            symbol,
            sector,
            price: coin.current_price,
            volume: coin.total_volume ?? 0,
            change24h: pct,
            sentiment,
            starred: prevAsset?.starred ?? false,
          };
        })
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
    const interval = setInterval(fetchAssets, 60_000);
    return () => clearInterval(interval);
  }, [fetchAssets]);

  return { assets, setAssets, loading, error, refresh: fetchAssets };
}

const FILTERS = [
  { label: "All", value: "all" },
  { label: "L1", value: "L1" },
  { label: "Memecoin", value: "Memecoin" },
];

function getSentimentColor(val: number) {
  if (val > 0.7) return "#00ffa3";
  if (val > 0.5) return "#0057ff";
  if (val > 0.3) return "#ffb300";
  return "#ff4d4f";
}

function formatPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatVolume(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function SmartWatchlistScreener() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { assets, setAssets, loading, error, refresh } = useLiveAssets();

  const filtered =
    activeFilter === "all"
      ? assets
      : assets.filter((a) => a.sector === activeFilter);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white">
            Smart Watchlist & Asset Screener
          </h3>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-blue-300 hover:text-[#00ffa3] transition disabled:opacity-40"
            aria-label="Refresh market data"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={15} />
          </button>
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`px-3 py-1 rounded-full font-mono text-sm font-bold transition ${activeFilter === f.value ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-300 border border-[#23234d]"}`}
              onClick={() => setActiveFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr>
              <th className="text-blue-300 font-mono">Asset</th>
              <th className="text-blue-300 font-mono">Price</th>
              <th className="text-blue-300 font-mono">24h</th>
              <th className="text-blue-300 font-mono">Sentiment</th>
              <th className="text-blue-300 font-mono">Volume</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((asset, idx) => (
                <motion.tr
                  key={asset.symbol}
                  className="bg-[#23234d] rounded-xl shadow-lg"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: 0.05 * idx, type: "spring", stiffness: 80 }}
                >
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="font-bold text-white">{asset.symbol}</span>
                    <button
                      aria-label={`${asset.starred ? "Unstar" : "Star"} ${asset.symbol}`}
                      onClick={() =>
                        setAssets((a) =>
                          a.map((x) =>
                            x.symbol === asset.symbol ? { ...x, starred: !x.starred } : x
                          )
                        )
                      }
                    >
                      <FiStar
                        className={asset.starred ? "text-[#00ffa3] fill-[#00ffa3]" : "text-blue-300"}
                      />
                    </button>
                  </td>
                  <td className="py-2 px-3 text-blue-300 font-mono">
                    {asset.price > 0 ? formatPrice(asset.price) : "—"}
                  </td>
                  <td className={`py-2 px-3 font-mono text-sm ${asset.change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {asset.price > 0 ? `${asset.change24h >= 0 ? "+" : ""}${asset.change24h.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-block w-20 h-3 rounded-full"
                      style={{ background: getSentimentColor(asset.sentiment), opacity: 0.3 }}
                    />
                    <span
                      className="ml-2 font-mono text-xs"
                      style={{ color: getSentimentColor(asset.sentiment) }}
                    >
                      {(asset.sentiment * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-blue-300 font-mono text-sm">
                    {asset.volume > 0 ? formatVolume(asset.volume) : "—"}
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                    <button className="hover:bg-[#00ffa3]/20 p-2 rounded transition" aria-label={`Alert for ${asset.symbol}`}>
                      <FiBell className="text-[#00ffa3]" />
                    </button>
                    <button className="hover:bg-[#0057ff]/20 p-2 rounded transition" aria-label={`Chart for ${asset.symbol}`}>
                      <FiBarChart2 className="text-[#0057ff]" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
