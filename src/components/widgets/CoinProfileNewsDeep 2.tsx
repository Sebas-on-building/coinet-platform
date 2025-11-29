import { useQuery } from "@tanstack/react-query";
import { getDeepNewsStats } from "@/services/news";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  Newspaper,
  Flame,
  TrendingUp,
  Link2,
  ThumbsUp,
  ThumbsDown,
  Circle,
} from "lucide-react";

export function CoinProfileNewsDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-news", coinId],
    queryFn: () => getDeepNewsStats(coinId),
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep news data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load news data.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        News & Sentiment <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      {/* Trending Topics & Sources */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Trending Topics
          </h4>
          <ul className="flex flex-wrap gap-2">
            {data.trendingTopics.map((topic: string, idx: number) => (
              <li
                key={idx}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium"
              >
                {topic}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            Trending Sources
          </h4>
          <ul className="flex flex-wrap gap-2">
            {data.trendingSources.map((src: string, idx: number) => (
              <li
                key={idx}
                className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs font-medium"
              >
                {src}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* News Feed */}
      <div className="mb-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-blue-400" />
          Latest News
        </h4>
        <ul className="space-y-4">
          {data.newsFeed.map((item: any, idx: number) => (
            <li
              key={idx}
              className={`bg-gray-50 dark:bg-gray-800/30 rounded p-4 border flex flex-col gap-2 ${item.causal ? "border-blue-400" : "border-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 dark:text-blue-300 hover:underline text-base"
                >
                  {item.title}
                </a>
                {item.causal && <Link2 className="h-4 w-4 text-blue-400" />}
                <span className="ml-auto text-xs text-gray-500">
                  {item.source}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(item.published_at).toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-200">
                {item.summary}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  {item.sentiment === "positive" && (
                    <ThumbsUp className="h-3 w-3 text-green-500" />
                  )}
                  {item.sentiment === "negative" && (
                    <ThumbsDown className="h-3 w-3 text-red-500" />
                  )}
                  {item.sentiment === "neutral" && (
                    <Circle className="h-3 w-3 text-gray-400" />
                  )}
                  {item.sentiment.charAt(0).toUpperCase() +
                    item.sentiment.slice(1)}
                </span>
                <span className="ml-2">
                  Impact:{" "}
                  <span className="font-semibold">
                    {(item.impact * 100).toFixed(0)}%
                  </span>
                </span>
                <button
                  className="ml-auto text-xs text-blue-500 underline"
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                >
                  {expanded === idx ? "Hide Details" : "Expand"}
                </button>
              </div>
              {expanded === idx && (
                <div className="mt-2 bg-white dark:bg-gray-900 rounded p-2 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-gray-500">
                    Full summary and causal mapping coming soon.
                  </div>
                </div>
              )}
              {/* AI Explainer and Community Q&A (scaffold) */}
              <div className="mt-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-300">
                  AI: News impact and causal mapping explained here soon.
                </span>
                <button className="ml-auto text-xs text-blue-500 underline flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Q&A
                </button>
              </div>
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
        More news metrics, causal mapping, AI explainers, and community Q&A
        coming soon!
      </div>
    </div>
  );
}
