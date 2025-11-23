/**
 * =========================================
 * NATURAL LANGUAGE PARSING SERVICE TYPES
 * =========================================
 * Divine world-class type definitions for NLP rule parsing
 */

import { z } from 'zod';

/**
 * Supported trigger types
 */
export enum TriggerType {
  PRICE = 'price',
  VOLUME = 'volume',
  LIQUIDATION = 'liquidation',
  FUNDING_RATE = 'funding_rate',
  OPEN_INTEREST = 'open_interest',
  TECHNICAL_INDICATOR = 'technical_indicator',
  MARKET_SENTIMENT = 'market_sentiment',
  SOCIAL_MEDIA = 'social_media',
  NEWS = 'news',
  WHALE_ACTIVITY = 'whale_activity',
  CUSTOM = 'custom'
}

/**
 * Supported comparison operators
 */
export enum ComparisonOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  EQUAL_TO = '=',
  NOT_EQUAL_TO = '!=',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  MATCHES = 'matches',
  EXISTS = 'exists'
}

/**
 * Supported logical operators
 */
export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

/**
 * Supported time windows
 */
export enum TimeWindowType {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  CUSTOM = 'custom'
}

/**
 * Supported notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
  SLACK = 'slack'
}

/**
 * Supported notification priorities
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical'
}

/**
 * Supported exchanges
 */
export enum Exchange {
  BINANCE = 'binance',
  COINBASE = 'coinbase',
  KRAKEN = 'kraken',
  BYBIT = 'bybit',
  OKEX = 'okex',
  HUOBI = 'huobi',
  KUCOIN = 'kucoin',
  GATE = 'gate',
  FTX = 'ftx',
  ALL = 'all'
}

/**
 * Trigger condition definition
 */
export interface TriggerCondition {
  type: TriggerType;
  symbol?: string;
  exchange?: Exchange;
  operator: ComparisonOperator;
  value?: number | string;
  threshold?: number;
  timeframe?: string;
  indicator?: string;
  parameters?: Record<string, any>;
}

/**
 * Filter condition definition
 */
export interface FilterCondition {
  field: string;
  operator: ComparisonOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

/**
 * Time window definition
 */
export interface TimeWindow {
  type: TimeWindowType;
  startTime?: string; // HH:MM format
  endTime?: string;   // HH:MM format
  duration?: number;  // in milliseconds
  timezone?: string;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  enabled?: boolean;
}

/**
 * Routing preferences
 */
export interface RoutingPreferences {
  channels: NotificationChannel[];
  priority: NotificationPriority;
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone?: string;
  };
  escalation?: {
    enabled: boolean;
    delay: number; // milliseconds
    channels: NotificationChannel[];
  };
}

/**
 * Parsed rule components
 */
export interface ParsedRule {
  triggers: TriggerCondition[];
  filters: FilterCondition[];
  conditions: FilterCondition[]; // Additional conditions beyond triggers
  timeWindows: TimeWindow[];
  routing: RoutingPreferences;
  metadata?: {
    confidence?: number;
    ambiguityFlags?: string[];
    suggestions?: string[];
    parsedTokens?: string[];
  };
}

/**
 * NLP parsing input
 */
export interface NaturalLanguageInput {
  text: string;
  userId?: string;
  context?: {
    preferredExchanges?: Exchange[];
    riskTolerance?: 'low' | 'medium' | 'high';
    tradingStyle?: 'scalping' | 'day_trading' | 'swing_trading' | 'hodl';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    previousRules?: ParsedRule[];
  };
  options?: {
    strictMode?: boolean;
    suggestAlternatives?: boolean;
    validateAgainstSchema?: boolean;
  };
}

/**
 * NLP parsing result
 */
export interface ParsingResult {
  success: boolean;
  rule?: ParsedRule;
  errors?: ParsingError[];
  warnings?: ParsingWarning[];
  suggestions?: string[];
  confidence?: number;
  processingTime?: number;
  tokens?: ParsedToken[];
}

/**
 * Parsing error with user-friendly message
 */
export interface ParsingError {
  code: string;
  message: string;
  userMessage: string;
  position?: {
    start: number;
    end: number;
    text: string;
  };
  severity: 'error' | 'warning' | 'info';
  suggestions?: string[];
  context?: Record<string, any>;
}

/**
 * Parsing warning
 */
export interface ParsingWarning {
  code: string;
  message: string;
  userMessage: string;
  suggestions?: string[];
  context?: Record<string, any>;
}

/**
 * Parsed token for debugging
 */
export interface ParsedToken {
  text: string;
  type: string;
  value?: any;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

/**
 * LLM provider configuration
 */
export interface LLMProvider {
  name: 'openai' | 'anthropic' | 'google' | 'local';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  options?: Record<string, any>;
}

/**
 * NLP service configuration
 */
export interface NLPConfig {
  providers: LLMProvider[];
  fallbackProvider?: string;
  caching: {
    enabled: boolean;
    ttl: number; // milliseconds
    maxSize: number;
  };
  validation: {
    strictMode: boolean;
    maxRetries: number;
    timeout: number; // milliseconds
  };
  performance: {
    maxConcurrentRequests: number;
    requestTimeout: number;
    retryDelay: number;
  };
}

/**
 * Zod schemas for validation
 */
export const TriggerConditionSchema = z.object({
  type: z.nativeEnum(TriggerType),
  symbol: z.string().optional(),
  exchange: z.nativeEnum(Exchange).optional(),
  operator: z.nativeEnum(ComparisonOperator),
  value: z.union([z.number(), z.string()]).optional(),
  threshold: z.number().optional(),
  timeframe: z.string().optional(),
  indicator: z.string().optional(),
  parameters: z.record(z.any()).optional()
});

export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: z.nativeEnum(ComparisonOperator),
  value: z.any(),
  logicalOperator: z.nativeEnum(LogicalOperator).optional()
});

export const TimeWindowSchema = z.object({
  type: z.nativeEnum(TimeWindowType),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
  timezone: z.string().optional(),
  daysOfWeek: z.array(z.number()).optional(),
  enabled: z.boolean().optional()
});

export const RoutingPreferencesSchema = z.object({
  channels: z.array(z.nativeEnum(NotificationChannel)),
  priority: z.nativeEnum(NotificationPriority),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    timezone: z.string().optional()
  }).optional(),
  escalation: z.object({
    enabled: z.boolean(),
    delay: z.number(),
    channels: z.array(z.nativeEnum(NotificationChannel))
  }).optional()
});

export const ParsedRuleSchema = z.object({
  triggers: z.array(TriggerConditionSchema),
  filters: z.array(FilterConditionSchema),
  conditions: z.array(FilterConditionSchema),
  timeWindows: z.array(TimeWindowSchema),
  routing: RoutingPreferencesSchema,
  metadata: z.object({
    confidence: z.number().optional(),
    ambiguityFlags: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional(),
    parsedTokens: z.array(z.string()).optional()
  }).optional()
});

export const NaturalLanguageInputSchema = z.object({
  text: z.string().min(1, 'Input text cannot be empty'),
  userId: z.string().optional(),
  context: z.object({
    preferredExchanges: z.array(z.nativeEnum(Exchange)).optional(),
    riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
    tradingStyle: z.enum(['scalping', 'day_trading', 'swing_trading', 'hodl']).optional(),
    experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    previousRules: z.array(ParsedRuleSchema).optional()
  }).optional(),
  options: z.object({
    strictMode: z.boolean().optional(),
    suggestAlternatives: z.boolean().optional(),
    validateAgainstSchema: z.boolean().optional()
  }).optional()
});

export const ParsingResultSchema = z.object({
  success: z.boolean(),
  rule: ParsedRuleSchema.optional(),
  errors: z.array(z.object({
    code: z.string(),
    message: z.string(),
    userMessage: z.string(),
    position: z.object({
      start: z.number(),
      end: z.number(),
      text: z.string()
    }).optional(),
    severity: z.enum(['error', 'warning', 'info']),
    suggestions: z.array(z.string()).optional(),
    context: z.record(z.any()).optional()
  })).optional(),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    userMessage: z.string(),
    suggestions: z.array(z.string()).optional(),
    context: z.record(z.any()).optional()
  })).optional(),
  suggestions: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  processingTime: z.number().optional(),
  tokens: z.array(z.object({
    text: z.string(),
    type: z.string(),
    value: z.any().optional(),
    confidence: z.number(),
    position: z.object({
      start: z.number(),
      end: z.number()
    })
  })).optional()
});

export const NLPConfigSchema = z.object({
  providers: z.array(z.object({
    name: z.enum(['openai', 'anthropic', 'google', 'local']),
    model: z.string().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    options: z.record(z.any()).optional()
  })),
  fallbackProvider: z.string().optional(),
  caching: z.object({
    enabled: z.boolean(),
    ttl: z.number(),
    maxSize: z.number()
  }),
  validation: z.object({
    strictMode: z.boolean(),
    maxRetries: z.number(),
    timeout: z.number()
  }),
  performance: z.object({
    maxConcurrentRequests: z.number(),
    requestTimeout: z.number(),
    retryDelay: z.number()
  })
});

// Type exports
export type TriggerConditionType = z.infer<typeof TriggerConditionSchema>;
export type FilterConditionType = z.infer<typeof FilterConditionSchema>;
export type TimeWindowTypeSchema = z.infer<typeof TimeWindowSchema>;
export type RoutingPreferencesType = z.infer<typeof RoutingPreferencesSchema>;
export type ParsedRuleType = z.infer<typeof ParsedRuleSchema>;
export type NaturalLanguageInputType = z.infer<typeof NaturalLanguageInputSchema>;
export type ParsingResultType = z.infer<typeof ParsingResultSchema>;
export type NLPConfigType = z.infer<typeof NLPConfigSchema>;
