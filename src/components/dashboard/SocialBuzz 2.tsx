"use client";

import { useState, useEffect } from "react";
import { BarChart2, MessageCircle, Flame, Heart } from "lucide-react";

interface SocialBuzzProps {
  coinId: string;
}

interface SocialData {
  twitter_followers: number;
  twitter_following: number;
  twitter_lists: number;
  twitter_favourites: number;
  twitter_statuses: number;
  reddit_subscribers: number;
  reddit_active_users: number;
  reddit_posts_per_day: number;
  reddit_comments_per_day: number;
  reddit_posts_per_hour: number;
  reddit_comments_per_hour: number;
  telegram_channel_user_count: number;
}

export function SocialBuzz({ coinId }: SocialBuzzProps) {
  const [data, setData] = useState<SocialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false&sparkline=false`,
        );
        const result = await response.json();

        setData(result.community_data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch social data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId]);

  if (loading)
    return <div className="text-gray-400">Loading social data...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data)
    return <div className="text-gray-400">No social data available</div>;

  return (
    <div className="space-y-6">
      {/* Twitter Stats */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          Twitter
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Followers</div>
            <div className="text-white font-semibold">
              {(data.twitter_followers ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Following</div>
            <div className="text-white font-semibold">
              {(data.twitter_following ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Lists</div>
            <div className="text-white font-semibold">
              {(data.twitter_lists ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Favorites</div>
            <div className="text-white font-semibold">
              {(data.twitter_favourites ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Reddit Stats */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          Reddit
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Subscribers</div>
            <div className="text-white font-semibold">
              {(data.reddit_subscribers ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Active Users</div>
            <div className="text-white font-semibold">
              {(data.reddit_active_users ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Posts/Day</div>
            <div className="text-white font-semibold">
              {(data.reddit_posts_per_day ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Comments/Day</div>
            <div className="text-white font-semibold">
              {(data.reddit_comments_per_day ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Stats */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-blue-500" />
          Telegram
        </h4>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Channel Members</div>
          <div className="text-white font-semibold">
            {(data.telegram_channel_user_count ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-400" />
          Engagement
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Posts/Hour</div>
            <div className="text-white font-semibold">
              {(data.reddit_posts_per_hour ?? 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Comments/Hour</div>
            <div className="text-white font-semibold">
              {(data.reddit_comments_per_hour ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
