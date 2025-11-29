import { useQuery } from "@tanstack/react-query";
import { getDeepSocialStats } from "@/services/social";
import { useState } from "react";
import {
  Info,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Sparkles,
  MessageCircle,
  Users,
  TrendingUp,
  Hash,
  UserCheck,
  Share2,
  Heart,
  MessageSquare,
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

export function CoinProfileSocialDeep({ coinId }: { coinId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["deep-social", coinId],
    queryFn: () => getDeepSocialStats(coinId),
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading)
    return <div className="text-gray-400">Loading deep social data...</div>;
  if (error || !data)
    return <div className="text-red-400">Failed to load social data.</div>;

  const metrics = [
    {
      key: "sentimentScore",
      label: "Sentiment Score",
      icon: <Sparkles className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.sentimentScore,
      definition: "Overall social sentiment score (0-1 scale).",
    },
    {
      key: "communityGrowth",
      label: "Community Growth",
      icon: <TrendingUp className="h-4 w-4 text-green-400" />,
      color: "#22c55e",
      value: data.communityGrowth,
      definition: "Growth rate of social community.",
    },
    {
      key: "viralityScore",
      label: "Virality Score",
      icon: <Share2 className="h-4 w-4 text-pink-400" />,
      color: "#f43f5e",
      value: data.viralityScore,
      definition: "Virality of social content.",
    },
    {
      key: "twitterFollowers",
      label: "Twitter Followers",
      icon: <Users className="h-4 w-4 text-blue-400" />,
      color: "#2563eb",
      value: data.twitterFollowers,
      definition: "Number of Twitter followers.",
    },
    {
      key: "redditSubscribers",
      label: "Reddit Subs",
      icon: <Users className="h-4 w-4 text-orange-400" />,
      color: "#f59e42",
      value: data.redditSubscribers,
      definition: "Number of Reddit subscribers.",
    },
    {
      key: "telegramMembers",
      label: "Telegram Members",
      icon: <Users className="h-4 w-4 text-cyan-400" />,
      color: "#06b6d4",
      value: data.telegramMembers,
      definition: "Number of Telegram members.",
    },
    {
      key: "discordMembers",
      label: "Discord Members",
      icon: <Users className="h-4 w-4 text-indigo-400" />,
      color: "#6366f1",
      value: data.discordMembers,
      definition: "Number of Discord members.",
    },
    {
      key: "youtubeSubscribers",
      label: "YouTube Subs",
      icon: <Users className="h-4 w-4 text-red-400" />,
      color: "#ef4444",
      value: data.youtubeSubscribers,
      definition: "Number of YouTube subscribers.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Social Metrics <BarChart3 className="h-5 w-5 text-blue-400" />
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((m) => (
          <div
            key={m.key}
            className="relative bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow flex flex-col gap-2 border border-transparent"
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
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {m.value !== undefined && m.value !== null
                  ? m.value.toLocaleString()
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">Source: Aggregated</span>
            </div>
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
      {/* Trending Topics, Influencers, Hashtags */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-400" />
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
            <UserCheck className="h-4 w-4 text-green-400" />
            Influencer Mentions
          </h4>
          <ul className="space-y-1">
            {data.influencerMentions.map((inf: any, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span className="font-semibold">{inf.name}</span>
                <span className="text-gray-500">({inf.count} mentions)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Engagement & Hashtags */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-400" />
            Engagement
          </h4>
          <ul className="space-y-1 text-xs">
            <li>
              Likes:{" "}
              <span className="font-semibold">
                {data.engagement.likes?.toLocaleString() ?? "N/A"}
              </span>
            </li>
            <li>
              Shares:{" "}
              <span className="font-semibold">
                {data.engagement.shares?.toLocaleString() ?? "N/A"}
              </span>
            </li>
            <li>
              Comments:{" "}
              <span className="font-semibold">
                {data.engagement.comments?.toLocaleString() ?? "N/A"}
              </span>
            </li>
            <li>
              Total Engagement:{" "}
              <span className="font-semibold">
                {data.engagement.totalEngagement?.toLocaleString() ?? "N/A"}
              </span>
            </li>
            <li>
              Engagement Rate:{" "}
              <span className="font-semibold">
                {(data.engagement.engagementRate * 100).toFixed(2)}%
              </span>
            </li>
          </ul>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/30 rounded p-4 shadow border border-transparent">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Hash className="h-4 w-4 text-blue-400" />
            Top Hashtags
          </h4>
          <ul className="flex flex-wrap gap-2">
            {data.topHashtags.map((h: any, idx: number) => (
              <li
                key={idx}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium"
              >
                #{h.tag} <span className="text-gray-400">({h.count})</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Top Posts */}
      <div className="mt-8">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" />
          Top Social Posts
        </h4>
        <ul className="space-y-2">
          {data.topPosts.map((post: any, idx: number) => (
            <li
              key={idx}
              className="bg-gray-50 dark:bg-gray-800/30 rounded p-3 border border-transparent"
            >
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="font-semibold">{post.author}</span>
                <span className="text-gray-400">on {post.platform}</span>
                <span className="ml-auto text-gray-400">
                  {new Date(post.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-sm mb-1">
                {post.content.length > 180
                  ? post.content.slice(0, 180) + "..."
                  : post.content}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Likes: {post.likes}</span>
                <span>Replies: {post.replies}</span>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline ml-auto"
                >
                  View
                </a>
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
