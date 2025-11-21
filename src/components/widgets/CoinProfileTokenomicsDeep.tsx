import { useQuery } from "@tanstack/react-query";
import { getDeepTokenomicsStats } from "@/services/tokenomics";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  PieChart,
  TrendingUp,
  Users,
  Lock,
  Unlock,
  Flame,
  Coins,
  FileText,
  ShieldCheck,
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

function DistributionBar({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  return (
    <div className="flex w-full h-6 rounded overflow-hidden border border-gray-200 dark:border-gray-700">
      {data.map((d, i) => (
        <div
          key={i}
          style={{ width: `${(d.value / total) * 100}%` }}
          className="h-full"
          title={`${d.label}: ${d.value}%`}
        >
          <div
            className={`h-full ${["bg-blue-400", "bg-green-400", "bg-yellow-400", "bg-purple-400", "bg-pink-400"][i % 5]}`}
          ></div>
        </div>
      ))}
    </div>
  );
}

export function CoinProfileTokenomicsDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-tokenomics", coinId],
    queryFn: () => getDeepTokenomicsStats(coinId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep tokenomics data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load tokenomics data.</div>;

  const metrics = [
    {
      key: "totalSupply",
      label: "Total Supply",
      icon: <Coins className="h-4 w-4 text-yellow-400" />,
      color: "#eab308",
      value: data.totalSupply,
      definition: "Total token supply.",
    },
    {
      key: "circulatingSupply",
      label: "Circulating Supply",
      icon: <Coins className="h-4 w-4 text-green-400" />,
      color: "#22c55e",
      value: data.circulatingSupply,
      definition: "Tokens in circulation.",
    },
    {
      key: "maxSupply",
      label: "Max Supply",
      icon: <Coins className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.maxSupply,
      definition: "Maximum possible supply.",
    },
    {
      key: "inflationRate",
      label: "Inflation Rate",
      icon: <TrendingUp className="h-4 w-4 text-pink-400" />,
      color: "#f43f5e",
      value: data.inflationRate,
      trend: data.inflationHistory,
      definition: "Annual inflation rate.",
    },
    {
      key: "deflationRate",
      label: "Deflation Rate",
      icon: <Flame className="h-4 w-4 text-red-400" />,
      color: "#f87171",
      value: data.deflationRate,
      definition: "Annual deflation rate.",
    },
    {
      key: "burns",
      label: "Total Burned",
      icon: <Flame className="h-4 w-4 text-orange-400" />,
      color: "#f59e42",
      value: data.burns,
      definition: "Total tokens burned.",
    },
    {
      key: "emissions",
      label: "Emissions",
      icon: <PieChart className="h-4 w-4 text-purple-400" />,
      color: "#a21caf",
      value: data.emissions,
      definition: "Tokens emitted this year.",
    },
    {
      key: "whaleConcentration",
      label: "Whale Concentration",
      icon: <Users className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.whaleConcentration,
      definition: "Percent of supply held by top holders.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Tokenomics <BarChart3 className="h-5 w-5 text-blue-400" />
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
              <span className="text-2xl font-bold">
                {m.value !== undefined && m.value !== null
                  ? m.value.toLocaleString()
                  : "N/A"}
              </span>
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
      {/* Distribution */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <PieChart className="h-4 w-4 text-blue-400" />
          Token Distribution
        </h4>
        <DistributionBar data={data.distribution} />
        <ul className="flex flex-wrap gap-2 mt-2">
          {data.distribution.map((d: any, idx: number) => (
            <li key={idx} className="text-xs text-gray-700 dark:text-gray-200">
              {d.label}: <span className="font-semibold">{d.value}%</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Unlocks */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Unlock className="h-4 w-4 text-green-400" />
          Upcoming Unlocks
        </h4>
        <ul className="space-y-2">
          {data.unlocks.map((u: any, idx: number) => (
            <li
              key={idx}
              className="bg-gray-50 dark:bg-gray-800/30 rounded p-2 border border-transparent flex items-center gap-2"
            >
              <span className="text-xs text-gray-500">
                {new Date(u.date).toLocaleDateString()}
              </span>
              <span className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                {u.amount.toLocaleString()} tokens
              </span>
              <span className="text-xs text-gray-400">{u.description}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Whale Concentration & Top Holders */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          Top Holders
        </h4>
        <ul className="space-y-2">
          {data.topHolders.map((w: any, idx: number) => (
            <li
              key={idx}
              className="bg-gray-50 dark:bg-gray-800/30 rounded p-2 border border-transparent flex items-center gap-2"
            >
              <span className="text-xs text-gray-700 dark:text-gray-200 font-semibold">
                {w.address}
              </span>
              <span className="text-xs text-gray-400">
                {w.percent}% of supply
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* Utility & Governance */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            Utility
          </h4>
          <div className="text-xs text-gray-700 dark:text-gray-200">
            {data.utility}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            Governance
          </h4>
          <div className="text-xs text-gray-700 dark:text-gray-200">
            {data.governance}
          </div>
        </div>
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
        More tokenomics metrics, charts, AI explainers, and community Q&A coming
        soon!
      </div>
    </div>
  );
}
