import { useQuery } from "@tanstack/react-query";
import { getDeepAIInsights } from "@/services/ai";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  Flame,
  Star,
} from "lucide-react";

function RiskMeter({ score }: { score: number }) {
  // score: 0 (safe) to 1 (risky)
  const percent = Math.round((1 - score) * 100);
  let color = "bg-green-400";
  if (score > 0.66) color = "bg-red-500";
  else if (score > 0.33) color = "bg-yellow-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Risk Meter:</span>
      <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <span className="text-xs font-bold ml-2">{percent}% Safe</span>
    </div>
  );
}

export function CoinProfileAIDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-ai", coinId],
    queryFn: () => getDeepAIInsights(coinId),
  });
  const [expanded, setExpanded] = useState<boolean>(false);
  if (isLoading)
    return <div className="text-gray-400">Loading AI insights...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load AI insights.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        AI Insights <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      {/* Executive Summary */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 rounded p-4 shadow border border-transparent">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          Executive Summary
        </h4>
        <div className="text-base text-blue-900 dark:text-blue-200 mb-2 font-semibold">
          {data.summary}
        </div>
        <RiskMeter score={data.riskScore} />
      </div>
      {/* Key Insights */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-400" />
          Key Insights
        </h4>
        <ul className="list-disc ml-6 mt-1 text-sm text-blue-900 dark:text-blue-200">
          {Array.isArray(data.keyInsights) && data.keyInsights.length > 0 ? (
            data.keyInsights.map((ins: string, idx: number) => (
              <li key={idx}>{ins}</li>
            ))
          ) : (
            <li>No key insights available.</li>
          )}
        </ul>
      </div>
      {/* Anomalies */}
      {Array.isArray(data.anomalies) && data.anomalies.length > 0 && (
        <div className="mb-6">
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
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 rounded p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-400" />
          AI Explainer
        </h4>
        <div className="text-xs text-blue-900 dark:text-blue-200">
          {data.aiExplainer}
        </div>
      </div>
      {/* Q&A Scaffold */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          AI Q&A
        </h4>
        <div className="text-xs text-gray-500">
          User Q&A and AI-powered answers coming soon.
        </div>
      </div>
      <div className="text-xs text-gray-400 mt-4">
        Last updated:{" "}
        {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : "N/A"}
      </div>
      <div className="text-xs text-neutral-400 mt-2">
        More advanced AI features and user Q&A coming soon!
      </div>
    </div>
  );
}
