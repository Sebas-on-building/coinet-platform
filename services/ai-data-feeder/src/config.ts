/**
 * AI Data Feeder Configuration
 */

import { DataFeederConfig } from './types';

export function getConfig(): DataFeederConfig {
  return {
    // Top coins to track
    coins: process.env.TRACKED_COINS?.split(',') || [
      'bitcoin',
      'ethereum',
      'solana',
      'cardano',
      'avalanche-2',
      'polkadot',
      'chainlink',
      'polygon',
      'uniswap',
      'aave',
    ],
    
    // Update intervals
    priceUpdateInterval: parseInt(process.env.PRICE_UPDATE_INTERVAL || '60000'), // 1 minute
    newsUpdateInterval: parseInt(process.env.NEWS_UPDATE_INTERVAL || '300000'),  // 5 minutes
    aiAnalysisInterval: parseInt(process.env.AI_ANALYSIS_INTERVAL || '600000'),  // 10 minutes
    
    // Storage
    enableRedisCache: process.env.ENABLE_REDIS_CACHE !== 'false',
    enableDatabase: process.env.ENABLE_DATABASE !== 'false',
    
    // Features
    enableSentimentAnalysis: process.env.ENABLE_SENTIMENT_ANALYSIS !== 'false',
    enableTechnicalAnalysis: process.env.ENABLE_TECHNICAL_ANALYSIS !== 'false',
    enableAIInsights: process.env.ENABLE_AI_INSIGHTS !== 'false',
    
    // Limits
    maxHistoricalDays: parseInt(process.env.MAX_HISTORICAL_DAYS || '30'),
    maxNewsArticles: parseInt(process.env.MAX_NEWS_ARTICLES || '20'),
  };
}

