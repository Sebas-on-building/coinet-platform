"use client";

import React, { useState, useEffect } from "react";
import { WebSocketService, WebSocketMessage } from "@/services/websocket";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface SecurityAlert {
  chain: string;
  timestamp: number;
  contractAddress: string;
  contractName: string;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  transactionHash?: string;
  impactedFunds?: string;
}

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: {
    [key: string]: number;
  };
  byContract: {
    [key: string]: number;
  };
}

// Interface for pie chart label props
interface PieLabelProps {
  name: string;
  percent: number;
}

const SEVERITY_COLORS = {
  critical: "#EF4444", // red
  high: "#F97316", // orange
  medium: "#F59E0B", // amber
  low: "#10B981", // emerald
};

const ALERT_TYPES = {
  vulnerabilityDetected: "Vulnerability Detected",
  exploitAttempt: "Exploit Attempt",
  contractUpgraded: "Contract Upgraded",
  ownershipTransferred: "Ownership Transferred",
  pauseStatus: "Contract Pause Status Change",
};

interface SecurityMonitorProps {
  maxItems?: number;
  defaultChain?: string;
}

export function SecurityMonitor({
  maxItems = 15,
  defaultChain = "ethereum",
}: SecurityMonitorProps) {
  const [wsInstance] = useState(() => new WebSocketService());
  const [selectedChain, setSelectedChain] = useState(defaultChain);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byType: {},
    byContract: {},
  });

  useEffect(() => {
    // Reset data when chain changes
    setAlerts([]);

    // Subscribe to security alerts
    const securityHandler = (message: WebSocketMessage) => {
      if (
        message.type === "securityAlert" &&
        message.data.chain === selectedChain
      ) {
        setAlerts((prev) => {
          const updated = [message.data, ...prev.slice(0, maxItems - 1)];
          updateStats(updated);
          return updated;
        });
      }
    };

    // Register handlers
    wsInstance.blockchain.on("securityAlert", securityHandler);

    // Subscribe to security alerts
    wsInstance.blockchain.subscribeToSecurityAlerts(selectedChain);

    // Cleanup
    return () => {
      wsInstance.blockchain.off("securityAlert", securityHandler);
      wsInstance.blockchain.unsubscribe(selectedChain, "securityAlerts");
    };
  }, [selectedChain, maxItems, wsInstance]);

  // Format time to readable format
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86000)}d ago`;
  };

  // Format address to truncated form
  const formatAddress = (address: string): string => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Update statistics based on current alerts
  const updateStats = (alertsData: SecurityAlert[]) => {
    const newStats = {
      total: alertsData.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byType: {} as { [key: string]: number },
      byContract: {} as { [key: string]: number },
    };

    alertsData.forEach((alert) => {
      // Count by severity
      newStats[alert.severity]++;

      // Count by type
      if (!newStats.byType[alert.alertType]) {
        newStats.byType[alert.alertType] = 0;
      }
      newStats.byType[alert.alertType]++;

      // Count by contract
      if (!newStats.byContract[alert.contractName]) {
        newStats.byContract[alert.contractName] = 0;
      }
      newStats.byContract[alert.contractName]++;
    });

    setStats(newStats);
  };

  // Prepare chart data
  const severityChartData = [
    {
      name: "Critical",
      value: stats.critical,
      color: SEVERITY_COLORS.critical,
    },
    { name: "High", value: stats.high, color: SEVERITY_COLORS.high },
    { name: "Medium", value: stats.medium, color: SEVERITY_COLORS.medium },
    { name: "Low", value: stats.low, color: SEVERITY_COLORS.low },
  ];

  const alertTypeData = Object.entries(stats.byType).map(([key, value]) => ({
    name: ALERT_TYPES[key as keyof typeof ALERT_TYPES] || key,
    value,
  }));

  // Helper to get severity badge
  const getSeverityBadge = (severity: string) => {
    const variantMap: { [key: string]: any } = {
      critical: "danger",
      high: "warning",
      medium: "secondary",
      low: "success",
    };

    return (
      <Badge variant={variantMap[severity] || "default"} className="ml-2">
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldExclamationIcon className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold">Security Monitoring</h2>
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
            <option value="arbitrum">Arbitrum</option>
          </select>
          <button
            onClick={() =>
              wsInstance.blockchain.subscribeToSecurityAlerts(selectedChain)
            }
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 relative overflow-hidden">
          <div className="text-xs text-gray-500 uppercase">Total Alerts</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
          <ShieldCheckIcon className="h-16 w-16 text-gray-200 absolute -bottom-2 -right-2 opacity-50" />
        </Card>
        <Card className="p-4 relative overflow-hidden bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50">
          <div className="text-xs text-red-500 uppercase font-medium">
            Critical
          </div>
          <div className="text-2xl font-bold mt-1 text-red-600">
            {stats.critical}
          </div>
          <ExclamationTriangleIcon className="h-16 w-16 text-red-200 dark:text-red-800/30 absolute -bottom-2 -right-2" />
        </Card>
        <Card className="p-4 relative overflow-hidden">
          <div className="text-xs text-orange-500 uppercase font-medium">
            High
          </div>
          <div className="text-2xl font-bold mt-1 text-orange-600">
            {stats.high}
          </div>
        </Card>
        <Card className="p-4 relative overflow-hidden">
          <div className="text-xs text-amber-500 uppercase font-medium">
            Medium
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">
            {stats.medium}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Alerts by Severity</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: PieLabelProps) =>
                    percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                  }
                >
                  {severityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Alerts by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }: PieLabelProps) =>
                    percent > 0.1
                      ? `${name}: ${(percent * 100).toFixed(0)}%`
                      : ""
                  }
                >
                  {alertTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Alerts */}
      <div>
        <h3 className="text-lg font-medium mb-4">Recent Security Alerts</h3>
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <Card className="p-4 text-center text-gray-500">
              <ShieldCheckIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p>No security alerts detected yet.</p>
              <p className="text-sm">
                Monitoring {selectedChain} network for security events...
              </p>
            </Card>
          ) : (
            alerts.map((alert, index) => (
              <Card
                key={`${alert.contractAddress}-${index}`}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  alert.severity === "critical"
                    ? "border-red-300 dark:border-red-800"
                    : alert.severity === "high"
                      ? "border-orange-300 dark:border-orange-800"
                      : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-medium flex items-center">
                      {ALERT_TYPES[
                        alert.alertType as keyof typeof ALERT_TYPES
                      ] || alert.alertType}
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{alert.contractName}</span>
                      <span className="text-gray-500 text-xs ml-2">
                        {formatAddress(alert.contractAddress)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(alert.timestamp)}
                      {alert.transactionHash && (
                        <span className="ml-2">
                          • Tx: {formatAddress(alert.transactionHash)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-1">{alert.description}</div>
                  </div>
                  {alert.impactedFunds && (
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        {alert.impactedFunds} at risk
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];
