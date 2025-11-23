import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import React, { useEffect } from "react";

/**
 * PortfolioWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
export function PortfolioWidget({
  analyticsEvent,
}: {
  analyticsEvent?: string;
}) {
  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "PortfolioWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Portfolio Overview"
    >
      <h2 className="text-xl font-bold mb-2" tabIndex={0}>
        Portfolio Value <Badge variant="primary">Live</Badge>
      </h2>
      <Card
        variant="default"
        className="mb-2 p-2"
        hover
        aria-label="Portfolio Value Chart"
      >
        <PortfolioValueChart />
      </Card>
      <Card
        variant="default"
        className="mb-2 p-2"
        hover
        aria-label="Portfolio Allocation Pie"
      >
        <PortfolioAllocationPie />
      </Card>
      <Card
        variant="default"
        className="mb-2 p-2"
        hover
        aria-label="Performance Table"
      >
        <PortfolioPerformanceTable />
      </Card>
      <Card
        variant="warning"
        className="mb-2 p-2"
        hover
        aria-label="Portfolio Alerts"
      >
        <PortfolioAlerts />
      </Card>
      <Card
        variant="primary"
        className="mb-2 p-2"
        hover
        aria-label="AI Insights"
      >
        <PortfolioAIInsights />
      </Card>
      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          sound
          soundType="success"
          analyticsEvent="portfolio_export"
        >
          Export
        </Button>
        <Button
          variant="secondary"
          sound
          soundType="link"
          analyticsEvent="portfolio_share"
        >
          Share
        </Button>
      </div>
    </Card>
  );
}

function PortfolioValueChart() {
  return (
    <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
      [Value Chart]
    </div>
  );
}
function PortfolioAllocationPie() {
  return (
    <div className="h-20 bg-gradient-to-r from-green-400 to-blue-400 rounded-xl flex items-center justify-center text-white font-bold">
      [Allocation Pie]
    </div>
  );
}
function PortfolioPerformanceTable() {
  return (
    <div className="bg-white/10 rounded-xl p-2 text-white">
      [Performance Table]
    </div>
  );
}
function PortfolioAlerts() {
  return (
    <div className="bg-yellow-100 text-yellow-900 rounded-xl p-2">
      No active alerts.
    </div>
  );
}
function PortfolioAIInsights() {
  return (
    <div className="bg-accent text-white rounded-xl p-2">
      AI: Your portfolio is well diversified.
    </div>
  );
}
