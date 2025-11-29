"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface TwitterPost {
  id: string;
  username: string;
  handle: string;
  content: string;
  timestamp: number;
  likes: number;
  retweets: number;
  sentiment: number;
  verified: boolean;
  followers: number;
}

interface TwitterMetrics {
  sentiment_score: number;
  mention_count: number;
  top_hashtags: { tag: string; count: number }[];
  top_posts: TwitterPost[];
  influential_users: {
    username: string;
    followers: number;
    engagement: number;
  }[];
}

interface TwitterFeedProps {
  data: TwitterMetrics;
  symbol: string;
}

export function TwitterFeed({ data, symbol }: TwitterFeedProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Twitter Activity</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-sm text-gray-400">Sentiment</div>
            <div
              className={`text-2xl font-bold ${
                data.sentiment_score > 60
                  ? "text-green-500"
                  : data.sentiment_score < 40
                    ? "text-red-500"
                    : "text-yellow-500"
              }`}
            >
              {data.sentiment_score}/100
            </div>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-sm text-gray-400">Mentions</div>
            <div className="text-2xl font-bold">
              {data.mention_count.toLocaleString()}
            </div>
          </div>

          <div className="bg-gray-800/30 p-4 rounded-lg">
            <div className="text-sm text-gray-400">Top Hashtags</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.top_hashtags.slice(0, 3).map((hashtag) => (
                <Badge key={hashtag.tag} variant="secondary">
                  #{hashtag.tag} ({hashtag.count})
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <h4 className="text-md font-medium mb-3">Top Posts</h4>
        <div className="space-y-4">
          {data.top_posts.map((post) => (
            <div
              key={post.id}
              className="border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-gray-700 w-10 h-10 flex items-center justify-center text-lg">
                  {post.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">{post.username}</span>
                    {post.verified && (
                      <span className="ml-1 text-blue-400">✓</span>
                    )}
                    <span className="text-gray-500 ml-2 text-sm">
                      @{post.handle}
                    </span>
                    <div className="ml-auto text-sm text-gray-500">
                      {new Date(post.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="mt-2">{post.content}</p>
                  <div className="flex gap-4 mt-3 text-sm text-gray-400">
                    <div>❤️ {post.likes}</div>
                    <div>🔄 {post.retweets}</div>
                    <div
                      className={`ml-auto ${
                        post.sentiment > 0.6
                          ? "text-green-500"
                          : post.sentiment < 0.4
                            ? "text-red-500"
                            : "text-yellow-500"
                      }`}
                    >
                      {post.sentiment > 0.6
                        ? "Positive"
                        : post.sentiment < 0.4
                          ? "Negative"
                          : "Neutral"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h4 className="text-md font-medium mt-6 mb-3">Influential Users</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.influential_users.map((user, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gray-800/30 p-3 rounded-lg"
            >
              <div className="rounded-full bg-gray-700 w-10 h-10 flex items-center justify-center text-lg">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-gray-400">
                  {user.followers.toLocaleString()} followers
                </div>
              </div>
              <div className="ml-auto">
                <Badge variant="secondary">
                  {user.engagement.toFixed(1)}% engagement
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
