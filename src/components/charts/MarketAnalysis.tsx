import React, { useState } from "react";
import { AdvancedMarketChart } from "./AdvancedMarketChart";
import { TechnicalIndicators } from "./TechnicalIndicators";
import { LiquidationHeatmap } from "./LiquidationHeatmap";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FireIcon,
  ChartPieIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export function MarketAnalysis() {
  const [selectedAsset, setSelectedAsset] = useState("bitcoin");
  const [timeframe, setTimeframe] = useState("1M");
  const [activeTab, setActiveTab] = useState("chart");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4">
        <Select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="min-w-[150px]"
        >
          <option value="bitcoin">Bitcoin</option>
          <option value="ethereum">Ethereum</option>
          <option value="solana">Solana</option>
        </Select>

        <Tabs value={timeframe} onValueChange={setTimeframe}>
          <TabsList>
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
            <TabsTrigger value="3M">3M</TabsTrigger>
            <TabsTrigger value="1Y">1Y</TabsTrigger>
            <TabsTrigger value="ALL">ALL</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="indicators">Indicators</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="liquidations">Liquidations</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TabsContent value="chart">
        <AdvancedMarketChart />
      </TabsContent>

      <TabsContent value="indicators">
        <TechnicalIndicators asset={selectedAsset} timeframe={timeframe} />
      </TabsContent>

      <TabsContent value="analysis">
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">Market Analysis</h3>
            <p className="text-gray-500">
              {selectedAsset.toUpperCase()} - {timeframe}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Price Action</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Trend</span>
                  <Badge variant="success">
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                    BULLISH
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Support Level</span>
                  <span className="font-medium">$24,500</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Resistance Level</span>
                  <span className="font-medium">$26,800</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Market Sentiment</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Overall Sentiment</span>
                  <Badge variant="success">
                    <FireIcon className="w-4 h-4 mr-1" />
                    BULLISH
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Social Sentiment</span>
                  <span className="font-medium">65% Positive</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>News Impact</span>
                  <span className="font-medium">Moderate</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Volume Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Volume Trend</span>
                  <Badge variant="success">
                    <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                    INCREASING
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Buy/Sell Ratio</span>
                  <span className="font-medium">1.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Liquidity</span>
                  <span className="font-medium">High</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Market Structure</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Market Phase</span>
                  <Badge variant="success">
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    ACCUMULATION
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Volatility</span>
                  <span className="font-medium">Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Market Dominance</span>
                  <span className="font-medium">45%</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="liquidations">
        <LiquidationHeatmap />
      </TabsContent>
    </div>
  );
}
