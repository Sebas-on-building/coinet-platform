import { useQuery } from "@tanstack/react-query";
import { getDeepCommunityStats } from "@/services/community";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  BarChart3,
  Sparkles,
  MessageCircle,
  Users,
  Star,
  Flame,
  ShieldCheck,
} from "lucide-react";

export function CoinProfileCommunityDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-community", coinId],
    queryFn: () => getDeepCommunityStats(coinId),
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep community data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load community data.</div>;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Community <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      {/* Average Rating & Engagement */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-4 shadow border border-transparent flex items-center gap-3">
          <Star className="h-6 w-6 text-yellow-400" />
          <span className="text-sm font-semibold">Average Rating:</span>
          <span className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
            {data.averageRating !== null
              ? data.averageRating.toFixed(2) + " / 5"
              : "N/A"}
          </span>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-4 shadow border border-transparent flex flex-col gap-1">
          <span className="text-xs text-gray-500 font-semibold">
            Engagement
          </span>
          <span className="text-xs">
            Posts:{" "}
            <span className="font-semibold">{data.engagement.posts}</span>
          </span>
          <span className="text-xs">
            Comments:{" "}
            <span className="font-semibold">{data.engagement.comments}</span>
          </span>
          <span className="text-xs">
            Upvotes:{" "}
            <span className="font-semibold">{data.engagement.upvotes}</span>
          </span>
        </div>
      </div>
      {/* Trending Posts */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-400" />
          Trending Posts
        </h4>
        <ul className="space-y-2">
          {data.trendingPosts.map((post: any, idx: number) => (
            <li
              key={post.id}
              className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/30 rounded p-2 border border-transparent"
            >
              <a
                href={post.url}
                className="font-semibold text-blue-700 dark:text-blue-300 hover:underline"
              >
                {post.title}
              </a>
              <span className="text-xs text-gray-400">by {post.user}</span>
              <span className="text-xs text-yellow-500 flex items-center gap-1">
                <Star className="h-3 w-3" />
                {post.upvotes}
              </span>
              <span className="text-xs text-gray-400 ml-auto">
                {new Date(post.timestamp).toLocaleString()}
              </span>
              <button
                className="ml-2 text-xs text-blue-500 underline"
                onClick={() => setExpanded(expanded === idx ? null : idx)}
              >
                {expanded === idx ? "Hide Comments" : "Expand"}
              </button>
            </li>
          ))}
        </ul>
        {/* Comments for expanded post (scaffold) */}
        {expanded !== null && data.comments && (
          <div className="mt-2 ml-4">
            <h5 className="text-xs font-semibold mb-1 flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-blue-400" />
              Comments
            </h5>
            <ul className="space-y-1">
              {data.comments.map((c: any, idx: number) => (
                <li
                  key={c.id}
                  className="text-xs text-gray-700 dark:text-gray-200"
                >
                  <span className="font-semibold">{c.user}:</span> {c.text}{" "}
                  <span className="text-gray-400">
                    ({new Date(c.timestamp).toLocaleString()})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Leaderboard */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-400" />
          Leaderboard
        </h4>
        <ul className="space-y-1">
          {data.leaderboards.map((u: any, idx: number) => (
            <li key={u.user} className="flex items-center gap-2 text-xs">
              <span className="font-semibold">{u.user}</span>
              <span className="text-yellow-500 flex items-center gap-1">
                <Star className="h-3 w-3" />
                {u.upvotes}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {/* Moderation */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-400" />
          Moderation
        </h4>
        <ul className="space-y-1">
          {data.moderation.map((m: any, idx: number) => (
            <li key={idx} className="text-xs text-gray-700 dark:text-gray-200">
              Action: <span className="font-semibold">{m.action}</span> on post{" "}
              {m.postId} ({m.reason}){" "}
              <span className="text-gray-400">
                {new Date(m.timestamp).toLocaleString()}
              </span>
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
        More community features, moderation, and user profiles coming soon!
      </div>
    </div>
  );
}
