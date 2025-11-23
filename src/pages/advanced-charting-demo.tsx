/**
 * Advanced Charting Demo Page
 * 
 * A showcase of the advanced charting capabilities, including
 * technical indicators, real-time updates, and chart state persistence.
 */

import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useTheme } from 'next-themes';
import AdvancedChartContainer from '@/components/charts/AdvancedChartContainer';
import { Candle } from '@/lib/indicators/types';
import { createIndicatorConfig } from '@/lib/indicators';

// Generate sample candle data for demonstration
const generateSampleData = (count: number): Candle[] => {
  const data: Candle[] = [];
  let price = 50000 + Math.random() * 2000; // Start around $50K (like Bitcoin)
  const now = new Date();

  // Generate candles backward from the current time
  for (let i = count; i > 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000); // 1-hour candles
    const open = price;
    const high = open * (1 + Math.random() * 0.02); // Up to 2% higher
    const low = open * (1 - Math.random() * 0.02); // Up to 2% lower
    const close = low + Math.random() * (high - low); // Random close within range
    const volume = 10 + Math.random() * 100; // Random volume

    data.push({
      time: time.getTime(),
      open,
      high,
      low,
      close,
      volume
    });

    // Next candle starts at the previous close
    price = close;
  }

  return data;
};

const AdvancedChartingDemo: NextPage = () => {
  const { resolvedTheme } = useTheme();
  const [sampleData, setSampleData] = useState<Candle[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');

  // Generate sample data on component mount
  useEffect(() => {
    setSampleData(generateSampleData(100));
  }, []);

  // Simulate a real-time data update
  const simulateRealtimeUpdate = (callback: (tick: any) => void) => {
    const interval = setInterval(() => {
      // Get the latest price from our sample data
      const lastCandle = sampleData[sampleData.length - 1];
      if (!lastCandle) return;

      const lastPrice = lastCandle.close;

      // Generate a new "tick" with a small random price change
      const change = (Math.random() - 0.5) * lastPrice * 0.001; // +/- 0.1%
      const tick = {
        timestamp: Date.now(),
        price: lastPrice + change,
        volume: Math.random() * 2,
        high: lastPrice + Math.abs(change),
        low: lastPrice - Math.abs(change)
      };

      callback(tick);
    }, 5000); // Update every 5 seconds

    // Return a cleanup function
    return () => clearInterval(interval);
  };

  // Handle timeframe changes
  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);

    // In a real app, you would fetch new data for the selected timeframe
    console.log(`Timeframe changed to ${timeframe}`);
  };

  return (
    <>
      <Head>
        <title>Advanced Charting Demo | Coinet</title>
        <meta name="description" content="Explore advanced cryptocurrency charting with interactive technical indicators" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Advanced Charting Demo
        </h1>

        <p className="mb-6 text-gray-700 dark:text-gray-300">
          This demo showcases the advanced charting capabilities of Coinet, including technical
          indicators, real-time updates, and chart state persistence. Try adding indicators,
          changing timeframes, and more.
        </p>

        {sampleData.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
            <AdvancedChartContainer
              symbol="BTC/USDT"
              initialData={sampleData}
              defaultTimeframe={selectedTimeframe}
              height={600}
              allowFullscreen={true}
              onTimeframeChange={handleTimeframeChange}
              onRealtimeUpdate={simulateRealtimeUpdate}
              className="w-full"
            />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Available Technical Indicators
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Simple Moving Average (SMA)</li>
              <li>Exponential Moving Average (EMA)</li>
              <li>Moving Average Convergence Divergence (MACD)</li>
              <li>Relative Strength Index (RSI)</li>
              <li>Bollinger Bands</li>
              <li>And more...</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Features
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
              <li>Customizable indicator parameters and visuals</li>
              <li>Multiple chart types (candlestick, line, area, etc.)</li>
              <li>Real-time price updates</li>
              <li>Chart configuration persistence</li>
              <li>Time range selection</li>
              <li>Fullscreen mode</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdvancedChartingDemo; 