import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { label: "Sentiment", color: "#00ffa3" },
  { label: "Volatility", color: "#ffb300" },
  { label: "Correlation", color: "#0057ff" },
];

function MockChart({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 w-full">
      <div
        className="w-3/4 h-24 rounded-xl"
        style={{ background: color, opacity: 0.25 }}
      ></div>
      <span className="text-blue-300 mt-4 font-mono">{label} Chart (Mock)</span>
    </div>
  );
}

export function DeepAssetAnalyticsPanel() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Deep Asset Analytics
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
      <div className="relative min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={TABS[activeTab].label}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 80 }}
            className="absolute w-full"
          >
            <MockChart
              color={TABS[activeTab].color}
              label={TABS[activeTab].label}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
