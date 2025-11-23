"use client";

import React from "react";
import { SocialMediaDashboard } from "@/components/social/SocialMediaDashboard";
import { Card } from "@/components/ui/Card";

interface SocialPageProps {
  params: {
    symbol: string;
  };
}

export default function SocialPage({ params }: SocialPageProps) {
  const { symbol } = params;

  // Capitalize symbol for display
  const displaySymbol = symbol.toUpperCase();

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          {displaySymbol} Social Analytics
        </h1>
        <p className="text-gray-500">
          Track social media sentiment and engagement for {displaySymbol} across
          Twitter, Reddit, and news sources.
        </p>
      </div>

      <SocialMediaDashboard symbol={displaySymbol} />

      <div className="mt-8">
        <Card className="p-6">
          <h2 className="text-lg font-medium mb-2">About Social Analytics</h2>
          <p className="text-gray-500">
            Social analytics provide valuable insights into market sentiment and
            potential price movements. Data is collected from multiple sources
            including Twitter/X, Reddit, news outlets, and more. Sentiment
            analysis uses advanced machine learning models to determine the
            overall community sentiment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <h3 className="font-medium">Data Sources</h3>
              <ul className="text-sm text-gray-500 mt-1 list-disc list-inside">
                <li>Twitter/X social media</li>
                <li>Reddit communities</li>
                <li>Crypto news outlets</li>
                <li>Influencer analysis</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Analysis Methods</h3>
              <ul className="text-sm text-gray-500 mt-1 list-disc list-inside">
                <li>Natural language processing</li>
                <li>Machine learning models</li>
                <li>Sentiment scoring algorithms</li>
                <li>Engagement metrics analysis</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Trading Insights</h3>
              <ul className="text-sm text-gray-500 mt-1 list-disc list-inside">
                <li>Sentiment correlation with price</li>
                <li>Engagement to trading volume ratio</li>
                <li>Sentiment divergence signals</li>
                <li>Trend prediction indicators</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
