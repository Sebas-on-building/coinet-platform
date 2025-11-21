/**
 * Backtesting Demo Page
 * 
 * Demonstrates the backtesting and analytics capabilities of the platform.
 * Users can define trading strategies, run backtests, and view performance results.
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import axios from 'axios';
import BacktestForm from '@/components/charts/BacktestForm';
import BacktestResultChart from '@/components/charts/BacktestResultChart';
import { BacktestResultData } from '@/components/charts/BacktestResultChart';
import { BacktestConfig } from '@/lib/backtester';

// Available timeframes for backtesting
const TIMEFRAMES = [
  { id: '1h', label: '1 Hour' },
  { id: '4h', label: '4 Hours' },
  { id: '1d', label: '1 Day' },
  { id: '1w', label: '1 Week' },
];

/**
 * Backtesting demonstration page
 */
const BacktestingDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResultData | null>(null);
  const router = useRouter();

  // Default symbol is BTC/USD, but can be set via query param
  const symbol = (router.query.symbol as string) || 'BTC/USD';

  /**
   * Run a backtest with the given configuration
   */
  const handleRunBacktest = async (config: BacktestConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get date range from router query or use default (last 1 year)
      const from = (router.query.from as string) ||
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const to = (router.query.to as string) || new Date().toISOString();
      const timeframe = (router.query.timeframe as string) || '1d';

      // Send backtest request to API
      const response = await axios.post('/api/backtest', {
        symbol,
        timeframe,
        from,
        to,
        config
      });

      setResult(response.data);
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to run backtest');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Export backtest data or historical data
   */
  const handleExport = () => {
    const format = 'xlsx'; // or 'csv'

    // For now, we'll just export historical data since we don't have 
    // a mechanism to store and retrieve backtest results by ID yet
    const from = (router.query.from as string) ||
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const to = (router.query.to as string) || new Date().toISOString();
    const timeframe = (router.query.timeframe as string) || '1d';

    window.open(`/api/exportData?type=history&symbol=${symbol}&timeframe=${timeframe}&from=${from}&to=${to}&format=${format}`, '_blank');
  };

  return (
    <>
      <Head>
        <title>Backtesting Tool | Coinet</title>
        <meta name="description" content="Backtest trading strategies using historical market data" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Trading Strategy Backtesting
        </h1>

        <div className="mb-4 text-gray-700 dark:text-gray-300">
          <p>
            Define trading strategies using technical indicators and test their performance
            against historical data. The backtester simulates trades and calculates key metrics
            to help you evaluate your strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Backtest Form */}
          <BacktestForm
            symbol={symbol}
            timeframes={TIMEFRAMES}
            onSubmit={handleRunBacktest}
            isLoading={isLoading}
            onExport={handleExport}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
              <h3 className="font-medium text-red-800 dark:text-red-300 mb-1">Error</h3>
              <p>{error}</p>
            </div>
          )}

          {/* Backtest Results */}
          {result && (
            <BacktestResultChart
              data={result}
              symbol={symbol}
              timeframe={(router.query.timeframe as string) || '1d'}
            />
          )}
        </div>
      </main>
    </>
  );
};

export default BacktestingDemo; 