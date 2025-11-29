"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from "@heroicons/react/24/solid";

interface AnalyticsMetric {
  label: string;
  value: string;
  change?: number;
  info?: string;
  trend?: "up" | "down" | "neutral";
}

export function AdvancedAnalytics({ coinId }: { coinId: string }) {
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`)
      .then((res) => res.json())
      .then((data) => {
        setMetrics([
          {
            label: "Market Rank",
            value: data.market_cap_rank
              ? `#${data.market_cap_rank}`
              : "Not available",
          },
          {
            label: "Price Change (24h)",
            value: data.market_data?.price_change_percentage_24h
              ? `${data.market_data.price_change_percentage_24h.toFixed(2)}%`
              : "Not available",
            trend:
              data.market_data?.price_change_percentage_24h > 0
                ? "up"
                : data.market_data?.price_change_percentage_24h < 0
                  ? "down"
                  : "neutral",
          },
          {
            label: "Price Change (7d)",
            value: data.market_data?.price_change_percentage_7d
              ? `${data.market_data.price_change_percentage_7d.toFixed(2)}%`
              : "Not available",
            trend:
              data.market_data?.price_change_percentage_7d > 0
                ? "up"
                : data.market_data?.price_change_percentage_7d < 0
                  ? "down"
                  : "neutral",
          },
          {
            label: "Price Change (30d)",
            value: data.market_data?.price_change_percentage_30d
              ? `${data.market_data.price_change_percentage_30d.toFixed(2)}%`
              : "Not available",
            trend:
              data.market_data?.price_change_percentage_30d > 0
                ? "up"
                : data.market_data?.price_change_percentage_30d < 0
                  ? "down"
                  : "neutral",
          },
          {
            label: "All-Time High",
            value: data.market_data?.ath?.usd
              ? `$${data.market_data.ath.usd.toLocaleString()}`
              : "Not available",
            info: data.market_data?.ath_date?.usd
              ? `on ${new Date(data.market_data.ath_date.usd).toLocaleDateString()}`
              : undefined,
          },
          {
            label: "All-Time Low",
            value: data.market_data?.atl?.usd
              ? `$${data.market_data.atl.usd.toLocaleString()}`
              : "Not available",
            info: data.market_data?.atl_date?.usd
              ? `on ${new Date(data.market_data.atl_date.usd).toLocaleDateString()}`
              : undefined,
          },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch analytics data");
        setLoading(false);
      });
  }, [coinId]);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Real Analytics Metrics */}
      <div>
        <h3 className="text-lg font-medium mb-4">Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <Card
              key={metric.label}
              variant="glass"
              hover
              className="p-4 transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm text-gray-500">{metric.label}</span>
                  {metric.info && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {metric.info}
                    </p>
                  )}
                </div>
                {metric.trend && (
                  <Badge
                    variant={
                      metric.trend === "up"
                        ? "success"
                        : metric.trend === "down"
                          ? "danger"
                          : "default"
                    }
                    icon={
                      metric.trend === "up" ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : metric.trend === "down" ? (
                        <ArrowDownIcon className="h-4 w-4" />
                      ) : (
                        <MinusIcon className="h-4 w-4" />
                      )
                    }
                  >
                    {metric.value}
                  </Badge>
                )}
                {!metric.trend && (
                  <span className="text-lg font-semibold">{metric.value}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
      {/* Placeholder for advanced TA metrics */}
      <div>
        <h3 className="text-lg font-medium mb-4">Technical Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="glass" className="p-4 opacity-60">
            <span className="text-gray-400">
              RSI, MACD, and more coming soon!
            </span>
          </Card>
        </div>
      </div>
    </div>
  );
}
