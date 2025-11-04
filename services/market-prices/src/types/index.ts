/**
 * Core Type Definitions for Market Prices Service
 * Divine perfection in type safety
 */

export enum DataSource {
  COINGECKO = 'coingecko',
  COINMARKETCAP = 'coinmarketcap',
}

export enum PriceUpdateType {
  WEBSOCKET = 'websocket',
  REST = 'rest',
  CACHED = 'cached',
}

export interface MarketPrice {
  symbol: string;
  coinId: string; // Internal Coinet symbol ID
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  ath?: number; // All-time high
  athDate?: Date;
  atl?: number; // All-time low
  atlDate?: Date;
  lastUpdated: Date;
  source: DataSource;
  updateType: PriceUpdateType;
}

export interface OHLCV {
  symbol: string;
  coinId: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: DataSource;
}

export interface CoinMetadata {
  coinId: string;
  symbol: string;
  name: string;
  description?: string;
  categories: string[];
  platforms: Record<string, string>; // blockchain -> contract address
  links: {
    homepage?: string[];
    blockchain_site?: string[];
    official_forum_url?: string[];
    chat_url?: string[];
    announcement_url?: string[];
    twitter_screen_name?: string;
    facebook_username?: string;
    telegram_channel_identifier?: string;
    subreddit_url?: string;
    repos_url?: {
      github?: string[];
      bitbucket?: string[];
    };
  };
  image?: {
    thumb?: string;
    small?: string;
    large?: string;
  };
  genesisDate?: Date;
  sentimentVotesUpPercentage?: number;
  sentimentVotesDownPercentage?: number;
  marketCapRank?: number;
  coingeckoRank?: number;
  lastUpdated: Date;
  source: DataSource;
}

export interface TickerData {
  symbol: string;
  coinId: string;
  base: string;
  target: string;
  market: {
    name: string;
    identifier: string;
  };
  last: number;
  volume: number;
  convertedLast: Record<string, number>;
  convertedVolume: Record<string, number>;
  trustScore: string;
  bidAskSpreadPercentage: number;
  timestamp: Date;
  lastTradedAt: Date;
  lastFetchAt: Date;
  isAnomaly: boolean;
  isStale: boolean;
  source: DataSource;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  reservoir: number;
  reservoirRefreshAmount: number;
  reservoirRefreshInterval: number;
}

export interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (retryCount: number, error: any) => void;
}

export interface WebSocketConfig {
  url: string;
  maxConnections: number;
  maxSubscriptionsPerChannel: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  enabled: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  apiUrl: string;
  wsUrl?: string;
  rateLimit: RateLimitConfig;
  retry: RetryConfig;
  websocket?: WebSocketConfig;
  priority: number; // Lower number = higher priority
}

export interface ServiceConfig {
  providers: {
    coingecko: ProviderConfig;
    coinmarketcap: ProviderConfig;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  cacheTTL: number;
  failoverRetryDelay: number;
  maxRetryAttempts: number;
  enableWebSocket: boolean;
  enableRestFallback: boolean;
  enableCMCFallback: boolean;
  logLevel: string;
}

export interface PriceUpdateEvent {
  type: 'price' | 'ticker' | 'ohlcv' | 'metadata';
  data: MarketPrice | TickerData | OHLCV | CoinMetadata;
  source: DataSource;
  timestamp: Date;
}

export interface HealthStatus {
  service: string;
  healthy: boolean;
  timestamp: Date;
  providers: {
    coingecko: {
      rest: boolean;
      websocket: boolean;
      lastSuccessfulRequest?: Date;
      lastError?: string;
    };
    coinmarketcap: {
      rest: boolean;
      lastSuccessfulRequest?: Date;
      lastError?: string;
    };
  };
  database: {
    connected: boolean;
    lastWrite?: Date;
  };
  cache: {
    connected: boolean;
    hitRate?: number;
  };
}

// CoinGecko specific types
export interface CoinGeckoSimplePrice {
  [coinId: string]: {
    [currency: string]: number;
    [key: string]: number; // For additional fields like market_cap, volume, etc.
  };
}

export interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  roi: any;
  last_updated: string;
}

export interface CoinGeckoOHLC {
  // [timestamp, open, high, low, close]
  data: [number, number, number, number, number][];
}

export interface CoinGeckoCoin {
  id: string;
  symbol: string;
  name: string;
  asset_platform_id: string;
  platforms: Record<string, string>;
  block_time_in_minutes: number;
  hashing_algorithm: string;
  categories: string[];
  public_notice: string;
  additional_notices: string[];
  description: {
    en: string;
    [key: string]: string;
  };
  links: any;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  country_origin: string;
  genesis_date: string;
  sentiment_votes_up_percentage: number;
  sentiment_votes_down_percentage: number;
  market_cap_rank: number;
  coingecko_rank: number;
  coingecko_score: number;
  developer_score: number;
  community_score: number;
  liquidity_score: number;
  public_interest_score: number;
  market_data: any;
  community_data: any;
  developer_data: any;
  public_interest_stats: any;
  status_updates: any[];
  last_updated: string;
  tickers: any[];
}

// CoinMarketCap specific types
export interface CoinMarketCapQuote {
  [symbol: string]: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    num_market_pairs: number;
    date_added: string;
    tags: string[];
    max_supply: number;
    circulating_supply: number;
    total_supply: number;
    platform: any;
    cmc_rank: number;
    last_updated: string;
    quote: {
      [currency: string]: {
        price: number;
        volume_24h: number;
        volume_change_24h: number;
        percent_change_1h: number;
        percent_change_24h: number;
        percent_change_7d: number;
        percent_change_30d: number;
        market_cap: number;
        market_cap_dominance: number;
        fully_diluted_market_cap: number;
        last_updated: string;
      };
    };
  };
}

export interface CoinMarketCapListing {
  data: Array<{
    id: number;
    name: string;
    symbol: string;
    slug: string;
    num_market_pairs: number;
    date_added: string;
    tags: string[];
    max_supply: number;
    circulating_supply: number;
    total_supply: number;
    platform: any;
    cmc_rank: number;
    last_updated: string;
    quote: any;
  }>;
  status: {
    timestamp: string;
    error_code: number;
    error_message: string;
    elapsed: number;
    credit_count: number;
  };
}

export interface CoinMarketCapOHLCV {
  data: {
    id: number;
    name: string;
    symbol: string;
    quotes: Array<{
      time_open: string;
      time_close: string;
      time_high: string;
      time_low: string;
      quote: {
        [currency: string]: {
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number;
          market_cap: number;
          timestamp: string;
        };
      };
    }>;
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  error?: string;
}

export interface CoinGeckoWSMessage extends WebSocketMessage {
  event?: 'subscribe' | 'unsubscribe' | 'price_update' | 'error' | 'heartbeat';
  params?: {
    coins?: string[];
    channels?: string[];
  };
}

// Error types
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number,
    public source?: DataSource
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public source: DataSource,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class DataNormalizationError extends Error {
  constructor(
    message: string,
    public source: DataSource,
    public rawData?: any
  ) {
    super(message);
    this.name = 'DataNormalizationError';
  }
}

