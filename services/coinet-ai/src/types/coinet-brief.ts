/**
 * 🎯 COINET AI BRIEF DATA MODELS
 * 
 * These are the divine data structures that define how Coinet AI
 * transforms raw inputs into structured, actionable crypto insights.
 * 
 * DESIGN PHILOSOPHY:
 * - Every field has a clear purpose and meaning
 * - Structure mirrors user mental models
 * - Rich metadata for transparency and trust
 * - Extensible for future enhancements
 */

import { z } from 'zod';

// =============================================================================
// INPUT PROCESSING TYPES
// =============================================================================

export const InputTypeSchema = z.enum([
  'ticker',     // $BTC, Bitcoin, BTC-USD
  'url',        // https://coinmarketcap.com/currencies/bitcoin/
  'thread',     // Twitter/X thread links
  'question',   // "What do you think about Bitcoin?"
  'news',       // News article links
  'auto'        // Auto-detect input type
]);

export type InputType = z.infer<typeof InputTypeSchema>;

export const UserInputSchema = z.object({
  content: z.string().min(1, "Input content cannot be empty"),
  type: InputTypeSchema.default('auto'),
  context: z.object({
    timeframe: z.enum(['1h', '4h', '1d', '1w']).optional(),
    analysisDepth: z.enum(['quick', 'standard', 'deep']).default('standard'),
    focusAreas: z.array(z.string()).optional(),
    userProfile: z.object({
      riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
      experienceLevel: z.enum(['beginner', 'intermediate', 'expert']).optional(),
      preferredStyle: z.enum(['technical', 'fundamental', 'sentiment']).optional()
    }).optional()
  }).optional()
});

export type UserInput = z.infer<typeof UserInputSchema>;

export interface ProcessedInput {
  // Original input
  originalInput: UserInput;
  
  // Detected metadata
  detectedType: InputType;
  symbol: string;
  confidence: number; // 0-1 confidence in detection
  
  // Enriched data
  marketData?: MarketDataContext;
  socialData?: SocialContext;
  newsData?: NewsContext;
  onChainData?: OnChainContext;
  sentimentData?: SentimentContext;
  technicalData?: TechnicalAnalysis;
  
  // Processing metadata
  processedAt: Date;
  dataFreshness: number; // 0-1 how fresh the data is
  completeness: number;  // 0-1 how complete the data is
}

// Sentiment data from Fear & Greed Index and other sources
export interface SentimentContext {
  fearGreed: {
    value: number;                    // 0-100
    classification: string;           // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
    timestamp: Date;
    previousValue?: number;
    previousClassification?: string;
    trend: 'improving' | 'worsening' | 'stable';
  };
  overallSentiment: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  sentimentScore: number;           // -100 to +100
  summary: string;
  lastUpdated: Date;
  dataSource: string;
}

// Technical analysis data
export interface TechnicalAnalysis {
  symbol: string;
  rsi14: number;
  rsiSignal: 'oversold' | 'neutral' | 'overbought';
  rsiDescription: string;
  macd: {
    value: number;
    signal: number;
    histogram: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    currentPrice: number;
    priceVsSMA20: number;
    priceVsSMA50: number;
    priceVsSMA200: number;
    goldenCross: boolean;
    deathCross: boolean;
  };
  trend: {
    direction: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    description: string;
  };
  levels: {
    support: number[];
    resistance: number[];
  };
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
  lastUpdated: Date;
}

// =============================================================================
// CONTEXT DATA TYPES
// =============================================================================

export interface MarketDataContext {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  marketCap: number;
  dominance?: number;
  // Price range
  high24h?: number;
  low24h?: number;
  // All-time high data
  ath?: number;
  athDate?: Date;
  athChangePercent?: number;
  // Supply data
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number | null;
  // Technical indicators
  technicalIndicators: {
    rsi?: number;
    macd?: { value: number; signal: number; histogram: number };
    movingAverages?: { ma20: number; ma50: number; ma200: number };
    support?: number;
    resistance?: number;
    rangePosition?: number; // 0-100 position in 24h range
  };
  volatility: number;
  lastUpdated: Date;
  // Data source tracking
  dataSource?: string;
}

export interface SocialContext {
  sentiment: {
    score: number;      // -100 to +100 (0 = unavailable)
    trend: 'improving' | 'stable' | 'declining';
    volume: number;     // Number of mentions
    authenticity: number; // 0-1 how authentic the sentiment is
  };
  topMentions: Array<{
    platform: string;
    content: string;
    engagement: number;
    sentiment: number;
    influence: number;
  }>;
  trendingTopics: string[];
  lastUpdated: Date;
  // Data source tracking
  dataSource?: string;
  unavailableReason?: string;
}

export interface NewsContext {
  recentNews: Array<{
    title: string;
    summary: string;
    source: string;
    credibility: number; // 0-1
    sentiment: number;   // -100 to +100
    impact: 'low' | 'medium' | 'high';
    publishedAt: Date;
    url: string;
  }>;
  dominantNarrative: string;
  lastUpdated: Date;
  // Data source tracking
  dataSource?: string;
  unavailableReason?: string;
}

export interface OnChainContext {
  activeAddresses: number;
  transactionVolume: number;
  whaleActivity: {
    largeTransfers: number;
    accumulation: 'buying' | 'selling' | 'holding';
    netFlow: number;
  };
  defiMetrics?: {
    tvl: number;
    borrowing: number;
    staking: number;
  };
  lastUpdated: Date;
  // Data source tracking
  dataSource?: string;
  unavailableReason?: string;
}

// =============================================================================
// OUTPUT TYPES - THE DIVINE BRIEF
// =============================================================================

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'extreme']);
export const ImpactLevelSchema = z.enum(['low', 'medium', 'high']);
export const TimeframeSchema = z.enum(['hours', 'days', 'weeks', 'months']);
export const RecommendationSchema = z.enum(['buy', 'hold', 'sell', 'watch']);

export const RiskSchema = z.object({
  category: z.enum(['market', 'technical', 'regulatory', 'fundamental', 'psychological']),
  severity: RiskLevelSchema,
  probability: RiskLevelSchema,
  description: z.string(),
  mitigation: z.string(),
  timeframe: TimeframeSchema.optional()
});

export const CatalystSchema = z.object({
  type: z.enum(['fundamental', 'technical', 'market', 'macro', 'sentiment']),
  impact: ImpactLevelSchema,
  timeframe: TimeframeSchema,
  probability: RiskLevelSchema,
  description: z.string(),
  priceTarget: z.number().optional()
});

export const SentimentAnalysisSchema = z.object({
  score: z.number().min(-100).max(100),
  trend: z.enum(['improving', 'stable', 'declining']),
  authenticity: z.number().min(0).max(1),
  drivers: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  contrarian: z.object({
    opportunity: z.boolean(),
    reason: z.string()
  }).optional()
});

export const SourceSchema = z.object({
  type: z.enum(['market_data', 'news', 'social', 'onchain', 'analysis', 'psychology', 'oracle']),
  provider: z.string(),
  title: z.string().optional(),
  url: z.string().optional(),
  credibility: z.number().min(0).max(1),
  relevance: z.number().min(0).max(1),
  publishedAt: z.date().optional()
});

export const PsychologyInsightsSchema = z.object({
  warnings: z.array(z.string()),
  manipulationRisk: RiskLevelSchema,
  biasDetected: z.array(z.string()),
  emotionalState: z.enum(['extreme_fear', 'fear', 'neutral', 'greed', 'extreme_greed']),
  coolingOffSuggested: z.boolean(),
  contrarian: z.object({
    signal: z.boolean(),
    reason: z.string()
  }).optional()
});

export const OracleInsightsSchema = z.object({
  predictions: z.object({
    next1h: z.object({ direction: z.string(), magnitude: z.number(), probability: z.number() }).optional(),
    next24h: z.object({ direction: z.string(), magnitude: z.number(), probability: z.number() }).optional(),
    next7d: z.object({ direction: z.string(), magnitude: z.number(), probability: z.number() }).optional()
  }),
  whaleActivity: z.enum(['accumulating', 'distributing', 'holding', 'unknown']),
  marketConsciousness: z.object({
    dominantEmotion: z.string(),
    phaseOfCycle: z.string(),
    riskLevel: RiskLevelSchema
  }),
  turningPoints: z.array(z.string()),
  actionWindows: z.array(z.object({
    action: RecommendationSchema,
    timeframe: z.string(),
    confidence: z.number()
  }))
});

// =============================================================================
// MAIN COINET BRIEF - THE DIVINE OUTPUT
// =============================================================================

export const CoinetBriefSchema = z.object({
  // Core identification
  symbol: z.string(),
  briefId: z.string(),
  timestamp: z.date(),
  
  // Core outputs (as per Coinet AI v1 requirements)
  thesis: z.string(),
  risks: z.array(RiskSchema),
  catalysts: z.array(CatalystSchema),
  sentiment: SentimentAnalysisSchema,
  tldr: z.string(),
  sources: z.array(SourceSchema),
  
  // Enhanced AI insights
  psychologyInsights: PsychologyInsightsSchema.optional(),
  oracleInsights: OracleInsightsSchema.optional(),
  
  // Metadata
  recommendation: RecommendationSchema,
  confidence: z.number().min(0).max(1),
  analysisDepth: z.enum(['quick', 'standard', 'deep']),
  processingTime: z.number(), // milliseconds
  
  // Provenance
  processedFrom: UserInputSchema,
  modelVersions: z.object({
    psychology: z.string().optional(),
    oracle: z.string().optional(),
    context: z.string().optional()
  }).optional()
});

export type Risk = z.infer<typeof RiskSchema>;
export type Catalyst = z.infer<typeof CatalystSchema>;
export type SentimentAnalysis = z.infer<typeof SentimentAnalysisSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type PsychologyInsights = z.infer<typeof PsychologyInsightsSchema>;
export type OracleInsights = z.infer<typeof OracleInsightsSchema>;
export type CoinetBrief = z.infer<typeof CoinetBriefSchema>;

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: CoinetBriefSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  }).optional(),
  metadata: z.object({
    requestId: z.string(),
    processingTime: z.number(),
    version: z.string(),
    rateLimit: z.object({
      remaining: z.number(),
      resetAt: z.number()
    }).optional()
  })
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export class ValidationError extends Error {
  constructor(message: string, public validationErrors: z.ZodError) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateUserInput(input: unknown): UserInput {
  try {
    return UserInputSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid user input', error);
    }
    throw error;
  }
}

export function validateCoinetBrief(brief: unknown): CoinetBrief {
  try {
    return CoinetBriefSchema.parse(brief);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid Coinet brief structure', error);
    }
    throw error;
  }
}
