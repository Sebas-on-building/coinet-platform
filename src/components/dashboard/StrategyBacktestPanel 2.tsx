import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiBarChart2, FiPlay, FiTrendingUp, FiActivity } from "react-icons/fi";

const assets = [
  { symbol: "BTC", color: "#00ffa3" },
  { symbol: "ETH", color: "#0057ff" },
  { symbol: "SOL", color: "#ffb300" },
];

const strategies = [
  { label: "Momentum", key: "momentum" },
  { label: "Mean Reversion", key: "mean" },
  { label: "Breakout", key: "breakout" },
];

const timeframes = ["1D", "1W", "1M", "3M"];

const mockResults = {
  equity: [10000, 10500, 11000, 12000, 12500, 13000],
  drawdown: [0, -200, -100, -300, -150, -50],
  winRate: 62,
  trades: 34,
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const points = data
    .map((v, i) => `${i * 40},${60 - ((v - min) / (max - min || 1)) * 50}`)
    .join(" ");
  return (
    <svg width="200" height="60">
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

export function StrategyBacktestPanel() {
  const [asset, setAsset] = useState(assets[0]);
  const [strategy, setStrategy] = useState(strategies[0].key);
  const [timeframe, setTimeframe] = useState(timeframes[0]);
  const [running, setRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const runBacktest = () => {
    setRunning(true);
    setShowResults(false);
    setTimeout(() => {
      setRunning(false);
      setShowResults(true);
    }, 1200);
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-[#1a1a2e] to-[#23234d] rounded-2xl p-6 shadow-xl mb-8 w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: "spring" }}
    >
      <h3 className="text-xl font-bold text-white mb-4">
        Strategy Backtesting & Simulation
      </h3>
      <div className="flex gap-4 mb-4">
        <div>
          <div className="text-blue-300 font-mono mb-1">Asset</div>
          <div className="flex gap-2">
            {assets.map((a) => (
              <button
                key={a.symbol}
                className={`px-3 py-1 rounded-full font-mono text-sm font-bold border-2 transition ${asset.symbol === a.symbol ? "ring-2 ring-white" : ""}`}
                style={{
                  background: a.color + "22",
                  color: a.color,
                  borderColor: a.color,
                }}
                onClick={() => setAsset(a)}
              >
                {a.symbol}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-blue-300 font-mono mb-1">Strategy</div>
          <div className="flex gap-2">
            {strategies.map((s) => (
              <button
                key={s.key}
                className={`px-3 py-1 rounded-full font-mono text-sm font-bold border-2 transition ${strategy === s.key ? "ring-2 ring-white" : ""}`}
                style={{
                  background: asset.color + "22",
                  color: asset.color,
                  borderColor: asset.color,
                }}
                onClick={() => setStrategy(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-blue-300 font-mono mb-1">Timeframe</div>
          <div className="flex gap-2">
            {timeframes.map((tf) => (
              <button
                key={tf}
                className={`px-3 py-1 rounded-full font-mono text-sm font-bold border-2 transition ${timeframe === tf ? "ring-2 ring-white" : ""}`}
                style={{
                  background: asset.color + "22",
                  color: asset.color,
                  borderColor: asset.color,
                }}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="bg-[#00ffa3] text-[#23234d] px-6 py-2 rounded-lg font-bold shadow hover:bg-[#0057ff] hover:text-white transition flex items-center gap-2 mb-4"
        onClick={runBacktest}
        disabled={running}
      >
        <FiPlay /> {running ? "Running..." : "Run Backtest"}
      </button>
      <AnimatePresence>
        {running && (
          <motion.div
            className="text-blue-300 font-mono text-center my-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FiActivity className="inline-block animate-spin mr-2" /> Running
            simulation...
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mt-4"
          >
            <div className="flex gap-6 items-center mb-4">
              <div>
                <div className="text-blue-300 font-mono mb-1">Equity Curve</div>
                <Sparkline data={mockResults.equity} color={asset.color} />
              </div>
              <div>
                <div className="text-blue-300 font-mono mb-1">Drawdown</div>
                <Sparkline data={mockResults.drawdown} color={"#ff4d4f"} />
              </div>
            </div>
            <div className="flex gap-6">
              <div
                className="bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
                style={{ borderColor: asset.color }}
              >
                <span className="text-white font-bold mb-1">Win Rate</span>
                <span className="text-green-400 text-lg font-mono mb-2">
                  {mockResults.winRate}%
                </span>
              </div>
              <div
                className="bg-[#23234d] rounded-xl p-4 shadow-lg flex flex-col items-center border-2"
                style={{ borderColor: asset.color }}
              >
                <span className="text-white font-bold mb-1">Trades</span>
                <span className="text-blue-300 text-lg font-mono mb-2">
                  {mockResults.trades}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
