import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * OnChainMetricsWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface OnChainMetricsWidgetProps {
  config?: {
    blockchain?: string;
    metric?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function OnChainMetricsWidget({
  config,
  analyticsEvent,
}: OnChainMetricsWidgetProps) {
  // Placeholder data
  const data = {
    value: "1.2M",
    trend: [1.0, 1.1, 1.15, 1.18, 1.2],
    anomaly: {
      label: "Spike",
      description: "Unusual increase in transactions",
    },
    aiExplainer:
      "A spike in transactions may indicate increased network activity, possibly due to market events or protocol upgrades.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "OnChainMetricsWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="On-Chain Metrics"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" tabIndex={0}>
          On-Chain Metrics
        </h2>
        <div className="flex gap-2">
          {config?.blockchain && (
            <Badge variant="info">{config.blockchain}</Badge>
          )}
          {config?.timeframe && (
            <Badge variant="primary">{config.timeframe}</Badge>
          )}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="{config?.metric || 'Metric'} Chart"
      >
        <span className="text-xs text-gray-500">
          {config?.metric || "Metric"}
        </span>
        <span className="text-xl font-bold">{data.value}</span>
        {/* Mini-chart placeholder */}
        <div className="w-full h-8 mt-2 flex items-end gap-1">
          {data.trend.map((v, i) => (
            <div
              key={i}
              className="bg-blue-400 rounded"
              style={{ height: `${v * 20}px`, width: "12%" }}
            />
          ))}
        </div>
      </Card>
      <Card
        variant="warning"
        className="p-4 mb-2"
        hover
        aria-label="Anomaly Detection"
      >
        <div className="font-semibold text-yellow-700 mb-1">
          Anomaly Detection
        </div>
        <div className="text-sm text-yellow-800">
          <span className="font-medium">{data.anomaly.label}:</span>{" "}
          {data.anomaly.description}
        </div>
      </Card>
      <Card
        variant="primary"
        className="p-4 mb-2"
        hover
        aria-label="AI Explainer"
      >
        <div className="font-semibold text-blue-700 mb-1">AI Explainer</div>
        <div className="text-sm text-blue-800">{data.aiExplainer}</div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-gray-500">
          Coming soon: Ask questions and get AI-powered answers about on-chain
          activity.
        </div>
      </Card>
    </Card>
  );
}
