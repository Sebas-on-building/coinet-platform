"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { RealTimeMarketData } from "@/components/market/RealTimeMarketData";
import { api } from "@/services/api";

interface CorrelationMatrixProps {
  assets?: string[];
  timeframe?: "1d" | "1w" | "1m" | "3m" | "6m" | "1y";
  symbol?: string;
}

interface CorrelationData {
  matrix: Record<string, Record<string, number>>;
  timestamp: string;
}

interface EnhancedCorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
  strength: string;
  direction: "positive" | "negative";
  rSquared: number;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

interface TimeframeCorrelation {
  timeframe: "1d" | "1w" | "1m" | "3m" | "6m" | "1y";
  correlation: number;
}

export function CorrelationMatrix({
  assets = ["BTC", "ETH", "BNB", "XRP", "ADA"],
  timeframe = "1m",
  symbol,
}: CorrelationMatrixProps) {
  const [correlationData, setCorrelationData] =
    useState<CorrelationData | null>(null);
  const [correlations, setCorrelations] = useState<EnhancedCorrelationData[]>(
    [],
  );
  const [historicalCorrelations, setHistoricalCorrelations] = useState<
    TimeframeCorrelation[]
  >([]);
  const [topAssets] = useState([
    "BTC",
    "ETH",
    "BNB",
    "XRP",
    "ADA",
    "SOL",
    "DOT",
    "AVAX",
    "MATIC",
  ]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "1d" | "1w" | "1m" | "3m" | "6m" | "1y"
  >("1m");
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCorrelationData = async () => {
      try {
        setLoading(true);
        // In a real implementation, this would be an API call
        // const response = await api.get('/analytics/correlation', { assets, timeframe });

        // Mock data for demonstration
        const mockData: CorrelationData = {
          matrix: {
            BTC: { BTC: 1, ETH: 0.82, BNB: 0.75, XRP: 0.62, ADA: 0.7 },
            ETH: { BTC: 0.82, ETH: 1, BNB: 0.78, XRP: 0.65, ADA: 0.72 },
            BNB: { BTC: 0.75, ETH: 0.78, BNB: 1, XRP: 0.58, ADA: 0.64 },
            XRP: { BTC: 0.62, ETH: 0.65, BNB: 0.58, XRP: 1, ADA: 0.55 },
            ADA: { BTC: 0.7, ETH: 0.72, BNB: 0.64, XRP: 0.55, ADA: 1 },
          },
          timestamp: new Date().toISOString(),
        };

        setCorrelationData(mockData);
      } catch (error) {
        console.error("Error fetching correlation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCorrelationData();
  }, [assets, timeframe]);

  // Advanced correlation data for expanded view
  useEffect(() => {
    if (!symbol) return;

    // In a real implementation, this would fetch data from an API
    const generateMockData = () => {
      const data: EnhancedCorrelationData[] = [];
      const baseCorrelation = 0.85;

      topAssets.forEach((asset) => {
        if (asset === symbol) return;
        const correlation = baseCorrelation - Math.random() * 0.3;
        data.push({
          asset1: symbol,
          asset2: asset,
          correlation,
          strength:
            correlation > 0.7
              ? "strong"
              : correlation > 0.4
                ? "moderate"
                : "weak",
          direction: correlation >= 0 ? "positive" : "negative",
          rSquared: correlation * correlation,
          pValue: Math.random() * 0.05,
          confidenceInterval: {
            lower: correlation - 0.1,
            upper: correlation + 0.1,
          },
        });
      });

      return data;
    };

    const generateHistoricalData = () => {
      const timeframes: ("1d" | "1w" | "1m" | "3m" | "6m" | "1y")[] = [
        "1d",
        "1w",
        "1m",
        "3m",
        "6m",
        "1y",
      ];
      return timeframes.map((timeframe) => ({
        timeframe,
        correlation: 0.5 + Math.random() * 0.5,
      }));
    };

    setCorrelations(generateMockData());
    setHistoricalCorrelations(generateHistoricalData());
  }, [symbol, selectedTimeframe, topAssets]);

  const getCorrelationColor = (value: number) => {
    if (value >= 0.8) return "bg-green-700/80";
    if (value >= 0.6) return "bg-green-600/70";
    if (value >= 0.4) return "bg-yellow-600/60";
    if (value >= 0.2) return "bg-yellow-700/50";
    if (value >= 0) return "bg-gray-600/40";
    if (value >= -0.2) return "bg-gray-600/40";
    if (value >= -0.4) return "bg-orange-700/50";
    if (value >= -0.6) return "bg-orange-600/60";
    return "bg-red-600/70";
  };

  const getStatisticalSignificance = (pValue: number): string => {
    if (pValue < 0.01) return "Highly Significant";
    if (pValue < 0.05) return "Significant";
    return "Not Significant";
  };

  // Simple view rendering
  if (!symbol) {
    if (loading) {
      return (
        <Card className="p-4">
          <div className="animate-pulse h-64 w-full bg-gray-800/50 rounded-lg"></div>
        </Card>
      );
    }

    if (!correlationData) {
      return (
        <Card className="p-4">
          <div className="text-center text-gray-400">
            No correlation data available
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-4">Asset Correlation Matrix</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-2 border-b border-gray-700"></th>
                {assets.map((asset) => (
                  <th
                    key={asset}
                    className="px-2 py-2 text-sm font-medium text-gray-300 border-b border-gray-700"
                  >
                    {asset}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset}>
                  <td className="px-2 py-2 text-sm font-medium text-gray-300 border-b border-gray-700">
                    {asset}
                  </td>
                  {assets.map((correlatedAsset) => (
                    <td
                      key={`${asset}-${correlatedAsset}`}
                      className={`px-2 py-2 text-center border-b border-gray-700 ${getCorrelationColor(
                        correlationData.matrix[asset][correlatedAsset],
                      )}`}
                    >
                      {correlationData.matrix[asset][correlatedAsset].toFixed(
                        2,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-400 text-right">
          Last updated: {new Date(correlationData.timestamp).toLocaleString()}
        </div>
      </Card>
    );
  }

  // Enhanced view with symbol-specific data
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div className="space-x-2">
          {["1d", "1w", "1m", "3m", "6m", "1y"].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf as any)}
              className={`px-3 py-1 rounded ${
                selectedTimeframe === tf
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdvancedStats(!showAdvancedStats)}
          className="text-blue-500 hover:text-blue-600"
        >
          {showAdvancedStats ? "Hide Advanced Stats" : "Show Advanced Stats"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Correlation Matrix */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Correlation Matrix</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2"></th>
                  {topAssets.map((asset) => (
                    <th key={asset} className="px-4 py-2 text-sm font-medium">
                      {asset}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topAssets.map((asset1, i) => (
                  <tr key={asset1}>
                    <td className="px-4 py-2 font-medium">{asset1}</td>
                    {topAssets.map((asset2, j) => {
                      const correlation = i === j ? 1 : Math.random() * 2 - 1;
                      return (
                        <td
                          key={`${asset1}-${asset2}`}
                          className="px-4 py-2 text-center relative group"
                          style={{
                            backgroundColor: getCorrelationColor(correlation),
                          }}
                        >
                          {i === j ? "1.00" : correlation.toFixed(2)}
                          {showAdvancedStats && i !== j && (
                            <div className="hidden group-hover:block absolute z-10 bg-white dark:bg-gray-800 p-2 rounded shadow-lg -translate-y-full">
                              <div className="text-xs">
                                <div>
                                  R²: {(correlation * correlation).toFixed(3)}
                                </div>
                                <div>
                                  p-value: {(Math.random() * 0.05).toFixed(3)}
                                </div>
                                <div>
                                  CI: [{(correlation - 0.1).toFixed(2)},{" "}
                                  {(correlation + 0.1).toFixed(2)}]
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Advanced Statistical Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Statistical Analysis</h3>
          <div className="space-y-4">
            {correlations.map((corr, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-medium">
                      {corr.asset1} ↔ {corr.asset2}
                    </div>
                    <div className="text-sm text-gray-500">
                      {corr.strength} {corr.direction} correlation
                    </div>
                  </div>
                  <div
                    className={`text-xl font-bold ${
                      corr.direction === "positive"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {corr.correlation.toFixed(3)}
                  </div>
                </div>

                {showAdvancedStats && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">R-squared</div>
                      <div className="font-medium">
                        {corr.rSquared.toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">
                        Statistical Significance
                      </div>
                      <div className="font-medium">
                        {getStatisticalSignificance(corr.pValue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">
                        Confidence Interval (95%)
                      </div>
                      <div className="font-medium">
                        [{corr.confidenceInterval.lower.toFixed(2)},{" "}
                        {corr.confidenceInterval.upper.toFixed(2)}]
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">p-value</div>
                      <div className="font-medium">
                        {corr.pValue.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Historical Correlation Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">
          Historical Correlation Trends
        </h3>
        <div className="h-48 relative">
          <div className="absolute inset-0 flex items-end">
            {historicalCorrelations.map((hc) => (
              <div
                key={hc.timeframe}
                className="flex-1 mx-1"
                style={{
                  height: `${hc.correlation * 100}%`,
                  backgroundColor: getCorrelationColor(hc.correlation),
                }}
              >
                <div className="text-xs text-center mt-2 transform -rotate-45 origin-top-left">
                  {hc.timeframe}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {symbol && <RealTimeMarketData symbol={symbol} />}
    </div>
  );
}
