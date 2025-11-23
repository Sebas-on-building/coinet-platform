import { motion } from "framer-motion";

const mockMovers = [
  { name: "SOL", change: "+12.4%", price: "$158.20", color: "#00ffa3" },
  { name: "BTC", change: "+8.1%", price: "$71,200", color: "#0057ff" },
  { name: "DOGE", change: "+6.7%", price: "$0.18", color: "#ffb300" },
  { name: "ETH", change: "-2.3%", price: "$3,420", color: "#ff4d4f" },
  { name: "AVAX", change: "-4.1%", price: "$34.10", color: "#7c3aed" },
];

export function MarketMoversCarousel() {
  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">Market Movers</h3>
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {mockMovers.map((mover, idx) => (
          <motion.div
            key={mover.name}
            className="min-w-[160px] bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
            style={{ borderColor: mover.color }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * idx, type: "spring", stiffness: 80 }}
            whileHover={{ scale: 1.07, boxShadow: `0 0 16px ${mover.color}` }}
          >
            <span className="text-2xl font-bold" style={{ color: mover.color }}>
              {mover.name}
            </span>
            <span
              className={`font-mono text-lg ${mover.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}
            >
              {mover.change}
            </span>
            <span className="text-blue-300 text-sm mt-1">{mover.price}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Add hide-scrollbar utility if not present in your CSS:
// .hide-scrollbar::-webkit-scrollbar { display: none; }
// .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
