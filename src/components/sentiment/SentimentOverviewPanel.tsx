import React from "react";

interface SentimentOverviewProps {
  data: {
    market_sentiment: number;
    total_volume: number;
    bullish_percentage: number;
    bearish_percentage: number;
    top_trending_assets: string[];
  };
}

/**
 * Component that displays the overall market sentiment metrics
 */
const SentimentOverviewPanel: React.FC<SentimentOverviewProps> = ({ data }) => {
  // Helper function to format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  // Determine sentiment color and label
  const getSentimentInfo = (sentiment: number) => {
    if (sentiment >= 0.7)
      return { color: "text-green-600", label: "Very Bullish" };
    if (sentiment >= 0.55) return { color: "text-green-500", label: "Bullish" };
    if (sentiment >= 0.45) return { color: "text-gray-500", label: "Neutral" };
    if (sentiment >= 0.3) return { color: "text-red-500", label: "Bearish" };
    return { color: "text-red-600", label: "Very Bearish" };
  };

  const sentimentInfo = getSentimentInfo(data.market_sentiment);

  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-hidden">
      <h2 className="text-lg font-semibold mb-4">Market Sentiment</h2>

      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Overall Sentiment</span>
          <span className={`text-sm font-bold ${sentimentInfo.color}`}>
            {sentimentInfo.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              data.market_sentiment >= 0.5 ? "bg-green-500" : "bg-red-500"
            }`}
            style={{ width: `${data.market_sentiment * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="flex justify-between mb-4">
        <div className="text-center">
          <div className="text-sm text-gray-500">Bullish</div>
          <div className="text-lg font-semibold text-green-500">
            {data.bullish_percentage.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Bearish</div>
          <div className="text-lg font-semibold text-red-500">
            {data.bearish_percentage.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Volume</div>
          <div className="text-lg font-semibold">
            {formatNumber(data.total_volume)}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Trending Assets</h3>
        <div className="flex flex-wrap gap-2">
          {data.top_trending_assets.map((asset, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded"
            >
              ${asset}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SentimentOverviewPanel;
