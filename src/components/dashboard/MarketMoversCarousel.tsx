import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface Mover {
  name: string;
  change: string;
  price: string;
  positive: boolean;
  color: string;
}

const TRACKED = ["bitcoin", "ethereum", "solana", "dogecoin", "avalanche-2"];
const COLORS = ["#00ffa3", "#0057ff", "#ffb300", "#ff4d4f", "#7c3aed"];

function formatPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function useMarketMovers() {
  const [movers, setMovers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovers = async () => {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${TRACKED.join(",")}&price_change_percentage=24h`
      );
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const data: any[] = await res.json();
      const sorted = [...data].sort(
        (a, b) => Math.abs(b.price_change_percentage_24h ?? 0) - Math.abs(a.price_change_percentage_24h ?? 0)
      );
      setMovers(
        sorted.map((coin, i) => {
          const pct = coin.price_change_percentage_24h ?? 0;
          const positive = pct >= 0;
          return {
            name: coin.symbol.toUpperCase(),
            change: `${positive ? "+" : ""}${pct.toFixed(1)}%`,
            price: formatPrice(coin.current_price),
            positive,
            color: COLORS[i % COLORS.length],
          };
        })
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovers();
    const interval = setInterval(fetchMovers, 60_000);
    return () => clearInterval(interval);
  }, []);

  return { movers, loading, error };
}

export function MarketMoversCarousel() {
  const { movers, loading, error } = useMarketMovers();

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Market Movers</h3>
        {loading && <span className="text-blue-300 text-xs animate-pulse">Updating…</span>}
        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {error && movers.length === 0 ? (
          <div className="min-w-full py-8 text-center text-red-400 text-sm">
            {error} — check network or try again later.
          </div>
        ) : (
          (loading && movers.length === 0 ? Array.from({ length: 5 }) : movers).map((mover, idx) =>
            mover ? (
              <motion.div
                key={mover.name}
                className="min-w-[160px] bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
                style={{ borderColor: mover.color }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
                whileHover={{ scale: 1.07, boxShadow: `0 0 16px ${mover.color}` }}
              >
                <span className="text-2xl font-bold" style={{ color: mover.color }}>
                  {mover.name}
                </span>
                <span className={`font-mono text-lg ${mover.positive ? "text-green-400" : "text-red-400"}`}>
                  {mover.change}
                </span>
                <span className="text-blue-300 text-sm mt-1">{mover.price}</span>
              </motion.div>
            ) : (
              <div key={idx} className="min-w-[160px] bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2 border-[#2d2d5a] animate-pulse">
                <div className="w-12 h-6 bg-[#2d2d5a] rounded mb-2" />
                <div className="w-16 h-5 bg-[#2d2d5a] rounded mb-1" />
                <div className="w-14 h-4 bg-[#2d2d5a] rounded" />
              </div>
            )
          )
        )}
      </div>
    </motion.div>
  );
}

// Add hide-scrollbar utility if not present in your CSS:
// .hide-scrollbar::-webkit-scrollbar { display: none; }
// .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
