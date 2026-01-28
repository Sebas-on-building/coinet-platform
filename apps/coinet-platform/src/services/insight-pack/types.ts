/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧠 INSIGHT PACK V1 — TYPE DEFINITIONS (HARDENED)                          ║
 * ║                                                                               ║
 * ║   Grok's structured hypothesis output based ONLY on Evidence Pack.            ║
 * ║   Every claim must reference Evidence Pack keys via evidence_keys pointers.   ║
 * ║                                                                               ║
 * ║   HARD INVARIANTS:                                                            ║
 * ║   I1. Output MUST parse to JSON (no markdown, no prose)                       ║
 * ║   I2. Output MUST validate against strict schema (no extra keys)              ║
 * ║   I3. Every driver/risk/catalyst must have resolvable evidence_keys           ║
 * ║   I4. Pass-1 may NOT introduce token facts not present in Evidence Pack       ║
 * ║   I5. Pass-1 must NOT contain user-facing language                            ║
 * ║   I6. Model-provided meta/coverage is overwritten server-side                 ║
 * ║                                                                               ║
 * ║   @version 1.1.0 - Hardened Pass-1 Insight Pack Layer                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ============================================================================
// SCHEMA VERSION
// ============================================================================

export const INSIGHT_PACK_VERSION = '1.1.0' as const;

// ============================================================================
// ENUMS (STRICT)
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

// Intent is now an enum, not freeform string
export const IntentType = z.enum([
  'quick_answer',
  'decision_help',
  'deep_analysis',
  'new_coin_analysis',
  'learning',
  'troubleshoot',
  'unknown',
]);
export type IntentType = z.infer<typeof IntentType>;

export const Timeframe = z.enum(['snapshot', 'today', 'week', 'historical']);
export type Timeframe = z.infer<typeof Timeframe>;

// ============================================================================
// EVIDENCE KEY PATH
// ============================================================================

/**
 * Evidence key format: dot notation + bracket indexes
 * Examples:
 *   evidence.dexscreener.data.price
 *   evidence.dexscreener.data.txns_24h.buys
 *   evidence.security.data.flags[0].code
 */
export const EvidenceKeyPath = z.string().regex(
  /^evidence\.[a-z_]+(\.[a-z_0-9]+|\[\d+\])+$/i,
  'Invalid evidence key path format. Must be: evidence.module.field[.subfield|[index]]'
);
export type EvidenceKeyPath = z.infer<typeof EvidenceKeyPath>;

// ============================================================================
// META (MODEL OUTPUT - will be overwritten server-side)
// ============================================================================

/**
 * Meta is model-provided but SERVER-AUTHORITATIVE.
 * Enforcer OVERWRITES these fields from server state.
 */
export const InsightPackMeta = z.object({
  version: z.literal(INSIGHT_PACK_VERSION),
  engine: Engine,
  intent: IntentType,
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Language must be BCP-47 format: en, de, es-ES'),
  asset_focus: z.string().nullable(),
  chain: z.string().nullable(),
  timeframe: Timeframe,
  created_at_unix: z.number().int().positive(),
}).strict();  // FIX #1: Reject extra keys
export type InsightPackMeta = z.infer<typeof InsightPackMeta>;

// ============================================================================
// COVERAGE USED (SERVER-AUTHORITATIVE)
// ============================================================================

/**
 * Coverage is computed from Evidence Pack server-side.
 * Model output is IGNORED and replaced.
 */
export const CoverageUsed = z.object({
  available_modules: z.array(z.string()),
  missing_modules: z.array(z.string()),
  max_data_age_seconds: z.number().int().nonnegative(),
}).strict();
export type CoverageUsed = z.infer<typeof CoverageUsed>;

// ============================================================================
// DRIVER (STRICT)
// ============================================================================

/**
 * A driver is a key factor explaining current state or movement.
 * RULES:
 * - summary must NOT contain numeric literals
 * - evidence_keys must have at least 1 valid path
 * - topic must NOT contain numeric literals
 */
export const Driver = z.object({
  id: z.string().regex(/^d[0-9]+$/, 'Driver ID must be d1, d2, etc.'),
  topic: z.string().min(3).max(50),
  summary: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath).min(1),  // Required: at least one
  confidence: ConfidenceLevel,
  direction: Direction.optional(),
}).strict();
export type Driver = z.infer<typeof Driver>;

// ============================================================================
// RISK (STRICT)
// ============================================================================

export const Risk = z.object({
  id: z.string().regex(/^r[0-9]+$/, 'Risk ID must be r1, r2, etc.'),
  risk: z.string().min(3).max(50),
  why: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath).min(1),  // Required: at least one
  severity: Severity,
  confidence: ConfidenceLevel,
}).strict();
export type Risk = z.infer<typeof Risk>;

// ============================================================================
// CATALYST (STRICT - evidence_keys now REQUIRED)
// ============================================================================

/**
 * FIX #5: Catalysts now REQUIRE evidence_keys.
 * If no evidence, the claim must go to unknowns instead.
 */
export const Catalyst = z.object({
  id: z.string().regex(/^c[0-9]+$/, 'Catalyst ID must be c1, c2, etc.'),
  topic: z.string().min(3).max(50),
  why_it_matters: z.string().min(10).max(200),
  evidence_keys: z.array(EvidenceKeyPath).min(1),  // FIX: Now required
  horizon: Horizon,
  confidence: ConfidenceLevel,
}).strict();
export type Catalyst = z.infer<typeof Catalyst>;

// ============================================================================
// SCENARIOS (STRICT)
// ============================================================================

export const Scenario = z.object({
  summary: z.string().min(20).max(300),
  probability: z.enum(['likely', 'possible', 'unlikely']),
  key_triggers: z.array(z.string().max(100)).max(3),
}).strict();
export type Scenario = z.infer<typeof Scenario>;

export const Scenarios = z.object({
  bull: Scenario,
  base: Scenario,
  bear: Scenario,
}).strict();
export type Scenarios = z.infer<typeof Scenarios>;

// ============================================================================
// UNKNOWN (STRICT)
// ============================================================================

export const UnknownReason = z.enum([
  'missing_module',
  'stale_data',
  'unverifiable',
  'speculative',
  'evidence_key_invalid',
  'demoted_from_driver',
  'demoted_from_risk',
  'demoted_from_catalyst',
  'insufficient_evidence',
]);
export type UnknownReason = z.infer<typeof UnknownReason>;

export const Unknown = z.object({
  id: z.string().regex(/^u[0-9]+$/, 'Unknown ID must be u1, u2, etc.'),
  what: z.string().min(5).max(150),
  why_unknown: UnknownReason,
  would_help: z.string().max(100).nullable(),
}).strict();
export type Unknown = z.infer<typeof Unknown>;

// ============================================================================
// REQUIRED CLARIFIER (STRICT)
// ============================================================================

export const ClarifierCandidate = z.object({
  symbol: z.string(),
  chain: z.string(),
  address: z.string(),
}).strict();

export const RequiredClarifier = z.object({
  question: z.string().min(10).max(200),
  reason: z.enum(['ambiguous_ticker', 'multiple_matches', 'no_match']),
  candidates: z.array(ClarifierCandidate).max(5).optional(),
}).strict().nullable();
export type RequiredClarifier = z.infer<typeof RequiredClarifier>;

// ============================================================================
// INSIGHT PACK V1 (STRICT - FIX #3: drivers no longer min(1))
// ============================================================================

/**
 * FIX #3: Allow empty drivers array, but require at least one of
 * {drivers, risks, catalysts_next, unknowns} to be non-empty.
 * This is validated in the enforcer, not in the schema.
 */
export const InsightPackV1Schema = z.object({
  meta: InsightPackMeta,
  coverage_used: CoverageUsed,
  drivers: z.array(Driver).max(5),     // FIX: Removed min(1)
  risks: z.array(Risk).max(5),
  catalysts_next: z.array(Catalyst).max(3),
  scenarios: Scenarios,
  unknowns: z.array(Unknown).max(10),
  overall_confidence: ConfidenceLevel,
  required_clarifier: RequiredClarifier,
}).strict();  // FIX #1: Reject extra keys at root level
export type InsightPackV1 = z.infer<typeof InsightPackV1Schema>;

// ============================================================================
// ERROR OUTPUT (GROK FAIL CASE)
// ============================================================================

export const GrokErrorOutput = z.object({
  error: z.literal('SCHEMA_VIOLATION'),
  reason: z.string().optional(),
}).strict();
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
  serverOverwrites: string[];  // Fields that were overwritten
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
  strictEvidenceKeys: boolean;
  strictNumericLiterals: boolean;
  strictJsonExtraction: boolean;  // FIX #7: Reject leading/trailing text
  strictUserTalk: boolean;         // FIX #8: Reject user-facing language
  timeoutMs: number;
  // Server-authoritative values
  serverMeta: {
    intent: IntentType;
    language: string;
    asset_focus: string | null;
    chain: string | null;
    timeframe: Timeframe;
  };
}

export const DEFAULT_ENFORCEMENT_OPTIONS: EnforcementOptions = {
  maxRetries: 2,
  strictEvidenceKeys: true,
  strictNumericLiterals: true,
  strictJsonExtraction: true,
  strictUserTalk: true,
  timeoutMs: 15000,
  serverMeta: {
    intent: 'unknown',
    language: 'en',
    asset_focus: null,
    chain: null,
    timeframe: 'snapshot',
  },
};

// ============================================================================
// NUMERIC LITERALS POLICY (FIX #4: Stronger detection)
// ============================================================================

/**
 * FIX #4: Comprehensive numeric literal detection.
 * Catches: 15%, $45K, 2m, x3, 1.5%, 24h, 45.000 (German), 1,5% (European)
 */
export const NUMERIC_LITERAL_PATTERNS = [
  // Basic numbers with units
  /\b\d+(?:[.,]\d+)?(?:\s*%|\s*hours?|\s*days?|\s*mins?|\s*minutes?|\s*weeks?|\s*months?)?\b/i,
  // Currency formats: $45, $45K, $1.2M, 45 USD, €100
  /[$€£¥]\s*\d+(?:[.,]\d+)?(?:\s*[KMBTkmbt])?\b/i,
  /\b\d+(?:[.,]\d+)?(?:\s*[KMBTkmbt])?\s*(?:USD|EUR|GBP|SOL|ETH|BTC)\b/i,
  // Multipliers: x2, x10, 2x, 10x
  /\b(?:x\d+|\d+x)\b/i,
  // Percentage ranges: 10-20%, 5 to 10%
  /\b\d+(?:[.,]\d+)?(?:\s*[-–—to]+\s*\d+(?:[.,]\d+)?)?(?:\s*%)\b/i,
  // European number formats: 1.000, 1.000.000 (thousands), 1,5 (decimal)
  /\b\d{1,3}(?:\.\d{3})+\b/,  // 1.000.000
  /\b\d+,\d+(?:\s*%|\s*[KMBkmb])?\b/,  // 1,5% or 45,5K
  // Time durations: 24h, 1hr, 3hrs
  /\b\d+\s*(?:hr?s?|h)\b/i,
  // Age: 3 hours old, 2 days old
  /\b\d+\s*(?:hours?|days?|weeks?|months?)\s*old\b/i,
];

/**
 * Check if text contains forbidden numeric literals.
 * Returns { clean: false, matches: [...] } if violations found.
 */
export function detectNumericLiterals(text: string): { clean: boolean; matches: string[] } {
  // First, remove allowed patterns
  let sanitized = text;
  
  // Allow ordinals (1st, 2nd, 3rd, 4th, etc.)
  sanitized = sanitized.replace(/\b\d+(?:st|nd|rd|th)\b/gi, '___ORDINAL___');
  
  // Allow IDs like d1, r2, c3, u4
  sanitized = sanitized.replace(/\b[drcuDRCU]\d+\b/g, '___ID___');
  
  // Allow version numbers like v1, v2.0
  sanitized = sanitized.replace(/\bv\d+(?:\.\d+)*\b/gi, '___VERSION___');
  
  // Allow "Layer 2", "L2", "ERC-20" type identifiers
  sanitized = sanitized.replace(/\b(?:Layer\s*\d+|L\d+|ERC-\d+|BEP-\d+)\b/gi, '___TECH___');
  
  const matches: string[] = [];
  
  for (const pattern of NUMERIC_LITERAL_PATTERNS) {
    const found = sanitized.match(new RegExp(pattern.source, 'gi'));
    if (found) {
      matches.push(...found);
    }
  }
  
  return {
    clean: matches.length === 0,
    matches: [...new Set(matches)],  // Dedupe
  };
}

// Legacy function for backwards compatibility
export function containsNumericLiteral(text: string): boolean {
  return !detectNumericLiterals(text).clean;
}

// ============================================================================
// USER-TALK DETECTION (FIX #8)
// ============================================================================

/**
 * FIX #8: Detect user-facing language in Pass-1.
 * Pass-1 is research artifact, not chat. Must be neutral/analytical.
 */
export const USER_TALK_PATTERNS = [
  // Greetings
  /\b(hey|hi|hello|yo|sup|howdy|greetings)\b/i,
  // Second person
  /\b(you should|you could|you might|you may|you can|you need|your)\b/i,
  // Disclaimers
  /\b(not financial advice|nfa|dyor|do your own research|this is not)\b/i,
  // Chatty filler
  /\b(honestly|basically|literally|actually|tbh|ngl|imo|imho)\b/i,
  // Questions (except in required_clarifier)
  /\?(?!\s*$)/,  // Question marks not at end
  // Emojis (basic detection)
  /[\u{1F300}-\u{1F9FF}]/u,
  // Slang
  /\b(bro|dude|fam|papi|homie|buddy|mate)\b/i,
  // Hedging phrases that indicate uncertainty (fine in unknowns, not in drivers)
  /\b(i think|i believe|i guess|maybe|perhaps|possibly|could be|might be)\b/i,
];

export function detectUserTalk(text: string): { clean: boolean; violations: string[] } {
  const violations: string[] = [];
  
  for (const pattern of USER_TALK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(match[0]);
    }
  }
  
  return {
    clean: violations.length === 0,
    violations: [...new Set(violations)],
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  InsightPackV1Schema as InsightPackSchema,
  NUMERIC_LITERAL_PATTERNS,
  USER_TALK_PATTERNS,
};
