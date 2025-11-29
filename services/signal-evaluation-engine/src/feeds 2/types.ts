/**
 * =========================================
 * REAL-TIME DATA FEEDS TYPES
 * =========================================
 * Type definitions for live market data, on-chain, social,
 * and news feeds with sub-second latency requirements
 */

import type { SignalType } from '../types';

export interface ExchangeConfig {
  name: string;
  wsUrl: string;
  restUrl: string;
  apiKey?: string;
  apiSecret?: string;
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  heartbeatInterval: number;
  supportedFeatures: {
    orderBook: boolean;
    trades: boolean;
    quotes: boolean;
    ticker: boolean;
    kline: boolean;
  };
}

export interface MarketDataFeedInterface {
  exchange: string;
  symbol: string;
  type: 'orderbook' | 'trade' | 'quote' | 'ticker' | 'kline';
  data: any;
  timestamp: Date;
  sequenceNumber?: number;
  checksum?: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders?: number;
}

export interface OrderBookUpdate {
  exchange: string;
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
  sequenceNumber: number;
  checksum?: string;
}

export interface TradeUpdate {
  exchange: string;
  symbol: string;
  tradeId: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: Date;
  takerOrderId?: string;
  makerOrderId?: string;
}

export interface QuoteUpdate {
  exchange: string;
  symbol: string;
  bidPrice: number;
  bidQuantity: number;
  askPrice: number;
  askQuantity: number;
  timestamp: Date;
  sequenceNumber: number;
}

export interface TickerUpdate {
  exchange: string;
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  volumeChange: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: Date;
}

export interface KlineUpdate {
  exchange: string;
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
  isClosed: boolean;
}

export interface BlockchainConfig {
  name: string;
  rpcUrls: string[];
  chainId: number;
  blockTime: number; // seconds
  confirmations: number;
  rateLimits: {
    requestsPerSecond: number;
    requestsPerMinute: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
  };
}

export interface BlockUpdate {
  chain: string;
  blockNumber: number;
  blockHash: string;
  timestamp: Date;
  transactions: number;
  gasUsed: number;
  gasLimit: number;
  parentHash: string;
  difficulty?: number;
  totalDifficulty?: number;
}

export interface TransactionUpdate {
  chain: string;
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: Date;
  from: string;
  to?: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  gasLimit: string;
  status: boolean;
  logs: LogEntry[];
  contractAddress?: string;
  methodName?: string;
  decodedInput?: any;
}

export interface LogEntry {
  address: string;
  topics: string[];
  data: string;
  logIndex: number;
  removed: boolean;
  transactionHash: string;
  transactionIndex: number;
  blockNumber: number;
  blockHash: string;
}

export interface TokenTransfer {
  chain: string;
  transactionHash: string;
  blockNumber: number;
  from: string;
  to: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  amount: string;
  decimals: number;
  timestamp: Date;
}

export interface DEXTrade {
  chain: string;
  transactionHash: string;
  blockNumber: number;
  exchange: string;
  pairAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  price: number;
  timestamp: Date;
  maker: string;
  taker: string;
}

export interface SocialMediaConfig {
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  rateLimits: {
    requestsPerHour: number;
    requestsPerMinute: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
  };
}

export interface SocialMediaPost {
  platform: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  timestamp: Date;
  language: string;
  mentions: string[];
  hashtags: string[];
  urls: string[];
  media: {
    type: 'image' | 'video' | 'gif' | 'audio';
    url: string;
  }[];
  engagement: {
    likes: number;
    retweets?: number;
    replies?: number;
    shares?: number;
    comments?: number;
  };
  metadata: {
    isRetweet: boolean;
    isReply: boolean;
    originalPostId?: string;
    quotedPostId?: string;
    location?: string;
    userFollowers?: number;
    userVerified?: boolean;
  };
}

export interface SentimentAnalysis {
  score: number; // -1 to 1, negative to positive
  magnitude: number; // 0 to 1, strength of emotion
  confidence: number; // 0 to 1, confidence in analysis
  emotions: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
  topics: string[];
  entities: {
    type: 'person' | 'organization' | 'location' | 'token' | 'protocol';
    text: string;
    confidence: number;
  }[];
  language: string;
}

export interface NewsConfig {
  source: string;
  feedUrl: string;
  apiKey?: string;
  updateInterval: number; // seconds
  rateLimits: {
    requestsPerHour: number;
  };
}

export interface NewsArticle {
  source: string;
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  publishedAt: Date;
  author?: string;
  tags: string[];
  category: 'breaking' | 'analysis' | 'regulation' | 'exploit' | 'macro' | 'general';
  sentiment: number; // -1 to 1
  relatedTokens: string[];
  relatedProtocols: string[];
  importance: number; // 0 to 1
  language: string;
  metadata: {
    wordCount: number;
    readTime: number; // minutes
    imageUrl?: string;
    videoUrl?: string;
  };
}

export interface DeFiConfig {
  protocol: string;
  apiUrl: string;
  apiKey?: string;
  rateLimits: {
    requestsPerMinute: number;
  };
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
  };
}

export interface DeFiMetrics {
  protocol: string;
  timestamp: Date;
  tvl: {
    total: number;
    change24h: number;
    change7d: number;
  };
  volume: {
    total24h: number;
    change24h: number;
  };
  yields: {
    average: number;
    highest: number;
    lowest: number;
  };
  lending: {
    totalBorrowed: number;
    totalSupplied: number;
    utilization: number;
  };
  pools: {
    count: number;
    largestPool: {
      pair: string;
      tvl: number;
      volume24h: number;
    };
  };
  governance: {
    activeProposals: number;
    totalVotes: number;
    quorum: number;
  };
  tokenUnlocks: {
    upcoming: number;
    totalLocked: number;
  };
}

export interface FeedHealth {
  feedType: 'market' | 'blockchain' | 'social' | 'news' | 'defi';
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  latency: number; // milliseconds
  lastUpdate: Date;
  errorRate: number; // errors per hour
  throughput: number; // messages per second
  uptime: number; // percentage
  reconnectCount: number;
  bufferSize: number;
}

export interface FeedMetrics {
  totalFeeds: number;
  healthyFeeds: number;
  totalThroughput: number; // messages per second
  avgLatency: number; // milliseconds
  errorRate: number; // errors per hour
  bufferUtilization: number; // percentage
  memoryUsage: number; // MB
  timestamp: Date;
}

export interface LatencyRequirements {
  marketData: number; // < 100ms
  onChain: number; // < 2000ms
  socialSignals: number; // < 5000ms
  newsFeeds: number; // < 10000ms
  defiMetrics: number; // < 5000ms
}

export interface NormalizationConfig {
  timestampSync: {
    enabled: boolean;
    maxDrift: number; // milliseconds
    syncInterval: number; // seconds
  };
  dataValidation: {
    enabled: boolean;
    strictMode: boolean;
    allowedAge: number; // seconds
  };
  rateLimiting: {
    enabled: boolean;
    burstLimit: number;
    sustainedRate: number;
  };
}
