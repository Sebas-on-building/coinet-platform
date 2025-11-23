import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiShield, FiEye } from "react-icons/fi";

const mockRisks = [
  {
    title: "Unusual Volume Spike",
    level: "High",
    color: "#ff4d4f",
    icon: <FiAlertTriangle size={28} />,
    detail:
      "BTC trading volume surged 300% in 10 minutes. Possible whale activity or manipulation.",
  },
  {
    title: "Coordinated Social Pump",
    level: "Medium",
    color: "#ffb300",
    icon: <FiEye size={28} />,
    detail:
      "SOL mentioned in 5x more tweets than average. Watch for FOMO-driven volatility.",
  },
  {
    title: "Protocol Security Alert",
    level: "Low",
    color: "#00ffa3",
    icon: <FiShield size={28} />,
    detail:
      "Minor bug reported in DeFi protocol. No funds at risk, but monitor updates.",
  },
];

export function AnomalyRiskPanel() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Anomaly & Manipulation Risk Detector
      </h3>
      <div className="grid gap-4">
        {mockRisks.map((risk, idx) => (
          <motion.div
            key={risk.title}
            className="flex flex-col bg-[#23234d] rounded-xl p-4 shadow-lg border-l-4 cursor-pointer"
            style={{ borderColor: risk.color }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.03, boxShadow: `0 0 16px ${risk.color}` }}
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl" style={{ color: risk.color }}>
                {risk.icon}
              </span>
              <div>
                <div className="text-white font-semibold">{risk.title}</div>
                <div
                  className="text-xs font-bold"
                  style={{ color: risk.color }}
                >
                  {risk.level} Risk
                </div>
              </div>
            </div>
            <AnimatePresence>
              {expanded === idx && (
                <motion.div
                  className="mt-3 text-blue-300 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, type: "spring" }}
                >
                  {risk.detail}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
