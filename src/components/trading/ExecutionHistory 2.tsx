"use client";

import React, { useState, useEffect } from "react";
import {
  Order,
  ExecutionReport,
  TradingMetrics,
  OrderSide,
} from "../../types/trading";
import { tradingService } from "../../services/tradingService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdvancedChart } from "@/components/charts/AdvancedChart";
import { api } from "@/services/api";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";

// Extend ExecutionReport with additional properties we need
interface ExtendedExecutionReport extends ExecutionReport {
  type?: "market" | "limit" | "stop";
  priceImpact?: number;
}

interface ExecutionHistoryProps {
  symbol: string;
}

// API response type conversion functions
interface TradeData {
  id: string;
  pair: string;
  side: string;
  price: number;
  amount: number;
  fee: number;
  timestamp: string | number;
  type?: string;
  route?: {
    priceImpact?: number;
  };
}

interface MetricsData {
  totalTrades: number;
  successRate?: number;
  profitLoss: number;
}

// Convert API Trade data to ExecutionReport format
const convertTradeToExecutionReport = (
  trade: TradeData,
): ExtendedExecutionReport => ({
  orderId: trade.id,
  tradeId: trade.id,
  symbol: trade.pair.split("/")[0],
  side: trade.side.toUpperCase() as OrderSide,
  price: trade.price,
  quantity: trade.amount,
  fee: trade.fee,
  feeAsset: "USDT",
  timestamp:
    typeof trade.timestamp === "string"
      ? new Date(trade.timestamp).getTime()
      : trade.timestamp,
  type: trade.type as any,
  priceImpact: trade.route?.priceImpact || 0,
});

// Convert metrics data from API to component format
const convertMetricsData = (metricsData: MetricsData): TradingMetrics => ({
  totalTrades: metricsData.totalTrades,
  winRate: metricsData.successRate || 0,
  profitLoss: metricsData.profitLoss,
  averageReturnPerTrade:
    metricsData.profitLoss / Math.max(metricsData.totalTrades, 1),
  sharpeRatio: 1.2, // Default value if not provided by API
  maxDrawdown: 15, // Default value if not provided by API
});

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  symbol,
}) => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [executionReports, setExecutionReports] = useState<
    ExtendedExecutionReport[]
  >([]);
  const [metrics, setMetrics] = useState<TradingMetrics>({
    totalTrades: 0,
    winRate: 0,
    profitLoss: 0,
    averageReturnPerTrade: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  });
  const [timeframe, setTimeframe] = useState<"1d" | "7d" | "30d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Update active orders
    const updateActiveOrders = () => {
      const orders = tradingService.getActiveOrders();
      setActiveOrders(orders.filter((order) => order.symbol === symbol));
    };

    // Initial update
    updateActiveOrders();

    // Set up polling interval
    const interval = setInterval(updateActiveOrders, 1000);
    return () => clearInterval(interval);
  }, [symbol]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tradesData, metricsData] = await Promise.all([
          api.getTradeHistory(timeframe),
          api.getTradeMetrics(timeframe),
        ]);

        // Transform data using our conversion functions
        const executionReports = (tradesData as TradeData[]).map(
          convertTradeToExecutionReport,
        );
        const formattedMetrics = convertMetricsData(metricsData as MetricsData);

        setExecutionReports(executionReports);
        setMetrics(formattedMetrics);
      } catch (error) {
        console.error("Failed to fetch trade data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeframe]);

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  const chartData = executionReports.map((report) => ({
    time: new Date(report.timestamp).toISOString(),
    value: report.price,
    volume: report.quantity,
    additional: {
      sideValue: report.side === "BUY" ? 1 : 0,
      typeValue: report.type === "market" ? 0 : report.type === "limit" ? 1 : 2,
      impact: report.priceImpact,
    },
  }));

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total Trades
            </div>
            <div className="text-2xl font-semibold">{metrics.totalTrades}</div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Win Rate
            </div>
            <div className="text-2xl font-semibold">
              {metrics.winRate.toFixed(2)}%
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">P&L</div>
            <div
              className={`text-2xl font-semibold ${
                metrics.profitLoss >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {metrics.profitLoss.toFixed(2)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Avg. Return/Trade
            </div>
            <div
              className={`text-2xl font-semibold ${
                metrics.averageReturnPerTrade >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {metrics.averageReturnPerTrade.toFixed(2)}%
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Sharpe Ratio
            </div>
            <div className="text-2xl font-semibold">
              {metrics.sharpeRatio.toFixed(2)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Max Drawdown
            </div>
            <div className="text-2xl font-semibold text-red-500">
              {metrics.maxDrawdown.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Active Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-sm text-gray-500 dark:text-gray-400">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Filled</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {activeOrders.map((order) => (
                <tr key={order.id} className="text-sm">
                  <td className="py-2">{formatDate(order.timestamp)}</td>
                  <td
                    className={`py-2 ${
                      order.side === "BUY" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {order.side} {order.type}
                  </td>
                  <td className="text-right py-2">
                    {formatPrice(order.price)}
                  </td>
                  <td className="text-right py-2">
                    {formatPrice(order.quantity)}
                  </td>
                  <td className="text-right py-2">
                    {((order.filledQuantity / order.quantity) * 100).toFixed(1)}
                    %
                  </td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.status === "NEW"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : order.status === "PARTIALLY_FILLED"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeOrders.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No active orders
            </div>
          )}
        </div>
      </div>

      {/* Execution Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Executions</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-sm text-gray-500 dark:text-gray-400">
                <th className="text-left py-2">Time</th>
                <th className="text-left py-2">Trade ID</th>
                <th className="text-left py-2">Side</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Amount</th>
                <th className="text-right py-2">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {executionReports.map((report) => (
                <tr key={report.tradeId} className="text-sm">
                  <td className="py-2">{formatDate(report.timestamp)}</td>
                  <td className="py-2">{report.tradeId}</td>
                  <td
                    className={`py-2 ${
                      report.side === "BUY" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {report.side}
                  </td>
                  <td className="text-right py-2">
                    {formatPrice(report.price)}
                  </td>
                  <td className="text-right py-2">
                    {formatPrice(report.quantity)}
                  </td>
                  <td className="text-right py-2">
                    {formatPrice(report.fee)} {report.feeAsset}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {executionReports.length === 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No recent executions
            </div>
          )}
        </div>
      </div>

      {/* Trade History Chart */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium">Execution History</h3>
          <div className="flex gap-2">
            {["1d", "7d", "30d"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf as any)}
                className={`px-3 py-1 rounded-md text-sm ${
                  timeframe === tf
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-gray-800/30 text-gray-400"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <AdvancedChart
          data={chartData}
          height={400}
          overlays={[
            {
              name: "Volume",
              type: "Histogram",
              data: chartData,
              color: "#3B82F6",
            },
          ]}
        />
      </Card>
    </div>
  );
};
