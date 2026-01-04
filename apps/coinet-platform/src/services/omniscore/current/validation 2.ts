/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ OMNISCORE INPUT VALIDATION — ZOD SCHEMAS                             ║
 * ║                                                                               ║
 * ║   Runtime validation for all OmniScore inputs.                               ║
 * ║   Fail-fast on invalid data — no silent defaults.                            ║
 * ║                                                                               ║
 * ║   Production Readiness Gate: Phase 3                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { ENGINE_VERSION, FORMULA_VERSION } from './version';

// ═══════════════════════════════════════════════════════════════════════════════
// MINIMUM VIABLE DATA THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum number of QS inputs required for a valid score
 * Fewer than this → INSUFFICIENT_DATA error
 */
export const MIN_QS_INPUTS = 3;

/**
 * Minimum number of OS inputs required for a valid score
 * Fewer than this → INSUFFICIENT_DATA error (or OS gated)
 */
export const MIN_OS_INPUTS = 2;

/**
 * Minimum coverage percentage for QS signals
 */
export const MIN_COVERAGE_QS = 0.3; // 30%

/**
 * Minimum coverage percentage for OS signals
 */
export const MIN_COVERAGE_OS = 0.2; // 20%

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const SegmentSchema = z.enum([
  'TEAM', 'TECH', 'SEC', 'TOKEN', 'ADOPT', 'MARKET',
  'COMM', 'GOV', 'ECO', 'VAL', 'LEGAL', 'MACRO'
]);

export type Segment = z.infer<typeof SegmentSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE INPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const FeatureInputSchema = z.object({
  key: z.string().min(1, 'Feature key is required'),
  segment: SegmentSchema,
  raw: z.number().finite('Value must be finite (no NaN/Infinity)').nullable(),
  timestamp: z.string().datetime({ message: 'Timestamp must be ISO8601 format' }),
  sources: z.array(z.string()).optional(),
});

export type FeatureInput = z.infer<typeof FeatureInputSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// REGIME & SECTOR SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const RegimeTypeSchema = z.enum(['bull', 'bear', 'neutral', 'crisis', 'recovery']);
export type RegimeType = z.infer<typeof RegimeTypeSchema>;

export const SectorTypeSchema = z.enum([
  'DeFi', 'L1', 'L2', 'Infrastructure', 'Meme', 'AI', 'Gaming', 'Unknown'
]);
export type SectorType = z.infer<typeof SectorTypeSchema>;

export const CapBucketSchema = z.enum(['mega', 'large', 'mid', 'small', 'micro']);
export type CapBucket = z.infer<typeof CapBucketSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// MARKET DATA SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CryptoRegimeSignalsSchema = z.object({
  btcVolatility30d: z.number().finite().optional(),
  btcTrend30d: z.number().finite().optional(),
  btcTrend90d: z.number().finite().optional(),
  fundingRateAvg: z.number().finite().optional(),
  liquidationIntensity: z.number().finite().optional(),
  stablecoinFlowWeekly: z.number().finite().optional(),
  fearGreedIndex: z.number().finite().optional(),
}).partial();

export type CryptoRegimeSignals = z.infer<typeof CryptoRegimeSignalsSchema>;

export const MarketDataSchema = z.object({
  btcTrend30d: z.number().finite(),
  btcTrend90d: z.number().finite(),
  volatilityIndex: z.number().finite(),
  fearGreedIndex: z.number().finite(),
});

export type MarketData = z.infer<typeof MarketDataSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN INPUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const CalculateOmniScoreParamsSchema = z.object({
  // Required fields
  projectId: z.string().min(1, 'projectId is required and cannot be empty'),
  
  // Input arrays (validated for minimum length downstream)
  qsInputs: z.array(FeatureInputSchema),
  osInputs: z.array(FeatureInputSchema),
  
  // Sector/classification (defaults with warning)
  sector: SectorTypeSchema.default('Unknown'),
  capBucket: CapBucketSchema.default('small'),
  
  // Risk metrics (0-1 range)
  eventRiskSeverity: z.number().min(0).max(1).default(0),
  botRisk: z.number().min(0).max(1).default(0),
  anomalyScore: z.number().min(0).max(1).default(0),
  influencerConcentration: z.number().min(0).max(1).default(0),
  sentimentDispersion: z.number().min(0).max(1).default(0),
  multiSourceConsistency: z.number().min(0).max(1).default(0.8),
  
  // Price data
  priceChange30d: z.number().finite().default(0),
  
  // Cold-start policy
  projectAgeDays: z.number().min(0).optional(),
  
  // Market regime signals (at least one required)
  marketData: MarketDataSchema.optional(),
  cryptoRegimeSignals: CryptoRegimeSignalsSchema.optional(),
  
  // Temporal smoothing state (optional, may come from persistence)
  previousPos: z.number().min(0).max(100).nullable().optional(),
  previousPosTimestamp: z.string().datetime().nullable().optional(),
  
  // Request metadata
  requestId: z.string().optional(),
}).refine(
  (data) => data.marketData !== undefined || data.cryptoRegimeSignals !== undefined,
  { 
    message: 'Either marketData or cryptoRegimeSignals is required for regime detection',
    path: ['marketData']
  }
);

export type ValidatedOmniScoreParams = z.infer<typeof CalculateOmniScoreParamsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class OmniScoreValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR' as const;
  public readonly severity = 'CRITICAL' as const;
  public readonly issues: z.ZodIssue[];
  public readonly formattedErrors: string[];

  constructor(zodError: z.ZodError) {
    const formattedErrors = zodError.issues.map(issue => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `${path}: ${issue.message}`;
    });
    
    super(`OmniScore validation failed: ${formattedErrors.join('; ')}`);
    this.name = 'OmniScoreValidationError';
    this.issues = zodError.issues;
    this.formattedErrors = formattedErrors;
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      issues: this.issues,
      formattedErrors: this.formattedErrors,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate OmniScore input parameters
 * @throws OmniScoreValidationError if validation fails
 */
export function validateOmniScoreParams(
  params: unknown
): ValidatedOmniScoreParams {
  const result = CalculateOmniScoreParamsSchema.safeParse(params);
  
  if (!result.success) {
    throw new OmniScoreValidationError(result.error);
  }
  
  return result.data;
}

/**
 * Safe validation that returns result instead of throwing
 */
export function safeValidateOmniScoreParams(
  params: unknown
): { success: true; data: ValidatedOmniScoreParams } | { success: false; error: OmniScoreValidationError } {
  const result = CalculateOmniScoreParamsSchema.safeParse(params);
  
  if (!result.success) {
    return { success: false, error: new OmniScoreValidationError(result.error) };
  }
  
  return { success: true, data: result.data };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const OmniScoreResultSchema = z.object({
  qs: z.object({
    score: z.number().min(0).max(100).finite(),
    tier: z.enum(['Elite', 'Strong', 'Neutral', 'Weak', 'Critical']),
    confidence: z.enum(['high', 'medium', 'low', 'insufficient']),
    coverage: z.number().min(0).max(1),
  }),
  os: z.object({
    status: z.enum(['ok', 'gated']),
    score: z.number().min(0).max(100).finite(),
    tier: z.enum(['Elite', 'Strong', 'Neutral', 'Weak', 'Critical']),
    coverage: z.number().min(0).max(1),
    gateReason: z.string().optional(),
  }),
  pos: z.object({
    raw: z.number().min(0).max(100).finite(),
    adjusted: z.number().min(0).max(100).finite(),
    tier: z.enum(['Elite', 'Strong', 'Neutral', 'Weak', 'Critical']),
  }),
  audit: z.object({
    engineVersion: z.literal(ENGINE_VERSION),
    formulaVersion: z.literal(FORMULA_VERSION),
    timestamp: z.string().datetime(),
  }).passthrough(), // Allow additional audit fields
});

export type ValidatedOmniScoreResult = z.infer<typeof OmniScoreResultSchema>;

/**
 * Validate OmniScore result before returning to caller
 * @throws OmniScoreValidationError if result is malformed
 */
export function validateOmniScoreResult(result: unknown): ValidatedOmniScoreResult {
  const parsed = OmniScoreResultSchema.safeParse(result);
  
  if (!parsed.success) {
    throw new OmniScoreValidationError(parsed.error);
  }
  
  return parsed.data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MISSING FIELDS TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

export interface MissingFieldsAudit {
  missingFields: string[];
  defaultsApplied: Record<string, unknown>;
  warnings: string[];
}

/**
 * Track which fields used defaults (for audit trail)
 */
export function trackMissingFields(
  rawParams: Record<string, unknown>,
  validatedParams: ValidatedOmniScoreParams
): MissingFieldsAudit {
  const missingFields: string[] = [];
  const defaultsApplied: Record<string, unknown> = {};
  const warnings: string[] = [];
  
  // Check for fields that used defaults
  if (rawParams.sector === undefined) {
    missingFields.push('sector');
    defaultsApplied.sector = 'Unknown';
    warnings.push('sector missing, defaulted to Unknown');
  }
  
  if (rawParams.capBucket === undefined) {
    missingFields.push('capBucket');
    defaultsApplied.capBucket = 'small';
    warnings.push('capBucket missing, defaulted to small');
  }
  
  if (rawParams.eventRiskSeverity === undefined) {
    missingFields.push('eventRiskSeverity');
    defaultsApplied.eventRiskSeverity = 0;
  }
  
  if (rawParams.multiSourceConsistency === undefined) {
    missingFields.push('multiSourceConsistency');
    defaultsApplied.multiSourceConsistency = 0.8;
  }
  
  return { missingFields, defaultsApplied, warnings };
}
