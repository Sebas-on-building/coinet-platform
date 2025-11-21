import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInfo } from "react-icons/fi";

const newsEvents = [
  {
    time: "08:00",
    headline: "BTC ETF Approval",
    impact: 0.9,
    detail: "Bitcoin surges as ETF gets green light.",
    color: "#00ffa3",
  },
  {
    time: "10:30",
    headline: "SOL Hackathon Results",
    impact: 0.6,
    detail: "SOL ecosystem projects win big grants.",
    color: "#0057ff",
  },
  {
    time: "13:15",
    headline: "DeFi Exploit",
    impact: -0.7,
    detail: "Major DeFi protocol suffers exploit, TVL drops.",
    color: "#ff4d4f",
  },
  {
    time: "16:00",
    headline: "NFT Floor Spike",
    impact: 0.4,
    detail: "NFT prices jump after celebrity endorsement.",
    color: "#7c3aed",
  },
];

export function NewsImpactTimeline() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        News Impact Timeline
      </h3>
      <div className="relative pl-8">
        <div className="absolute left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00ffa3] via-[#0057ff] to-[#ffb300] opacity-30 rounded-full" />
        <ul className="space-y-8">
          {newsEvents.map((event, idx) => (
            <motion.li
              key={event.time}
              className="relative flex items-center gap-4 cursor-pointer"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
              onClick={() => setExpanded(expanded === idx ? null : idx)}
            >
              <span className="absolute left-[-2.5rem] top-1.5">
                <span
                  className="block w-4 h-4 rounded-full border-2"
                  style={{
                    background: event.color,
                    borderColor: event.color,
                    boxShadow: `0 0 8px ${event.color}`,
                  }}
                ></span>
              </span>
              <span className="text-xs text-blue-300 font-mono w-16">
                {event.time}
              </span>
              <span className="text-white font-semibold w-48">
                {event.headline}
              </span>
              <motion.div
                className="h-4 rounded-full flex items-center"
                style={{
                  width: `${Math.abs(event.impact) * 120}px`,
                  background: event.impact > 0 ? "#00ffa3" : "#ff4d4f",
                  opacity: 0.3,
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.1 * idx, type: "spring" }}
              />
              <span
                className={`ml-2 font-mono text-xs ${event.impact > 0 ? "text-green-400" : "text-red-400"}`}
              >
                {event.impact > 0 ? "+" : ""}
                {(event.impact * 100).toFixed(0)}%
              </span>
              <AnimatePresence>
                {expanded === idx && (
                  <motion.div
                    className="absolute left-40 top-8 bg-[#23234d] text-blue-300 text-xs rounded-lg shadow-lg px-4 py-2 z-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, type: "spring" }}
                  >
                    <FiInfo className="inline-block mr-1 text-[#00ffa3]" />{" "}
                    {event.detail}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
