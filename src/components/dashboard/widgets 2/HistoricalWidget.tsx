import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * HistoricalWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface HistoricalWidgetProps {
  config?: {
    asset?: string;
    metric?: string;
    timeframe?: string;
    eventOverlays?: string[];
  };
  analyticsEvent?: string;
}

export default function HistoricalWidget({
  config,
  analyticsEvent,
}: HistoricalWidgetProps) {
  // Placeholder data
  const data = {
    chart: [
      { value: 40000, event: null },
      { value: 42000, event: "Upgrade" },
      { value: 41000, event: null },
      { value: 43000, event: "Major News" },
      { value: 44000, event: null },
    ],
    anomaly: {
      label: "Volume Spike",
      description: "Unusual volume on upgrade event",
    },
    aiExplainer:
      "The price spiked following a major upgrade, with volume and volatility increasing. This may indicate renewed market interest.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "HistoricalWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Historical"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" tabIndex={0}>
          Historical
        </h2>
        <div className="flex gap-2">
          {config?.asset && <Badge variant="secondary">{config.asset}</Badge>}
          {config?.timeframe && (
            <Badge variant="primary">{config.timeframe}</Badge>
          )}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="{config?.metric || 'Price'} Chart"
      >
        <div className="font-semibold mb-2">
          {config?.metric || "Price"} Chart
        </div>
        {/* Main chart placeholder */}
        <div className="flex items-end gap-2 h-32 w-full">
          {data.chart.map((point, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center"
              style={{ height: `${point.value / 1000}px` }}
            >
              <div
                className="w-4 bg-blue-400 rounded"
                style={{ height: `${point.value / 1000}px` }}
              />
              {point.event && (
                <span className="absolute -top-6 text-xs bg-yellow-200 text-yellow-800 px-1 rounded shadow">
                  {point.event}
                </span>
              )}
            </div>
          ))}
        </div>
        {/* Event overlays legend */}
        {config?.eventOverlays && config.eventOverlays.length > 0 && (
          <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
            <span>Event Overlays:</span>
            {config.eventOverlays.map((e) => (
              <Badge key={e} variant="warning">
                {e}
              </Badge>
            ))}
          </div>
        )}
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
          Coming soon: Ask questions and get AI-powered answers about historical
          trends.
        </div>
      </Card>
    </Card>
  );
}
