"use client";

import React, { useState, useEffect } from "react";
import { WebSocketService, WebSocketMessage } from "@/services/websocket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface SentimentData {
  chain: string;
  timestamp: number;
  sentimentScore: number;
  bullishSignals: {
    whaleAccumulation: boolean;
    exchangeOutflows: number;
    stakingIncrease: boolean;
    decreasedSellingPressure: boolean;
  };
  bearishSignals: {
    whaleDistribution: boolean;
    exchangeInflows: number;
    stakingDecrease: boolean;
    increasedSellingPressure: boolean;
  };
  topTokensActivity: {
    token: string;
    netFlow: number;
  }[];
}

interface SentimentHistoryItem {
  timestamp: number;
  score: number;
  bullishCount: number;
  bearishCount: number;
}

// Type definitions for recharts components
interface PieLabelProps {
  name: string;
  percent: number;
}

interface TooltipPayload {
  value: number;
  name: string;
}

interface TokenActivity {
  token: string;
  netFlow: number;
}

interface FlowDataPoint {
  time: string;
  value: number;
  positiveValue?: number;
  negativeValue?: number;
}

interface MarketSentimentAnalyzerProps {
  defaultChain?: string;
  historyLength?: number;
}

export function MarketSentimentAnalyzer({
  defaultChain = "ethereum",
  historyLength = 20,
}: MarketSentimentAnalyzerProps) {
  const [wsInstance] = useState(() => new WebSocketService());
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [latestSentiment, setLatestSentiment] = useState<SentimentData | null>(
    null,
  );
  const [sentimentHistory, setSentimentHistory] = useState<
    SentimentHistoryItem[]
  >([]);
  const [flowHistory, setFlowHistory] = useState<{
    [token: string]: { timestamp: number; value: number }[];
  }>({ ETH: [], USDC: [], USDT: [] });

  useEffect(() => {
    // Reset data when chain changes
    setLatestSentiment(null);
    setSentimentHistory([]);
    setFlowHistory({ ETH: [], USDC: [], USDT: [] });

    // Subscribe to market sentiment data
    const sentimentHandler = (message: WebSocketMessage) => {
      if (
        message.type === "marketSentiment" &&
        message.data.chain === selectedChain
      ) {
        // Update latest sentiment
        setLatestSentiment(message.data);

        // Update sentiment history
        setSentimentHistory((prev) => {
          const bullishCount = Object.values(
            message.data.bullishSignals,
          ).filter(Boolean).length;
          const bearishCount = Object.values(
            message.data.bearishSignals,
          ).filter(Boolean).length;

          const newItem = {
            timestamp: message.data.timestamp,
            score: message.data.sentimentScore,
            bullishCount,
            bearishCount,
          };

          const updated = [newItem, ...prev.slice(0, historyLength - 1)];
          return updated;
        });

        // Update token flow history
        setFlowHistory((prev) => {
          const newFlowHistory = { ...prev };

          message.data.topTokensActivity.forEach(
            (tokenActivity: TokenActivity) => {
              const token = tokenActivity.token;
              if (!newFlowHistory[token]) {
                newFlowHistory[token] = [];
              }

              newFlowHistory[token] = [
                {
                  timestamp: message.data.timestamp,
                  value: tokenActivity.netFlow,
                },
                ...newFlowHistory[token].slice(0, historyLength - 1),
              ];
            },
          );

          return newFlowHistory;
        });
      }
    };

    // Register handlers
    wsInstance.blockchain.on("marketSentiment", sentimentHandler);

    // Subscribe to market sentiment data
    wsInstance.blockchain.subscribeToMarketSentiment(selectedChain);

    // Cleanup
    return () => {
      wsInstance.blockchain.off("marketSentiment", sentimentHandler);
      wsInstance.blockchain.unsubscribe(selectedChain, "marketSentiment");
    };
  }, [selectedChain, historyLength, wsInstance]);

  // Format time for charts and displays
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format time for relative display
  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Get sentiment level
  const getSentimentLevel = (score: number): string => {
    if (score >= 75) return "Extremely Bullish";
    if (score >= 60) return "Bullish";
    if (score >= 45) return "Slightly Bullish";
    if (score >= 40) return "Neutral";
    if (score >= 25) return "Slightly Bearish";
    if (score >= 10) return "Bearish";
    return "Extremely Bearish";
  };

  // Get color based on sentiment score
  const getSentimentColor = (score: number): string => {
    if (score >= 60) return "#10B981"; // Emerald/Green
    if (score >= 45) return "#34D399"; // Light Green
    if (score >= 40) return "#9CA3AF"; // Gray
    if (score >= 25) return "#FCD34D"; // Amber
    return "#EF4444"; // Red
  };

  // Format chart data
  const formatSentimentChartData = () => {
    return sentimentHistory
      .slice()
      .reverse()
      .map((item) => ({
        time: formatTime(item.timestamp),
        score: item.score,
        bullish: item.bullishCount,
        bearish: item.bearishCount,
      }));
  };

  // Format token flow chart data with positive and negative values separated
  const formatTokenFlowData = (token: string): FlowDataPoint[] => {
    if (!flowHistory[token] || flowHistory[token].length === 0) return [];

    return flowHistory[token]
      .slice()
      .reverse()
      .map((item) => ({
        time: formatTime(item.timestamp),
        value: item.value,
        positiveValue: item.value >= 0 ? item.value : 0,
        negativeValue: item.value < 0 ? Math.abs(item.value) : 0,
      }));
  };

  // Calculate bullish/bearish indicators count
  const getBullishCount = () => {
    if (!latestSentiment) return 0;
    return Object.values(latestSentiment.bullishSignals).filter(Boolean).length;
  };

  const getBearishCount = () => {
    if (!latestSentiment) return 0;
    return Object.values(latestSentiment.bearishSignals).filter(Boolean).length;
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-bold">Market Sentiment Analyzer</h2>
        </div>
        <div className="flex space-x-2">
          <select
            className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
          >
            <option value="ethereum">Ethereum</option>
            <option value="binance-smart-chain">BSC</option>
            <option value="polygon">Polygon</option>
          </select>
          <button
            onClick={() =>
              wsInstance.blockchain.subscribeToMarketSentiment(selectedChain)
            }
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Current Sentiment */}
      {!latestSentiment ? (
        <Card className="p-4 text-center text-gray-500">
          <p>Waiting for market sentiment data...</p>
        </Card>
      ) : (
        <Card
          className="p-6 border-2"
          style={{
            borderColor: getSentimentColor(latestSentiment.sentimentScore),
          }}
        >
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h3 className="text-lg font-medium">Current Market Sentiment</h3>
              <div className="mt-2 flex items-center">
                <div className="text-4xl font-bold">
                  {Math.round(latestSentiment.sentimentScore)}
                </div>
                <div className="ml-4">
                  <Badge
                    variant={
                      latestSentiment.sentimentScore >= 50
                        ? "success"
                        : latestSentiment.sentimentScore >= 40
                          ? "secondary"
                          : "danger"
                    }
                    className="text-sm py-1 px-2"
                  >
                    {getSentimentLevel(latestSentiment.sentimentScore)}
                  </Badge>
                  <div className="text-sm text-gray-500 mt-1">
                    Last updated: {formatTimeAgo(latestSentiment.timestamp)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 md:mt-0 grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-green-500 font-medium">
                  Bullish Signals
                </div>
                <div className="text-3xl font-bold">{getBullishCount()}/4</div>
                <div className="text-xs mt-2 space-y-1">
                  {Object.entries(latestSentiment.bullishSignals).map(
                    ([key, value], i) => (
                      <div key={i} className="flex items-center space-x-1">
                        {value ? (
                          <ArrowUpIcon className="h-3 w-3 text-green-500" />
                        ) : (
                          <span className="h-3 w-3" />
                        )}
                        <span
                          className={value ? "text-green-500" : "text-gray-400"}
                        >
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-red-500 font-medium">Bearish Signals</div>
                <div className="text-3xl font-bold">{getBearishCount()}/4</div>
                <div className="text-xs mt-2 space-y-1">
                  {Object.entries(latestSentiment.bearishSignals).map(
                    ([key, value], i) => (
                      <div key={i} className="flex items-center space-x-1">
                        {value ? (
                          <ArrowDownIcon className="h-3 w-3 text-red-500" />
                        ) : (
                          <span className="h-3 w-3" />
                        )}
                        <span
                          className={value ? "text-red-500" : "text-gray-400"}
                        >
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Trend */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Sentiment Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatSentimentChartData()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  strokeOpacity={0.2}
                />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                  name="Sentiment Score"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bullish vs Bearish Signals */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">
            Bullish vs Bearish Signals
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formatSentimentChartData()}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  strokeOpacity={0.2}
                />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="bullish" name="Bullish Signals" fill="#10B981" />
                <Bar dataKey="bearish" name="Bearish Signals" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Token Flows */}
      <div>
        <h3 className="text-lg font-medium mb-4">
          Token Flows (Exchange Net Flows)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {["ETH", "USDC", "USDT"].map((token) => (
            <Card key={token} className="p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{token}</h4>
                {flowHistory[token]?.length > 0 && (
                  <div
                    className={`text-sm font-medium ${
                      flowHistory[token][0].value >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {flowHistory[token][0].value >= 0 ? "Outflow" : "Inflow"} $
                    {Math.abs(flowHistory[token][0].value).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatTokenFlowData(token)}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#333"
                      strokeOpacity={0.2}
                    />
                    <XAxis dataKey="time" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        return [
                          `$${Math.abs(Number(value)).toLocaleString()}`,
                          name.includes("Outflow")
                            ? "Exchange Outflows (Bullish)"
                            : "Exchange Inflows (Bearish)",
                        ];
                      }}
                    />
                    <Bar
                      dataKey="positiveValue"
                      name="Outflow"
                      fill="#10B981"
                    />
                    <Bar dataKey="negativeValue" name="Inflow" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                Outflows (Green) = Bullish, Inflows (Red) = Bearish
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
