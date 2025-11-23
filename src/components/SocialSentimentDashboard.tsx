import React, { useState, useEffect } from "react";
import { SocialSentimentService } from "../services/socialSentimentService";
import SentimentOverviewPanel from "./sentiment/SentimentOverviewPanel";
import InfluencerTrackingPanel from "./sentiment/InfluencerTrackingPanel";
import SentimentTrendsChart from "./sentiment/SentimentTrendsChart";
import SocialPostsFeed from "./sentiment/SocialPostsFeed";
import AssetSentimentPanel from "./sentiment/AssetSentimentPanel";

/**
 * Dashboard for social sentiment analysis and tracking
 */
const SocialSentimentDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overallSentiment, setOverallSentiment] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [assetSentiment, setAssetSentiment] = useState<any>(null);
  const [topInfluencers, setTopInfluencers] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // seconds
  const [error, setError] = useState<string | null>(null);

  // Initialize sentiment service
  const sentimentService = SocialSentimentService.getInstance();

  // Load initial data and set up real-time updates
  useEffect(() => {
    let subscriptionId: string | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load all data in parallel
        const [overallData, assetData, influencers, posts] = await Promise.all([
          sentimentService.getOverallSentiment(),
          sentimentService.getAssetSentiment(selectedAsset),
          sentimentService.getTopInfluencers(undefined, 10),
          sentimentService.getRecentPosts(selectedAsset, 20),
        ]);

        // Update state with data
        setOverallSentiment(overallData);
        setAssetSentiment(assetData);
        setTopInfluencers(influencers);
        setRecentPosts(posts);
        setError(null);
      } catch (err) {
        console.error("Error loading sentiment data:", err);
        setError("Failed to load sentiment data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    // Initial data load
    loadData();

    // Subscribe to real-time updates
    subscriptionId = sentimentService.subscribeToSentimentUpdates(
      (data) => {
        // Handle real-time updates
        if (data.asset === selectedAsset) {
          // Update asset sentiment with new data
          setAssetSentiment((prev) => {
            if (!prev) return prev;

            // Update hourly sentiment data
            const updatedHourly = [...prev.hourly_sentiment];
            updatedHourly.push({
              timestamp: data.timestamp,
              sentiment: data.sentiment,
              volume: data.volume,
            });

            // Keep only the last 24 hours
            if (updatedHourly.length > 24) {
              updatedHourly.shift();
            }

            return {
              ...prev,
              overall_score: prev.overall_score * 0.9 + data.sentiment * 0.1, // Weighted update
              volume_24h: prev.volume_24h + data.volume,
              hourly_sentiment: updatedHourly,
            };
          });
        }

        // Update overall market sentiment (regardless of asset)
        setOverallSentiment((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            total_volume: prev.total_volume + data.volume,
            market_sentiment:
              prev.market_sentiment * 0.95 + ((data.sentiment + 1) / 2) * 0.05, // Weighted update
          };
        });
      },
      [selectedAsset, "BTC", "ETH", "SOL"],
    );

    // Set up refresh interval for data
    if (refreshInterval > 0) {
      intervalId = setInterval(loadData, refreshInterval * 1000);
    }

    // Cleanup
    return () => {
      if (subscriptionId) {
        sentimentService.unsubscribe(subscriptionId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedAsset, refreshInterval]);

  // Handle asset selection change
  const handleAssetChange = async (asset: string) => {
    setSelectedAsset(asset);
    setLoading(true);

    try {
      const [assetData, posts] = await Promise.all([
        sentimentService.getAssetSentiment(asset),
        sentimentService.getRecentPosts(asset, 20),
      ]);

      setAssetSentiment(assetData);
      setRecentPosts(posts);
      setError(null);
    } catch (err) {
      console.error(`Error loading data for ${asset}:`, err);
      setError(`Failed to load data for ${asset}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (interval: number) => {
    setRefreshInterval(interval);
  };

  // Render dashboard skeleton during loading
  if (loading && !overallSentiment) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Social Sentiment Dashboard</h1>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-200 h-40 rounded"></div>
            <div className="bg-gray-200 h-40 rounded"></div>
            <div className="bg-gray-200 h-40 rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-200 h-80 rounded"></div>
            <div className="bg-gray-200 h-80 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Social Sentiment Dashboard</h1>

        <div className="flex space-x-4 items-center">
          <div>
            <label htmlFor="asset-select" className="mr-2 text-sm">
              Asset:
            </label>
            <select
              id="asset-select"
              value={selectedAsset}
              onChange={(e) => handleAssetChange(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="SOL">Solana (SOL)</option>
              <option value="ADA">Cardano (ADA)</option>
              <option value="XRP">XRP</option>
              <option value="DOGE">Dogecoin (DOGE)</option>
            </select>
          </div>

          <div>
            <label htmlFor="refresh-interval" className="mr-2 text-sm">
              Refresh:
            </label>
            <select
              id="refresh-interval"
              value={refreshInterval}
              onChange={(e) =>
                handleRefreshIntervalChange(parseInt(e.target.value))
              }
              className="p-2 border rounded"
            >
              <option value="0">Manual</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
            </select>
          </div>

          <button
            onClick={() => handleAssetChange(selectedAsset)}
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {overallSentiment && <SentimentOverviewPanel data={overallSentiment} />}

        {assetSentiment && <AssetSentimentPanel data={assetSentiment} />}

        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Platform Distribution</h2>
          {overallSentiment && overallSentiment.platform_distribution && (
            <div className="h-32">
              {/* Platform distribution chart will be implemented in the child component */}
              <pre className="text-xs overflow-auto">
                {JSON.stringify(
                  overallSentiment.platform_distribution,
                  null,
                  2,
                )}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {assetSentiment && (
          <SentimentTrendsChart data={assetSentiment.hourly_sentiment} />
        )}

        {topInfluencers.length > 0 && (
          <InfluencerTrackingPanel influencers={topInfluencers} />
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Social Posts</h2>
        <SocialPostsFeed posts={recentPosts} />
      </div>
    </div>
  );
};

export default SocialSentimentDashboard;
