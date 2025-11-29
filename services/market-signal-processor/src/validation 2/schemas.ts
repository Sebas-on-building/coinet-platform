/**
 * =========================================
 * SIGNAL VALIDATION SCHEMAS
 * =========================================
 * Divine world-class Zod validation schemas for market signal processing
 * Comprehensive validation with business logic rules and sanitization
 */

import { z, RefinementCtx } from 'zod';
import { ExchangeType, SignalType, AssetType } from '@/types';

// Custom validation functions
const validateTimestamp = (timestamp: number): boolean => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  return timestamp > 0 && timestamp <= now && (now - timestamp) <= maxAge;
};

const validatePrice = (price: number): boolean => {
  return price > 0 && price < Number.MAX_SAFE_INTEGER && Number.isFinite(price);
};

const validateVolume = (volume: number): boolean => {
  return volume >= 0 && volume < Number.MAX_SAFE_INTEGER && Number.isFinite(volume);
};

const validateSymbol = (symbol: string): boolean => {
  // Symbol format validation (e.g., BTCUSDT, ETH/BTC, etc.)
  const symbolRegex = /^[A-Z0-9]{2,20}([/-][A-Z0-9]{2,20})?$/;
  return symbolRegex.test(symbol) && symbol.length >= 2 && symbol.length <= 20;
};

const validateExchangeSymbol = (exchange: ExchangeType, symbol: string): boolean => {
  // Exchange-specific symbol validation
  const exchangeSymbolPatterns: Record<ExchangeType, RegExp[]> = {
    binance: [/^[A-Z0-9]{4,12}$/], // BTCUSDT, ETHBTC, etc.
    coinbase: [/^[A-Z0-9]{3,6}(-[A-Z0-9]{3,6})?$/], // BTC-USD, ETH-BTC, etc.
    kraken: [/^[A-Z0-9]{3,6}\/[A-Z0-9]{3,6}$/], // BTC/USD, ETH/BTC, etc.
    deribit: [/^[A-Z0-9]{3,6}-[0-9]{2}[A-Z]{3}[0-9]{2}$/], // BTC-24DEC22, etc.
    bybit: [/^[A-Z0-9]{4,12}$/], // Similar to Binance
    okx: [/^[A-Z0-9]{4,12}$/], // Similar to Binance
    huobi: [/^[A-Z0-9]{4,12}$/], // Similar to Binance
    kucoin: [/^[A-Z0-9]{4,12}$/], // Similar to Binance
  };

  return exchangeSymbolPatterns[exchange]?.some(pattern => pattern.test(symbol)) ?? true;
};

// Base schema with common validations (without superRefine for extendability)
export const BaseSignalSchema = z.object({
  exchange: z.enum(['binance', 'coinbase', 'kraken', 'deribit', 'bybit', 'okx', 'huobi', 'kucoin'], {
    errorMap: () => ({ message: 'Invalid exchange specified' })
  }),
  symbol: z.string()
    .min(2, 'Symbol must be at least 2 characters')
    .max(20, 'Symbol must be at most 20 characters')
    .refine((symbol) => validateSymbol(symbol), 'Invalid symbol format'),
  timestamp: z.number()
    .int('Timestamp must be an integer')
    .positive('Timestamp must be positive')
    .refine(validateTimestamp, 'Timestamp is invalid or too old (max 24 hours)'),
  signalType: z.enum(['trade', 'quote', 'orderbook', 'liquidation', 'funding_rate', 'open_interest'], {
    errorMap: () => ({ message: 'Invalid signal type' })
  }),
  assetType: z.enum(['spot', 'futures', 'options', 'perpetual', 'margin'], {
    errorMap: () => ({ message: 'Invalid asset type' })
  }),
  rawData: z.record(z.any()).optional(),
  metadata: z.object({
    sequence: z.number().int().positive().optional(),
    source: z.string().min(1).max(100).optional(),
    version: z.string().min(1).max(20).optional(),
  }).optional(),
});

// Trade signal schema with advanced validations
export const TradeSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('trade'),
  price: z.number()
    .positive('Price must be positive')
    .finite('Price must be finite')
    .refine(validatePrice, 'Price value is invalid'),
  volume: z.number()
    .nonnegative('Volume must be non-negative')
    .finite('Volume must be finite')
    .refine(validateVolume, 'Volume value is invalid'),
  side: z.enum(['buy', 'sell'], {
    errorMap: () => ({ message: 'Side must be either "buy" or "sell"' })
  }),
  tradeId: z.string().min(1).max(100).optional(),
  takerSide: z.enum(['maker', 'taker']).optional(),
  aggressor: z.boolean().optional(),
}).superRefine((data, ctx: RefinementCtx) => {
  // Business logic validation
  if (data.takerSide === 'taker' && data.aggressor !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Taker orders should be marked as aggressors',
      path: ['aggressor'],
    });
    return z.NEVER;
  }
});

// Quote signal schema with spread validation
export const QuoteSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('quote'),
  bid: z.number()
    .positive('Bid must be positive')
    .finite('Bid must be finite')
    .refine(validatePrice, 'Bid value is invalid'),
  ask: z.number()
    .positive('Ask must be positive')
    .finite('Ask must be finite')
    .refine(validatePrice, 'Ask value is invalid'),
  bidVolume: z.number()
    .nonnegative('Bid volume must be non-negative')
    .finite('Bid volume must be finite'),
  askVolume: z.number()
    .nonnegative('Ask volume must be non-negative')
    .finite('Ask volume must be finite'),
  spread: z.number().nonnegative().finite().optional(),
  midPrice: z.number().positive().finite().optional(),
}).superRefine((data, ctx: RefinementCtx) => {
  // Cross-field validations
  if (data.ask <= data.bid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ask must be greater than bid',
      path: ['ask', 'bid'],
    });
    return z.NEVER;
  }
});

// Orderbook signal schema with depth validation
export const OrderbookSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('orderbook'),
  bids: z.array(z.tuple([
    z.number().positive().finite(),
    z.number().nonnegative().finite()
  ])).min(1, 'Orderbook must have at least one bid level')
    .max(100, 'Orderbook bids exceed maximum allowed levels'),
  asks: z.array(z.tuple([
    z.number().positive().finite(),
    z.number().nonnegative().finite()
  ])).min(1, 'Orderbook must have at least one ask level')
    .max(100, 'Orderbook asks exceed maximum allowed levels'),
  snapshot: z.boolean().optional(),
  depth: z.number().int().positive().max(100).optional(),
}).superRefine((data, ctx: RefinementCtx) => {
  // Validate orderbook structure
  const bids = data.bids.sort((a, b) => b[0] - a[0]); // Sort by price descending
  const asks = data.asks.sort((a, b) => a[0] - b[0]); // Sort by price ascending

  // Best bid should be less than best ask
  if (bids.length > 0 && asks.length > 0) {
    const bestBid = bids[0]?.[0];
    const bestAsk = asks[0]?.[0];
    if (bestBid !== undefined && bestAsk !== undefined && bestBid >= bestAsk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Best bid must be less than best ask',
        path: ['bids', 'asks'],
      });
      return z.NEVER;
    }
  }
});

// Liquidation signal schema
export const LiquidationSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('liquidation'),
  price: z.number()
    .positive('Liquidation price must be positive')
    .finite('Liquidation price must be finite'),
  volume: z.number()
    .positive('Liquidation volume must be positive')
    .finite('Liquidation volume must be finite'),
  side: z.enum(['long', 'short'], {
    errorMap: () => ({ message: 'Liquidation side must be "long" or "short"' })
  }),
  liquidationType: z.enum(['forced', 'adl', 'partial']).optional(),
});

// Funding rate signal schema
export const FundingRateSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('funding_rate'),
  fundingRate: z.number()
    .finite('Funding rate must be finite')
    .refine((rate) => rate >= -1 && rate <= 1, 'Funding rate must be between -1 and 1'),
  fundingTime: z.number()
    .int('Funding time must be an integer')
    .positive('Funding time must be positive'),
  markPrice: z.number().positive().finite().optional(),
  indexPrice: z.number().positive().finite().optional(),
}).superRefine((data, ctx: RefinementCtx) => {
  // Funding time should be in the future
  if (data.fundingTime <= Date.now()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Funding time must be in the future',
      path: ['fundingTime'],
    });
    return z.NEVER;
  }
});

// Open interest signal schema
export const OpenInterestSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('open_interest'),
  openInterest: z.number()
    .nonnegative('Open interest must be non-negative')
    .finite('Open interest must be finite'),
  change: z.number().finite().optional(),
  changePercent: z.number().finite().optional(),
}).superRefine((data, ctx: RefinementCtx) => {
  // If change percentage is provided, it should be reasonable
  if (data.changePercent !== undefined) {
    if (Math.abs(data.changePercent) > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Change percentage is unreasonably high (>1000%)',
        path: ['changePercent'],
      });
      return z.NEVER;
    }
  }
});

// Union schema for all signal types
export const MarketSignalSchema = z.union([
  TradeSignalSchema,
  QuoteSignalSchema,
  OrderbookSignalSchema,
  LiquidationSignalSchema,
  FundingRateSignalSchema,
  OpenInterestSignalSchema,
]);

// Batch processing schema
export const SignalBatchSchema = z.object({
  signals: z.array(MarketSignalSchema)
    .min(1, 'Batch must contain at least one signal')
    .max(1000, 'Batch size exceeds maximum allowed (1000)'),
  batchId: z.string().uuid('Batch ID must be a valid UUID'),
  metadata: z.object({
    source: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
    compression: z.enum(['none', 'gzip', 'lz4']).default('none'),
  }).optional(),
});

// Raw signal schemas (without superRefine for use in unions)
export const RawLiquidationSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('liquidation'),
  price: z.number()
    .positive('Liquidation price must be positive')
    .finite('Liquidation price must be finite'),
  volume: z.number()
    .positive('Liquidation volume must be positive')
    .finite('Liquidation volume must be finite'),
  side: z.enum(['long', 'short'], {
    errorMap: () => ({ message: 'Liquidation side must be "long" or "short"' })
  }),
  liquidationType: z.enum(['forced', 'adl', 'partial']).optional(),
});

export const RawFundingRateSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('funding_rate'),
  fundingRate: z.number()
    .finite('Funding rate must be finite')
    .refine((rate) => rate >= -1 && rate <= 1, 'Funding rate must be between -1 and 1'),
  fundingTime: z.number()
    .int('Funding time must be an integer')
    .positive('Funding time must be positive'),
  markPrice: z.number().positive().finite().optional(),
  indexPrice: z.number().positive().finite().optional(),
});

export const RawOpenInterestSignalSchema = BaseSignalSchema.extend({
  signalType: z.literal('open_interest'),
  openInterest: z.number()
    .nonnegative('Open interest must be non-negative')
    .finite('Open interest must be finite'),
  change: z.number().finite().optional(),
  changePercent: z.number().finite().optional(),
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
  signals: z.array(MarketSignalSchema).min(1).max(100),
  options: z.object({
    skipEnrichment: z.boolean().default(false),
    skipPublishing: z.boolean().default(false),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    timeout: z.number().int().positive().default(30000), // 30 seconds
  }).optional(),
});

// Export type inference helpers
export type ValidatedTradeSignal = z.infer<typeof TradeSignalSchema>;
export type ValidatedQuoteSignal = z.infer<typeof QuoteSignalSchema>;
export type ValidatedOrderbookSignal = z.infer<typeof OrderbookSignalSchema>;
export type ValidatedLiquidationSignal = z.infer<typeof LiquidationSignalSchema>;
export type ValidatedFundingRateSignal = z.infer<typeof FundingRateSignalSchema>;
export type ValidatedOpenInterestSignal = z.infer<typeof OpenInterestSignalSchema>;
export type ValidatedMarketSignal = z.infer<typeof MarketSignalSchema>;
export type ValidatedSignalBatch = z.infer<typeof SignalBatchSchema>;
export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;
export type ProcessSignalsRequest = z.infer<typeof ProcessSignalsRequestSchema>;

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

// Validation utility functions
export class SignalValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = ValidationConfigSchema.parse(config);
  }

  /**
   * Validate a single market signal
   */
  async validateSignal(signal: unknown): Promise<ValidationResult<ValidatedMarketSignal>> {
    const startTime = Date.now();

    try {
      const validatedSignal = MarketSignalSchema.parse(signal);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: validatedSignal,
        errors: [],
        warnings: [],
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            value: (err as any).input, // Access input correctly
          })),
          warnings: [],
          processingTime,
        };
      }

      return {
        success: false,
        errors: [{
          field: 'unknown',
          message: error.message || 'Unknown validation error',
          code: 'VALIDATION_ERROR',
          value: signal,
        }],
        warnings: [],
        processingTime,
      };
    }
  }

  /**
   * Validate a batch of signals
   */
  async validateBatch(batch: unknown): Promise<ValidationResult<ValidatedSignalBatch>> {
    const startTime = Date.now();

    try {
      const validatedBatch = SignalBatchSchema.parse(batch);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: validatedBatch,
        errors: [],
        warnings: [],
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            value: (err as any).input, // Access input correctly
          })),
          warnings: [],
          processingTime,
        };
      }

      return {
        success: false,
        errors: [{
          field: 'batch',
          message: error.message || 'Batch validation failed',
          code: 'BATCH_VALIDATION_ERROR',
          value: batch,
        }],
        warnings: [],
        processingTime,
      };
    }
  }

  /**
   * Validate a processing request
   */
  async validateRequest(request: unknown): Promise<ValidationResult<ProcessSignalsRequest>> {
    const startTime = Date.now();

    try {
      const validatedRequest = ProcessSignalsRequestSchema.parse(request);
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: validatedRequest,
        errors: [],
        warnings: [],
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code,
            value: (err as any).input, // Access input correctly
          })),
          warnings: [],
          processingTime,
        };
      }

      return {
        success: false,
        errors: [{
          field: 'request',
          message: error.message || 'Request validation failed',
          code: 'REQUEST_VALIDATION_ERROR',
          value: request,
        }],
        warnings: [],
        processingTime,
      };
    }
  }
}
