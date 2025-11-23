import { useQuery } from "@tanstack/react-query";
import { getDeepHistoricalStats } from "@/services/historical";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  TrendingUp,
  LineChart,
  CalendarCheck2,
  Flame,
} from "lucide-react";

function LineChartSVG({
  data,
  color = "blue",
  height = 60,
}: {
  data: { date: string; value: number }[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const points = data
    .map(
      (d, i) =>
        `${(i / (data.length - 1)) * 100},${height - ((d.value - min) / (max - min || 1)) * height}`,
    )
    .join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 100 ${height}`}
      className="w-full"
    >
      <polyline fill="none" stroke={color} strokeWidth="3" points={points} />
    </svg>
  );
}

export function CoinProfileHistoricalDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-historical", coinId],
    queryFn: () => getDeepHistoricalStats(coinId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep historical data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load historical data.</div>;

  const charts = [
    {
      key: "priceHistory",
      label: "Price",
      color: "#2563eb",
      icon: <TrendingUp className="h-4 w-4 text-blue-400" />,
    },
    {
      key: "volumeHistory",
      label: "Volume",
      color: "#22c55e",
      icon: <LineChart className="h-4 w-4 text-green-400" />,
    },
    {
      key: "marketCapHistory",
      label: "Market Cap",
      color: "#eab308",
      icon: <BarChart3 className="h-4 w-4 text-yellow-400" />,
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Historical Data <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charts.map((c) => (
          <div
            key={c.key}
            className="relative bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow flex flex-col gap-2 border border-transparent"
          >
            <div className="flex items-center gap-2">
              {c.icon}
              <span className="text-sm font-semibold">{c.label}</span>
              <button
                title={c.label}
                className="ml-1 text-gray-400 hover:text-blue-500"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <LineChartSVG data={data[c.key]} color={c.color} />
            <button
              className="ml-auto text-xs text-blue-500 underline"
              onClick={() => setExpanded(expanded === c.key ? null : c.key)}
            >
              {expanded === c.key ? "Hide Chart" : "Expand"}
            </button>
            {expanded === c.key && (
              <div className="mt-2 bg-white dark:bg-gray-900 rounded p-2 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold mb-1">
                  {c.label} History
                </h4>
                <LineChartSVG data={data[c.key]} color={c.color} height={120} />
                <div className="text-xs text-gray-500 mt-1">
                  Export and more charting coming soon.
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* On-Chain Metrics Over Time */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-400" />
          On-Chain Metrics
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-gray-500">
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Active Addresses</th>
                <th className="px-2 py-1">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.onChainHistory.map((row: any, idx: number) => (
                <tr
                  key={idx}
                  className="odd:bg-gray-50 even:bg-white dark:odd:bg-gray-800/30 dark:even:bg-gray-900/30"
                >
                  <td className="px-2 py-1">
                    {new Date(row.date).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1">
                    {row.activeAddresses.toLocaleString()}
                  </td>
                  <td className="px-2 py-1">
                    {row.transactions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Event Overlays */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <CalendarCheck2 className="h-4 w-4 text-blue-400" />
          Major Events
        </h4>
        <ul className="space-y-2">
          {data.events.map((e: any, idx: number) => (
            <li
              key={idx}
              className="bg-gray-50 dark:bg-gray-800/30 rounded p-2 border border-transparent flex items-center gap-2"
            >
              <span className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                {e.label}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(e.date).toLocaleDateString()}
              </span>
              <span className="text-xs text-gray-400">({e.type})</span>
            </li>
          ))}
        </ul>
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
      {/* AI Explainer */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 rounded p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          AI Explainer
        </h4>
        <div className="text-xs text-blue-900 dark:text-blue-200">
          {data.aiExplainer}
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-4">
        Last updated:{" "}
        {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "N/A"}
      </div>
      <div className="text-xs text-neutral-400 mt-2">
        More historical metrics, charts, AI explainers, and community Q&A coming
        soon!
      </div>
    </div>
  );
}
