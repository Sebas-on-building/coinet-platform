/**
 * AI Data Feeder Configuration
 */

import { DataFeederConfig } from './types';

export function getConfig(): DataFeederConfig {
  // Parse TRACKED_COINS - handle Railway format issues
  let trackedCoins: string[] = [];
  if (process.env.TRACKED_COINS) {
    let coinsValue = process.env.TRACKED_COINS.trim();
    
    // Fix: Remove variable name prefix if present (Railway sometimes includes it)
    // e.g., "TRACKED_COINS=bitcoin,ethereum" -> "bitcoin,ethereum"
    if (coinsValue.startsWith('TRACKED_COINS=')) {
      coinsValue = coinsValue.substring('TRACKED_COINS='.length);
    }
    
    // Split and clean up
    trackedCoins = coinsValue
      .split(',')
      .map(coin => coin.trim())
      .filter(coin => coin.length > 0);
  }
  
  // Use default if empty or invalid
  if (trackedCoins.length === 0) {
    trackedCoins = [
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
    ];
  }
  
  return {
    // Top coins to track
    coins: trackedCoins,
    
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

