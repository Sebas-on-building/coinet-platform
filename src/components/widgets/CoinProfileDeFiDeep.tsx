import { useQuery } from "@tanstack/react-query";
import { getDeepDeFiStats } from "@/services/defi";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  TrendingUp,
  Banknote,
  Users,
  PieChart,
  ShieldCheck,
  Flame,
} from "lucide-react";

function Sparkline({
  data,
  color = "blue",
}: {
  data: number[];
  color?: string;
}) {
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

export function CoinProfileDeFiDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-defi", coinId],
    queryFn: () => getDeepDeFiStats(coinId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep DeFi data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load DeFi data.</div>;

  const metrics = [
    {
      key: "tvl",
      label: "Total Value Locked",
      icon: <Banknote className="h-4 w-4 text-green-400" />,
      color: "#22c55e",
      value: data.tvl,
      trend: data.tvlHistory,
      definition: "Total value locked in DeFi.",
    },
    {
      key: "yield",
      label: "Average Yield",
      icon: <TrendingUp className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.yield,
      trend: data.yieldHistory,
      definition: "Average DeFi yield.",
    },
    {
      key: "stablecoinSupply",
      label: "Stablecoin Supply",
      icon: <PieChart className="h-4 w-4 text-yellow-400" />,
      color: "#eab308",
      value: data.stablecoinSupply,
      definition: "Total stablecoins in circulation.",
    },
    {
      key: "dexVolume",
      label: "DEX Volume",
      icon: <PieChart className="h-4 w-4 text-purple-400" />,
      color: "#a21caf",
      value: data.dexVolume,
      definition: "Decentralized exchange volume.",
    },
    {
      key: "liquidStaking",
      label: "Liquid Staking",
      icon: <Users className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.liquidStaking,
      definition: "Value in liquid staking protocols.",
    },
    {
      key: "lendingStats",
      label: "Lending/Borrowing",
      icon: <ShieldCheck className="h-4 w-4 text-green-400" />,
      color: "#22c55e",
      value: data.lendingStats,
      definition: "Total lent and borrowed.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        DeFi Metrics <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((m) => (
          <div
            key={m.key}
            className={`relative bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow flex flex-col gap-2 border ${data.anomalies?.some((a: any) => a.metric === m.key) ? "border-red-400" : "border-transparent"}`}
          >
            <div className="flex items-center gap-2">
              {m.icon}
              <span className="text-sm font-semibold">{m.label}</span>
              <button
                title={m.definition}
                className="ml-1 text-gray-400 hover:text-blue-500"
              >
                <Info className="h-4 w-4" />
              </button>
              {data.anomalies?.some((a: any) => a.metric === m.key) && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {m.key === "lendingStats" ? (
                <span className="text-2xl font-bold">
                  Lent: {m.value.totalLent.toLocaleString()}
                  <br />
                  Borrowed: {m.value.totalBorrowed.toLocaleString()}
                </span>
              ) : (
                <span className="text-2xl font-bold">
                  {m.value !== undefined && m.value !== null
                    ? typeof m.value === "number"
                      ? "$" + m.value.toLocaleString()
                      : m.value.toLocaleString()
                    : "N/A"}
                </span>
              )}
              {m.trend && <Sparkline data={m.trend} color={m.color} />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Source: Aggregated</span>
              {m.trend && (
                <button
                  className="ml-auto text-xs text-blue-500 underline"
                  onClick={() => setExpanded(expanded === m.key ? null : m.key)}
                >
                  {expanded === m.key ? "Hide Chart" : "Expand"}
                </button>
              )}
            </div>
            {expanded === m.key && m.trend && (
              <div className="mt-2 bg-white dark:bg-gray-900 rounded p-2 border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-semibold mb-1">
                  {m.label} History
                </h4>
                <Sparkline data={m.trend} color={m.color} />
                <div className="text-xs text-gray-500 mt-1">
                  Export and more charting coming soon.
                </div>
              </div>
            )}
            {/* AI Explainer and Community Q&A (scaffold) */}
            <div className="mt-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                AI: {m.definition}
              </span>
              <button className="ml-auto text-xs text-blue-500 underline flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Q&A
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Protocol Leaderboard */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-blue-400" />
          Top Protocols
        </h4>
        <ul className="space-y-2">
          {data.protocols.map((p: any, idx: number) => (
            <li
              key={idx}
              className="bg-gray-50 dark:bg-gray-800/30 rounded p-2 border border-transparent flex items-center gap-2"
            >
              <span className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                {p.name}
              </span>
              <span className="text-xs text-green-500">
                TVL: ${p.tvl.toLocaleString()}
              </span>
              <span className="text-xs text-blue-500">Yield: {p.yield}%</span>
              <span
                className={`text-xs font-semibold ${p.risk === "Low" ? "text-green-600" : p.risk === "Medium" ? "text-yellow-600" : "text-red-600"}`}
              >
                Risk: {p.risk}
              </span>
              {p.insurance && (
                <ShieldCheck
                  className="h-4 w-4 text-green-400"
                  title="Insurance available"
                />
              )}
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
        More DeFi metrics, charts, AI explainers, and community Q&A coming soon!
      </div>
    </div>
  );
}
