import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mockBids = [
  { price: 71200, size: 0.5 },
  { price: 71180, size: 1.2 },
  { price: 71160, size: 0.8 },
  { price: 71140, size: 2.1 },
];
const mockAsks = [
  { price: 71220, size: 0.7 },
  { price: 71240, size: 1.0 },
  { price: 71260, size: 0.6 },
  { price: 71280, size: 1.5 },
];
const mockTrades = [
  { price: 71210, size: 0.2, side: "buy" },
  { price: 71230, size: 0.1, side: "sell" },
  { price: 71190, size: 0.3, side: "buy" },
  { price: 71250, size: 0.4, side: "sell" },
];

export function LiveOrderBookTradesTicker() {
  const [trades, setTrades] = useState(mockTrades);

  // Simulate new trades
  useEffect(() => {
    const interval = setInterval(() => {
      setTrades((trades) => {
        const newTrade = {
          price: 71150 + Math.floor(Math.random() * 200),
          size: parseFloat((Math.random() * 2).toFixed(2)),
          side: Math.random() > 0.5 ? "buy" : "sell",
        };
        return [newTrade, ...trades.slice(0, 7)];
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Live Order Book & Trades Ticker
      </h3>
      <div className="flex gap-6 mb-4">
        {/* Bids */}
        <div className="flex-1">
          <div className="text-green-400 font-bold mb-2">Bids</div>
          <div className="space-y-2">
            {mockBids.map((bid, idx) => (
              <motion.div
                key={bid.price}
                className="flex justify-between bg-[#1a1a2e] rounded px-3 py-2 text-green-300 font-mono shadow"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, type: "spring" }}
              >
                <span>${bid.price}</span>
                <span>{bid.size} BTC</span>
              </motion.div>
            ))}
          </div>
        </div>
        {/* Asks */}
        <div className="flex-1">
          <div className="text-red-400 font-bold mb-2">Asks</div>
          <div className="space-y-2">
            {mockAsks.map((ask, idx) => (
              <motion.div
                key={ask.price}
                className="flex justify-between bg-[#1a1a2e] rounded px-3 py-2 text-red-300 font-mono shadow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx, type: "spring" }}
              >
                <span>${ask.price}</span>
                <span>{ask.size} BTC</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      {/* Trades Ticker */}
      <div className="overflow-x-auto whitespace-nowrap flex gap-3 py-2 hide-scrollbar">
        <AnimatePresence initial={false}>
          {trades.map((trade, idx) => (
            <motion.div
              key={trade.price + "-" + idx}
              className={`inline-block px-4 py-2 rounded-lg font-mono shadow text-sm ${trade.side === "buy" ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#ff4d4f] text-white"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              {trade.side === "buy" ? "+" : "-"}${trade.price}{" "}
              <span className="opacity-70">({trade.size} BTC)</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
