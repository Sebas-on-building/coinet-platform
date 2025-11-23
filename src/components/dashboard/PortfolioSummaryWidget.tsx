import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const COLORS = ["#00ffa3", "#0057ff", "#ffb300", "#ff4d4f", "#7c3aed"];

const mockData = [
  { name: "BTC", value: 40 },
  { name: "SOL", value: 25 },
  { name: "ETH", value: 20 },
  { name: "USDT", value: 10 },
  { name: "Other", value: 5 },
];

// Count up animation hook
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    let startTime: number | null = null;
    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor(progress * (target - start) + start));
      if (progress < 1) requestAnimationFrame(animate);
      else setValue(target);
    }
    requestAnimationFrame(animate);
    // eslint-disable-next-line
  }, [target]);
  return value;
}

export function PortfolioSummaryWidget() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#23234d]/80 to-[#1a1a2e]/90 rounded-3xl p-8 shadow-2xl mb-10 w-full max-w-xl mx-auto border border-blue-400/20 backdrop-blur-2xl transition-all duration-300 hover:scale-[1.025] hover:shadow-[0_0_32px_#00ffa3cc] hover:border-[#00ffa3] group"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        scale: 1.025,
        boxShadow: "0 0 32px #00ffa3cc",
        borderColor: "#00ffa3",
      }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-2xl font-extrabold text-white mb-6 tracking-tight">
        Portfolio Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={mockData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            isAnimationActive
          >
            {mockData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {mockData.map((asset, idx) => {
          const animatedValue = useCountUp(asset.value);
          return (
            <div key={asset.name} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ background: COLORS[idx % COLORS.length] }}
              ></span>
              <span className="text-white font-mono text-base">
                {asset.name}
              </span>
              <span className="text-blue-300 font-mono ml-auto text-lg font-bold">
                {animatedValue}%
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
