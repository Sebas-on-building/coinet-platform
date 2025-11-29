import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiBarChart2, FiTrendingUp, FiActivity } from "react-icons/fi";

const allAssets = [
  { symbol: "BTC", color: "#00ffa3" },
  { symbol: "ETH", color: "#0057ff" },
  { symbol: "SOL", color: "#ffb300" },
  { symbol: "AVAX", color: "#ff4d4f" },
  { symbol: "DOGE", color: "#7c3aed" },
];

const metrics = [
  { label: "Price", icon: <FiBarChart2 />, key: "price" },
  { label: "Sentiment", icon: <FiTrendingUp />, key: "sentiment" },
  { label: "Volume", icon: <FiActivity />, key: "volume" },
];

const mockData: Record<
  string,
  { price: number[]; sentiment: number[]; volume: number[] }
> = {
  BTC: {
    price: [70000, 70500, 71000, 71200],
    sentiment: [0.7, 0.75, 0.78, 0.8],
    volume: [1.2e8, 1.3e8, 1.25e8, 1.28e8],
  },
  ETH: {
    price: [3400, 3410, 3420, 3425],
    sentiment: [0.6, 0.62, 0.61, 0.6],
    volume: [9e7, 9.2e7, 9.1e7, 9.3e7],
  },
  SOL: {
    price: [150, 155, 158, 160],
    sentiment: [0.8, 0.85, 0.88, 0.9],
    volume: [7e7, 7.2e7, 7.1e7, 7.3e7],
  },
  AVAX: {
    price: [32, 33, 34, 34.1],
    sentiment: [0.6, 0.65, 0.68, 0.7],
    volume: [2.5e7, 2.6e7, 2.55e7, 2.58e7],
  },
  DOGE: {
    price: [0.16, 0.17, 0.18, 0.18],
    sentiment: [0.4, 0.42, 0.41, 0.4],
    volume: [3e7, 3.1e7, 3.05e7, 3.08e7],
  },
};

function OverlayChart({
  assets,
  metric,
}: {
  assets: { symbol: string; color: string }[];
  metric: "price" | "sentiment" | "volume";
}) {
  return (
    <svg width="320" height="80" className="my-4">
      {assets.map((asset, idx) => {
        const data = mockData[asset.symbol][metric];
        const min = Math.min(...data);
        const max = Math.max(...data);
        const points = data
          .map(
            (v: number, i: number) =>
              `${i * 100},${70 - ((v - min) / (max - min || 1)) * 60}`,
          )
          .join(" ");
        return (
          <polyline
            key={asset.symbol}
            fill="none"
            stroke={asset.color}
            strokeWidth="3"
            points={points}
            style={{ opacity: 0.7 }}
          />
        );
      })}
    </svg>
  );
}

export function MultiAssetComparisonPanel() {
  const [selectedAssets, setSelectedAssets] = useState([
    allAssets[0],
    allAssets[1],
  ]);
  const [activeMetric, setActiveMetric] = useState<
    "price" | "sentiment" | "volume"
  >("price");

  const toggleAsset = (asset: (typeof allAssets)[0]) => {
    setSelectedAssets((sel) =>
      sel.find((a) => a.symbol === asset.symbol)
        ? sel.filter((a) => a.symbol !== asset.symbol)
        : [...sel, asset],
    );
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Multi-Asset Comparison</h3>
        <div className="flex gap-2">
          {metrics.map((m) => (
            <button
              key={m.key}
              className={`px-3 py-1 rounded-full font-mono text-sm font-bold flex items-center gap-1 transition ${activeMetric === m.key ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-300 border border-[#23234d]"}`}
              onClick={() =>
                setActiveMetric(m.key as "price" | "sentiment" | "volume")
              }
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap mb-4">
        {allAssets.map((asset) => (
          <motion.button
            key={asset.symbol}
            className={`px-3 py-1 rounded-full font-mono text-sm font-bold flex items-center gap-1 border-2 transition ${selectedAssets.find((a) => a.symbol === asset.symbol) ? "ring-2 ring-white" : ""}`}
            style={{
              background: asset.color + "22",
              color: asset.color,
              borderColor: asset.color,
            }}
            whileHover={{ scale: 1.08, boxShadow: `0 0 12px ${asset.color}` }}
            onClick={() => toggleAsset(asset)}
          >
            {asset.symbol}
          </motion.button>
        ))}
      </div>
      <OverlayChart assets={selectedAssets} metric={activeMetric} />
      <div className="flex gap-2 mt-2">
        {selectedAssets.map((asset) => (
          <motion.div
            key={asset.symbol}
            className="flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs font-bold border-2"
            style={{
              background: asset.color + "22",
              color: asset.color,
              borderColor: asset.color,
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {asset.symbol}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
