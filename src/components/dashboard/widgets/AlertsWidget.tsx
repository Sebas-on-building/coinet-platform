import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { motion } from "framer-motion";

/**
 * AlertsWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface AlertsWidgetProps {
  config?: {
    alertType?: string;
    asset?: string;
    condition?: string;
    threshold?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

const AlertsWidget: React.FC<AlertsWidgetProps> = ({
  config,
  analyticsEvent,
}) => {
  // Placeholder data
  const data = {
    activeAlerts: [
      {
        type: "Price",
        asset: "BTC",
        condition: "Above",
        threshold: "70000",
        status: "pending",
      },
      {
        type: "Volume",
        asset: "ETH",
        condition: "Spike",
        threshold: "1M",
        status: "triggered",
        triggeredAt: "2024-06-10 14:32",
      },
    ],
    recentTriggers: [
      {
        type: "Volume",
        asset: "ETH",
        condition: "Spike",
        threshold: "1M",
        triggeredAt: "2024-06-10 14:32",
      },
    ],
    anomaly: {
      label: "Spike",
      description: "ETH volume spiked above 1M in 1h",
    },
    aiSuggestion: "Consider adding an alert for BTC social sentiment spike.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, { label: "AlertsWidget" });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Alerts"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" tabIndex={0}>
          Alerts
        </h2>
        <div className="flex gap-2">
          {config?.alertType && (
            <Badge variant="danger">{config.alertType}</Badge>
          )}
          {config?.asset && <Badge variant="secondary">{config.asset}</Badge>}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="Active Alerts"
      >
        <div className="font-semibold mb-2">Active Alerts</div>
        <ul className="space-y-2">
          {data.activeAlerts.map((alert, i) => (
            <motion.li
              key={i}
              className="flex items-center gap-2 text-xs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="font-bold">{alert.type}</span>
              <span>{alert.asset}</span>
              <span>{alert.condition}</span>
              <span>{alert.threshold}</span>
              <span
                className={
                  alert.status === "triggered"
                    ? "text-green-600"
                    : "text-yellow-600"
                }
              >
                {alert.status}
              </span>
              {alert.triggeredAt && (
                <span className="text-gray-400">@ {alert.triggeredAt}</span>
              )}
            </motion.li>
          ))}
        </ul>
      </Card>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="Recent Triggers"
      >
        <div className="font-semibold mb-2">Recent Triggers</div>
        <ul className="space-y-2">
          {data.recentTriggers.map((trigger, i) => (
            <motion.li
              key={i}
              className="flex items-center gap-2 text-xs"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="font-bold">{trigger.type}</span>
              <span>{trigger.asset}</span>
              <span>{trigger.condition}</span>
              <span>{trigger.threshold}</span>
              <span className="text-green-600">triggered</span>
              <span className="text-gray-400">@ {trigger.triggeredAt}</span>
            </motion.li>
          ))}
        </ul>
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
        aria-label="AI Suggestions"
      >
        <div className="font-semibold text-blue-700 mb-1">AI Suggestions</div>
        <div className="text-sm text-blue-800">{data.aiSuggestion}</div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-gray-500">
          Coming soon: Ask questions and get AI-powered answers about alerts.
        </div>
      </Card>
    </Card>
  );
};

export default AlertsWidget;
