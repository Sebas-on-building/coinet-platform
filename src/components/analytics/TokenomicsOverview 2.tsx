"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AdvancedChart } from "@/components/charts/AdvancedChart";
import { api } from "@/services/api";
import {
  CircleStackIcon,
  ChartPieIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface TokenMetric {
  title: string;
  value: string;
  change: number;
  icon: any;
}

interface DistributionItem {
  time: string;
  value: number;
  category: string;
  amount: number;
}

interface TokenomicsOverviewProps {
  symbol: string;
}

export function TokenomicsOverview({ symbol }: TokenomicsOverviewProps) {
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.getTokenomics(symbol.toLowerCase());
        setTokenData(data);
      } catch (error) {
        console.error("Failed to fetch tokenomics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [symbol]);

  const keyMetrics: TokenMetric[] = tokenData
    ? [
        {
          title: "Market Cap",
          value: `$${(tokenData.market_cap / 1e9).toFixed(2)}B`,
          change: 3.2,
          icon: CurrencyDollarIcon,
        },
        {
          title: "Circulating Supply",
          value: `${(tokenData.circulating_supply / 1e6).toFixed(2)}M`,
          change: 0.5,
          icon: CircleStackIcon,
        },
        {
          title: "Total Holders",
          value: tokenData.holders.toLocaleString(),
          change: 2.8,
          icon: UserGroupIcon,
        },
        {
          title: "Fully Diluted Val.",
          value: `$${(tokenData.fully_diluted_valuation / 1e9).toFixed(2)}B`,
          change: 1.5,
          icon: ChartPieIcon,
        },
      ]
    : [];

  const distributionData =
    tokenData?.distribution.map(
      (item: any): DistributionItem => ({
        time: new Date().toISOString(),
        value: item.percentage,
        category: item.category,
        amount: item.amount,
      }),
    ) || [];

  // Create stacked area chart data
  const stackedDistributionData = distributionData.map(
    (item: DistributionItem) => ({
      time: item.time,
      value: item.value,
      additional: {
        category: item.category,
        amount: item.amount,
      },
    }),
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <Card key={index} variant="glass" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{metric.title}</p>
                <p className="text-2xl font-bold mt-1">{metric.value}</p>
              </div>
              <metric.icon className="h-8 w-8 text-gray-400" />
            </div>
            <div className="mt-2">
              <Badge
                variant={metric.change >= 0 ? "success" : "danger"}
                icon={<ChartPieIcon className="h-4 w-4" />}
              >
                {metric.change >= 0 ? "+" : ""}
                {metric.change}%
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Distribution Chart */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-6">Token Distribution</h3>
        <AdvancedChart
          data={stackedDistributionData}
          height={400}
          overlays={[
            {
              name: "Distribution",
              type: "Line",
              data: stackedDistributionData,
              color: "#3B82F6",
            },
          ]}
        />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {distributionData.map((item: DistributionItem, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full bg-blue-${(index + 3) * 100}`}
              />
              <span className="text-sm">
                {item.category} ({item.value.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Supply Schedule */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Supply Schedule</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg">
            <div>
              <p className="text-sm text-gray-400">Current Supply</p>
              <p className="text-lg font-medium mt-1">
                {tokenData?.circulating_supply.toLocaleString()} tokens
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Max Supply</p>
              <p className="text-lg font-medium mt-1">
                {tokenData?.max_supply
                  ? tokenData.max_supply.toLocaleString()
                  : "Unlimited"}{" "}
                tokens
              </p>
            </div>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-blue-400">
                  Supply Progress
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-blue-400">
                  {tokenData?.max_supply
                    ? `${((tokenData.circulating_supply / tokenData.max_supply) * 100).toFixed(2)}%`
                    : "N/A"}
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-800/30">
              <div
                style={{
                  width: tokenData?.max_supply
                    ? `${(tokenData.circulating_supply / tokenData.max_supply) * 100}%`
                    : "100%",
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Holder Distribution */}
      <Card variant="glass" className="p-6">
        <h3 className="text-lg font-medium mb-4">Holder Distribution</h3>
        <div className="space-y-4">
          {tokenData?.distribution.map((item: any, index: number) => (
            <div key={index} className="p-4 bg-gray-800/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.category}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {item.amount.toLocaleString()} tokens
                  </p>
                </div>
                <Badge variant="default">{item.percentage.toFixed(2)}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
