import { motion } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiActivity } from "react-icons/fi";

const mockSignals = [
  {
    asset: "BTC",
    signal: "Bullish",
    icon: <FiTrendingUp size={28} />,
    color: "#00ffa3",
    detail: "Momentum and volume rising. Next resistance: $72,000.",
  },
  {
    asset: "SOL",
    signal: "Bearish",
    icon: <FiTrendingDown size={28} />,
    color: "#ff4d4f",
    detail: "Short-term correction likely. Watch $140 support.",
  },
  {
    asset: "ETH",
    signal: "Neutral",
    icon: <FiActivity size={28} />,
    color: "#ffb300",
    detail: "Sideways action expected. Awaiting breakout.",
  },
];

export function ForwardSignalsPanel() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Forward-Looking Signals
      </h3>
      <div className="grid gap-4">
        {mockSignals.map((signal, idx) => (
          <motion.div
            key={signal.asset}
            className="flex items-center gap-4 bg-[#23234d] rounded-xl p-4 shadow-lg border-l-4"
            style={{ borderColor: signal.color }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.03, boxShadow: `0 0 16px ${signal.color}` }}
          >
            <span className="text-3xl" style={{ color: signal.color }}>
              {signal.icon}
            </span>
            <div>
              <div className="text-white font-semibold">
                {signal.asset}{" "}
                <span
                  className="ml-2 text-xs font-bold"
                  style={{ color: signal.color }}
                >
                  {signal.signal}
                </span>
              </div>
              <div className="text-blue-300 text-sm">{signal.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
