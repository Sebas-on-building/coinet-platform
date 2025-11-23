import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
} from "@heroicons/react/24/solid";
import type { TradingSignal, AIAnalysisResult } from "@/services/api";
import { Dialog } from "@/components/ui/dialog";

interface MetricCard {
  title: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  description: string;
}

interface Props {
  signal: TradingSignal;
  onClose: () => void;
  open: boolean;
}

export function SignalAnalysis({ signal, onClose, open }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "technical" | "onchain" | "sentiment"
  >("overview");

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const data = await api.getDetailedAIAnalysis(signal.asset);
        setAnalysis(data);
      } catch (error) {
        console.error("Error fetching analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [signal.asset]);

  const renderMetricCard = ({
    title,
    value,
    change,
    icon,
    description,
  }: MetricCard) => (
    <Card variant="glass" className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {icon}
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          </div>
          <p className="text-2xl font-bold">{value.toFixed(2)}</p>
          {change !== undefined && (
            <Badge
              variant={change >= 0 ? "success" : "danger"}
              icon={
                change >= 0 ? (
                  <ArrowTrendingUpIcon className="h-3 w-3" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3 w-3" />
                )
              }
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(2)}%
            </Badge>
          )}
        </div>
        <div className="text-xs text-gray-400 max-w-[150px] text-right">
          {description}
        </div>
      </div>
    </Card>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analysis &&
          [
            {
              title: "Price Momentum",
              value: analysis.metrics.price_momentum,
              icon: <ChartBarIcon className="h-5 w-5 text-blue-500" />,
              description:
                "Overall price momentum based on multiple timeframes",
            },
            {
              title: "Volume Analysis",
              value: analysis.metrics.volume_analysis,
              icon: (
                <DocumentChartBarIcon className="h-5 w-5 text-purple-500" />
              ),
              description: "Volume-based market strength indicator",
            },
            {
              title: "Market Correlation",
              value: analysis.metrics.market_correlation,
              icon: <ChartPieIcon className="h-5 w-5 text-green-500" />,
              description: "Correlation with major market indices",
            },
            {
              title: "Whale Activity",
              value: analysis.metrics.whale_activity,
              icon: <CurrencyDollarIcon className="h-5 w-5 text-yellow-500" />,
              description: "Large transaction volume and holder concentration",
            },
          ].map((metric, index) => renderMetricCard(metric))}
      </div>

      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Signal Performance History</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Success Rate (30d)</span>
            <div className="w-48 h-2 bg-gray-200/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: "75%" }}
              />
            </div>
            <span className="text-sm font-medium">75%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Avg. Return per Trade</span>
            <div className="w-48 h-2 bg-gray-200/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: "62%" }}
              />
            </div>
            <span className="text-sm font-medium">3.2%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Max Drawdown</span>
            <div className="w-48 h-2 bg-gray-200/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: "28%" }}
              />
            </div>
            <span className="text-sm font-medium">-5.8%</span>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTechnicalTab = () => (
    <div className="space-y-6">
      {analysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "RSI",
                value: analysis.metrics.technical_indicators.rsi,
                icon: <ChartBarIcon className="h-5 w-5 text-blue-500" />,
                description: "Relative Strength Index (14 periods)",
              },
              {
                title: "MACD",
                value: analysis.metrics.technical_indicators.macd,
                icon: <ChartBarIcon className="h-5 w-5 text-purple-500" />,
                description: "Moving Average Convergence Divergence",
              },
              {
                title: "Bollinger",
                value: analysis.metrics.technical_indicators.bollinger,
                icon: <ChartBarIcon className="h-5 w-5 text-green-500" />,
                description: "Bollinger Bands Position",
              },
            ].map((metric, index) => renderMetricCard(metric))}
          </div>

          <Card variant="glass" className="p-6">
            <h3 className="text-lg font-medium mb-4">
              Support & Resistance Levels
            </h3>
            <div className="space-y-3">
              {[
                {
                  level: "Strong Resistance",
                  price: signal.price_target * 1.1,
                },
                { level: "Weak Resistance", price: signal.price_target * 1.05 },
                {
                  level: "Current Price",
                  price: signal.price_target,
                  current: true,
                },
                { level: "Weak Support", price: signal.stop_loss * 1.05 },
                { level: "Strong Support", price: signal.stop_loss },
              ].map((level) => (
                <div
                  key={level.level}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    level.current
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : ""
                  }`}
                >
                  <span className="text-sm text-gray-500">{level.level}</span>
                  <span className="font-medium">
                    ${level.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${signal.asset} Signal Analysis`}
      size="xl"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">
              {signal.asset} Signal Analysis
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            Generated at {new Date(signal.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        {(["overview", "technical", "onchain", "sentiment"] as const).map(
          (tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === tab ? "bg-[#00ffa3] text-[#23234d]" : "bg-[#23234d] text-blue-200"} hover:bg-[#0057ff] hover:text-white`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ),
        )}
      </div>
      <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === "overview" && renderOverviewTab()}
            {activeTab === "technical" && renderTechnicalTab()}
            {/* Add more tabs as needed */}
          </div>
        )}
      </div>
    </Dialog>
  );
}
