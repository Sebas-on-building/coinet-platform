import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiStar, FiBell, FiBarChart2, FiChevronDown } from "react-icons/fi";

const mockAssets = [
  {
    symbol: "BTC",
    price: 71200,
    sentiment: 0.8,
    starred: true,
    sector: "L1",
    volume: 120000000,
  },
  {
    symbol: "ETH",
    price: 3420,
    sentiment: 0.6,
    starred: false,
    sector: "L1",
    volume: 90000000,
  },
  {
    symbol: "SOL",
    price: 158.2,
    sentiment: 0.9,
    starred: true,
    sector: "L1",
    volume: 70000000,
  },
  {
    symbol: "DOGE",
    price: 0.18,
    sentiment: 0.4,
    starred: false,
    sector: "Memecoin",
    volume: 30000000,
  },
  {
    symbol: "AVAX",
    price: 34.1,
    sentiment: 0.7,
    starred: false,
    sector: "L1",
    volume: 25000000,
  },
];

const filters = [
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

export function SmartWatchlistScreener() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [assets, setAssets] = useState(mockAssets);

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
        <h3 className="text-xl font-bold text-white">
          Smart Watchlist & Asset Screener
        </h3>
        <div className="flex gap-2">
          {filters.map((f) => (
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
                  transition={{
                    delay: 0.05 * idx,
                    type: "spring",
                    stiffness: 80,
                  }}
                >
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span className="font-bold text-white">{asset.symbol}</span>
                    <button
                      onClick={() =>
                        setAssets((a) =>
                          a.map((x) =>
                            x.symbol === asset.symbol
                              ? { ...x, starred: !x.starred }
                              : x,
                          ),
                        )
                      }
                    >
                      <FiStar
                        className={
                          asset.starred
                            ? "text-[#00ffa3] fill-[#00ffa3]"
                            : "text-blue-300"
                        }
                      />
                    </button>
                  </td>
                  <td className="py-2 px-3 text-blue-300 font-mono">
                    ${asset.price.toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className="inline-block w-20 h-3 rounded-full"
                      style={{
                        background: getSentimentColor(asset.sentiment),
                        opacity: 0.3,
                      }}
                    ></span>
                    <span
                      className="ml-2 font-mono text-xs"
                      style={{ color: getSentimentColor(asset.sentiment) }}
                    >
                      {(asset.sentiment * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-blue-300 font-mono">
                    {asset.volume.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 flex gap-2">
                    <button className="hover:bg-[#00ffa3]/20 p-2 rounded transition">
                      <FiBell className="text-[#00ffa3]" />
                    </button>
                    <button className="hover:bg-[#0057ff]/20 p-2 rounded transition">
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
