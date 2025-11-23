"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/services/api";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  DocumentMagnifyingGlassIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/solid";

interface SecurityMetrics {
  protocol: string;
  tvl: number;
  audit_status: {
    last_audit: string;
    auditor: string;
    score: number;
    critical_findings: number;
    resolved_findings: number;
    pending_findings: number;
  };
  insurance: {
    coverage_amount: number;
    coverage_ratio: number;
    provider: string;
    premium: number;
  };
  risk_metrics: {
    centralization_risk: number;
    complexity_score: number;
    admin_keys: number;
    timelock_delay: number;
    upgradeable_contracts: number;
  };
  monitoring: {
    anomaly_score: number;
    recent_events: {
      timestamp: string;
      type: "high_volume" | "unusual_tx" | "price_impact" | "governance";
      description: string;
      severity: "low" | "medium" | "high";
    }[];
    active_alerts: {
      type: string;
      description: string;
      threshold: number;
      current_value: number;
    }[];
  };
  security_score: number;
}

export function SecurityMonitor() {
  const [selectedProtocol, setSelectedProtocol] = useState("aave");
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.getProtocolSecurityMetrics(selectedProtocol);
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching security metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(intervalId);
  }, [selectedProtocol]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getSeverityBadge = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return (
          <Badge
            variant="danger"
            icon={<ExclamationTriangleIcon className="h-4 w-4" />}
          >
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="warning"
            icon={<ExclamationTriangleIcon className="h-4 w-4" />}
          >
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="success"
            icon={<ExclamationTriangleIcon className="h-4 w-4" />}
          >
            Low
          </Badge>
        );
    }
  };

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Overall Security Score */}
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium">
              {metrics.protocol} Security Score
            </h3>
            <p className="text-sm text-gray-400">
              Overall protocol security assessment
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-4xl font-bold ${getScoreColor(metrics.security_score)}`}
            >
              {metrics.security_score}/100
            </p>
            <Badge
              variant={metrics.security_score >= 80 ? "success" : "warning"}
              icon={<ShieldCheckIcon className="h-4 w-4" />}
            >
              {metrics.security_score >= 80 ? "Secure" : "Needs Attention"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DocumentMagnifyingGlassIcon className="h-5 w-5 text-blue-400" />
              <h4 className="font-medium">Audit Status</h4>
            </div>
            <p className="text-2xl font-bold">
              {metrics.audit_status.score}/100
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-400">
                Last Audit:{" "}
                {new Date(metrics.audit_status.last_audit).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-400">
                By: {metrics.audit_status.auditor}
              </p>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    metrics.audit_status.critical_findings === 0
                      ? "success"
                      : "danger"
                  }
                >
                  {metrics.audit_status.critical_findings} Critical
                </Badge>
                <Badge variant="warning">
                  {metrics.audit_status.pending_findings} Pending
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <LockClosedIcon className="h-5 w-5 text-purple-400" />
              <h4 className="font-medium">Risk Assessment</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Centralization</span>
                <Badge
                  variant={
                    metrics.risk_metrics.centralization_risk < 30
                      ? "success"
                      : "warning"
                  }
                >
                  {metrics.risk_metrics.centralization_risk}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Complexity</span>
                <Badge
                  variant={
                    metrics.risk_metrics.complexity_score < 50
                      ? "success"
                      : "warning"
                  }
                >
                  {metrics.risk_metrics.complexity_score}/100
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Admin Keys</span>
                <Badge
                  variant={
                    metrics.risk_metrics.admin_keys <= 3 ? "success" : "warning"
                  }
                >
                  {metrics.risk_metrics.admin_keys}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Timelock</span>
                <Badge
                  variant={
                    metrics.risk_metrics.timelock_delay >= 86400
                      ? "success"
                      : "warning"
                  }
                >
                  {Math.floor(metrics.risk_metrics.timelock_delay / 3600)}h
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BanknotesIcon className="h-5 w-5 text-green-400" />
              <h4 className="font-medium">Insurance Coverage</h4>
            </div>
            <p className="text-2xl font-bold">
              ${(metrics.insurance.coverage_amount / 1e6).toFixed(1)}M
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-400">
                Coverage Ratio:{" "}
                {(metrics.insurance.coverage_ratio * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">
                Provider: {metrics.insurance.provider}
              </p>
              <p className="text-sm text-gray-400">
                Premium: {metrics.insurance.premium}% APY
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Active Monitoring */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Active Monitoring</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Anomaly Score</p>
              <p className="text-sm text-gray-400">
                Based on recent protocol activity
              </p>
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${getScoreColor(100 - metrics.monitoring.anomaly_score)}`}
              >
                {metrics.monitoring.anomaly_score}/100
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-400">Recent Events</h4>
            {metrics.monitoring.recent_events.map((event, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {event.type.replace("_", " ").toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-400">{event.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {getSeverityBadge(event.severity)}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-400">Active Alerts</h4>
            {metrics.monitoring.active_alerts.map((alert, index) => (
              <div key={index} className="bg-gray-800/30 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{alert.type}</p>
                    <p className="text-sm text-gray-400">{alert.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        alert.current_value > alert.threshold
                          ? "danger"
                          : "warning"
                      }
                      icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
                    >
                      {alert.current_value.toFixed(2)} /{" "}
                      {alert.threshold.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
