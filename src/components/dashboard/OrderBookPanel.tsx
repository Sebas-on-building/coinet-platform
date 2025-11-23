import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTrendingUp, FiTrendingDown, FiInfo } from "react-icons/fi";
import axios from "axios";
import { useBinanceOrderBook } from "../../hooks/useBinanceOrderBook";
import { useBinanceRecentTrades } from "../../hooks/useBinanceRecentTrades";
import { useCoinGeckoStats } from "../../hooks/useCoinGeckoStats";

interface Order {
  price: number;
  size: number;
}

function formatNumber(n: number, decimals = 2) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getCumulative(orders: Order[]) {
  let sum = 0;
  return orders.map((o) => (sum += o.size));
}

// Utility for smart tooltip positioning
function getSmartTooltipPosition(
  anchorRect: DOMRect,
  tooltipWidth = 220,
  tooltipHeight = 80,
) {
  const padding = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top = anchorRect.bottom + 8;
  let left = anchorRect.left;
  // Flip up if not enough space below
  if (top + tooltipHeight > vh - padding) {
    top = anchorRect.top - tooltipHeight - 8;
  }
  // Flip left if not enough space right
  if (left + tooltipWidth > vw - padding) {
    left = vw - tooltipWidth - padding;
  }
  // Clamp to left edge
  if (left < padding) left = padding;
  // Clamp to top
  if (top < padding) top = padding;
  return { top, left };
}

// Enhanced Tooltip component
function GlassyTooltip({
  text,
  anchorRect,
  onClose,
  locked,
  arrow = true,
}: {
  text: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
  locked?: boolean;
  arrow?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRect) {
      setPos(getSmartTooltipPosition(anchorRect));
    }
  }, [anchorRect]);
  // Close on Escape or click outside
  useEffect(() => {
    if (!locked) return;
    function handle(e: any) {
      if (e.key === "Escape") onClose();
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("keydown", handle);
    document.addEventListener("mousedown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.removeEventListener("mousedown", handle);
    };
  }, [locked, onClose]);
  if (!anchorRect) return null;
  return (
    <motion.div
      ref={ref}
      className="fixed z-50 bg-[#23234d]/95 text-white rounded-xl shadow-2xl border border-blue-400/30 px-4 py-3 text-xs backdrop-blur-xl animate-fade-in"
      style={{
        top: pos.top,
        left: pos.left,
        minWidth: 220,
        maxWidth: 320,
        pointerEvents: locked ? "auto" : "none",
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      role="tooltip"
      tabIndex={-1}
      onMouseLeave={() => !locked && onClose()}
      aria-live="polite"
    >
      {arrow && (
        <div className="absolute -top-2 left-6 w-4 h-4">
          <svg width="16" height="16">
            <polygon points="8,0 16,16 0,16" fill="#23234d" opacity="0.95" />
          </svg>
        </div>
      )}
      {text}
      {locked && (
        <button
          className="mt-2 text-xs text-blue-400 underline hover:text-blue-200"
          onClick={onClose}
        >
          Close
        </button>
      )}
    </motion.div>
  );
}

export default function OrderBookPanel() {
  const { bids, asks } = useBinanceOrderBook("BTCUSDT", 16);
  const trades = useBinanceRecentTrades("BTCUSDT", 20);
  const stats = useCoinGeckoStats("bitcoin", "usd");
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  // Buy/Sell filter
  const [tradeFilter, setTradeFilter] = useState<"all" | "buy" | "sell">("all");
  // Tooltip state
  const [tooltipTrade, setTooltipTrade] = useState<any>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<DOMRect | null>(null);
  // For price/size pulse
  const [pulseIds, setPulseIds] = useState<Set<number>>(new Set());
  // Track previous trade IDs to pulse on new
  const prevTradeIds = useRef<Set<number>>(new Set());
  // Advanced analytics state for tooltips
  const [metricTooltip, setMetricTooltip] = useState<{
    text: string;
    anchor: DOMRect | null;
  } | null>(null);

  useEffect(() => {
    // Pulse animation for new trades
    const newIds = trades
      .filter((t) => !prevTradeIds.current.has(t.id))
      .map((t) => t.id);
    if (newIds.length > 0) {
      setPulseIds(new Set(newIds));
      setTimeout(() => setPulseIds(new Set()), 350);
    }
    prevTradeIds.current = new Set(trades.map((t) => t.id));
  }, [trades]);

  // Depth chart data
  const bidPrices = bids.map((b) => b.price);
  const askPrices = asks.map((a) => a.price);
  const allPrices = [...bidPrices, ...askPrices].sort((a, b) => a - b);
  const minPrice = allPrices[0] || 0;
  const maxPrice = allPrices[allPrices.length - 1] || 1;
  const bidCum = getCumulative(bids);
  const askCum = getCumulative(asks);
  const maxCum = Math.max(
    bidCum[bidCum.length - 1] || 1,
    askCum[askCum.length - 1] || 1,
  );

  // Spread
  const spread = asks[0] && bids[0] ? asks[0].price - bids[0].price : null;
  // VWAP (from recent trades)
  const vwap =
    trades.length > 0
      ? trades.reduce((acc, t) => acc + t.price * t.qty, 0) /
        trades.reduce((acc, t) => acc + t.qty, 0)
      : null;

  // Order book imbalance and liquidity
  const totalBid = bids.reduce((acc, b) => acc + b.size, 0);
  const totalAsk = asks.reduce((acc, a) => acc + a.size, 0);
  const totalBook = totalBid + totalAsk;
  const bidPct = totalBook > 0 ? (totalBid / totalBook) * 100 : 0;
  const askPct = totalBook > 0 ? (totalAsk / totalBook) * 100 : 0;
  const dominantSide =
    totalBid > totalAsk ? "bid" : totalAsk > totalBid ? "ask" : "even";

  return (
    <motion.div
      className="bg-gradient-to-br from-[#23234d] to-[#181836] rounded-2xl p-6 shadow-2xl border-2 border-blue-400/40 backdrop-blur-xl max-w-2xl mx-auto my-8"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.7, type: "spring" }}
      aria-label="Order Book Panel"
    >
      {/* Analytics Bar */}
      <motion.div
        className="flex flex-wrap gap-4 items-center justify-between bg-[#23234d]/80 rounded-xl px-4 py-3 mb-6 shadow border border-blue-400/20 backdrop-blur"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        role="region"
        aria-label="Order Book Analytics"
      >
        {/* Spread */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            Spread
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is Spread?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "Spread is the difference between the best ask and best bid price.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "Spread is the difference between the best ask and best bid price.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            {spread !== null ? `$${spread.toFixed(2)}` : "--"}
          </span>
        </motion.div>
        {/* VWAP */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            VWAP
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is VWAP?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "VWAP (Volume Weighted Average Price) is the average price weighted by volume for recent trades.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "VWAP (Volume Weighted Average Price) is the average price weighted by volume for recent trades.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            {vwap ? `$${vwap.toFixed(2)}` : "--"}
          </span>
        </motion.div>
        {/* 24h High */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            24h High
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is 24h High?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "The highest price traded in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "The highest price traded in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            {stats?.high
              ? `$${stats.high.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "--"}
          </span>
        </motion.div>
        {/* 24h Low */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            24h Low
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is 24h Low?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "The lowest price traded in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "The lowest price traded in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            {stats?.low
              ? `$${stats.low.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "--"}
          </span>
        </motion.div>
        {/* 24h Volume */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            24h Volume
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is 24h Volume?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "The total trading volume in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "The total trading volume in the last 24 hours.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            {stats?.volume
              ? stats.volume.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              : "--"}
          </span>
        </motion.div>
        {/* Order Book Imbalance */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            Imbalance
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is Order Book Imbalance?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "Order book imbalance is the percentage of liquidity on the bid vs ask side. >50% bid means more buy-side liquidity.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "Order book imbalance is the percentage of liquidity on the bid vs ask side. >50% bid means more buy-side liquidity.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            <span
              className={
                bidPct > askPct
                  ? "text-green-400"
                  : askPct > bidPct
                    ? "text-red-400"
                    : "text-blue-200"
              }
            >
              {bidPct.toFixed(0)}%
            </span>
            <span className="mx-1 text-blue-400">/</span>
            <span
              className={
                askPct > bidPct
                  ? "text-red-400"
                  : bidPct > askPct
                    ? "text-green-400"
                    : "text-blue-200"
              }
            >
              {askPct.toFixed(0)}%
            </span>
          </span>
        </motion.div>
        {/* Liquidity Metrics */}
        <motion.div
          className="flex flex-col text-xs text-blue-200 relative group cursor-pointer"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          tabIndex={0}
        >
          <span className="font-semibold text-white flex items-center gap-1">
            Liquidity
            <motion.button
              className="text-blue-300 hover:text-blue-100 focus:outline-none"
              aria-label="What is Liquidity?"
              onMouseEnter={(e) =>
                setMetricTooltip({
                  text: "Liquidity is the total size available on each side of the order book. Higher liquidity means less slippage.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onMouseLeave={() => setMetricTooltip(null)}
              onFocus={(e) =>
                setMetricTooltip({
                  text: "Liquidity is the total size available on each side of the order book. Higher liquidity means less slippage.",
                  anchor: (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect(),
                })
              }
              onBlur={() => setMetricTooltip(null)}
              tabIndex={0}
              whileHover={{ scale: 1.2, color: "#00ffa3" }}
              whileFocus={{ scale: 1.2, color: "#00ffa3" }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <FiInfo className="inline" />
            </motion.button>
          </span>
          <span className="font-mono text-lg" aria-live="polite">
            <span
              className={
                dominantSide === "bid"
                  ? "text-green-400 font-bold"
                  : "text-blue-100"
              }
            >
              Bid: {totalBid.toFixed(2)}
            </span>
            <span className="mx-1 text-blue-400">/</span>
            <span
              className={
                dominantSide === "ask"
                  ? "text-red-400 font-bold"
                  : "text-blue-100"
              }
            >
              Ask: {totalAsk.toFixed(2)}
            </span>
          </span>
        </motion.div>
        {/* Metric Tooltip Render */}
        <AnimatePresence>
          {metricTooltip && metricTooltip.anchor && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              style={{
                position: "fixed",
                zIndex: 50,
                top: metricTooltip.anchor.bottom + 8,
                left: metricTooltip.anchor.left,
                minWidth: 180,
              }}
            >
              <GlassyTooltip
                text={metricTooltip.text}
                anchorRect={metricTooltip.anchor}
                onClose={() => setMetricTooltip(null)}
                locked={false}
                arrow={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="flex items-center gap-3 mb-6">
        <FiTrendingUp className="text-[#00ffa3] text-2xl" />
        <h2 className="text-2xl font-bold text-white">Order Book (BTC/USDT)</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
        {/* Bids */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-green-400 font-bold">Bids</span>
            <FiTrendingUp className="text-green-400" />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-right">
              <thead>
                <tr className="text-blue-200">
                  <th className="px-2 py-1">Price</th>
                  <th className="px-2 py-1">Size</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {bids.map((order, i) => (
                    <motion.tr
                      key={order.price}
                      className={`transition-colors ${hoveredRow === i ? "bg-green-900/30" : ""}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => setHoveredRow(i)}
                      onMouseLeave={() => setHoveredRow(null)}
                      tabIndex={0}
                      aria-label={`Bid: ${order.price} for ${order.size}`}
                    >
                      <td className="px-2 py-1 text-green-400 font-mono">
                        {formatNumber(order.price, 2)}
                      </td>
                      <td className="px-2 py-1 text-blue-100 font-mono">
                        {formatNumber(order.size, 4)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
        {/* Asks */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 font-bold">Asks</span>
            <FiTrendingDown className="text-red-400" />
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="w-full text-right">
              <thead>
                <tr className="text-blue-200">
                  <th className="px-2 py-1">Price</th>
                  <th className="px-2 py-1">Size</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {asks.map((order, i) => (
                    <motion.tr
                      key={order.price}
                      className={`transition-colors ${hoveredRow === i + bids.length ? "bg-red-900/30" : ""}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      onMouseEnter={() => setHoveredRow(i + bids.length)}
                      onMouseLeave={() => setHoveredRow(null)}
                      tabIndex={0}
                      aria-label={`Ask: ${order.price} for ${order.size}`}
                    >
                      <td className="px-2 py-1 text-red-400 font-mono">
                        {formatNumber(order.price, 2)}
                      </td>
                      <td className="px-2 py-1 text-blue-100 font-mono">
                        {formatNumber(order.size, 4)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Depth Chart */}
      <div className="mt-8">
        <h3 className="text-blue-200 text-sm font-semibold mb-2">
          Order Book Depth
        </h3>
        <div className="relative h-32 w-full">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 400 120`}
            className="absolute top-0 left-0 w-full h-full"
          >
            {/* Bids Area */}
            <polyline
              fill="rgba(0,255,163,0.18)"
              stroke="#00ffa3"
              strokeWidth="2"
              points={bids
                .map(
                  (b, i) =>
                    `${((b.price - minPrice) / (maxPrice - minPrice || 1)) * 400},${120 - (bidCum[i] / maxCum) * 110}`,
                )
                .join(" ")}
            />
            {/* Asks Area */}
            <polyline
              fill="rgba(255,77,79,0.18)"
              stroke="#ff4d4f"
              strokeWidth="2"
              points={asks
                .map(
                  (a, i) =>
                    `${((a.price - minPrice) / (maxPrice - minPrice || 1)) * 400},${120 - (askCum[i] / maxCum) * 110}`,
                )
                .join(" ")}
            />
          </svg>
        </div>
      </div>
      {/* Recent Trades Feed */}
      <div className="mt-8">
        <h3 className="text-blue-200 text-sm font-semibold mb-2 flex items-center gap-2">
          Recent Trades
          <span className="flex gap-1 ml-2">
            <button
              className={`px-2 py-0.5 rounded text-xs font-bold border transition focus:ring-2 focus:ring-blue-400 ${tradeFilter === "all" ? "bg-blue-500 text-white border-blue-500" : "bg-[#23234d] text-blue-200 border-blue-400/30 hover:bg-blue-600"}`}
              onClick={() => setTradeFilter("all")}
              aria-label="Show all trades"
            >
              All
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs font-bold border transition focus:ring-2 focus:ring-green-400 ${tradeFilter === "buy" ? "bg-green-500 text-white border-green-500" : "bg-[#23234d] text-green-300 border-green-400/30 hover:bg-green-600"}`}
              onClick={() => setTradeFilter("buy")}
              aria-label="Show buy trades"
            >
              Buy
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs font-bold border transition focus:ring-2 focus:ring-red-400 ${tradeFilter === "sell" ? "bg-red-500 text-white border-red-500" : "bg-[#23234d] text-red-300 border-red-400/30 hover:bg-red-600"}`}
              onClick={() => setTradeFilter("sell")}
              aria-label="Show sell trades"
            >
              Sell
            </button>
          </span>
        </h3>
        <div className="relative bg-[#181836]/80 rounded-xl shadow-inner max-h-48 overflow-y-auto hover:overflow-y-scroll transition-all">
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-blue-200">
                <th className="px-2 py-1 text-left">Time</th>
                <th className="px-2 py-1 text-right">Price</th>
                <th className="px-2 py-1 text-right">Size</th>
                <th className="px-2 py-1 text-center">Side</th>
                <th className="px-2 py-1 text-center">Info</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {trades
                  .filter((t) =>
                    tradeFilter === "all" ? true : t.side === tradeFilter,
                  )
                  .map((trade, i) => (
                    <motion.tr
                      key={trade.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.18 }}
                      className={
                        trade.side === "buy"
                          ? "bg-green-900/10 hover:bg-green-900/30 transition"
                          : "bg-red-900/10 hover:bg-red-900/30 transition"
                      }
                      tabIndex={0}
                      aria-label={`Trade: ${trade.price} ${trade.side} for ${trade.qty}`}
                      onMouseEnter={(e) => {
                        setTooltipTrade(trade);
                        setTooltipAnchor(
                          (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect(),
                        );
                      }}
                      onMouseLeave={() => setTooltipTrade(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTooltipTrade(trade);
                        setTooltipAnchor(
                          (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect(),
                        );
                      }}
                    >
                      <td className="px-2 py-1 text-blue-200 font-mono">
                        {new Date(trade.time).toLocaleTimeString([], {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td
                        className={`px-2 py-1 font-mono text-right ${trade.side === "buy" ? "text-green-400" : "text-red-400"} ${pulseIds.has(trade.id) ? "animate-pulse-fast ring-2 ring-green-400/60" : ""}`}
                      >
                        {formatNumber(trade.price, 2)}
                      </td>
                      <td
                        className={`px-2 py-1 text-blue-100 font-mono text-right ${pulseIds.has(trade.id) ? "animate-pulse-fast ring-2 ring-blue-400/60" : ""}`}
                      >
                        {formatNumber(trade.qty, 4)}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${trade.side === "buy" ? "bg-green-400/20 text-green-300" : "bg-red-400/20 text-red-300"}`}
                        >
                          {trade.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button
                          className="text-blue-300 hover:text-blue-100 focus:outline-none"
                          aria-label="Show trade details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTooltipTrade(trade);
                            setTooltipAnchor(
                              (
                                e.currentTarget as HTMLElement
                              ).getBoundingClientRect(),
                            );
                          }}
                        >
                          <FiInfo />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>
          {/* Tooltip */}
          <AnimatePresence>
            {tooltipTrade && tooltipAnchor && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                style={{
                  position: "fixed",
                  zIndex: 50,
                  top: tooltipAnchor.bottom + 8,
                  left: tooltipAnchor.left,
                  minWidth: 220,
                }}
              >
                <GlassyTooltip
                  text={`Trade ID: ${tooltipTrade.id}\nTime: ${new Date(tooltipTrade.time).toLocaleString()}\nPrice: $${tooltipTrade.price.toFixed(2)}\nSize: ${tooltipTrade.qty.toFixed(4)}`}
                  anchorRect={tooltipAnchor}
                  onClose={() => setTooltipTrade(null)}
                  locked={false}
                  arrow={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
