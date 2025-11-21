import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { api, SimpleCoinData } from "@/services/api";

interface ExecutionProps {
  coinId?: string;
}

interface Trade {
  id: string;
  coinId: string;
  symbol: string;
  type: "buy" | "sell";
  amount: string;
  price: string;
  status: "completed" | "pending" | "failed";
  timestamp: string;
}

const MOCK_TRADES: Trade[] = [
  {
    id: "1",
    coinId: "bitcoin",
    symbol: "BTC",
    type: "buy",
    amount: "0.5 BTC",
    price: "$43,250",
    status: "completed",
    timestamp: "2 min ago",
  },
  {
    id: "2",
    coinId: "ethereum",
    symbol: "ETH",
    type: "sell",
    amount: "2.5 ETH",
    price: "$2,280",
    status: "completed",
    timestamp: "5 min ago",
  },
  {
    id: "3",
    coinId: "bitcoin",
    symbol: "BTC",
    type: "buy",
    amount: "1.0 BTC",
    price: "$43,150",
    status: "pending",
    timestamp: "just now",
  },
  {
    id: "4",
    coinId: "tether",
    symbol: "USDT",
    type: "sell",
    amount: "100 USDT",
    price: "$1.00",
    status: "failed",
    timestamp: "10 min ago",
  },
];

export function Execution({ coinId = "bitcoin" }: ExecutionProps) {
  const [coinData, setCoinData] = useState<SimpleCoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTrades(MOCK_TRADES.filter((t) => t.coinId === coinId));
    api
      .getCoinData(coinId)
      .then((data) => setCoinData(data))
      .catch(() => setError("Failed to fetch coin data"))
      .finally(() => setLoading(false));
  }, [coinId]);

  const getStatusColor = (status: Trade["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTypeColor = (type: Trade["type"]) => {
    return type === "buy" ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center py-8">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Execution</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Last Trade</span>
          <span className="font-medium">
            ${coinData?.current_price?.toLocaleString?.()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">24h Volume</span>
          <span className="font-medium">
            ${coinData?.total_volume?.toLocaleString?.()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Open Orders</span>
          <span className="font-medium">Loading...</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Success Rate</span>
          <span className="font-medium text-green-500">Loading...</span>
        </div>
      </div>
      <div className="space-y-4 mt-4">
        {trades.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No trades for this coin.
          </div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.id}
              className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-medium capitalize ${getTypeColor(trade.type)}`}
                  >
                    {trade.type}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {trade.amount}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {trade.timestamp}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {trade.price}
                </span>
                <span
                  className={`text-sm font-medium ${getStatusColor(trade.status)}`}
                >
                  {trade.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
