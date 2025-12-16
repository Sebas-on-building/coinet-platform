/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 6 - UNCERTAINTY & CONFIDENCE                                ║
 * ║                                                                               ║
 * ║   THE HONESTY LAYER                                                           ║
 * ║                                                                               ║
 * ║   "Interpretation must never be divorced from the certainty of the           ║
 * ║    underlying data. This is the mechanism that prevents the generation       ║
 * ║    of analysis that is 'wrong and confident.'"                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIS_LAYER6_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORE WEIGHTS (FROM SPECIFICATION)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confidence Score Input Weights
 * 
 * C = Σ(wᵢ × Qᵢ)
 * 
 * Where:
 * - Q_AG: Agreement Factor (Layer 3 Reconciliation)
 * - Q_VAL: Validation Status Factor (Layer 4 Gating)
 * - Q_STALE: Staleness Penalty (Layer 1 Timeliness)
 * - Q_COV: Coverage Factor (Layer 3 Source Count)
 */
export const CONFIDENCE_WEIGHTS = {
  /** Agreement Factor - From Layer 3 reconciliation */
  W_AGREEMENT: 0.40,
  
  /** Validation Status Factor - From Layer 4 gating */
  W_VALIDATION: 0.30,
  
  /** Staleness Penalty - From Layer 1 timeliness */
  W_STALENESS: 0.15,
  
  /** Coverage Factor - From Layer 3 source count */
  W_COVERAGE: 0.15,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HARD GATE THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hard Gate Thresholds
 * 
 * Below these thresholds, the system is ARCHITECTURALLY FORBIDDEN
 * from producing any interpretation.
 */
export const HARD_GATE_THRESHOLDS = {
  /** If Confidence < 70, NO OUTPUT */
  CONFIDENCE_GATE: 70,
  
  /** If critical metrics Coverage < 90%, NO OUTPUT */
  COVERAGE_GATE: 0.90,
  
  /** If Identity Confidence < 85%, interpretation suspended */
  IDENTITY_GATE: 85,
  
  /** Soft warning threshold for confidence */
  CONFIDENCE_WARNING: 80,
  
  /** Soft warning threshold for coverage */
  COVERAGE_WARNING: 0.95,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Agreement Factor (Q_AG) - From Layer 3
 * 
 * Derivation: 1 - (Dispute Count / Total High-Impact Metrics)
 */
export interface AgreementFactorInput {
  /** Number of disputed metrics (from Layer 3) */
  dispute_count: number;
  
  /** Total number of high-impact metrics */
  total_high_impact_metrics: number;
  
  /** Individual agreement scores per metric */
  metric_agreements: Record<string, number>;
}

/**
 * Validation Status Factor (Q_VAL) - From Layer 4
 * 
 * Derivation: 1 - (FAIL/GATED Count / Total Metrics)
 */
export interface ValidationFactorInput {
  /** Number of FAIL or GATED metrics (from Layer 4) */
  fail_gated_count: number;
  
  /** Total metrics validated */
  total_metrics: number;
  
  /** Individual validation statuses */
  metric_statuses: Record<string, 'PASS' | 'WARN' | 'FAIL' | 'GATED'>;
}

/**
 * Staleness Penalty (Q_STALE) - From Layer 1
 * 
 * Derivation: Penalty function based on observation latency
 */
export interface StalenessInput {
  /** Average observation age in seconds */
  average_age_seconds: number;
  
  /** Maximum observation age in seconds */
  max_age_seconds: number;
  
  /** Number of stale metrics */
  stale_count: number;
  
  /** Total metrics */
  total_metrics: number;
}

/**
 * Coverage Factor (Q_COV) - From Layer 3
 * 
 * Derivation: Min(1.0, Source Count / Min Required Sources)
 */
export interface CoverageFactorInput {
  /** Number of sources per metric */
  source_counts: Record<string, number>;
  
  /** Minimum required sources for high confidence */
  min_required_sources: number;
  
  /** Critical metrics coverage */
  critical_metrics_coverage: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete confidence calculation input
 */
export interface ConfidenceInput {
  /** Entity ID */
  entity_id: string;
  
  /** Agreement factor inputs */
  agreement: AgreementFactorInput;
  
  /** Validation factor inputs */
  validation: ValidationFactorInput;
  
  /** Staleness inputs */
  staleness: StalenessInput;
  
  /** Coverage factor inputs */
  coverage: CoverageFactorInput;
  
  /** Identity confidence from Layer 5 */
  identity_confidence: number;
}

/**
 * Confidence score result
 */
export const ConfidenceScoreSchema = z.object({
  /** Entity ID */
  entity_id: z.string(),
  
  /** Final composite confidence score (0-100) */
  confidence_score: z.number().min(0).max(100),
  
  /** Individual factor scores (0-1) */
  factor_scores: z.object({
    q_agreement: z.number().min(0).max(1),
    q_validation: z.number().min(0).max(1),
    q_staleness: z.number().min(0).max(1),
    q_coverage: z.number().min(0).max(1),
  }),
  
  /** Weighted contributions */
  weighted_contributions: z.object({
    agreement_contribution: z.number(),
    validation_contribution: z.number(),
    staleness_contribution: z.number(),
    coverage_contribution: z.number(),
  }),
  
  /** Identity confidence (from Layer 5) */
  identity_confidence: z.number().min(0).max(100),
  
  /** Critical metrics coverage */
  critical_coverage: z.number().min(0).max(1),
  
  /** Gate status */
  gate_status: z.object({
    /** Did the confidence pass the hard gate? */
    confidence_gate_passed: z.boolean(),
    
    /** Did the coverage pass the hard gate? */
    coverage_gate_passed: z.boolean(),
    
    /** Did the identity pass the hard gate? */
    identity_gate_passed: z.boolean(),
    
    /** Overall: Can we produce output? */
    can_produce_output: z.boolean(),
    
    /** Gate failure reason (if any) */
    gate_failure_reason: z.string().nullable(),
  }),
  
  /** Warnings (non-fatal issues) */
  warnings: z.array(z.string()),
  
  /** Confidence level classification */
  confidence_level: z.enum(['HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT']),
  
  /** Calculation timestamp */
  calculated_at: z.string().datetime(),
});

export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// GATE RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gate check result
 */
export interface GateCheckResult {
  /** Gate name */
  gate: 'CONFIDENCE' | 'COVERAGE' | 'IDENTITY';
  
  /** Did the check pass? */
  passed: boolean;
  
  /** Actual value */
  actual_value: number;
  
  /** Required threshold */
  threshold: number;
  
  /** Deficit (how much below threshold) */
  deficit: number;
  
  /** Message */
  message: string;
}

/**
 * Complete gate assessment
 */
export interface GateAssessment {
  /** Entity ID */
  entity_id: string;
  
  /** Individual gate results */
  gates: GateCheckResult[];
  
  /** Overall result */
  all_gates_passed: boolean;
  
  /** Primary failure reason (if any) */
  primary_failure: string | null;
  
  /** Recommendations */
  recommendations: string[];
}
