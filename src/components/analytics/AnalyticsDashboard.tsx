"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs2 as Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TechnicalIndicators } from "./TechnicalIndicators";

interface AnalyticsDashboardProps {
  symbol: string;
}

export function AnalyticsDashboard({ symbol }: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState("1d");

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-6 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="correlation">Correlation</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TechnicalIndicators symbol={symbol} timeframe={timeframe} />
            <Card className="p-4">
              <h3 className="text-lg font-medium">Sentiment Analysis</h3>
              <p className="text-gray-400 mt-2">
                Sentiment analysis for {symbol} would display here.
              </p>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="text-lg font-medium">Market Heatmap</h3>
            <p className="text-gray-400 mt-2">
              Market heatmap would display here.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium">Advanced Analytics</h3>
            <p className="text-gray-400 mt-2">
              Advanced analytics would display here
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium">Market Heatmap</h3>
            <p className="text-gray-400 mt-2">
              Market heatmap would display here.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium">Correlation Matrix</h3>
            <p className="text-gray-400 mt-2">
              Correlation matrix for{" "}
              {["BTC", "ETH", "BNB", "XRP", "ADA"].join(", ")} would display
              here.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium">Volume Profile</h3>
            <p className="text-gray-400 mt-2">
              Volume profile for {symbol} would display here.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <Card className="p-4">
            <h3 className="text-lg font-medium">Sentiment Analysis</h3>
            <p className="text-gray-400 mt-2">
              Sentiment analysis for {symbol} would display here.
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-4 col-span-full lg:col-span-1">
          <h3 className="text-lg font-medium mb-3">Market Timeframe</h3>
          <div className="grid grid-cols-4 gap-2">
            {["15m", "1h", "4h", "1d", "1w"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  timeframe === tf
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800/40 text-gray-400 hover:bg-gray-800/60"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
