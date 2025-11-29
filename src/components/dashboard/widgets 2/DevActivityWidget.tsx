import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * DevActivityWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface DevActivityWidgetProps {
  config?: {
    platform?: string;
    metric?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function DevActivityWidget({
  config,
  analyticsEvent,
}: DevActivityWidgetProps) {
  // Placeholder data
  const data = {
    value: "128",
    trend: [100, 110, 120, 125, 128],
    contributors: 12,
    auditStatus: "Audited",
    anomaly: { label: "Spike", description: "PRs up 50% in 7d" },
    aiExplainer:
      "Increased PR activity and a healthy contributor base indicate strong project momentum.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "DevActivityWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Dev Activity"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" tabIndex={0}>
          Dev Activity
        </h2>
        <div className="flex gap-2">
          {config?.platform && <Badge variant="info">{config.platform}</Badge>}
          {config?.timeframe && (
            <Badge variant="primary">{config.timeframe}</Badge>
          )}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="{config?.metric || 'Commits'} Chart"
      >
        <span className="text-xs text-gray-500">
          {config?.metric || "Commits"}
        </span>
        <span className="text-xl font-bold">{data.value}</span>
        {/* Mini-chart placeholder */}
        <div className="w-full h-8 mt-2 flex items-end gap-1">
          {data.trend.map((v, i) => (
            <div
              key={i}
              className="bg-gray-400 rounded"
              style={{ height: `${v / 2}px`, width: "12%" }}
            />
          ))}
        </div>
      </Card>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="Contributors & Audit Status"
      >
        <div className="font-semibold mb-2">Contributors</div>
        <span className="text-lg font-bold text-blue-700">
          {data.contributors}
        </span>
        <div className="font-semibold mt-3 mb-1">Audit Status</div>
        <Badge variant="success">{data.auditStatus}</Badge>
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
          Coming soon: Ask questions and get AI-powered answers about dev
          activity.
        </div>
      </Card>
    </Card>
  );
}
