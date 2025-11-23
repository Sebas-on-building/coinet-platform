import { EventEmitter } from 'events';

/**
 * =========================================
 * TYPES AND INTERFACES
 * =========================================
 * Core type definitions for the live market data feeds system
 */

export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'deribit' | 'bybit';

export type DataType = 'trades' | 'quotes' | 'orderbook' | 'ohlc';

export type MarketDataType = 'trade' | 'quote' | 'orderbook';

export interface BaseMarketData {
  exchange: ExchangeType;
  symbol: string;
  timestamp: Date;
  type: MarketDataType;
  normalized: boolean;
  raw?: any;
  metadata?: Record<string, any>;
}

export interface TradeData extends BaseMarketData {
  type: 'trade';
  price: number;
  volume: number;
  side: 'buy' | 'sell' | 'unknown';
}

export interface QuoteData extends BaseMarketData {
  type: 'quote';
  bid: number;
  ask: number;
  bidVolume: number;
  askVolume: number;
}

export interface OrderBookData extends BaseMarketData {
  type: 'orderbook';
  bids: Array<[number, number]>; // [price, volume][]
  asks: Array<[number, number]>; // [price, volume][]
}

export type MarketData = TradeData | QuoteData | OrderBookData;

export interface FeedConfig {
  exchange: ExchangeType;
  wsUrl: string;
  restUrl: string;
  rateLimit: number; // requests per minute
  heartbeatInterval: number; // milliseconds
  reconnectDelay: number; // milliseconds
  maxReconnectAttempts: number;
  timeout: number; // milliseconds
  dataTypes: DataType[];
  supportedSymbols: string[];
}

export interface ExchangeClient extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;
  unsubscribe(symbols: string[], dataTypes: DataType[]): Promise<void>;
  isConnected(): boolean;
  getHealth(): Promise<any>;
}

export interface MetricsData {
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  connectionCount: number;
  bufferSize: number;
  uptime: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  checks: Record<string, boolean>;
  issues: string[];
}
