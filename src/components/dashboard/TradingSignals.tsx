// @ts-nocheck
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  SignalIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/solid";
import { SignalAnalysis } from "./SignalAnalysis";

interface TradingSignal {
  asset: string;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  timeframe: string;
  price_target: number;
  stop_loss: number;
  supporting_metrics: {
    technical: number;
    sentiment: number;
    onchain: number;
    fundamental: number;
  };
  reasoning: string[];
  timestamp: string;
}

type TimeframeFilter = "1h" | "4h" | "1d" | "all";
type DirectionFilter = "buy" | "sell" | "all";
type ConfidenceFilter = "high" | "medium" | "low" | "all";

export function TradingSignals() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(
    null,
  );

  // Filters
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("all");
  const [direction, setDirection] = useState<DirectionFilter>("all");
  const [confidence, setConfidence] = useState<ConfidenceFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const watchedAssets = [
    "BTC",
    "ETH",
    "SOL",
    "BNB",
    "XRP",
    "ADA",
    "DOT",
    "DOGE",
    "MATIC",
    "LINK",
  ];

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        setLoading(true);
        const data = await api.getAISignals(watchedAssets);
        setSignals(data);
        setError(null);
      } catch (err) {
        setError("Failed to fetch trading signals");
        console.error("Error fetching signals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    const intervalId = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const getSignalIcon = (direction: TradingSignal["direction"]) => {
    switch (direction) {
      case "buy":
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />;
      case "sell":
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ChartBarIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceLevel = (confidence: number): ConfidenceFilter => {
    if (confidence >= 80) return "high";
    if (confidence >= 60) return "medium";
    return "low";
  };

  const filteredSignals = signals.filter((signal) => {
    if (timeframe !== "all" && signal.timeframe !== timeframe) return false;
    if (direction !== "all" && signal.direction !== direction) return false;
    if (
      confidence !== "all" &&
      getConfidenceLevel(signal.confidence) !== confidence
    )
      return false;
    if (
      searchQuery &&
      !signal.asset.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading && signals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold">AI Trading Signals</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" icon={<SignalIcon className="h-4 w-4" />}>
            Live Updates
          </Badge>
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
          )}
        </div>
      </div>

      {/* Filters */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search assets..."
              className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as TimeframeFilter)}
            >
              <option value="all">All Timeframes</option>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={direction}
              onChange={(e) => setDirection(e.target.value as DirectionFilter)}
            >
              <option value="all">All Signals</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <select
              className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2"
              value={confidence}
              onChange={(e) =>
                setConfidence(e.target.value as ConfidenceFilter)
              }
            >
              <option value="all">All Confidence</option>
              <option value="high">High (80%+)</option>
              <option value="medium">Medium (60-79%)</option>
              <option value="low">Low (&lt;60%)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Signals Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSignals.map((signal, index) => (
          <Card
            key={index}
            variant="glass"
            hover
            className="p-6 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedSignal(signal)}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {getSignalIcon(signal.direction)}
                  <div>
                    <h3 className="text-lg font-semibold">{signal.asset}</h3>
                    <p className="text-sm text-gray-500">
                      {signal.timeframe} Timeframe
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Target</p>
                    <p className="font-semibold">
                      ${signal.price_target.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stop Loss</p>
                    <p className="font-semibold">
                      ${signal.stop_loss.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Supporting Metrics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(signal.supporting_metrics).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between bg-gray-50/5 rounded-lg p-2"
                        >
                          <span className="text-sm capitalize">{key}</span>
                          <Badge
                            variant={
                              value >= 80
                                ? "success"
                                : value >= 60
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {value}%
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">AI Reasoning</p>
                  <ul className="space-y-1">
                    {signal.reasoning.map((reason, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-400 flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">
                      {signal.confidence}%
                    </span>
                  </div>
                  <svg className="transform -rotate-90 w-20 h-20">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-gray-200/10"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - signal.confidence / 100)}`}
                      className={`${getConfidenceColor(signal.confidence)} transition-all duration-500`}
                    />
                  </svg>
                </div>
                <span className="text-sm text-gray-500 mt-2">
                  Confidence Score
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed Analysis Modal */}
      {selectedSignal && (
        <SignalAnalysis
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  );
}
