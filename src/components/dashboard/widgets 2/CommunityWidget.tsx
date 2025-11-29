import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * CommunityWidget
 * - World-class UI/UX, a11y, microinteractions, analytics
 */
interface CommunityWidgetProps {
  config?: {
    platform?: string;
    metric?: string;
    timeframe?: string;
  };
  analyticsEvent?: string;
}

export default function CommunityWidget({
  config,
  analyticsEvent,
}: CommunityWidgetProps) {
  // Placeholder data
  const data = {
    trendingPosts: [
      { title: "BTC to $100k?", author: "user123", upvotes: 120, comments: 34 },
      { title: "ETH L2 explosion", author: "alice", upvotes: 98, comments: 21 },
      {
        title: "SOL outage explained",
        author: "bob",
        upvotes: 76,
        comments: 15,
      },
    ],
    leaderboard: [
      { user: "user123", score: 320 },
      { user: "alice", score: 290 },
      { user: "bob", score: 250 },
    ],
    engagement: { posts: 120, comments: 340, upvotes: 2100 },
    anomaly: {
      label: "Upvote Spike",
      description: "BTC post upvotes up 300% in 24h",
    },
    aiExplainer:
      "Community engagement is high, with BTC topics leading. Leaderboard users are driving most discussions.",
  };

  useEffect(() => {
    if (analyticsEvent && (window as any)?.gtag) {
      (window as any).gtag("event", analyticsEvent, {
        label: "CommunityWidget",
      });
    }
  }, [analyticsEvent]);

  return (
    <Card
      variant="glass"
      hover
      analyticsEvent={analyticsEvent}
      aria-label="Community"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold" tabIndex={0}>
          Community
        </h2>
        <div className="flex gap-2">
          {config?.platform && <Badge variant="info">{config.platform}</Badge>}
          {config?.timeframe && (
            <Badge variant="primary">{config.timeframe}</Badge>
          )}
        </div>
      </div>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="Trending Posts"
      >
        <div className="font-semibold mb-2">Trending Posts</div>
        <ul className="space-y-2">
          {data.trendingPosts.map((post, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 border-b pb-2 last:border-b-0"
            >
              <span className="font-medium">{post.title}</span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>by {post.author}</span>
                <span>⬆️ {post.upvotes}</span>
                <span>💬 {post.comments}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card
        variant="default"
        className="p-4 mb-2"
        hover
        aria-label="Leaderboard & Engagement"
      >
        <div className="font-semibold mb-2">Leaderboard</div>
        <ul className="space-y-1">
          {data.leaderboard.map((entry, i) => (
            <li key={i} className="flex justify-between text-xs">
              <span className="font-semibold">{entry.user}</span>
              <span className="text-blue-700">{entry.score}</span>
            </li>
          ))}
        </ul>
        <div className="font-semibold mt-3 mb-1">Engagement</div>
        <div className="flex gap-4 text-xs text-gray-600">
          <span>Posts: {data.engagement.posts}</span>
          <span>Comments: {data.engagement.comments}</span>
          <span>Upvotes: {data.engagement.upvotes}</span>
        </div>
      </Card>
      <Card
        variant="warning"
        className="p-4 mb-2"
        hover
        aria-label="Anomaly Detection"
      >
        <div className="font-semibold text-yellow-700 mb-1">
          Anomaly Detection
        </div>
        <div className="text-sm text-yellow-800">
          <span className="font-medium">{data.anomaly.label}:</span>{" "}
          {data.anomaly.description}
        </div>
      </Card>
      <Card
        variant="primary"
        className="p-4 mb-2"
        hover
        aria-label="AI Explainer"
      >
        <div className="font-semibold text-blue-700 mb-1">AI Explainer</div>
        <div className="text-sm text-blue-800">{data.aiExplainer}</div>
      </Card>
      <Card
        variant="glass"
        className="p-4 mt-2"
        hover
        aria-label="Community Q&A"
      >
        <div className="font-semibold mb-1">Community Q&amp;A</div>
        <div className="text-xs text-gray-500">
          Coming soon: Ask questions and get AI-powered answers about community
          engagement.
        </div>
      </Card>
    </Card>
  );
}
