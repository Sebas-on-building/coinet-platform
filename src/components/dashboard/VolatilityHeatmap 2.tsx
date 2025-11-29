import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const assets = [
  { symbol: "BTC", volatility: 0.18 },
  { symbol: "ETH", volatility: 0.22 },
  { symbol: "SOL", volatility: 0.35 },
  { symbol: "AVAX", volatility: 0.29 },
  { symbol: "DOGE", volatility: 0.41 },
  { symbol: "ADA", volatility: 0.16 },
  { symbol: "XRP", volatility: 0.21 },
  { symbol: "LINK", volatility: 0.27 },
];

function getColor(vol: number) {
  // Green for low, yellow for mid, red for high
  if (vol < 0.2) return "#00ffa3";
  if (vol < 0.3) return "#ffb300";
  return "#ff4d4f";
}

export function VolatilityHeatmap() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">Volatility Heatmap</h3>
      <div className="grid grid-cols-4 gap-4">
        {assets.map((asset, idx) => (
          <motion.div
            key={asset.symbol}
            className={`rounded-xl p-4 flex flex-col items-center cursor-pointer shadow-lg border-2 ${focused === idx ? "ring-2 ring-[#00ffa3]" : ""}`}
            style={{
              background: getColor(asset.volatility) + "33",
              borderColor: getColor(asset.volatility),
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * idx, type: "spring", stiffness: 80 }}
            whileHover={{
              scale: 1.08,
              boxShadow: `0 0 16px ${getColor(asset.volatility)}`,
            }}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setFocused(idx)}
          >
            <span
              className="text-xl font-bold"
              style={{ color: getColor(asset.volatility) }}
            >
              {asset.symbol}
            </span>
            <span className="text-blue-300 text-xs mt-1">
              {(asset.volatility * 100).toFixed(1)}% Vol
            </span>
            <AnimatePresence>
              {hovered === idx && (
                <motion.div
                  className="absolute mt-12 px-3 py-2 rounded-lg bg-[#23234d] text-white text-xs shadow-lg z-50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, type: "spring" }}
                >
                  {asset.symbol} volatility:{" "}
                  {(asset.volatility * 100).toFixed(1)}%
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
      {focused !== null && (
        <motion.div
          className="mt-4 p-4 rounded-xl bg-[#1a1a2e] text-blue-300 font-mono shadow-lg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Focused asset:{" "}
          <span className="font-bold text-white">{assets[focused].symbol}</span>{" "}
          — Volatility:{" "}
          <span style={{ color: getColor(assets[focused].volatility) }}>
            {(assets[focused].volatility * 100).toFixed(1)}%
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
