import React from "react";
import { useEffect, useState, useRef } from "react";
import { TradingViewChart } from "./TradingViewChart";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  AlertTriangle,
  BarChart2,
  Info,
  Frown,
} from "lucide-react";
import { AnomalyEvent } from "@/hooks/useAnomaliesFeed";

interface AnalyticsData {
  symbol: string;
  data: { time: number; value: number }[];
  ma20: (number | null)[];
  vol20: (number | null)[];
  anomalies: boolean[];
}

// Simple tooltip component
function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      ref={ref}
      aria-label={text}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute z-50 left-1/2 -translate-x-1/2 -top-10 bg-gray-900 text-white text-xs rounded px-3 py-1 shadow-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role="tooltip"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

export function AdvancedAnalyticsWidget({
  symbol,
  realtimeAnomalies,
}: {
  symbol: string;
  realtimeAnomalies?: AnomalyEvent[];
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/${symbol}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch analytics");
        return res.json();
      })
      .then(setAnalytics)
      .catch(() => setError("Failed to load analytics data."))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <motion.div
        className="rounded-2xl bg-glass/80 p-6 shadow-xl min-h-[420px] flex items-center justify-center animate-pulse"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        aria-label="Loading analytics"
        aria-live="polite"
      >
        <span className="text-lg text-brand flex items-center gap-2">
          <motion.span
            className="w-6 h-6 border-4 border-blue-300 border-t-transparent rounded-full animate-spin"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          />
          Loading analytics…
        </span>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="rounded-2xl bg-glass/80 p-6 shadow-xl min-h-[420px] flex flex-col items-center justify-center text-center animate-fade-in"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        aria-label="Analytics error"
        aria-live="polite"
      >
        <Frown className="w-10 h-10 text-red-400 mb-2" aria-hidden="true" />
        <span className="text-lg text-red-500 font-semibold mb-2">{error}</span>
        <span className="text-sm text-gray-400">Please try again later.</span>
      </motion.div>
    );
  }

  if (!analytics || !analytics.data || analytics.data.length === 0) {
    return (
      <motion.div
        className="rounded-2xl bg-glass/80 p-6 shadow-xl min-h-[420px] flex flex-col items-center justify-center text-center animate-fade-in"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        aria-label="No analytics data"
        aria-live="polite"
      >
        <Info className="w-10 h-10 text-blue-400 mb-2" aria-hidden="true" />
        <span className="text-lg text-blue-500 font-semibold mb-2">
          No analytics data available
        </span>
        <span className="text-sm text-gray-400">
          Try selecting a different asset or check back later.
        </span>
      </motion.div>
    );
  }

  // Prepare chart data overlays
  const chartData = analytics.data.map((d, i) => ({
    time: d.time,
    value: d.value,
    anomaly: analytics.anomalies[i],
    ma20: analytics.ma20[i],
  }));

  // Prepare overlays
  const ma20Overlay = chartData
    .map((d) =>
      d.ma20 !== null ? { time: d.time, value: d.ma20 as number } : null,
    )
    .filter(Boolean) as { time: number; value: number }[];
  // Merge backend and realtime anomalies for overlay
  const backendAnomalies = chartData
    .filter((d) => d.anomaly)
    .map((d) => ({ time: d.time, value: d.value }));
  const realtimeOverlay = (realtimeAnomalies || []).map((a) => ({
    time:
      typeof a.time === "number"
        ? a.time
        : Math.floor(new Date(a.time).getTime() / 1000),
    value: a.price,
    pulse: true,
  }));
  // Merge and dedupe by time
  const anomalyOverlay = [...backendAnomalies, ...realtimeOverlay].filter(
    (a, i, arr) => arr.findIndex((b) => b.time === a.time) === i,
  );

  // Stats
  const last = analytics.data[analytics.data.length - 1];
  const lastMA = analytics.ma20[analytics.ma20.length - 1];
  const lastVol = analytics.vol20[analytics.vol20.length - 1];
  const anomalyCount = analytics.anomalies.filter(Boolean).length;

  return (
    <motion.div
      className="rounded-2xl bg-glass/80 p-6 shadow-xl w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, type: "spring" }}
      aria-label="Advanced Analytics Widget"
    >
      <div className="flex items-center gap-3 mb-4">
        <BarChart2 className="text-brand w-6 h-6" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight">Advanced Analytics</h2>
        <span className="ml-auto text-xs text-muted">
          {symbol.toUpperCase()}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <motion.div
          className="flex items-center gap-2 bg-glass/60 rounded-xl p-3 shadow"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #00ffa355" }}
          whileTap={{ scale: 0.98 }}
          tabIndex={0}
          aria-label="Last Price stat card"
        >
          <Tooltip text="The latest price from the data feed.">
            <TrendingUp className="text-green-400 w-5 h-5" aria-hidden="true" />
          </Tooltip>
          <div>
            <div className="text-xs text-muted">Last Price</div>
            <div className="font-semibold text-lg">
              ${last.value.toFixed(2)}
            </div>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 bg-glass/60 rounded-xl p-3 shadow"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #3b82f655" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #3b82f655" }}
          whileTap={{ scale: 0.98 }}
          tabIndex={0}
          aria-label="20-period MA stat card"
        >
          <Tooltip text="20-period Moving Average (MA20) smooths out price to show the trend.">
            <BarChart2 className="text-blue-400 w-5 h-5" aria-hidden="true" />
          </Tooltip>
          <div>
            <div className="text-xs text-muted">20-period MA</div>
            <div className="font-semibold text-lg">
              {lastMA ? lastMA.toFixed(2) : "-"}
            </div>
          </div>
        </motion.div>
        <motion.div
          className="flex items-center gap-2 bg-glass/60 rounded-xl p-3 shadow"
          whileHover={{ scale: 1.04, boxShadow: "0 2px 16px #f59e4255" }}
          whileFocus={{ scale: 1.04, boxShadow: "0 2px 16px #f59e4255" }}
          whileTap={{ scale: 0.98 }}
          tabIndex={0}
          aria-label="Anomalies stat card"
        >
          <Tooltip text="Anomalies are points where price deviates significantly from the moving average.">
            <AlertTriangle
              className="text-yellow-400 w-5 h-5"
              aria-hidden="true"
            />
          </Tooltip>
          <div>
            <div className="text-xs text-muted">Anomalies (20MA)</div>
            <div className="font-semibold text-lg">{anomalyCount}</div>
          </div>
        </motion.div>
      </div>
      <div className="mb-2">
        <TradingViewChart
          data={chartData.map((d) => ({ time: d.time, value: d.value }))}
          containerHeight={320}
          ma20={ma20Overlay}
          anomalies={anomalyOverlay}
        />
        {/* TODO: Overlay MA as line is supported. For anomaly markers, lightweight-charts only supports markers on candlestick series. Consider switching or custom rendering for future enhancement. */}
      </div>
    </motion.div>
  );
}
