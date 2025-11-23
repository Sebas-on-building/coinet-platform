import { useQuery } from "@tanstack/react-query";
import { getDeepOnChainStats } from "@/services/onchainDeep";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  MessageCircle,
} from "lucide-react";

function Sparkline({
  data,
  color = "blue",
}: {
  data: number[];
  color?: string;
}) {
  // Simple SVG sparkline
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`,
    )
    .join(" ");
  return (
    <svg
      width="80"
      height="24"
      viewBox="0 0 100 100"
      className="inline-block align-middle"
    >
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
}

export function CoinProfileOnChainDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-onchain", coinId],
    queryFn: () => getDeepOnChainStats(coinId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep on-chain data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load on-chain data.</div>;

  const metrics = [
    { key: "activeAddresses", label: "Active Addresses", color: "#2563eb" },
    { key: "newAddresses", label: "New Addresses", color: "#22c55e" },
    { key: "transactions", label: "Transactions", color: "#f59e42" },
    { key: "supply", label: "Supply", color: "#eab308" },
    { key: "holders", label: "Holders", color: "#a21caf" },
    { key: "minerStats", label: "Miner Stats", color: "#f43f5e" },
    { key: "gas", label: "Gas", color: "#64748b" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        On-Chain Metrics <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((m) => {
          const metric = data[m.key];
          if (!metric) return null;
          const value =
            metric.value ??
            metric.count ??
            metric.circulating ??
            metric.total ??
            metric.hashRate ??
            metric.avgPrice ??
            metric.total;
          const history = metric.history || [];
          const trend =
            metric.trend ||
            (history.length > 1 && history[history.length - 1] > history[0]
              ? "up"
              : "down");
          const anomaly = metric.anomaly;
          return (
            <div
              key={m.key}
              className={`relative bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow flex flex-col gap-2 border ${anomaly ? "border-red-400" : "border-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{m.label}</span>
                <button
                  title={metric.definition}
                  className="ml-1 text-gray-400 hover:text-blue-500"
                >
                  <Info className="h-4 w-4" />
                </button>
                {anomaly && (
                  <AlertTriangle
                    className="h-4 w-4 text-red-500"
                    title="Anomaly detected"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {value !== undefined ? value.toLocaleString() : "N/A"}
                </span>
                <Sparkline data={history} color={m.color} />
                {trend === "up" ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  Source: {metric.source}
                </span>
                <button
                  className="ml-auto text-xs text-blue-500 underline"
                  onClick={() => setExpanded(expanded === m.key ? null : m.key)}
                >
                  {expanded === m.key ? "Hide Chart" : "Expand"}
                </button>
              </div>
              {expanded === m.key && (
                <div className="mt-2 bg-white dark:bg-gray-900 rounded p-2 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold mb-1">
                    {m.label} History
                  </h4>
                  <Sparkline data={history} color={m.color} />
                  <div className="text-xs text-gray-500 mt-1">
                    Export and more charting coming soon.
                  </div>
                </div>
              )}
              {/* AI Explainer and Community Q&A (scaffold) */}
              <div className="mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  AI: {metric.definition}
                </span>
                <button className="ml-auto text-xs text-blue-500 underline flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Q&A
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Anomalies */}
      {Array.isArray(data.anomalies) && data.anomalies.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Anomalies
          </h4>
          <ul className="space-y-2">
            {data.anomalies.map((a: any, idx: number) => (
              <li
                key={idx}
                className="bg-red-50 dark:bg-red-900/30 rounded p-2 text-xs text-red-700 dark:text-red-300"
              >
                <span className="font-semibold">{a.metric}:</span>{" "}
                {a.description} ({a.date})
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-xs text-gray-400 mt-4">
        Last updated:{" "}
        {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "N/A"}
      </div>
      <div className="text-xs text-neutral-400 mt-2">
        More metrics, charts, AI explainers, and community Q&A coming soon!
      </div>
    </div>
  );
}
