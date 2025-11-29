import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdvancedChart } from "@/components/charts/AdvancedChart";
import { analyticsService } from "@/services/analytics";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
} from "@heroicons/react/24/solid";
import type {
  EnhancedTechnicalIndicator,
  EnhancedMarketMetric,
  MarketRegime,
} from "@/types/analytics";

interface AdvancedAnalyticsProps {
  symbol: string;
  timeframe?: string;
}

export function AdvancedAnalytics({
  symbol,
  timeframe = "4h",
}: AdvancedAnalyticsProps) {
  const [technicalIndicators, setTechnicalIndicators] = useState<
    EnhancedTechnicalIndicator[]
  >([]);
  const [marketMetrics, setMarketMetrics] = useState<EnhancedMarketMetric[]>(
    [],
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [indicators, metrics] = await Promise.all([
          analyticsService.getTechnicalIndicators(symbol),
          analyticsService.getMarketMetrics(symbol),
        ]);
        setTechnicalIndicators(indicators);
        setMarketMetrics(metrics);
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const getSignalIcon = (signal: "buy" | "sell" | "neutral") => {
    switch (signal) {
      case "buy":
        return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
      case "sell":
        return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getSignalVariant = (signal: "buy" | "sell" | "neutral") => {
    switch (signal) {
      case "buy":
        return "success";
      case "sell":
        return "danger";
      default:
        return "warning";
    }
  };

  const getMarketRegimeColor = (regime: MarketRegime["current"]) => {
    switch (regime) {
      case "trending":
        return "text-blue-500";
      case "ranging":
        return "text-yellow-500";
      case "volatile":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const renderTechnicalAnalysis = () => (
    <div>
      <h3 className="text-lg font-medium mb-4">Technical Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {technicalIndicators.map((indicator) => (
          <Card
            key={indicator.name}
            variant="glass"
            hover
            className="p-4 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-sm text-gray-500">{indicator.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={getSignalVariant(indicator.current.signal)}
                    icon={getSignalIcon(indicator.current.signal)}
                  >
                    {indicator.current.signal.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">
                    {(indicator.current.confidence * 100).toFixed(0)}%
                    Confidence
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-semibold">
                  {indicator.current.value.toFixed(2)}
                </span>
                <div className="text-sm text-gray-400">
                  Win Rate:{" "}
                  {(indicator.backtest_results.win_rate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>
                  Profit Factor:{" "}
                  {indicator.backtest_results.profit_factor.toFixed(2)}
                </div>
                <div>
                  Max Drawdown:{" "}
                  {(indicator.backtest_results.max_drawdown * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMarketRegimeAnalysis = () => (
    <div className="mt-8">
      <h3 className="text-lg font-medium mb-4">Market Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {marketMetrics.map((metric) => (
          <Card
            key={metric.label}
            variant="glass"
            hover
            className="p-4 transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm text-gray-500">{metric.label}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-semibold">{metric.value}</span>
                  <Badge
                    variant={metric.change >= 0 ? "success" : "danger"}
                    icon={
                      metric.change >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4" />
                      )
                    }
                  >
                    {metric.change >= 0 ? "+" : ""}
                    {metric.change}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {/* Volatility Analysis */}
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Volatility</span>
                  <Badge
                    variant={
                      metric.historical_volatility.volatility_regime === "high"
                        ? "danger"
                        : "success"
                    }
                  >
                    {metric.historical_volatility.volatility_regime.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Daily</span>
                    <div>
                      {(metric.historical_volatility.daily * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Weekly</span>
                    <div>
                      {(metric.historical_volatility.weekly * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Monthly</span>
                    <div>
                      {(metric.historical_volatility.monthly * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Market Regime */}
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Market Regime</span>
                  <span
                    className={`font-medium ${getMarketRegimeColor(metric.market_regime.current)}`}
                  >
                    {metric.market_regime.current.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Confidence</span>
                    <span>
                      {(metric.market_regime.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Duration</span>
                    <span>{metric.market_regime.duration} days</span>
                  </div>
                </div>
              </div>

              {/* Liquidity Analysis */}
              <div className="bg-gray-800/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Liquidity</span>
                  <Badge
                    variant={
                      metric.liquidity_analysis.orderbook_imbalance > 0.2
                        ? "warning"
                        : "success"
                    }
                  >
                    {metric.liquidity_analysis.orderbook_imbalance > 0.2
                      ? "IMBALANCED"
                      : "BALANCED"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Depth ($)</span>
                    <div>
                      {metric.liquidity_analysis.depth.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Spread</span>
                    <div>
                      {(metric.liquidity_analysis.spread * 100).toFixed(3)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Advanced Analytics</h2>
        <div className="flex gap-2">
          {["15m", "1h", "4h", "1d"].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                selectedTimeframe === tf
                  ? "bg-blue-500 text-white"
                  : "bg-gray-800/30 text-gray-400 hover:bg-gray-800/50"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          {renderTechnicalAnalysis()}
          {renderMarketRegimeAnalysis()}
        </>
      )}
    </div>
  );
}
