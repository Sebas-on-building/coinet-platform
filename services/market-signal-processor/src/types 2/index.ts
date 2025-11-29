/**
 * =========================================
 * MARKET SIGNAL PROCESSING TYPES
 * =========================================
 * Divine world-class type definitions for the market signal processing system
 * Comprehensive interfaces for raw signals, enriched data, and normalized outputs
 */

import { z } from 'zod';

// Base types for market data
export type ExchangeType = 'binance' | 'coinbase' | 'kraken' | 'deribit' | 'bybit' | 'okx' | 'huobi' | 'kucoin';
export type SignalType = 'trade' | 'quote' | 'orderbook' | 'liquidation' | 'funding_rate' | 'open_interest';
export type AssetType = 'spot' | 'futures' | 'options' | 'perpetual' | 'margin';

// Raw market signal interfaces
export interface BaseRawSignal {
  id?: string; // Optional unique ID for the signal
  exchange: ExchangeType;
  symbol: string;
  timestamp: number; // Unix timestamp in milliseconds
  signalType: SignalType;
  assetType: AssetType;
  rawData?: Record<string, any>; // Original exchange data
  metadata?: {
    sequence?: number;
    source?: string;
    version?: string;
  };
}

// Trade signal types
export interface RawTradeSignal extends BaseRawSignal {
  signalType: 'trade';
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  tradeId?: string;
  takerSide?: 'maker' | 'taker';
  aggressor?: boolean;
}

// Quote signal types
export interface RawQuoteSignal extends BaseRawSignal {
  signalType: 'quote';
  bid: number;
  ask: number;
  bidVolume: number;
  askVolume: number;
  spread?: number;
  midPrice?: number;
}

// Orderbook signal types
export interface RawOrderbookSignal extends BaseRawSignal {
  signalType: 'orderbook';
  bids: Array<[number, number]>; // [price, volume][]
  asks: Array<[number, number]>; // [price, volume][]
  snapshot?: boolean; // true for full snapshot, false for update
  depth?: number; // Number of levels
}

// Liquidation signal types
export interface RawLiquidationSignal extends BaseRawSignal {
  signalType: 'liquidation';
  price: number;
  volume: number;
  side: 'long' | 'short';
  liquidationType?: 'forced' | 'adl' | 'partial';
}

// Funding rate signal types
export interface RawFundingRateSignal extends BaseRawSignal {
  signalType: 'funding_rate';
  fundingRate: number; // Percentage rate
  fundingTime: number; // Next funding time
  markPrice?: number;
  indexPrice?: number;
}

// Open interest signal types
export interface RawOpenInterestSignal extends BaseRawSignal {
  signalType: 'open_interest';
  openInterest: number;
  change?: number; // 24h change
  changePercent?: number; // 24h change percentage
}

// Union type for all raw signals
export type RawMarketSignal = RawTradeSignal | RawQuoteSignal | RawOrderbookSignal | RawLiquidationSignal | RawFundingRateSignal | RawOpenInterestSignal;

// Enriched data interfaces
export interface MomentumMetrics {
  priceMomentum: number; // Rate of price change
  volumeMomentum: number; // Rate of volume change
  priceVelocity: number; // Price change per unit time
  volumeVelocity: number; // Volume change per unit time
  acceleration: number; // Rate of change of velocity
  momentumScore: number; // Composite momentum score (-1 to 1)
  trendStrength: number; // Strength of trend (0 to 1)
  trendDirection: 'bullish' | 'bearish' | 'sideways';
}

export interface OrderBookImbalance {
  bidAskImbalance: number; // Volume imbalance between bids and asks
  priceImbalance: number; // Price level distribution
  spreadPressure: number; // Pressure from bid-ask spread
  depthRatio: number; // Ratio of bid depth to ask depth
  orderFlowImbalance: number; // Net order flow direction
  marketMakerActivity: number; // Activity of market makers
  retailActivity: number; // Activity of retail traders
  institutionalActivity: number; // Activity of institutional traders
  imbalanceScore: number; // Composite imbalance score (-1 to 1)
}

export interface LiquidityMetrics {
  totalBidLiquidity: number;
  totalAskLiquidity: number;
  bidDepth: number; // Number of bid levels
  askDepth: number; // Number of ask levels
  averageBidSize: number;
  averageAskSize: number;
  bidAskRatio: number;
  liquidityScore: number; // Overall liquidity assessment
}

export interface VolatilityMetrics {
  priceVolatility: number; // Price variance over time window
  volumeVolatility: number; // Volume variance over time window
  spreadVolatility: number; // Spread variance over time window
  realizedVolatility: number; // Realized volatility calculation
  impliedVolatility?: number; // Implied volatility if available
  volatilityScore: number; // Composite volatility score
}

export interface MarketMicrostructure {
  orderBookShape: 'normal' | 'inverted' | 'skewed_bull' | 'skewed_bear';
  priceDiscovery: number; // Efficiency of price discovery (0 to 1)
  marketEfficiency: number; // Overall market efficiency (0 to 1)
  informationAsymmetry: number; // Level of information asymmetry (0 to 1)
  toxicityIndex: number; // Order book toxicity (0 to 1)
}

// Enriched signal interface - using intersection type to extend union type
export type EnrichedMarketSignal = RawMarketSignal & {
  // Core data (optional, copied from original signal)
  price?: number;
  volume?: number;
  side?: 'buy' | 'sell' | 'long' | 'short';
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
  spread?: number;
  midPrice?: number;
  fundingRate?: number;
  fundingTime?: number;
  markPrice?: number;
  indexPrice?: number;
  openInterest?: number;
  change?: number;
  changePercent?: number;

  // Enrichment data
  momentum: MomentumMetrics;
  orderBookImbalance?: OrderBookImbalance;
  liquidity?: LiquidityMetrics;
  volatility?: VolatilityMetrics;
  microstructure?: MarketMicrostructure;

  // Processing metadata
  enrichedAt: Date;
  enrichmentVersion: string;
  processingLatency: number; // Time taken for enrichment in ms
  confidence: number; // Confidence in enrichment calculations (0 to 1)
};

// Normalized signal for Kafka publishing
export interface NormalizedMarketSignal extends BaseRawSignal {
  // Core data (varies by signal type)
  price?: number;
  volume?: number;
  side?: 'buy' | 'sell' | 'long' | 'short';
  bid?: number;
  ask?: number;
  bidVolume?: number;
  askVolume?: number;
  spread?: number;
  midPrice?: number;
  fundingRate?: number;
  fundingTime?: number;
  markPrice?: number;
  indexPrice?: number;
  openInterest?: number;
  change?: number;
  changePercent?: number;

  // Enriched data
  momentumScore?: number;
  orderBookImbalance?: number;
  liquidityScore?: number;
  volatilityScore?: number;

  // Metadata
  normalizedAt: Date;
  normalizationVersion: string;
  sourceId: string; // ID of original signal
}

// Processing context for stateful operations
export interface ProcessingContext {
  signalId: string;
  startTime: Date;
  endTime?: Date;
  processingTime?: number;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

// Batch processing interface
export interface SignalBatch {
  signals: RawMarketSignal[];
  batchId: string;
  batchSize: number;
  receivedAt: Date;
  processedAt?: Date;
  processingTime?: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ signalId: string; error: string }>;
  warnings: string[];
}

// Health check interface
export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  dependencies: {
    kafka: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    database: 'connected' | 'disconnected' | 'error';
  };
  metrics: {
    totalSignalsProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
    throughput: number; // signals per second
  };
}

// Event types for the service
export interface ServiceEvents {
  'signal:processed': [EnrichedMarketSignal];
  'signal:published': [NormalizedMarketSignal];
  'batch:completed': [BatchProcessingResult];
  'rate:limit:exceeded': [{ key: string; limit: number; windowMs: number }];
  'error:occurred': [{ error: string; signalId?: string; context?: Record<string, any> }];
  'health:changed': [ServiceHealth];
}

// Zod schemas for validation
export const BaseRawSignalSchema = z.object({
  id: z.string().uuid().optional(), // Add optional ID to base schema
  exchange: z.enum(['binance', 'coinbase', 'kraken', 'deribit', 'bybit', 'okx', 'huobi', 'kucoin']),
  symbol: z.string().min(1),
  timestamp: z.number().positive(),
  signalType: z.enum(['trade', 'quote', 'orderbook', 'liquidation', 'funding_rate', 'open_interest']),
  assetType: z.enum(['spot', 'futures', 'options', 'perpetual', 'margin']),
  rawData: z.record(z.any()).optional(),
  metadata: z.object({
    sequence: z.number().optional(),
    source: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
});

export const RawTradeSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('trade'),
  price: z.number().positive(),
  volume: z.number().positive(),
  side: z.enum(['buy', 'sell']),
  tradeId: z.string().optional(),
  takerSide: z.enum(['maker', 'taker']).optional(),
  aggressor: z.boolean().optional(),
});

export const RawQuoteSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('quote'),
  bid: z.number().positive(),
  ask: z.number().positive(),
  bidVolume: z.number().nonnegative(),
  askVolume: z.number().nonnegative(),
  spread: z.number().optional(),
  midPrice: z.number().optional(),
});

export const RawOrderbookSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('orderbook'),
  bids: z.array(z.tuple([z.number().positive().finite(), z.number().nonnegative().finite()])),
  asks: z.array(z.tuple([z.number().positive().finite(), z.number().nonnegative().finite()])),
  snapshot: z.boolean().optional(),
  depth: z.number().optional(),
});

export const RawLiquidationSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('liquidation'),
  price: z.number().positive(),
  volume: z.number().positive(),
  side: z.enum(['long', 'short']),
  liquidationType: z.enum(['forced', 'adl', 'partial']).optional(),
});

export const RawFundingRateSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('funding_rate'),
  fundingRate: z.number(),
  fundingTime: z.number().positive(),
  markPrice: z.number().positive().optional(),
  indexPrice: z.number().positive().optional(),
});

export const RawOpenInterestSignalSchema = BaseRawSignalSchema.extend({
  signalType: z.literal('open_interest'),
  openInterest: z.number().nonnegative(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
});

// Union schema for all raw signals
export const RawMarketSignalSchema = z.discriminatedUnion('signalType', [
  RawTradeSignalSchema,
  RawQuoteSignalSchema,
  RawOrderbookSignalSchema,
  RawLiquidationSignalSchema,
  RawFundingRateSignalSchema,
  RawOpenInterestSignalSchema,
]);

// Batch processing schema
export const SignalBatchSchema = z.object({
  signals: z.array(RawMarketSignalSchema)
    .min(1, 'Batch must contain at least one signal')
    .max(1000, 'Batch size exceeds maximum allowed (1000)'),
  batchId: z.string().uuid('Batch ID must be a valid UUID'),
  metadata: z.object({
    source: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    compression: z.enum(['none', 'gzip', 'lz4']).default('none'),
  }).optional(),
});

// Configuration schema for validation
export const ValidationConfigSchema = z.object({
  strictMode: z.boolean().default(true),
  allowUnknownFields: z.boolean().default(false),
  maxValidationErrors: z.number().int().positive().default(10),
  skipBusinessLogicValidation: z.boolean().default(false),
  customValidators: z.record(z.function().args(z.any()).returns(z.boolean())).optional(),
});

// Processing request schema
export const ProcessSignalsRequestSchema = z.object({
  signals: z.array(RawMarketSignalSchema).min(1).max(100),
  options: z.object({
    skipEnrichment: z.boolean().default(false),
    skipPublishing: z.boolean().default(false),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    timeout: z.number().int().positive().default(30000), // 30 seconds
  }).optional(),
});

// Custom validation error class
export class SignalValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'SignalValidationError';
  }
}

// Validation result interface
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  processingTime: number;
}

// Processing result types
export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
  metadata?: Record<string, any>;
}

export interface BatchProcessingResult {
  batchId: string;
  totalSignals: number;
  processedSignals: number;
  failedSignals: number;
  processingTime: number;
  errors: Array<{ signalId: string; error: string }>;
  warnings: string[];
}

// Configuration schemas for the entire service
export const KafkaConfigSchema = z.object({
  brokers: z.array(z.string()).min(1),
  clientId: z.string().min(1),
  ssl: z.boolean().optional(),
  sasl: z.object({
    mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']),
    username: z.string().min(1),
    password: z.string().min(1),
  }).optional(),
  topic: z.string().min(1), // Added topic to KafkaConfigSchema
  partitionKey: z.string().optional(),
  compression: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).optional(),
  batchSize: z.number().int().optional(),
  lingerMs: z.number().int().optional(),
  requestTimeoutMs: z.number().int().optional(),
});

export const RedisConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().positive(),
  password: z.string().optional(),
  db: z.number().int().optional(),
});

export const RateLimitingConfigSchema = z.object({
  enabled: z.boolean(),
  defaultLimit: z.number().int().positive(),
  defaultWindowMs: z.number().int().positive(),
  perKeyLimits: z.record(z.string(), z.object({ limit: z.number().int().positive(), windowMs: z.number().int().positive() })).optional(),
  burstLimit: z.number().int().optional(),
});

export const EnrichmentConfigSchema = z.object({
  enabled: z.boolean(),
  lookbackPeriods: z.array(z.number()).optional(),
  momentumCalculation: z.object({
    enabled: z.boolean(),
    priceWindow: z.number().int().positive(),
    volumeWindow: z.number().int().positive(),
    smoothingAlpha: z.number().optional(),
  }),
  orderBookAnalysis: z.object({
    enabled: z.boolean(),
    depthLevels: z.number().int().optional(),
    imbalanceThreshold: z.number().optional(),
  }),
  liquidityAnalysis: z.object({
    enabled: z.boolean(),
    minDepthLevels: z.number().int().optional(),
  }),
  volatilityCalculation: z.object({
    enabled: z.boolean(),
    windowSize: z.number().int().positive(),
    annualizationFactor: z.number().optional(),
  }),
});

export const ObservabilityConfigSchema = z.object({
  metrics: z.object({
    enabled: z.boolean(),
    collectionInterval: z.number().int().positive(),
    retentionPeriod: z.number().int().positive(),
    prometheus: z.object({
      enabled: z.boolean(),
      port: z.number().int().positive(),
      path: z.string().min(1),
    }).optional(),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
    structured: z.boolean(),
    includeRawData: z.boolean(),
    maxLogSize: z.number().int().positive(),
  }),
  tracing: z.object({
    enabled: z.boolean(),
    serviceName: z.string().min(1),
    samplingRate: z.number().optional(),
    exporter: z.enum(['jaeger', 'zipkin', 'otlp']).optional(),
  }),
});

export const ProcessingConfigSchema = z.object({
  rateLimiting: RateLimitingConfigSchema,
  enrichment: EnrichmentConfigSchema,
  kafka: z.object({
    enabled: z.boolean(),
    topic: z.string().min(1),
    partitionKey: z.string().optional(),
    compression: z.enum(['none', 'gzip', 'snappy', 'lz4', 'zstd']).optional(),
    batchSize: z.number().int().optional(),
    lingerMs: z.number().int().optional(),
    requestTimeoutMs: z.number().int().optional(),
  }),
  observability: ObservabilityConfigSchema,
});

export const MarketSignalProcessorConfigSchema = z.object({
  port: z.number().int().positive().default(3000),
  host: z.string().min(1).default('0.0.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  processing: ProcessingConfigSchema,
  kafka: KafkaConfigSchema,
  redis: RedisConfigSchema,
  health: z.object({
    checkInterval: z.number().int().positive().default(30000),
    unhealthyThreshold: z.number().int().positive().default(3),
  }),
});

// Export type inference helpers
export type MarketSignalProcessorConfig = z.infer<typeof MarketSignalProcessorConfigSchema>;
export type KafkaConfig = z.infer<typeof KafkaConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type RateLimitingConfig = z.infer<typeof RateLimitingConfigSchema>;
export type EnrichmentConfig = z.infer<typeof EnrichmentConfigSchema>;
export type ObservabilityConfig = z.infer<typeof ObservabilityConfigSchema>;
export type ProcessingConfig = z.infer<typeof ProcessingConfigSchema>;
