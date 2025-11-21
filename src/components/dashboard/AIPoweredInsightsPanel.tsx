import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiZap, FiLoader, FiTrendingUp, FiClock } from "react-icons/fi";

const mockInsights = {
  summary:
    "BTC and SOL are showing strong momentum. Market sentiment is bullish, with macro tailwinds and on-chain activity rising.",
  signals: [
    {
      asset: "BTC",
      signal: "Bullish",
      detail: "Momentum and volume rising. Next resistance: $72,000.",
      color: "#00ffa3",
    },
    {
      asset: "SOL",
      signal: "Bullish",
      detail: "Ecosystem growth and social buzz. Watch $170.",
      color: "#ffb300",
    },
  ],
  timeline: [
    { time: "09:00", event: "BTC ETF approval rumors surge", color: "#00ffa3" },
    { time: "13:00", event: "SOL hackathon trends", color: "#ffb300" },
    { time: "15:45", event: "Macro data beats expectations", color: "#0057ff" },
  ],
};

export function AIPoweredInsightsPanel() {
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const generate = () => {
    setLoading(true);
    setShow(false);
    setTimeout(() => {
      setLoading(false);
      setShow(true);
    }, 1400);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FiZap /> AI-Powered Insights
      </h3>
      <button
        className="bg-[#00ffa3] text-[#23234d] px-6 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-2 mb-4"
        onClick={generate}
        disabled={loading}
      >
        <FiZap /> {loading ? "Generating..." : "Generate Insights"}
      </button>
      <AnimatePresence>
        {loading && (
          <motion.div
            className="text-blue-300 font-mono text-center my-4 flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FiLoader className="animate-spin mb-2" size={32} /> AI is analyzing
            market data...
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="space-y-6"
          >
            {/* Executive Summary */}
            <motion.div className="bg-[#23234d] rounded-xl p-4 shadow-lg border-l-4 border-[#00ffa3]">
              <div className="text-white font-bold mb-1 flex items-center gap-2">
                <FiZap /> Executive Summary
              </div>
              <div className="text-blue-300 text-sm">
                {mockInsights.summary}
              </div>
            </motion.div>
            {/* Forward-Looking Signals */}
            <motion.div className="bg-[#23234d] rounded-xl p-4 shadow-lg border-l-4 border-[#ffb300]">
              <div className="text-white font-bold mb-1 flex items-center gap-2">
                <FiTrendingUp /> Forward-Looking Signals
              </div>
              <div className="space-y-2">
                {mockInsights.signals.map((s, idx) => (
                  <div key={s.asset} className="flex items-center gap-2">
                    <span className="font-bold" style={{ color: s.color }}>
                      {s.asset}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: s.color }}
                    >
                      {s.signal}
                    </span>
                    <span className="text-blue-300 text-xs">{s.detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            {/* Narrative Timeline */}
            <motion.div className="bg-[#23234d] rounded-xl p-4 shadow-lg border-l-4 border-[#0057ff]">
              <div className="text-white font-bold mb-1 flex items-center gap-2">
                <FiClock /> Narrative Timeline
              </div>
              <ul className="space-y-2">
                {mockInsights.timeline.map((item, idx) => (
                  <li key={item.time} className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ background: item.color }}
                    ></span>
                    <span className="text-xs text-blue-300 font-mono w-16">
                      {item.time}
                    </span>
                    <span className="text-white text-sm">{item.event}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
