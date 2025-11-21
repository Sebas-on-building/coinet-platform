"use client";

import React, { useState, useEffect } from "react";
import { WebSocketService, WebSocketMessage } from "@/services/websocket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface MEVTransaction {
  chain: string;
  hash: string;
  timestamp: number;
  blockNumber: number;
  mevType: string;
  protocol: string;
  profitUSD: number;
  profitETH: string;
  bundleId: string;
  from: string;
}

interface MEVChartData {
  name: string; // mevType
  value: number; // count
  profit: number; // total USD profit
}

interface MEVProtocolData {
  name: string; // protocol
  value: number; // percentage of MEV
}

// Interface for pie chart label props
interface PieLabelProps {
  name: string;
  percent: number;
}

// Interface for tooltip formatter props
interface TooltipFormatterProps {
  value: number;
}

interface MEVMonitorProps {
  maxItems?: number;
  defaultChain?: string;
}

export function MEVMonitor({
  maxItems = 15,
  defaultChain = "ethereum",
}: MEVMonitorProps) {
  const [wsInstance] = useState(() => new WebSocketService());
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [mevTransactions, setMevTransactions] = useState<MEVTransaction[]>([]);
  const [mevSummary, setMevSummary] = useState({
    totalProfit: 0,
    totalTransactions: 0,
    avgProfitPerTx: 0,
    largestProfit: 0,
  });
  const [mevChartData, setMevChartData] = useState<MEVChartData[]>([]);
  const [protocolChartData, setProtocolChartData] = useState<MEVProtocolData[]>(
    [],
  );

  useEffect(() => {
    // Reset data when chain changes
    setMevTransactions([]);

    // Subscribe to MEV transactions
    const mevHandler = (message: WebSocketMessage) => {
      if (
        message.type === "mevTransaction" &&
        message.data.chain === selectedChain
      ) {
        setMevTransactions((prev) => {
          const updated = [message.data, ...prev.slice(0, maxItems - 1)];
          updateChartData(updated);
          return updated;
        });
      }
    };

    // Register handlers
    wsInstance.blockchain.on("mevTransaction", mevHandler);

    // Subscribe to MEV data
    wsInstance.blockchain.subscribeToMEV(selectedChain);

    // Initial chart data setup with empty data
    updateChartData([]);

    // Cleanup
    return () => {
      wsInstance.blockchain.off("mevTransaction", mevHandler);
      wsInstance.blockchain.unsubscribe(selectedChain, "mev");
    };
  }, [selectedChain, maxItems, wsInstance]);

  // Format time to readable format
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Format address to truncated form
  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Update chart data based on transactions
  const updateChartData = (transactions: MEVTransaction[]) => {
    if (transactions.length === 0) {
      setMevChartData([
        { name: "frontrunning", value: 0, profit: 0 },
        { name: "backrunning", value: 0, profit: 0 },
        { name: "sandwich", value: 0, profit: 0 },
        { name: "arbitrage", value: 0, profit: 0 },
        { name: "liquidation", value: 0, profit: 0 },
      ]);

      setProtocolChartData([
        { name: "Uniswap", value: 35 },
        { name: "SushiSwap", value: 20 },
        { name: "Curve", value: 25 },
        { name: "Balancer", value: 10 },
        { name: "dYdX", value: 10 },
      ]);

      return;
    }

    // Calculate MEV type stats
    const mevTypeCounts: Record<string, { count: number; profit: number }> = {};
    const protocolCounts: Record<string, number> = {};
    let totalProfit = 0;
    let largestProfit = 0;

    transactions.forEach((tx) => {
      // MEV type stats
      if (!mevTypeCounts[tx.mevType]) {
        mevTypeCounts[tx.mevType] = { count: 0, profit: 0 };
      }
      mevTypeCounts[tx.mevType].count += 1;
      mevTypeCounts[tx.mevType].profit += tx.profitUSD;

      // Protocol stats
      if (!protocolCounts[tx.protocol]) {
        protocolCounts[tx.protocol] = 0;
      }
      protocolCounts[tx.protocol] += 1;

      // Summary stats
      totalProfit += tx.profitUSD;
      if (tx.profitUSD > largestProfit) {
        largestProfit = tx.profitUSD;
      }
    });

    // Format data for charts
    const chartData = Object.keys(mevTypeCounts).map((type) => ({
      name: type,
      value: mevTypeCounts[type].count,
      profit: mevTypeCounts[type].profit,
    }));

    // Calculate protocol percentages
    const totalTx = transactions.length;
    const protocolData = Object.keys(protocolCounts).map((protocol) => ({
      name: protocol,
      value: Math.round((protocolCounts[protocol] / totalTx) * 100),
    }));

    // Update state
    setMevChartData(chartData);
    setProtocolChartData(protocolData);
    setMevSummary({
      totalProfit,
      totalTransactions: transactions.length,
      avgProfitPerTx: totalProfit / transactions.length,
      largestProfit,
    });
  };

  // Generate colors for pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">MEV Monitor</h2>
        <div className="flex space-x-2">
          <select
            className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
          >
            <option value="ethereum">Ethereum</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
          </select>
          <button
            onClick={() => wsInstance.blockchain.subscribeToMEV(selectedChain)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowTrendingUpIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MEV Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">
            Total Extracted Value
          </div>
          <div className="text-2xl font-bold mt-1">
            ${mevSummary.totalProfit.toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">
            Total MEV Transactions
          </div>
          <div className="text-2xl font-bold mt-1">
            {mevSummary.totalTransactions}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">
            Avg. Profit per TX
          </div>
          <div className="text-2xl font-bold mt-1">
            ${Math.round(mevSummary.avgProfitPerTx).toLocaleString()}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 uppercase">Largest Profit</div>
          <div className="text-2xl font-bold mt-1">
            ${mevSummary.largestProfit.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* MEV Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">MEV by Strategy</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mevChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#333"
                  strokeOpacity={0.2}
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">MEV by Protocol</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: PieLabelProps) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {protocolChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* MEV Transactions */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent MEV Transactions</h3>
        <div className="space-y-2">
          {mevTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Waiting for MEV transactions...
            </p>
          ) : (
            mevTransactions.map((tx, index) => (
              <Card
                key={`${tx.hash}-${index}`}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium flex items-center space-x-2">
                      <span>{formatAddress(tx.hash)}</span>
                      <Badge
                        variant={
                          tx.mevType === "frontrunning" ||
                          tx.mevType === "sandwich"
                            ? "danger"
                            : tx.mevType === "arbitrage"
                              ? "primary"
                              : "secondary"
                        }
                      >
                        {tx.mevType}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(tx.timestamp)} • Block: {tx.blockNumber} •
                      Protocol: {tx.protocol}
                    </div>
                    <div className="text-xs mt-1">
                      From: {formatAddress(tx.from)} • Bundle:{" "}
                      {tx.bundleId.substring(0, 10)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-emerald-600">
                      +${tx.profitUSD.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tx.profitETH} ETH
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
