import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useCoinetData } from "@/hooks/useCoinetData";
import { DataLoader, DataError, DataEmpty, DataLivePulse } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertTriangle, Star, BarChart3, MessageCircle } from "lucide-react";
import { ChartWithOverlays } from "@/components/charts/ChartWithOverlays";
import { Overlay } from "@/components/charts/ChartOverlay";

// Sparkline component for trend micro-chart
function Sparkline({ data, color = "#00ffa3" }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`)
    .join(" ");
  return (
    <svg width="80" height="24" viewBox="0 0 100 100" className="inline-block align-middle">
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
}

/**
 * AIInsightsWidget
 * - Divine perfection: real AI data, overlays, micro-interactions, pixel-perfect design
 * - Modular, extensible, theme-aware, accessible
 */
interface AIInsightsWidgetProps {
  config?: {
    asset?: string;
    focusArea?: string;
    insightType?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function AIInsightsWidget({ config, analyticsEvent }: AIInsightsWidgetProps) {
  // Asset selection (default to bitcoin)
  const [asset, setAsset] = useState(config?.asset || "bitcoin");
  // Fetch AI insights via unified data layer
  const { data, state, error, isLive } = useCoinetData({
    type: "ai",
    asset,
    ai: true,
    config,
  });

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "AIInsightsWidget",
      });
    }
  }, [analyticsEvent]);

  // Divine loader, error, empty states
  if (state === "loading") return <DataLoader />;
  if (state === "error") return <DataError error={error} />;
  if (!data) return <DataEmpty message="No AI insights available." />;

  // Risk meter
  function RiskMeter({ score }: { score: number }) {
    // score: 0 (safe) to 1 (risky)
    const percent = Math.round((1 - score) * 100);
    let color = "bg-green-400";
    if (score > 0.66) color = "bg-red-500";
    else if (score > 0.33) color = "bg-yellow-400";
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Risk Meter:</span>
        <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }}></div>
        </div>
        <span className="text-xs font-bold ml-2">{percent}% Safe</span>
      </div>
    );
  }

  // Animated anomaly overlay
  function AnomalyOverlay({ anomalies }: { anomalies: any[] }) {
    if (!anomalies || anomalies.length === 0) return null;
    return (
      <AnimatePresence>
        {anomalies.map((a, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.32, type: "spring" }}
            className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 rounded p-2 my-2 border border-yellow-300 dark:border-yellow-700 shadow"
            aria-label="Anomaly"
          >
            <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />
            <span className="text-xs text-yellow-800 dark:text-yellow-200 font-semibold">
              {a.metric}: {a.description} ({a.date ? new Date(a.date).toLocaleString() : ""})
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    );
  }

  // Micro-interaction: expand/collapse Q&A
  const [showQA, setShowQA] = useState(false);

  // Chart data and overlays (mocked for now, but should be derived from AI data)
  const chartData = Array.isArray(data.trend)
    ? data.trend.map((y: number, i: number) => ({ x: i / (data.trend.length - 1), y: y / 100 }))
    : [];
  const overlays: Overlay[] = [];
  // Predictive zone overlay (example: highlight predicted move)
  if (data.predictive) {
    overlays.push({
      type: "ai",
      label: "AI Signal",
      x: 0.8,
      y: chartData.length > 0 ? chartData[chartData.length - 1].y : 0.5,
      color: "#00ffa3",
      pulse: true,
      details: data.predictive,
    });
  }
  // Anomaly overlays
  if (Array.isArray(data.anomalies)) {
    data.anomalies.forEach((a: any, idx: number) => {
      overlays.push({
        type: "anomaly",
        label: a.metric,
        x: idx / (data.anomalies.length || 1),
        color: "#ffb300",
        pulse: false,
        details: a.description,
      });
    });
  }

  // Chart controls (timeframe, overlays)
  const [selectedTimeframe, setSelectedTimeframe] = useState(config?.timeframe || "7d");
  const [showAIOverlay, setShowAIOverlay] = useState(true);
  const [showAnomalyOverlay, setShowAnomalyOverlay] = useState(true);
  const chartControls = (
    <div className="flex gap-2 items-center bg-white/10 rounded-lg px-3 py-1 shadow">
      <select
        className="bg-transparent text-white font-semibold outline-none"
        value={selectedTimeframe}
        onChange={e => setSelectedTimeframe(e.target.value)}
        aria-label="Select timeframe"
      >
        <option value="24h">24h</option>
        <option value="7d">7d</option>
        <option value="30d">30d</option>
      </select>
      <button
        className={`px-2 py-1 rounded ${showAIOverlay ? "bg-blue-500 text-white" : "bg-white/20 text-blue-200"}`}
        onClick={() => setShowAIOverlay(v => !v)}
        aria-pressed={showAIOverlay}
      >
        AI Overlay
      </button>
      <button
        className={`px-2 py-1 rounded ${showAnomalyOverlay ? "bg-yellow-500 text-white" : "bg-white/20 text-yellow-200"}`}
        onClick={() => setShowAnomalyOverlay(v => !v)}
        aria-pressed={showAnomalyOverlay}
      >
        Anomalies
      </button>
    </div>
  );

  // Filter overlays based on toggles
  const filteredOverlays = overlays.filter(ov =>
    (ov.type === "ai" && showAIOverlay) || (ov.type === "anomaly" && showAnomalyOverlay)
  );

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="AI Insights"
      className="bg-gradient-to-br from-[#23234d]/90 via-[#23234d]/80 to-[#18192b]/90 text-white shadow-2xl ring-1 ring-white/10 ring-inset border border-blue-900/40 font-semibold"
    >
      <div className="flex items-center gap-2 mb-2">
        {isLive && <DataLivePulse />}
        <BarChart3 className="h-6 w-6 text-blue-400" aria-hidden="true" />
        <h2 className="text-2xl font-extrabold text-white drop-shadow-xl" tabIndex={0}>
          AI Insights
        </h2>
        {config?.focusArea && <Badge variant="info">{config.focusArea}</Badge>}
        {config?.timeframe && <Badge variant="primary">{config.timeframe}</Badge>}
      </div>
      {/* Executive Summary & Risk */}
      <Card variant="primary" className="p-4 mb-2 bg-blue-900/30 text-blue-100 shadow-inner" hover aria-label="Executive Summary">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-blue-400" />
          <span className="font-semibold">Executive Summary</span>
        </div>
        <div className="text-base text-blue-100 mb-2 font-semibold">{data.summary}</div>
        {typeof data.riskScore === "number" && <RiskMeter score={data.riskScore} />}
      </Card>
      {/* Key Insights */}
      <Card variant="default" className="p-4 mb-2 bg-white/10 text-white shadow-inner" hover aria-label="Key Insights">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-yellow-400" />
          <span className="font-semibold">Key Insights</span>
        </div>
        <ul className="list-disc ml-4 text-sm text-blue-100">
          {Array.isArray(data.keyInsights) && data.keyInsights.length > 0 ? (
            data.keyInsights.map((ins: string, idx: number) => <li key={idx}>{ins}</li>)
          ) : (
            <li>No key insights available.</li>
          )}
        </ul>
      </Card>
      {/* Anomalies Overlay */}
      <AnomalyOverlay anomalies={data.anomalies || []} />
      {/* Trend Mini-Chart */}
      {Array.isArray(data.trend) && data.trend.length > 1 && (
        <Card variant="default" className="p-4 mb-2 bg-white/10 text-white shadow-inner" hover aria-label="Trend Chart">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-fuchsia-400" />
            <span className="font-semibold">Trend</span>
          </div>
          <Sparkline data={data.trend} color="#00ffa3" />
        </Card>
      )}
      {/* Predictive Analytics */}
      {data.predictive && (
        <Card variant="default" className="p-4 mb-2 bg-white/10 text-white shadow-inner" hover aria-label="Predictive Analytics">
          <div className="font-semibold mb-2 text-fuchsia-400">Predictive Analytics</div>
          <div className="text-sm text-fuchsia-200">{data.predictive}</div>
        </Card>
      )}
      {/* AI Explainer */}
      {data.aiExplainer && (
        <Card variant="primary" className="p-4 mb-2 bg-blue-900/30 text-blue-100 shadow-inner" hover aria-label="AI Explainer">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span className="font-semibold">AI Explainer</span>
          </div>
          <div className="text-xs text-blue-100">{data.aiExplainer}</div>
        </Card>
      )}
      {/* Q&A Micro-interaction */}
      <Card variant="glass" className="p-4 mt-2 bg-white/10 text-white shadow-inner" hover aria-label="Community Q&A">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          <span className="font-semibold">Community Q&amp;A</span>
          <button
            className="ml-auto text-xs text-blue-500 underline flex items-center gap-1"
            onClick={() => setShowQA((v) => !v)}
            aria-expanded={showQA}
            aria-controls="ai-qa-panel"
          >
            {showQA ? "Hide" : "Expand"}
          </button>
        </div>
        <AnimatePresence>
          {showQA && (
            <motion.div
              id="ai-qa-panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.22, type: "spring" }}
              className="mt-2"
            >
              <div className="text-xs text-blue-100 mb-2">User Q&amp;A and AI-powered answers coming soon.</div>
              {/* Future: Q&A input, animated answers, upvote, etc. */}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
      {/* Last updated */}
      <div className="text-xs text-neutral-400 mt-4">
        Last updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "N/A"}
      </div>
      <div className="text-xs text-neutral-400 mt-2">
        More advanced AI features and user Q&amp;A coming soon!
      </div>
      {/* Chart with overlays */}
      {chartData.length > 1 && (
        <div className="my-4">
          <ChartWithOverlays
            data={chartData}
            overlays={filteredOverlays}
            width={420}
            height={180}
            controls={chartControls}
          />
        </div>
      )}
    </Card>
  );
}
