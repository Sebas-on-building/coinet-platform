import { useState, useEffect } from "react";

interface OnChainFlowProps {
  coinId: string;
}

interface OnChainData {
  block_time_in_minutes: number;
  hashing_algorithm: string;
  genesis_date: string;
  market_cap_rank: number;
  developer_data: {
    forks: number;
    stars: number;
    subscribers: number;
    total_issues: number;
    closed_issues: number;
    pull_requests_merged: number;
    pull_request_contributors: number;
    commit_count_4_weeks: number;
  };
  community_data: {
    twitter_followers: number;
    reddit_subscribers: number;
    telegram_channel_user_count: number;
  };
}

export function OnChainFlow({ coinId }: OnChainFlowProps) {
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true&sparkline=false`,
        );
        const result = await response.json();

        setData({
          block_time_in_minutes: result.block_time_in_minutes,
          hashing_algorithm: result.hashing_algorithm,
          genesis_date: result.genesis_date,
          market_cap_rank: result.market_cap_rank,
          developer_data: result.developer_data,
          community_data: result.community_data,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch on-chain data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [coinId]);

  if (loading)
    return <div className="text-gray-400">Loading on-chain data...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!data)
    return <div className="text-gray-400">No on-chain data available</div>;

  return (
    <div className="space-y-6">
      {/* Blockchain Info */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Blockchain Info</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Block Time</div>
            <div className="text-white font-semibold">
              {data.block_time_in_minutes} min
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Algorithm</div>
            <div className="text-white font-semibold">
              {data.hashing_algorithm || "N/A"}
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Genesis Date</div>
          <div className="text-white font-semibold">
            {data.genesis_date
              ? new Date(data.genesis_date).toLocaleDateString()
              : "N/A"}
          </div>
        </div>
      </div>

      {/* Developer Activity */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Developer Activity</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Forks</div>
            <div className="text-white font-semibold">
              {data.developer_data.forks.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Stars</div>
            <div className="text-white font-semibold">
              {data.developer_data.stars.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Contributors</div>
            <div className="text-white font-semibold">
              {data.developer_data.pull_request_contributors.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Commits (4w)</div>
            <div className="text-white font-semibold">
              {data.developer_data.commit_count_4_weeks.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Community Stats */}
      <div className="space-y-4">
        <h4 className="text-gray-300 text-sm">Community Stats</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Twitter</div>
            <div className="text-white font-semibold">
              {data.community_data.twitter_followers.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Reddit</div>
            <div className="text-white font-semibold">
              {data.community_data.reddit_subscribers.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Telegram</div>
            <div className="text-white font-semibold">
              {data.community_data.telegram_channel_user_count.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-gray-400 text-sm">Market Rank</div>
            <div className="text-white font-semibold">
              #{data.market_cap_rank}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
