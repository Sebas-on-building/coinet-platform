/**
 * Analytics and Backtesting Hub
 * 
 * Main entry point for Coinet's analytics and backtesting features.
 * Provides access to various analytical tools and strategy testing.
 */

import React from 'react';
import Head from 'next/head';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

/**
 * Analytics Hub Page
 */
const AnalyticsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Analytics & Backtesting | Coinet</title>
        <meta name="description" content="Advanced analytics and backtesting tools for cryptocurrency traders" />
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#e0e7ef] to-[#f0f4ff] dark:from-[#18192b] dark:via-[#23243a] dark:to-[#1a1b2d] px-0 md:px-8 py-8 flex flex-col items-center">
        <section className="w-full max-w-7xl mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4 drop-shadow-lg" style={{ letterSpacing: '-0.02em' }}>Analytics & Backtesting</h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-6 max-w-3xl">Powerful, modular tools to analyze market data, test trading strategies, and optimize your portfolio performance. Experience analytics reimagined—beautiful, interactive, and as easy as Canva, as deep as TradingView, as delightful as Apple, as vibrant as Solana.</p>
        </section>
        <section className="w-full max-w-7xl flex-1">
          {/* Divine, modular, extensible dashboard system */}
          <AnalyticsDashboard symbol="BTC" />
        </section>
      </main>
    </>
  );
};

export default AnalyticsPage; 