/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     ✅ OMNISCORE v3.0 VALIDATION                                              ║
 * ║                                                                               ║
 * ║   Zod schemas for strict runtime validation of inputs and outputs.           ║
 * ║   If it's not valid, it doesn't ship.                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { CONFIDENCE_THRESHOLDS, SCORE_BOUNDS } from './constants';

// ═══════════════════════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

const TierLabelSchema = z.enum(['Elite', 'Strong', 'Neutral', 'Weak', 'Critical']);

const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low', 'insufficient']);

const LegitimacyLabelSchema = z.enum(['LEGIT', 'WATCH', 'NOT_LEGIT', 'INSUFFICIENT_DATA']);

const IntegrityFlagSchema = z.enum(['Clean', 'Suspicious', 'Manipulated', 'Severe', 'Gated']);

const SectorTypeSchema = z.enum(['L1', 'L2', 'DeFi', 'Infrastructure', 'AI', 'Meme', 'Gaming', 'Unknown']);

const CapBucketSchema = z.enum(['mega', 'large', 'mid', 'small', 'micro']);

const SegmentSchema = z.enum([
  'TEAM', 'TECH', 'SEC', 'GOV', 'ECO',  // QS
  'MARKET', 'TOKEN', 'VAL', 'ADOPT', 'COMM',  // OS
  'LEGAL', 'MACRO',  // Risk
]);

const DataSourceTypeSchema = z.enum(['api', 'blockchain', 'derived', 'estimate']);

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE SCHEMAS (with bounds validation)
// ═══════════════════════════════════════════════════════════════════════════════

const Score0to100Schema = z.number()
  .min(SCORE_BOUNDS.min)
  .max(SCORE_BOUNDS.max);

const Score0to1Schema = z.number()
  .min(0)
  .max(1);

const NullableScoreSchema = z.number()
  .min(SCORE_BOUNDS.min)
  .max(SCORE_BOUNDS.max)
  .nullable();

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const TokenIdentitySchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1).max(20),
  name: z.string().min(1).max(100),
  chain: z.string().min(1),
  contract: z.string().nullable(),
  canonicalProviderIds: z.object({
    coingecko: z.string().optional(),
    defillama: z.string().optional(),
    github: z.string().optional(),
    twitter: z.string().optional(),
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA POINT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const DataPointSchema = z.object({
  key: z.string().min(1),
  segment: SegmentSchema,
  value: z.number().nullable(),
  source: z.string().min(1),
  sourceType: DataSourceTypeSchema,
  fetchedAt: z.string().datetime(),
  reliability: Score0to1Schema,
  derivedFrom: z.array(z.string()).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const LegitimacyHardFailsSchema = z.object({
  rugPullHistory: z.boolean(),
  activeSecWarning: z.boolean(),
  contractHoneypot: z.boolean(),
  fakeAuditPdf: z.boolean(),
});

export const LegitimacySoftFailsSchema = z.object({
  noPublicTeam: z.boolean(),
  lessThan30dOld: z.boolean(),
  lessThan100Holders: z.boolean(),
  washTradingDetected: z.boolean(),
  noAudit: z.boolean(),
});

export const LegitimacyResultSchema = z.object({
  status: z.enum(['passed', 'failed', 'gated']),
  hardFails: LegitimacyHardFailsSchema,
  softFails: LegitimacySoftFailsSchema,
  hardFailCount: z.number().int().min(0),
  softFailCount: z.number().int().min(0),
  reason: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCORE DRIVER SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const ScoreDriverSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  raw: z.number(),
  normalized: Score0to100Schema,
  weight: Score0to1Schema,
  contribution: z.number(),
  impact: z.enum(['positive', 'negative', 'neutral']),
});

export const ScoreDriversSchema = z.object({
  qs: z.array(ScoreDriverSchema).max(5),
  os: z.array(ScoreDriverSchema).max(5).nullable(),
  risk: z.array(ScoreDriverSchema).max(5),
});

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const AllocatorViewSchema = z.object({
  recommendation: z.enum(['accumulate', 'hold', 'reduce', 'avoid']),
  timeHorizon: z.literal('6-12 months'),
  keyMetrics: z.tuple([z.literal('qs'), z.literal('risk'), z.literal('confidence')]),
  hideOS: z.boolean(),
  rationale: z.string().min(1),
});

export const TraderViewSchema = z.object({
  signal: z.enum(['strong_buy', 'buy', 'neutral', 'sell', 'strong_sell']),
  timeHorizon: z.literal('1-4 weeks'),
  keyMetrics: z.tuple([z.literal('os'), z.literal('nrg'), z.literal('momentum')]),
  gateReason: z.string().optional(),
  rationale: z.string().min(1),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const AuditMetadataSchema = z.object({
  engineVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  formulaVersion: z.string().regex(/^v\d+\.\d+$/),
  methodologyId: z.string().min(1),
  methodologyHash: z.string().length(64), // SHA256
  buildSha: z.string().length(40).optional(), // Git SHA
  timestamp: z.string().datetime(),
  requestId: z.string().optional(),
  
  // Calculation audit
  legitimacyChecked: z.boolean(),
  confidenceChecked: z.boolean(),
  smoothingApplied: z.boolean(),
  
  // Data quality
  totalDataPoints: z.number().int().min(0),
  validDataPoints: z.number().int().min(0),
  staleDataPoints: z.number().int().min(0),
  sourceStaleness: z.record(z.string(), z.number()),
  missingSources: z.array(z.string()),
  
  // Flags
  degraded: z.boolean(),
  gated: z.boolean(),
  gateReason: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// OMNISCORE SNAPSHOT SCHEMA (THE CANONICAL OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

export const OmniScoreSnapshotSchema = z.object({
  // Identity
  identity: TokenIdentitySchema,

  // Legitimacy
  legitimacy: LegitimacyLabelSchema,
  legitimacyDetails: LegitimacyResultSchema,

  // Core Scores
  qs: Score0to100Schema,
  qsTier: TierLabelSchema,
  os: NullableScoreSchema,
  osTier: TierLabelSchema.nullable(),
  osGated: z.boolean(),
  osGateReason: z.string().optional(),
  risk: Score0to100Schema,
  riskTier: TierLabelSchema,

  // POS
  posRaw: Score0to100Schema,
  posSmoothed: Score0to100Schema,
  posFinal: NullableScoreSchema,
  posTier: TierLabelSchema.nullable(),

  // Confidence & Coverage
  confidence: z.number().int().min(0).max(100),
  confidenceLevel: ConfidenceLevelSchema,
  coverageQS: Score0to1Schema,
  coverageOS: Score0to1Schema,

  // Integrity
  flag: IntegrityFlagSchema,

  // Drivers
  drivers: ScoreDriversSchema,

  // Views
  allocatorView: AllocatorViewSchema,
  traderView: TraderViewSchema,

  // Classification
  sector: SectorTypeSchema,
  capBucket: CapBucketSchema,

  // Audit
  audit: AuditMetadataSchema,

  // Error (optional)
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
}).refine(
  // HARD RULE: If confidence < threshold → posFinal must be null
  (data) => {
    const confidenceDecimal = data.confidence / 100;
    if (confidenceDecimal < CONFIDENCE_THRESHOLDS.low) {
      return data.posFinal === null;
    }
    return true;
  },
  {
    message: 'INVARIANT: posFinal must be null when confidence < 40%',
    path: ['posFinal'],
  }
).refine(
  // HARD RULE: If legitimacy = NOT_LEGIT → posFinal must be null
  (data) => {
    if (data.legitimacy === 'NOT_LEGIT') {
      return data.posFinal === null;
    }
    return true;
  },
  {
    message: 'INVARIANT: posFinal must be null when legitimacy = NOT_LEGIT',
    path: ['posFinal'],
  }
).refine(
  // INVARIANT: If posFinal is null, flag must be Gated
  (data) => {
    if (data.posFinal === null) {
      return data.flag === 'Gated';
    }
    return true;
  },
  {
    message: 'INVARIANT: flag must be Gated when posFinal is null',
    path: ['flag'],
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const CalculateOmniScoreParamsSchema = z.object({
  identity: TokenIdentitySchema,
  sector: SectorTypeSchema.optional(),
  marketCapUsd: z.number().positive().optional(),
  dataPoints: z.array(DataPointSchema).min(1),
  eventRiskSeverity: z.number().min(0).max(1).optional(),
  requestId: z.string().optional(),
  previousState: z.object({
    projectId: z.string(),
    qs: Score0to100Schema,
    os: NullableScoreSchema,
    pos: Score0to100Schema,
    risk: Score0to100Schema,
    timestamp: z.date(),
    engineVersion: z.string(),
  }).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS (inferred from schemas)
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidatedTokenIdentity = z.infer<typeof TokenIdentitySchema>;
export type ValidatedDataPoint = z.infer<typeof DataPointSchema>;
export type ValidatedOmniScoreSnapshot = z.infer<typeof OmniScoreSnapshotSchema>;
export type ValidatedCalculateParams = z.infer<typeof CalculateOmniScoreParamsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a snapshot and throw if invalid
 */
export function validateSnapshotOrThrow(snapshot: unknown): ValidatedOmniScoreSnapshot {
  return OmniScoreSnapshotSchema.parse(snapshot);
}

/**
 * Safely validate a snapshot (returns null on failure)
 */
export function validateSnapshotSafe(snapshot: unknown): ValidatedOmniScoreSnapshot | null {
  const result = OmniScoreSnapshotSchema.safeParse(snapshot);
  return result.success ? result.data : null;
}

/**
 * Validate input params and throw if invalid
 */
export function validateParamsOrThrow(params: unknown): ValidatedCalculateParams {
  return CalculateOmniScoreParamsSchema.parse(params);
}

/**
 * Get validation errors for a snapshot
 */
export function getSnapshotValidationErrors(snapshot: unknown): string[] {
  const result = OmniScoreSnapshotSchema.safeParse(snapshot);
  if (result.success) return [];
  
  return result.error.errors.map(e => 
    `${e.path.join('.')}: ${e.message}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CHECKS (exported for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export const SNAPSHOT_INVARIANTS = {
  /** INV-1: All scores must be in [0, 100] */
  scoresInBounds: (s: ValidatedOmniScoreSnapshot) => 
    s.qs >= 0 && s.qs <= 100 &&
    s.risk >= 0 && s.risk <= 100 &&
    s.posRaw >= 0 && s.posRaw <= 100 &&
    s.posSmoothed >= 0 && s.posSmoothed <= 100 &&
    (s.os === null || (s.os >= 0 && s.os <= 100)) &&
    (s.posFinal === null || (s.posFinal >= 0 && s.posFinal <= 100)),

  /** INV-2: Coverage must be in [0, 1] */
  coverageInBounds: (s: ValidatedOmniScoreSnapshot) =>
    s.coverageQS >= 0 && s.coverageQS <= 1 &&
    s.coverageOS >= 0 && s.coverageOS <= 1,

  /** INV-3: Confidence must match coverage */
  confidenceMatchesCoverage: (s: ValidatedOmniScoreSnapshot) => {
    const expectedConfidence = Math.round(((s.coverageQS + s.coverageOS) / 2) * 100);
    return Math.abs(s.confidence - expectedConfidence) <= 5; // 5% tolerance
  },

  /** INV-4: If OS is gated, osGated must be true */
  osGatedConsistent: (s: ValidatedOmniScoreSnapshot) =>
    s.os === null ? s.osGated === true : true,

  /** INV-5: Gated snapshot must have error */
  gatedHasError: (s: ValidatedOmniScoreSnapshot) =>
    s.posFinal === null ? s.error !== undefined : true,

  /** INV-6: Tier must match score */
  tierMatchesScore: (s: ValidatedOmniScoreSnapshot) => {
    const tierForScore = (score: number): string => {
      if (score >= 85) return 'Elite';
      if (score >= 70) return 'Strong';
      if (score >= 50) return 'Neutral';
      if (score >= 30) return 'Weak';
      return 'Critical';
    };
    return s.qsTier === tierForScore(s.qs) &&
           s.riskTier === tierForScore(s.risk);
  },
} as const;

/**
 * Run all invariant checks on a snapshot
 */
export function checkAllInvariants(snapshot: ValidatedOmniScoreSnapshot): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  for (const [name, check] of Object.entries(SNAPSHOT_INVARIANTS)) {
    if (!check(snapshot)) {
      violations.push(name);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
