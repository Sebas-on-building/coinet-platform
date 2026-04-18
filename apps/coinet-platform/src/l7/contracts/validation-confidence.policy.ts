/**
 * L7.6 — Validation Confidence Policy
 *
 * §7.6.2.4 — A `ValidationConfidenceDecision` is the L7.6 governed
 * reliance object: it carries the factor breakdown, raw and capped
 * scores, the cap chain, the contradiction-penalty chain, the resolved
 * reliability band, the restriction profile reference, and lineage.
 *
 * It is a SUPERSET of L7.2's runtime `L7ConfidenceAssessment` so the
 * runtime contract continues to round-trip cleanly through L7.4.
 *
 * §7.6.3.9 — All factor weights must come from a registered, versioned
 * `L7ConfidencePolicy`. No hidden tuning is permitted in engine code.
 */

import {
  L7ConfidenceFactorGroup,
  L7ConfidenceFactorValues,
  L7ConfidenceFactorWeights,
} from './confidence-factor';
import {
  L7ConfidenceCapEvaluation,
  L7ConfidenceCapClass,
} from './confidence-cap';
import { L7ContradictionPenaltyEvaluation } from './contradiction-penalty';
import { L7ReliabilityBand, L7ReliabilityBandThreshold } from './confidence-band';

export interface L7ConfidencePolicyVersion {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly factor_weights: L7ConfidenceFactorWeights;
  readonly band_thresholds: readonly L7ReliabilityBandThreshold[];
  readonly published_at: string;
  /**
   * Optional family-specific override map. Validation families may
   * tighten weights but never override truth-safety law.
   */
  readonly family_weight_overrides?: Readonly<
    Record<string, Partial<Record<L7ConfidenceFactorGroup, number>>>
  >;
}

export interface L7ConfidencePolicyResolution {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly effective_weights: L7ConfidenceFactorWeights;
  readonly band_thresholds: readonly L7ReliabilityBandThreshold[];
  readonly applied_family_override: string | null;
}

/**
 * Cap chain in the canonical order produced by the engine. The
 * order is INFORMATIONAL (cap-precedence law uses the most
 * truth-restrictive ceiling regardless of order).
 */
export interface L7ConfidenceCapChain {
  readonly evaluations: readonly L7ConfidenceCapEvaluation[];
  readonly applied_cap_classes: readonly L7ConfidenceCapClass[];
  readonly resolved_ceiling_score100: number | null;
}

export interface L7ContradictionPenaltyChain {
  readonly evaluations: readonly L7ContradictionPenaltyEvaluation[];
  readonly applied_magnitude: number;
}

export interface L7ConfidenceFactorBreakdown {
  readonly values: L7ConfidenceFactorValues;
  readonly weights: L7ConfidenceFactorWeights;
  readonly weighted_contributions: Readonly<
    Record<L7ConfidenceFactorGroup, number>
  >;
  /** Sum of positive (non-penalty) weighted contributions. */
  readonly positive_sum_01: number;
  /** Penalty subtracted from the positive sum (= w_G * v_G). */
  readonly penalty_subtracted_01: number;
}

/**
 * §7.6.2.4 — The L7.6 governed confidence decision.
 */
export interface L7ValidationConfidenceDecision {
  readonly confidence_assessment_id: string;
  readonly validation_subject_id: string;
  readonly validation_result_id: string;
  readonly policy_version: L7ConfidencePolicyResolution;

  readonly raw_score_100: number;
  readonly capped_score_100: number;
  readonly reliability_band: L7ReliabilityBand;

  readonly factor_breakdown: L7ConfidenceFactorBreakdown;
  readonly cap_chain: L7ConfidenceCapChain;
  readonly contradiction_penalty_chain: L7ContradictionPenaltyChain;

  readonly restriction_profile_ref: string | null;
  readonly rationale_codes: readonly string[];

  readonly compute_run_id: string;
  readonly replay_hash: string;

  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
}

export function clamp01(n: number): number {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function clamp100(n: number): number {
  if (!isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}
