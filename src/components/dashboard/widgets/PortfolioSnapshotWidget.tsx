import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPortfolioSnapshot } from "@/services/portfolio/getPortfolioSnapshot";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * PortfolioSnapshotWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface PortfolioSnapshotWidgetProps {
  config?: {
    walletAddress?: string;
    currency?: string;
  };
  analyticsEvent?: string;
}

export default function PortfolioSnapshotWidget({
  config,
  analyticsEvent,
}: PortfolioSnapshotWidgetProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio-snapshot", config?.walletAddress, config?.currency],
    queryFn: () =>
      getPortfolioSnapshot(config?.walletAddress, config?.currency),
    staleTime: 60 * 1000, // 1 minute
  });

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "PortfolioSnapshotWidget",
      });
    }
  }, [analyticsEvent]);

  if (isLoading) {
    return (
      <Card
        variant="glass"
        className="flex items-center justify-center h-32 animate-pulse"
        aria-label="Loading Portfolio"
      >
        <div className="w-8 h-8 border-4 border-green-300 border-t-transparent rounded-full animate-spin" />
      </Card>
    );
  }
  if (isError || !data) {
    return (
      <Card
        variant="error"
        className="text-red-600 p-4"
        aria-label="Failed to load portfolio data."
      >
        Failed to load portfolio data.
      </Card>
    );
  }

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Portfolio Snapshot"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold" tabIndex={0}>
            Portfolio Snapshot
          </h2>
          {config?.currency && (
            <Badge variant="success">{config.currency}</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card
            variant="default"
            className="p-4"
            hover
            aria-label="Total Balance"
          >
            <span className="text-xs text-gray-500">Total Balance</span>
            <span className="text-xl font-bold">
              {data.totalBalance.toLocaleString(undefined, {
                style: "currency",
                currency: config?.currency || "USD",
              })}
            </span>
          </Card>
          <Card variant="default" className="p-4" hover aria-label="P&L">
            <span className="text-xs text-gray-500">P&amp;L</span>
            <span
              className={`text-xl font-bold ${data.pnl >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {data.pnl >= 0 ? "+" : ""}
              {data.pnl.toLocaleString(undefined, {
                style: "currency",
                currency: config?.currency || "USD",
              })}
            </span>
          </Card>
        </div>
        <Card
          variant="default"
          className="p-4"
          hover
          aria-label="Asset Allocation"
        >
          <div className="font-semibold mb-2">Asset Allocation</div>
          <ul className="space-y-1">
            {data.allocation.map((a) => (
              <li key={a.symbol} className="flex justify-between">
                <span>{a.symbol}</span>
                <span className="font-mono">{a.percent.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
          {/* Mini-chart placeholder */}
          <div className="mt-2 h-2 w-full bg-gray-200 rounded flex overflow-hidden">
            {data.allocation.map((a, i) => (
              <div
                key={a.symbol}
                className={
                  i === 0
                    ? "bg-yellow-400"
                    : i === 1
                      ? "bg-blue-400"
                      : i === 2
                        ? "bg-pink-400"
                        : "bg-gray-400"
                }
                style={{ width: `${a.percent}%` }}
              />
            ))}
          </div>
        </Card>
        <Card
          variant="warning"
          className="p-4"
          hover
          aria-label="Anomaly Detection"
        >
          <div className="font-semibold text-yellow-700 mb-1">
            Anomaly Detection
          </div>
          <ul className="text-sm text-yellow-800 list-disc ml-4">
            <li>
              <span className="font-medium">Large Outflow:</span> Check for
              recent withdrawals or deposits
            </li>
          </ul>
        </Card>
        <Card variant="primary" className="p-4" hover aria-label="AI Summary">
          <div className="font-semibold text-blue-700 mb-1">AI Summary</div>
          <div className="text-sm text-blue-800">
            Your portfolio is well diversified. BTC is leading gains. Watch for
            volatility in SOL.
          </div>
        </Card>
        <Card
          variant="glass"
          className="p-4 mt-2"
          hover
          aria-label="Community Q&A"
        >
          <div className="font-semibold mb-1">Community Q&amp;A</div>
          <div className="text-xs text-gray-500">
            Coming soon: Ask questions and get AI-powered answers about your
            portfolio.
          </div>
        </Card>
      </div>
    </Card>
  );
}
