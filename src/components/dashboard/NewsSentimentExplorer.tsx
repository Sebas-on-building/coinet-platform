import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const assets = [
  { symbol: "BTC", sentiment: 0.8, trend: [0.6, 0.7, 0.75, 0.8] },
  { symbol: "ETH", sentiment: 0.6, trend: [0.5, 0.55, 0.58, 0.6] },
  { symbol: "SOL", sentiment: 0.9, trend: [0.7, 0.8, 0.85, 0.9] },
  { symbol: "DOGE", sentiment: 0.4, trend: [0.5, 0.45, 0.42, 0.4] },
  { symbol: "AVAX", sentiment: 0.7, trend: [0.6, 0.65, 0.68, 0.7] },
];

const filters = [
  { label: "All", value: "all" },
  { label: "News", value: "news" },
  { label: "Social", value: "social" },
  { label: "On-chain", value: "onchain" },
];

function getSentimentColor(val: number) {
  if (val > 0.7) return "#00ffa3";
  if (val > 0.5) return "#0057ff";
  if (val > 0.3) return "#ffb300";
  return "#ff4d4f";
}

export function NewsSentimentExplorer() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          News Sentiment Explorer
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
      {/* Sentiment Heatmap */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {assets.map((asset, idx) => (
          <motion.div
            key={asset.symbol}
            className="rounded-xl p-4 flex flex-col items-center cursor-pointer shadow-lg border-2 relative"
            style={{
              background: getSentimentColor(asset.sentiment) + "33",
              borderColor: getSentimentColor(asset.sentiment),
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * idx, type: "spring", stiffness: 80 }}
            whileHover={{
              scale: 1.08,
              boxShadow: `0 0 16px ${getSentimentColor(asset.sentiment)}`,
            }}
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <span
              className="text-xl font-bold"
              style={{ color: getSentimentColor(asset.sentiment) }}
            >
              {asset.symbol}
            </span>
            <span className="text-blue-300 text-xs mt-1">
              {(asset.sentiment * 100).toFixed(0)}%
            </span>
            {/* Trend line (mock) */}
            <svg width="60" height="24" className="mt-2">
              <polyline
                fill="none"
                stroke={getSentimentColor(asset.sentiment)}
                strokeWidth="3"
                points={asset.trend
                  .map((v, i) => `${i * 20},${24 - v * 20}`)
                  .join(" ")}
                style={{ opacity: 0.7 }}
              />
            </svg>
            <AnimatePresence>
              {expanded === idx && (
                <motion.div
                  className="absolute left-0 right-0 top-20 bg-[#23234d] text-blue-300 text-xs rounded-lg shadow-lg px-4 py-2 z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, type: "spring" }}
                >
                  <span className="font-bold text-white">{asset.symbol}</span>{" "}
                  sentiment trend:{" "}
                  {asset.trend.map((v) => (v * 100).toFixed(0)).join("% → ")}%
                  <br />
                  <span className="text-[#00ffa3]">
                    (Mock news cluster details here)
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
