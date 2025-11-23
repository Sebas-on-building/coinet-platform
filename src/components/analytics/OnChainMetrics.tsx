"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdvancedChart } from "@/components/charts/AdvancedChart";
import { analyticsService } from "@/services/analytics";
import {
  ArrowTrendingUpIcon,
  CircleStackIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  HashtagIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type {
  EnhancedOnChainMetrics,
  WhaleActivity,
  DeFiProtocolMetrics,
} from "@/types/analytics";

interface OnChainMetricsProps {
  symbol: string;
}

export function OnChainMetrics({ symbol }: OnChainMetricsProps) {
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d">("24h");
  const [metrics, setMetrics] = useState<EnhancedOnChainMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "whales" | "defi"
  >("overview");

  // Helper function to safely access nested properties
  const getSafeValue = (obj: any, path: string, defaultValue: any = 0) => {
    const value = path.split(".").reduce((prev, curr) => {
      return prev && prev[curr] !== undefined ? prev[curr] : undefined;
    }, obj);
    return value !== undefined ? value : defaultValue;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getOnChainMetrics(symbol);
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching on-chain metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const renderNetworkMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Active Addresses</p>
            <p className="text-2xl font-bold mt-1">
              {getSafeValue(
                metrics,
                "network_health.active_addresses",
                0,
              ).toLocaleString()}
            </p>
          </div>
          <UserGroupIcon className="h-8 w-8 text-blue-500" />
        </div>
        <div className="mt-2">
          <div className="text-sm text-gray-400">
            New: +
            {getSafeValue(
              metrics,
              "network_health.new_addresses",
              0,
            ).toLocaleString()}
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Transaction Volume</p>
            <p className="text-2xl font-bold mt-1">
              $
              {getSafeValue(
                metrics,
                "network_health.transaction_volume",
                0,
              ).toLocaleString()}
            </p>
          </div>
          <CircleStackIcon className="h-8 w-8 text-green-500" />
        </div>
        <div className="mt-2">
          <div className="text-sm text-gray-400">
            Avg: $
            {getSafeValue(
              metrics,
              "network_health.average_transaction_value",
              0,
            ).toLocaleString()}
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Network Fee</p>
            <p className="text-2xl font-bold mt-1">
              $
              {getSafeValue(
                metrics,
                "network_health.fee_metrics.average",
                0,
              ).toFixed(2)}
            </p>
          </div>
          <BanknotesIcon className="h-8 w-8 text-yellow-500" />
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Fast:</span>
            <span>
              $
              {getSafeValue(
                metrics,
                "network_health.fee_metrics.gas_price_prediction.fast",
                0,
              ).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-400">
            <span>Standard:</span>
            <span>
              $
              {getSafeValue(
                metrics,
                "network_health.fee_metrics.gas_price_prediction.standard",
                0,
              ).toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">Network Load</p>
            <p className="text-2xl font-bold mt-1">
              {(
                getSafeValue(metrics, "network_health.network_utilization", 0) *
                100
              ).toFixed(1)}
              %
            </p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-purple-500" />
        </div>
        <div className="mt-2">
          <Badge
            variant={
              getSafeValue(metrics, "network_health.network_utilization", 0) >
              0.8
                ? "danger"
                : getSafeValue(
                      metrics,
                      "network_health.network_utilization",
                      0,
                    ) > 0.5
                  ? "warning"
                  : "success"
            }
          >
            {getSafeValue(metrics, "network_health.network_utilization", 0) >
            0.8
              ? "High Load"
              : getSafeValue(metrics, "network_health.network_utilization", 0) >
                  0.5
                ? "Medium Load"
                : "Low Load"}
          </Badge>
        </div>
      </Card>
    </div>
  );

  const renderWhaleActivity = () => (
    <div className="space-y-4">
      {/* Whale Concentration Metrics */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Whale Concentration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-400">Gini Coefficient</p>
            <p className="text-2xl font-bold mt-1">
              {getSafeValue(
                metrics,
                "whale_tracking.concentration_metrics.gini_coefficient",
                0,
              ).toFixed(3)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Top Holders %</p>
            <p className="text-2xl font-bold mt-1">
              {getSafeValue(
                metrics,
                "whale_tracking.concentration_metrics.top_holders_percentage",
                0,
              ).toFixed(1)}
              %
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Price Impact Probability</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold mt-1">
                {(
                  getSafeValue(
                    metrics,
                    "whale_tracking.predictive_metrics.price_impact_probability",
                    0,
                  ) * 100
                ).toFixed(1)}
                %
              </p>
              <Badge
                variant={
                  getSafeValue(
                    metrics,
                    "whale_tracking.predictive_metrics.expected_movement",
                  ) === "up"
                    ? "success"
                    : getSafeValue(
                          metrics,
                          "whale_tracking.predictive_metrics.expected_movement",
                        ) === "down"
                      ? "danger"
                      : "warning"
                }
              >
                {(
                  getSafeValue(
                    metrics,
                    "whale_tracking.predictive_metrics.expected_movement",
                    "neutral",
                  ) as string
                ).toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Whale Movements */}
      <div className="space-y-4">
        {(
          getSafeValue(
            metrics,
            "whale_tracking.movements",
            [],
          ) as WhaleActivity[]
        ).map((movement: WhaleActivity, index: number) => (
          <Card key={index} variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    movement.direction === "in"
                      ? "bg-green-500/10"
                      : "bg-red-500/10"
                  }`}
                >
                  <ArrowTrendingUpIcon
                    className={`h-6 w-6 ${
                      movement.direction === "in"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  />
                </div>
                <div>
                  <p className="font-medium">
                    {movement.address.slice(0, 8)}...
                    {movement.address.slice(-6)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Date(movement.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {movement.amount.toLocaleString()} {symbol}
                </p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <Badge variant="secondary">
                    Accuracy:{" "}
                    {(movement.historical_behavior.accuracy * 100).toFixed(0)}%
                  </Badge>
                  <Badge
                    variant={
                      movement.historical_behavior.profit_loss >= 0
                        ? "success"
                        : "danger"
                    }
                  >
                    {movement.historical_behavior.profit_loss >= 0 ? "+" : ""}
                    {movement.historical_behavior.profit_loss.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderDeFiMetrics = () => (
    <div className="space-y-6">
      {/* DeFi Overview */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">DeFi Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-400">Total Value Locked</p>
            <p className="text-2xl font-bold mt-1">
              $
              {getSafeValue(
                metrics,
                "defi_metrics.total_value_locked",
                0,
              ).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">24h Volume</p>
            <p className="text-2xl font-bold mt-1">
              $
              {getSafeValue(
                metrics,
                "defi_metrics.total_volume_24h",
                0,
              ).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Unique Users</p>
            <p className="text-2xl font-bold mt-1">
              {getSafeValue(
                metrics,
                "defi_metrics.unique_users_24h",
                0,
              ).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Protocol Breakdown */}
      <div className="space-y-4">
        {(
          getSafeValue(
            metrics,
            "defi_metrics.protocol_breakdown",
            [],
          ) as DeFiProtocolMetrics[]
        ).map((protocol: DeFiProtocolMetrics, index: number) => (
          <Card key={protocol.name} variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{protocol.name}</p>
                    <Badge variant="secondary">{protocol.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        protocol.security.audit_status === "audited"
                          ? "success"
                          : protocol.security.audit_status === "in_progress"
                            ? "warning"
                            : "danger"
                      }
                    >
                      {protocol.security.audit_status}
                    </Badge>
                    {protocol.security.insurance_coverage && (
                      <Badge variant="secondary">Insured</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  TVL: ${protocol.tvl.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <Badge variant="secondary">
                    APY: {protocol.apy.toFixed(2)}%
                  </Badge>
                  <Badge
                    variant={
                      protocol.risk_score < 3
                        ? "success"
                        : protocol.risk_score < 7
                          ? "warning"
                          : "danger"
                    }
                  >
                    Risk: {protocol.risk_score}/10
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-400">
              <div>
                <p>Users</p>
                <p className="font-medium text-white">
                  {protocol.metrics.unique_users.toLocaleString()}
                </p>
              </div>
              <div>
                <p>Transactions</p>
                <p className="font-medium text-white">
                  {protocol.metrics.transactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p>Revenue</p>
                <p className="font-medium text-white">
                  ${protocol.metrics.revenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p>Growth</p>
                <p className="font-medium text-white">
                  {protocol.metrics.growth_rate >= 0 ? "+" : ""}
                  {protocol.metrics.growth_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-gray-800">
        {[
          { id: "overview", label: "Overview", icon: ChartBarIcon },
          { id: "whales", label: "Whale Activity", icon: CircleStackIcon },
          { id: "defi", label: "DeFi Metrics", icon: BanknotesIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              selectedTab === tab.id
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {selectedTab === "overview" && renderNetworkMetrics()}
          {selectedTab === "whales" && renderWhaleActivity()}
          {selectedTab === "defi" && renderDeFiMetrics()}
        </>
      )}
    </div>
  );
}
