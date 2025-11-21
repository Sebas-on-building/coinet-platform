"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ScaleIcon,
} from "@heroicons/react/24/solid";

interface PortfolioAsset {
  id: string;
  symbol: string;
  amount: number;
  value_usd: number;
  price_change_24h: number;
  allocation: number;
  pnl: {
    day: number;
    week: number;
    month: number;
  };
}

interface PortfolioMetrics {
  total_value: number;
  daily_change: number;
  best_performer: string;
  worst_performer: string;
  risk_score: number;
  sharpe_ratio: number;
}

const MOCK_ASSETS = [
  { id: "bitcoin", symbol: "BTC", amount: 0.5 },
  { id: "ethereum", symbol: "ETH", amount: 5.2 },
  { id: "solana", symbol: "SOL", amount: 85.5 },
];

export function PortfolioAnalytics({ coinId }: { coinId: string }) {
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all(
      MOCK_ASSETS.map((asset) =>
        fetch(`https://api.coingecko.com/api/v3/coins/${asset.id}`)
          .then((res) => res.json())
          .then((data) => ({
            id: asset.id,
            symbol: asset.symbol,
            amount: asset.amount,
            value_usd:
              asset.amount * (data.market_data?.current_price?.usd || 0),
            price_change_24h:
              data.market_data?.price_change_percentage_24h || 0,
            allocation: 0, // will calculate below
            pnl: {
              day: data.market_data?.price_change_percentage_24h || 0,
              week: 0,
              month: 0,
            },
          })),
      ),
    )
      .then((assetData) => {
        const total_value = assetData.reduce((sum, a) => sum + a.value_usd, 0);
        const assetsWithAlloc = assetData.map((a) => ({
          ...a,
          allocation: total_value > 0 ? (a.value_usd / total_value) * 100 : 0,
        }));
        // Find best/worst performer by 24h change
        const best = assetsWithAlloc.reduce((a, b) =>
          a.price_change_24h > b.price_change_24h ? a : b,
        );
        const worst = assetsWithAlloc.reduce((a, b) =>
          a.price_change_24h < b.price_change_24h ? a : b,
        );
        setAssets(assetsWithAlloc);
        setMetrics({
          total_value,
          daily_change:
            (assetsWithAlloc.reduce(
              (sum, a) => sum + (a.value_usd * a.price_change_24h) / 100,
              0,
            ) /
              (total_value || 1)) *
            100,
          best_performer: best.symbol,
          worst_performer: worst.symbol,
          risk_score: 7.2, // placeholder
          sharpe_ratio: 1.85, // placeholder
        });
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch portfolio data");
        setLoading(false);
      });
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString("en-US");
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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

  if (error || !metrics) {
    return (
      <div className="text-red-400 text-center py-8">{error || "No data"}</div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass" hover className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Total Value</h4>
              <p className="text-2xl font-bold">
                ${formatNumber(metrics.total_value)}
              </p>
              <Badge
                variant={metrics.daily_change >= 0 ? "success" : "danger"}
                icon={
                  metrics.daily_change >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )
                }
              >
                {metrics.daily_change >= 0 ? "+" : ""}
                {metrics.daily_change.toFixed(2)}% today
              </Badge>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <ScaleIcon className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Risk Score</h4>
              <p className="text-2xl font-bold">{metrics.risk_score}/10</p>
              <span className="text-sm text-gray-500">
                Sharpe Ratio: {metrics.sharpe_ratio}
              </span>
            </div>
          </div>
        </Card>

        <Card variant="glass" hover className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h4 className="text-sm text-gray-500 mb-1">Performance</h4>
              <div className="space-y-1">
                <Badge variant="success">Best: {metrics.best_performer}</Badge>
                <Badge variant="danger">Worst: {metrics.worst_performer}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Assets Table */}
      <Card variant="glass" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/10">
            <thead className="bg-gray-50/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value (USD)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24h Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/10">
              {assets.map((asset) => (
                <tr
                  key={asset.symbol}
                  className="hover:bg-gray-50/5 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">{asset.symbol}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {asset.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${formatNumber(asset.value_usd)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge
                      variant={
                        asset.price_change_24h >= 0 ? "success" : "danger"
                      }
                      icon={
                        asset.price_change_24h >= 0 ? (
                          <ArrowUpIcon className="h-4 w-4" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4" />
                        )
                      }
                    >
                      {asset.price_change_24h >= 0 ? "+" : ""}
                      {asset.price_change_24h.toFixed(2)}%
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full bg-gray-200/10 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${asset.allocation}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 mt-1">
                      {asset.allocation.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="secondary"
          leftIcon={<ChartBarIcon className="h-5 w-5" />}
        >
          Export Report
        </Button>
        <Button
          variant="gradient"
          leftIcon={<CurrencyDollarIcon className="h-5 w-5" />}
        >
          Rebalance Portfolio
        </Button>
      </div>
    </div>
  );
}
