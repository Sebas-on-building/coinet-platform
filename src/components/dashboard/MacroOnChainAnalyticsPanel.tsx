import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const macroIndicators = [
  {
    label: "S&P 500",
    value: 5450,
    trend: [5400, 5420, 5430, 5450],
    color: "#00ffa3",
  },
  {
    label: "DXY",
    value: 104.2,
    trend: [103.8, 104.0, 104.1, 104.2],
    color: "#0057ff",
  },
  {
    label: "Inflation",
    value: 3.2,
    trend: [3.4, 3.3, 3.25, 3.2],
    color: "#ffb300",
  },
  {
    label: "Fed Rate",
    value: 5.25,
    trend: [5.0, 5.1, 5.2, 5.25],
    color: "#ff4d4f",
  },
];

const onchainMetrics = [
  {
    label: "Active Addresses",
    value: 1.2e6,
    trend: [1.1e6, 1.15e6, 1.18e6, 1.2e6],
    color: "#00ffa3",
  },
  {
    label: "TVL",
    value: 8.4e9,
    trend: [8.0e9, 8.2e9, 8.3e9, 8.4e9],
    color: "#0057ff",
  },
  {
    label: "Whale Flows",
    value: 320,
    trend: [280, 300, 310, 320],
    color: "#ffb300",
  },
];

const TABS = [
  { label: "Macro", color: "#00ffa3" },
  { label: "On-Chain", color: "#0057ff" },
];

function Sparkline({ trend, color }: { trend: number[]; color: string }) {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const points = trend
    .map((v, i) => `${i * 20},${40 - ((v - min) / (max - min || 1)) * 30}`)
    .join(" ");
  return (
    <svg width="60" height="40">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        points={points}
        style={{ opacity: 0.7 }}
      />
    </svg>
  );
}

export function MacroOnChainAnalyticsPanel() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Macro & On-Chain Analytics
      </h3>
      <div className="flex gap-2 mb-6">
        {TABS.map((tab, idx) => (
          <button
            key={tab.label}
            className={`px-4 py-2 rounded-lg font-bold transition text-sm ${activeTab === idx ? "bg-[#23234d] text-white border-2" : "bg-[#1a1a2e] text-blue-300 border border-[#23234d]"}`}
            style={
              activeTab === idx
                ? { borderColor: tab.color, color: tab.color }
                : {}
            }
            onClick={() => setActiveTab(idx)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={TABS[activeTab].label}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 80 }}
            className="absolute w-full"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {(activeTab === 0 ? macroIndicators : onchainMetrics).map(
                (item, idx) => (
                  <motion.div
                    key={item.label}
                    className="bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
                    style={{ borderColor: item.color }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.05 * idx,
                      type: "spring",
                      stiffness: 80,
                    }}
                  >
                    <span className="text-white font-bold mb-1">
                      {item.label}
                    </span>
                    <span className="text-blue-300 text-lg font-mono mb-2">
                      {typeof item.value === "number" && item.value > 1000
                        ? item.value.toLocaleString()
                        : item.value}
                    </span>
                    <Sparkline trend={item.trend} color={item.color} />
                  </motion.div>
                ),
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
