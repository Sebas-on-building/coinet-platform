import { useState } from "react";
import { motion } from "framer-motion";
import { FiArrowUpRight, FiArrowDownRight, FiTrendingUp } from "react-icons/fi";

const sectors = [
  { name: "DeFi", trend: "up", change: "+8.2%", color: "#00ffa3" },
  { name: "NFTs", trend: "down", change: "-3.5%", color: "#7c3aed" },
  { name: "Layer 1s", trend: "up", change: "+5.1%", color: "#0057ff" },
  { name: "Memecoins", trend: "up", change: "+12.7%", color: "#ffb300" },
  { name: "Gaming", trend: "down", change: "-1.9%", color: "#ff4d4f" },
];

export function SectorTrendsPanel() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-3xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Sector Trends & Rotations
      </h3>
      <div className="flex gap-4 flex-wrap justify-center">
        {sectors.map((sector, idx) => (
          <motion.div
            key={sector.name}
            className={`min-w-[140px] bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2 cursor-pointer ${selected === idx ? "ring-2 ring-[#00ffa3]" : ""}`}
            style={{ borderColor: sector.color }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.07, boxShadow: `0 0 16px ${sector.color}` }}
            onClick={() => setSelected(idx)}
          >
            <span
              className="text-lg font-bold mb-1"
              style={{ color: sector.color }}
            >
              {sector.name}
            </span>
            <span
              className={`flex items-center gap-1 font-mono text-sm ${sector.trend === "up" ? "text-green-400" : "text-red-400"}`}
            >
              {sector.trend === "up" ? (
                <FiArrowUpRight />
              ) : (
                <FiArrowDownRight />
              )}
              {sector.change}
            </span>
            {selected === idx && (
              <motion.div
                className="mt-3 text-blue-300 text-xs text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, type: "spring" }}
              >
                <FiTrendingUp className="inline-block mr-1 text-[#00ffa3]" />{" "}
                Sector rotation in progress. More analytics coming soon!
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
