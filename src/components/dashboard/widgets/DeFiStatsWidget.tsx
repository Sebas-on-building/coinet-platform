import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * DeFiStatsWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface DeFiStatsWidgetProps {
  config?: {
    protocol?: string;
    metric?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function DeFiStatsWidget({
  config,
  analyticsEvent,
}: DeFiStatsWidgetProps) {
  // Placeholder data
  const data = {
    value: "$12.3B",
    breakdown: [
      { protocol: "Aave", percent: 40 },
      { protocol: "Uniswap", percent: 30 },
      { protocol: "Curve", percent: 20 },
      { protocol: "Lido", percent: 10 },
    ],
    yield: "4.2% APY",
    risk: "Moderate",
    anomaly: { label: "TVL Drop", description: "Curve TVL down 15% in 24h" },
    aiExplainer:
      "TVL is stable, but Curve experienced a notable outflow. Yields remain attractive on Aave and Lido.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "DeFiStatsWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="DeFi Stats"
      className="bg-gradient-to-br from-[#23234d]/90 via-[#23234d]/80 to-[#18192b]/90 text-white shadow-2xl ring-1 ring-white/10 ring-inset border border-blue-900/40 font-semibold"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-extrabold text-white drop-shadow-xl" tabIndex={0}>
          DeFi Stats
        </h2>
        <div className="flex gap-2">
          {config?.protocol && <Badge variant="info">{config.protocol}</Badge>}
          {config?.timeframe && (
            <Badge variant="primary">{config.timeframe}</Badge>
          )}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="DeFi Value & Breakdown"
      >
        <span className="text-xs text-blue-100">{config?.metric || "TVL"}</span>
        <span className="text-2xl font-bold">{data.value}</span>
        {/* Protocol breakdown mini-chart placeholder */}
        <div className="mt-2 flex w-full h-3 rounded overflow-hidden">
          {data.breakdown.map((b, i) => (
            <div
              key={b.protocol}
              style={{ width: `${b.percent}%` }}
              className={
                i === 0
                  ? "bg-indigo-400"
                  : i === 1
                    ? "bg-pink-400"
                    : i === 2
                      ? "bg-yellow-400"
                      : "bg-green-400"
              }
            />
          ))}
        </div>
        <div className="mt-2 text-xs text-blue-100 flex flex-wrap gap-2">
          {data.breakdown.map((b) => (
            <span key={b.protocol}>
              {b.protocol}: {b.percent}%
            </span>
          ))}
        </div>
      </Card>
      {config?.metric === "Yield" && (
        <Card
          variant="default"
          className="p-4 mb-2 bg-white/10 text-white shadow-inner"
          hover
          aria-label="Yield / APY"
        >
          <div className="font-semibold mb-2">Yield / APY</div>
          <span className="text-lg font-bold text-green-400">{data.yield}</span>
        </Card>
      )}
      <Card
        variant="default"
        className="p-4 mb-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="Risk Indicator"
      >
        <div className="font-semibold mb-2">Risk Indicator</div>
        <Badge variant="warning">{data.risk}</Badge>
      </Card>
      <Card
        variant="warning"
        className="p-4 mb-2 bg-yellow-900/30 text-yellow-100 shadow-inner"
        hover
        aria-label="Anomaly Detection"
      >
        <div className="font-semibold text-yellow-200 mb-1">
          Anomaly Detection
        </div>
        <div className="text-sm text-yellow-100">
          <span className="font-medium">{data.anomaly.label}:</span>{" "}
          {data.anomaly.description}
        </div>
      </Card>
      <Card
        variant="primary"
        className="p-4 mb-2 bg-blue-900/30 text-blue-100 shadow-inner"
        hover
        aria-label="AI Explainer"
      >
        <div className="font-semibold text-blue-200 mb-1">AI Explainer</div>
        <div className="text-sm text-blue-100">{data.aiExplainer}</div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2 bg-white/10 text-white shadow-inner"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-blue-100">
          Coming soon: Ask questions and get AI-powered answers about DeFi
          stats.
        </div>
      </Card>
    </Card>
  );
}
