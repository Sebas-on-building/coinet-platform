/**
 * =========================================
 * REAL-TIME DATA FEEDS
 * =========================================
 * High-performance data ingestion system with sub-second
 * latency for market data, blockchain, social, and news feeds
 */

// Core feed classes
export { MarketDataFeedClass } from './MarketDataFeed';
export { BlockchainMonitor } from './BlockchainMonitor';
export { FeedManager } from './FeedManager';

// Types
export type {
  ExchangeConfig,
  MarketDataFeedInterface,
  OrderBookUpdate,
  TradeUpdate,
  QuoteUpdate,
  TickerUpdate,
  KlineUpdate,
  BlockchainConfig,
  BlockUpdate,
  TransactionUpdate,
  LogEntry,
  TokenTransfer,
  DEXTrade,
  SocialMediaConfig,
  SocialMediaPost,
  SentimentAnalysis,
  NewsConfig,
  NewsArticle,
  DeFiConfig,
  DeFiMetrics,
  FeedHealth,
  FeedMetrics,
  LatencyRequirements,
  NormalizationConfig
} from './types';

// Feed manager interface
export type { FeedManagerConfig } from './FeedManager';

// Default configuration factory
export { FeedManager as default } from './FeedManager';
