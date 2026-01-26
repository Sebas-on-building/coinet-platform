/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 INSIGHT PACK V1 — TYPE DEFINITIONS                                     ║
 * ║                                                                               ║
 * ║   Grok's structured hypothesis output based ONLY on Evidence Pack.            ║
 * ║   Every claim must reference Evidence Pack keys via evidence_keys pointers.   ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. Output MUST parse to JSON (no markdown, no prose)                       ║
 * ║   I2. Output MUST validate against schema with required fields                ║
 * ║   I3. Every driver/risk/catalyst must have resolvable evidence_keys           ║
 * ║   I4. Pass-1 may NOT introduce token facts not present in Evidence Pack       ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA VERSION
// ============================================================================

export const INSIGHT_PACK_VERSION = '1.0.0' as const;

// ============================================================================
// ENUMS
// ============================================================================

export const ConfidenceLevel = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const Severity = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof Severity>;

export const Direction = z.enum(['bullish', 'bearish', 'neutral', 'mixed']);
export type Direction = z.infer<typeof Direction>;

export const Horizon = z.enum(['immediate', 'hours', 'days', 'weeks', 'unknown']);
export type Horizon = z.infer<typeof Horizon>;

export const Engine = z.enum(['grok', 'gemini', 'aggregated']);
export type Engine = z.infer<typeof Engine>;

// ============================================================================
// EVIDENCE KEY PATH
// ============================================================================

/**
 * Evidence key format: dot notation + bracket indexes
 * Examples:
 *   evidence.dexscreener.data.price
 *   evidence.dexscreener.data.txns_24h.buys
 *   evidence.security.data.flags[0].code
 *   evidence.market_snapshot.data.btc.price
 */
export const EvidenceKeyPath = z.string().regex(
  /^evidence\.[a-z_]+(\.[a-z_]+|\[\d+\])+$/,
  'Invalid evidence key path format'
);
export type EvidenceKeyPath = z.infer<typeof EvidenceKeyPath>;

// ============================================================================
// META
// ============================================================================

export const InsightPackMeta = z.object({
  version: z.literal(INSIGHT_PACK_VERSION),
  engine: Engine,
  intent: z.string().min(1),
  language: z.string().length(2),
  asset_focus: z.string().nullable(),  // Token symbol or null for market
  chain: z.string().nullable(),        // Chain if token, null for market
  timeframe: z.enum(['snapshot', 'today', 'week', 'historical']),
  created_at_unix: z.number().int().positive(),
});
export type InsightPackMeta = z.infer<typeof InsightPackMeta>;

// ============================================================================
// COVERAGE USED
// ============================================================================

export const CoverageUsed = z.object({
  available_modules: z.array(z.string()),
  missing_modules: z.array(z.string()),
  max_data_age_seconds: z.number().int().nonnegative(),
});
export type CoverageUsed = z.infer<typeof CoverageUsed>;

// ============================================================================
// DRIVER
// ============================================================================

/**
 * A driver is a key factor explaining current state or movement.
 * RULE: summary must NOT contain numeric literals.
 * Numbers are inferred from evidence_keys during rendering.
 */
export const Driver = z.object({
  id: z.string().regex(/^d[0-9]+$/, 'Driver ID must be d1, d2, etc.'),
  topic: z.string().min(3).max(50),
  summary: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath).min(1),  // At least one evidence pointer
  confidence: ConfidenceLevel,
  direction: Direction.optional(),
});
export type Driver = z.infer<typeof Driver>;

// ============================================================================
// RISK
// ============================================================================

/**
 * A risk is a potential negative factor.
 * RULE: summary (why) must NOT contain numeric literals.
 */
export const Risk = z.object({
  id: z.string().regex(/^r[0-9]+$/, 'Risk ID must be r1, r2, etc.'),
  risk: z.string().min(3).max(50),
  why: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath).min(1),
  severity: Severity,
  confidence: ConfidenceLevel,
});
export type Risk = z.infer<typeof Risk>;

// ============================================================================
// CATALYST
// ============================================================================

/**
 * A catalyst is a potential future event or trigger.
 * Can have empty evidence_keys if speculative (but confidence must be low).
 */
export const Catalyst = z.object({
  id: z.string().regex(/^c[0-9]+$/, 'Catalyst ID must be c1, c2, etc.'),
  topic: z.string().min(3).max(50),
  why_it_matters: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath),  // Can be empty for speculative
  horizon: Horizon,
  confidence: ConfidenceLevel,
});
export type Catalyst = z.infer<typeof Catalyst>;

// ============================================================================
// SCENARIOS
// ============================================================================

/**
 * Bull/Base/Bear scenarios.
 * RULE: summaries must NOT contain specific numbers.
 * Use qualitative language: "significant increase", "moderate decline", etc.
 */
export const Scenario = z.object({
  summary: z.string().min(20).max(300),
  probability: z.enum(['likely', 'possible', 'unlikely']),
  key_triggers: z.array(z.string().max(100)).max(3),
});
export type Scenario = z.infer<typeof Scenario>;

export const Scenarios = z.object({
  bull: Scenario,
  base: Scenario,
  bear: Scenario,
});
export type Scenarios = z.infer<typeof Scenarios>;

// ============================================================================
// UNKNOWN
// ============================================================================

/**
 * Things we don't know or couldn't verify.
 * Items demoted from drivers/risks due to bad evidence also go here.
 */
export const Unknown = z.object({
  id: z.string().regex(/^u[0-9]+$/, 'Unknown ID must be u1, u2, etc.'),
  what: z.string().min(5).max(150),
  why_unknown: z.enum([
    'missing_module',
    'stale_data',
    'unverifiable',
    'speculative',
    'evidence_key_invalid',
    'demoted_from_driver',
    'demoted_from_risk',
  ]),
  would_help: z.string().max(100).nullable(),
});
export type Unknown = z.infer<typeof Unknown>;

// ============================================================================
// REQUIRED CLARIFIER
// ============================================================================

/**
 * Only set if token resolution is uncertain.
 * Pass-1 should NOT ask clarifying questions otherwise.
 */
export const RequiredClarifier = z.object({
  question: z.string().min(10).max(200),
  reason: z.enum(['ambiguous_ticker', 'multiple_matches', 'no_match']),
  candidates: z.array(z.object({
    symbol: z.string(),
    chain: z.string(),
    address: z.string(),
  })).max(5).optional(),
}).nullable();
export type RequiredClarifier = z.infer<typeof RequiredClarifier>;

// ============================================================================
// INSIGHT PACK V1 (FULL SCHEMA)
// ============================================================================

export const InsightPackV1Schema = z.object({
  meta: InsightPackMeta,
  coverage_used: CoverageUsed,
  drivers: z.array(Driver).min(1).max(5),
  risks: z.array(Risk).max(5),
  catalysts_next: z.array(Catalyst).max(3),
  scenarios: Scenarios,
  unknowns: z.array(Unknown).max(10),
  overall_confidence: ConfidenceLevel,
  required_clarifier: RequiredClarifier,
});
export type InsightPackV1 = z.infer<typeof InsightPackV1Schema>;

// ============================================================================
// ERROR OUTPUT (GROK FAIL CASE)
// ============================================================================

export const GrokErrorOutput = z.object({
  error: z.literal('SCHEMA_VIOLATION'),
  reason: z.string().optional(),
});
export type GrokErrorOutput = z.infer<typeof GrokErrorOutput>;

// ============================================================================
// ENFORCEMENT RESULT
// ============================================================================

export interface EnforcementSuccess {
  ok: true;
  data: InsightPackV1;
  degraded: boolean;
  warnings: string[];
  attemptsUsed: number;
  demotedItems: number;
}

export interface EnforcementFailure {
  ok: false;
  error: string;
  retriesUsed: number;
  lastRawExcerpt: string;
  validationErrors: string[];
}

export type EnforcementResult = EnforcementSuccess | EnforcementFailure;

// ============================================================================
// ENFORCEMENT OPTIONS
// ============================================================================

export interface EnforcementOptions {
  maxRetries: number;
  strictEvidenceKeys: boolean;  // If true, invalid keys cause demotion; if false, warning only
  allowEmptyEvidenceKeys: boolean;  // For catalysts only
  timeoutMs: number;
}

export const DEFAULT_ENFORCEMENT_OPTIONS: EnforcementOptions = {
  maxRetries: 2,
  strictEvidenceKeys: true,
  allowEmptyEvidenceKeys: true,  // Catalysts can be speculative
  timeoutMs: 15000,
};

// ============================================================================
// NUMERIC LITERALS POLICY
// ============================================================================

/**
 * DECISION: FORBID numeric literals in summaries.
 * 
 * Justification:
 * 1. Reliability: Numbers in free text are the #1 source of hallucination
 * 2. Verifiability: Evidence Pack has the numbers; Pass-2 renderer can inject them
 * 3. Moat: Competitors allowing free numbers will have more hallucinations
 * 4. Simplicity: No need for complex numbers_used mapping in Pass-1
 * 
 * Exception: Percentage ranges like "significant portion" are allowed.
 * Forbidden: "price is $0.0042", "top 10 holders own 58%", "3 hours old"
 */
export const NUMERIC_LITERAL_PATTERN = /\b\d+(?:\.\d+)?(?:\s*%|\s*hours?|\s*days?|\s*[KMBkmb]|\s*USD|\s*\$)?\b/;

export function containsNumericLiteral(text: string): boolean {
  // Allow ordinals (1st, 2nd, 3rd, etc.)
  const withoutOrdinals = text.replace(/\b\d+(?:st|nd|rd|th)\b/gi, '');
  // Allow IDs like d1, r2, c3
  const withoutIds = withoutOrdinals.replace(/\b[drcuDRCU]\d+\b/g, '');
  return NUMERIC_LITERAL_PATTERN.test(withoutIds);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  InsightPackV1Schema as InsightPackSchema,
};
