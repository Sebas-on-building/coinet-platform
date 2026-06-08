/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     COINET JUDGMENT STANDARD — OUTPUT CONTRACT                                ║
 * ║                                                                               ║
 * ║   Every meaningful Coinet analysis must produce these 7 fields:               ║
 * ║   1. State       — what is happening right now                                ║
 * ║   2. Cause       — why is it happening                                        ║
 * ║   3. Thesis      — what is most likely true                                   ║
 * ║   4. Contradictions — what weakens the current story                          ║
 * ║   5. Timing      — is this early, mature, or late                             ║
 * ║   6. Scenario    — what must happen next for the thesis to hold               ║
 * ║   7. Confidence  — how much trust should the user place                       ║
 * ║                                                                               ║
 * ║   This is the non-negotiable product rule.                                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import {
  MarketStateSchema,
  CausalFamilySchema,
  HypothesisClassSchema,
  ContradictionClassSchema,
  TimingPhaseSchema,
  ConfidenceBandSchema,
  ContradictionSeveritySchema,
} from './taxonomies';

// ═══════════════════════════════════════════════════════════════════════════════
// 0. SIGNAL SNAPSHOT (input for all judgment engines)
// ═══════════════════════════════════════════════════════════════════════════════

/** Normalized signal values for judgment engines. All fields 0–1 unless noted. */
export interface SignalSnapshot {
  price_momentum_24h: number;
  price_momentum_1h: number;
  volume_24h: number;
  buy_sell_ratio: number;
  liquidity: number;
  pair_age_hours: number | null;
  leverage_pressure: number;
  funding_rate: number;
  liquidation_density: number;
  fundamentals_strength: number;
  tvl_trend: number;
  revenue_quality: number;
  whale_activity: number;
  exchange_inflow: number;
  exchange_outflow: number;
  security_risk: number;
  holder_concentration: number;
  narrative_intensity: number;
  sentiment: number;
  unlock_pressure: number;
  data_completeness: number;
  data_freshness: number;
  /**
   * Set of signal categories that were defaulted due to missing source data.
   * Used to distinguish "neutral observation" from "no data available".
   * When non-empty, downstream engines apply coverage penalties.
   */
  _missing?: Set<string>;

  /**
   * Per-family applicability for THIS asset's purpose (SCORED / APPLICABLE_NO_DATA
   * / NOT_APPLICABLE), computed by produceJudgment from the asset's Sector. Lets
   * the confidence/contradiction/hypothesis engines judge each asset by the right
   * lens — never penalizing it for a metric that's the wrong lens for its type.
   * Optional: when absent, engines fall back to legacy (all-applicable) behavior.
   */
  _applicability?: import('./asset-applicability').FamilyApplicability;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. STATE
// ═══════════════════════════════════════════════════════════════════════════════

export const JudgmentStateSchema = z.object({
  primary: MarketStateSchema,
  secondary: MarketStateSchema.nullable(),
  confidence: z.number().min(0).max(1),
});
export type JudgmentState = z.infer<typeof JudgmentStateSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CAUSE
// ═══════════════════════════════════════════════════════════════════════════════

export const CausalDriverSchema = z.object({
  family: CausalFamilySchema,
  /** Feature keys that support this causal attribution */
  supporting_features: z.array(z.string()),
  /** Strength 0–1 based on feature strength and agreement */
  strength: z.number().min(0).max(1),
  /** Human-readable one-line summary */
  summary: z.string(),
});
export type CausalDriver = z.infer<typeof CausalDriverSchema>;

export const JudgmentCauseSchema = z.object({
  positive_drivers: z.array(CausalDriverSchema).max(3),
  negative_drivers: z.array(CausalDriverSchema).max(3),
  dominant_cluster: CausalFamilySchema,
  secondary_cluster: CausalFamilySchema.nullable(),
});
export type JudgmentCause = z.infer<typeof JudgmentCauseSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. THESIS (Hypothesis Ranking)
// ═══════════════════════════════════════════════════════════════════════════════

export const RankedHypothesisSchema = z.object({
  hypothesis: HypothesisClassSchema,
  support_score: z.number().min(0).max(1),
  contradiction_score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  missing_evidence: z.array(z.string()),
});
export type RankedHypothesis = z.infer<typeof RankedHypothesisSchema>;

export const JudgmentThesisSchema = z.object({
  primary: RankedHypothesisSchema,
  secondary: RankedHypothesisSchema.nullable(),
  /** Confidence gap between primary and secondary (higher = clearer) */
  clarity: z.number().min(0).max(1),
  ambiguity_flag: z.boolean(),
});
export type JudgmentThesis = z.infer<typeof JudgmentThesisSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CONTRADICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ContradictionSchema = z.object({
  class: ContradictionClassSchema,
  severity: ContradictionSeveritySchema,
  /** Features on positive side of the contradiction */
  positive_side: z.array(z.string()),
  /** Features on negative side of the contradiction */
  negative_side: z.array(z.string()),
  /** Which scores this contradiction affects */
  affects_scores: z.array(z.string()),
  /** Whether this could resolve with more data or is structural */
  resolvable: z.boolean(),
  /** One-line description */
  summary: z.string(),
});
export type Contradiction = z.infer<typeof ContradictionSchema>;

export const JudgmentContradictionsSchema = z.object({
  items: z.array(ContradictionSchema).max(5),
  /** Overall contradiction load 0–1 */
  load: z.number().min(0).max(1),
  /** Are any contradictions severe enough to warrant caution? */
  structural_warning: z.boolean(),
  /** L3.3-B: if identity gate denied, explains why contradictions were suppressed */
  identity_gate_denial: z.string().optional(),
  /** L3.3-B: when gate allows with scar or conditional, surfaces disclosure */
  identity_gate_note: z.string().optional(),
});
export type JudgmentContradictions = z.infer<typeof JudgmentContradictionsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TIMING
// ═══════════════════════════════════════════════════════════════════════════════

export const JudgmentTimingSchema = z.object({
  phase: TimingPhaseSchema,
  /** 0–100 score: 0 = extremely early, 100 = extremely late */
  score: z.number().min(0).max(100),
  /** Which sequence step we're at (1-based, out of total steps) */
  sequence_position: z.number().int().min(1),
  sequence_total: z.number().int().min(1),
  /** Was there a recent key inflection? */
  maturity_warning: z.boolean(),
  maturity_note: z.string().nullable(),
});
export type JudgmentTiming = z.infer<typeof JudgmentTimingSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. SCENARIO
// ═══════════════════════════════════════════════════════════════════════════════

export const HorizonScenarioSchema = z.object({
  horizon: z.enum(['24h', '7d', '30d']),
  confirmation: z.string(),
  failure: z.string(),
  trigger: z.string(),
  invalidation: z.string(),
});
export type HorizonScenario = z.infer<typeof HorizonScenarioSchema>;

export const JudgmentScenarioSchema = z.object({
  base_case: z.string(),
  bullish_confirmation: z.string(),
  bearish_failure: z.string(),
  next_trigger: z.string(),
  /** How confident is the scenario framing? */
  scenario_confidence: z.number().min(0).max(1),
  /** Horizon-specific scenarios (24h, 7d, 30d) */
  horizons: z.array(HorizonScenarioSchema).optional(),
  /** Primary hypothesis label referenced in scenario */
  primary_hypothesis: z.string().optional(),
  /** Top contradiction referenced in scenario */
  top_contradiction: z.string().optional(),
  /** Regime context referenced in scenario */
  regime_context: z.string().optional(),
});
export type JudgmentScenario = z.infer<typeof JudgmentScenarioSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 7. CONFIDENCE
// ═══════════════════════════════════════════════════════════════════════════════

export const ConfidenceBreakdownSchema = z.object({
  market: z.number().min(0).max(1),
  fundamentals: z.number().min(0).max(1),
  onchain: z.number().min(0).max(1),
  narrative: z.number().min(0).max(1),
});
export type ConfidenceBreakdown = z.infer<typeof ConfidenceBreakdownSchema>;

export const JudgmentConfidenceSchema = z.object({
  overall: ConfidenceBandSchema,
  /** Numeric 0–1 */
  score: z.number().min(0).max(1),
  breakdown: ConfidenceBreakdownSchema,
  /** What is reducing confidence the most? */
  primary_uncertainty: z.string().nullable(),
});
export type JudgmentConfidence = z.infer<typeof JudgmentConfidenceSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE JUDGMENT OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

export const JudgmentOutputSchema = z.object({
  /** Schema version */
  version: z.literal('1.0.0'),

  /** Asset identity */
  entity_id: z.string(),
  symbol: z.string(),
  chain: z.string().nullable(),

  /** Timestamp of judgment */
  judged_at: z.string(),

  /** The 7 required fields */
  state: JudgmentStateSchema,
  cause: JudgmentCauseSchema,
  thesis: JudgmentThesisSchema,
  contradictions: JudgmentContradictionsSchema,
  timing: JudgmentTimingSchema,
  scenario: JudgmentScenarioSchema,
  confidence: JudgmentConfidenceSchema,

  /** Evidence ledger for auditability */
  evidence: z.object({
    positive: z.array(z.string()),
    negative: z.array(z.string()),
    unresolved: z.array(z.string()),
    stale: z.array(z.string()),
  }),

  /** Source OmniScore scores (for reference / coupling) */
  scores: z.object({
    qs: z.number().min(0).max(100),
    os: z.number().min(0).max(100).nullable(),
    risk: z.number().min(0).max(100),
    pos: z.number().min(0).max(100).nullable(),
  }),

  /** Quality checks: did we satisfy the 6-check standard? */
  quality_checks: z.object({
    has_clear_state: z.boolean(),
    has_top_causes: z.boolean(),
    has_contradictions: z.boolean(),
    has_timing: z.boolean(),
    has_next_conditions: z.boolean(),
    has_honest_confidence: z.boolean(),
    all_passed: z.boolean(),
  }),

  /** Unified Regime Context (Layer 8 v2) */
  regime: z.object({
    macro: z.object({
      posture: z.enum(['risk_on', 'risk_off', 'neutral', 'transition_bearish', 'transition_bullish', 'data_unavailable']),
      confidence: z.number(),
      drivers: z.array(z.string()),
      btcTrend: z.enum(['bullish', 'bearish', 'neutral']),
      btcDominanceTrend: z.enum(['rising', 'falling', 'stable']),
      overallLeverage: z.enum(['low', 'moderate', 'high', 'extreme']),
      coverage: z.number(),
    }),
    ecosystem: z.object({
      chain: z.string(),
      health: z.enum(['thriving', 'growing', 'stable', 'weakening', 'stressed', 'crisis', 'unknown']),
      tvlTrend: z.enum(['rising', 'falling', 'stable']),
      activityTrend: z.enum(['rising', 'falling', 'stable']),
      capitalFlow: z.enum(['inflow', 'outflow', 'neutral']),
      coverage: z.number(),
    }),
    volatility: z.object({
      regime: z.enum(['extreme_high', 'high', 'elevated', 'normal', 'low', 'extreme_low']),
      realizedAnnualized: z.number(),
      trend: z.enum(['expanding', 'contracting', 'stable']),
      method: z.enum(['realized_multi', 'intraday_proxy']),
    }),
    transition: z.object({
      risk: z.enum(['low', 'moderate', 'elevated', 'high']),
      probability: z.number(),
      direction: z.enum(['improving', 'deteriorating', 'stable']),
      signals: z.array(z.string()),
    }),
    summary: z.string(),
    confidenceModifier: z.number(),
    dataCoverage: z.number(),
    configVersion: z.string(),
  }).optional(),

  /** Extended timing & sequence data (Phase C) */
  timing_extended: z.object({
    sequence: z.object({
      activation_order: z.array(z.object({
        layer: z.string(),
        strength: z.number(),
        canonical_order: z.number(),
      })),
      sequence_health: z.number(),
      lead_signal: z.string(),
      lag_signal: z.string(),
      missing_lead: z.string().nullable(),
      late_arrivals: z.array(z.string()),
      pattern: z.string(),
      summary: z.string(),
    }),
    maturity: z.object({
      score: z.number(),
      label: z.string(),
      warning: z.boolean(),
      note: z.string().nullable(),
      risk_factors: z.array(z.string()),
      confirmation_needed: z.array(z.string()),
    }),
    inflections: z.array(z.object({
      type: z.enum(['positive', 'negative']),
      label: z.string(),
      strength: z.number(),
    })),
    projection: z.object({
      must_happen: z.array(z.string()),
      invalidates_thesis: z.array(z.string()),
      watch_for: z.array(z.string()),
    }),
  }).optional(),

  /** Phase 3 Wave 2 — Full Hypothesis Engine output */
  hypothesisEngine: z.object({
    output: z.any(),
    coverage: z.any(),
    configVersions: z.any(),
    auditNotes: z.array(z.string()),
  }).optional(),

  /** L3.3-B — Identity confidence gate results for this entity */
  identity_confidence: z.object({
    band: z.enum(['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED']),
    epistemic_state: z.enum(['RESOLVED_CLEAN', 'RESOLVED_WITH_SCAR', 'CONTESTED', 'UNRESOLVED']),
    scoring_gate: z.enum(['ALLOW', 'ALLOW_WITH_SCAR', 'CONDITIONAL', 'DENY']),
    contradiction_gate: z.enum(['ALLOW', 'ALLOW_WITH_SCAR', 'CONDITIONAL', 'DENY']),
    scenario_gate: z.enum(['ALLOW', 'ALLOW_WITH_SCAR', 'CONDITIONAL', 'DENY']),
    judgment_gate: z.enum(['ALLOW', 'ALLOW_WITH_SCAR', 'CONDITIONAL', 'DENY']),
    disclosure_required: z.boolean(),
    active_scars: z.array(z.string()),
    state_id: z.string(),
  }).optional(),
});

export type JudgmentOutput = z.infer<typeof JudgmentOutputSchema>;

export const JUDGMENT_VERSION = '1.0.0' as const;
