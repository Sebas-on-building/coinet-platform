/**
 * L8.7 — Regime Confidence Policy
 *
 * §8.7.3 — Confidence doctrine and factor model. Defines the canonical
 * factor groups, band thresholds, required-caps-per-context, and
 * governance policy that validators enforce on top of the existing
 * L8.3 `L8RegimeConfidenceContract`.
 */

import { L8RegimeConfidenceBand } from './regime-state';
import { L8RegimeCapReason } from './regime-cap-chain';

/**
 * §8.7.3.4 — Required confidence factor groups. Each group maps 1:1 to
 * one key in the L8.3 `L8RegimeConfidenceFactors` shape.
 */
export enum L8RegimeConfidenceFactorGroup {
  BREADTH_CONSISTENCY = 'BREADTH_CONSISTENCY',
  FRESHNESS = 'FRESHNESS',
  CROSS_DOMAIN_AGREEMENT = 'CROSS_DOMAIN_AGREEMENT',
  VALIDATION_CONFIDENCE = 'VALIDATION_CONFIDENCE',
  TRANSITION_INSTABILITY = 'TRANSITION_INSTABILITY',
  AMBIGUITY_PRESSURE = 'AMBIGUITY_PRESSURE',
  HISTORICAL_RELIABILITY = 'HISTORICAL_RELIABILITY',
}

export const ALL_L8_REGIME_CONFIDENCE_FACTOR_GROUPS:
  readonly L8RegimeConfidenceFactorGroup[] =
    Object.values(L8RegimeConfidenceFactorGroup);

/**
 * Mapping from the L8.7 governance factor group → the L8.3 contract
 * factor-breakdown key. Validators use this to check that the L8.3
 * factor breakdown populates every governance group.
 */
export const L8_FACTOR_GROUP_TO_BREAKDOWN_KEY:
  Readonly<Record<L8RegimeConfidenceFactorGroup, string>> = {
    [L8RegimeConfidenceFactorGroup.BREADTH_CONSISTENCY]: 'support_breadth',
    [L8RegimeConfidenceFactorGroup.FRESHNESS]: 'freshness',
    [L8RegimeConfidenceFactorGroup.CROSS_DOMAIN_AGREEMENT]:
      'cross_domain_agreement',
    [L8RegimeConfidenceFactorGroup.VALIDATION_CONFIDENCE]:
      'validation_quality_posture',
    [L8RegimeConfidenceFactorGroup.TRANSITION_INSTABILITY]:
      'transition_instability',
    [L8RegimeConfidenceFactorGroup.AMBIGUITY_PRESSURE]:
      'ambiguity_pressure',
    [L8RegimeConfidenceFactorGroup.HISTORICAL_RELIABILITY]:
      'historical_reliability',
  };

/**
 * §8.7.3.6 — Band thresholds. Higher is stronger reliance. `UNRESOLVED`
 * is reserved for cases where the engine refuses to commit.
 */
export const L8_REGIME_CONFIDENCE_BAND_THRESHOLDS:
  Readonly<Record<L8RegimeConfidenceBand, [number, number]>> = {
    [L8RegimeConfidenceBand.LOW]: [0.0, 0.25],
    [L8RegimeConfidenceBand.MODERATE]: [0.25, 0.55],
    [L8RegimeConfidenceBand.HIGH]: [0.55, 0.85],
    [L8RegimeConfidenceBand.FULL]: [0.85, 1.0 + 1e-9],
  };

export function resolveL8RegimeConfidenceBandFromScore(
  score: number,
): L8RegimeConfidenceBand {
  if (!Number.isFinite(score) || score < 0) return L8RegimeConfidenceBand.LOW;
  if (score < 0.25) return L8RegimeConfidenceBand.LOW;
  if (score < 0.55) return L8RegimeConfidenceBand.MODERATE;
  if (score < 0.85) return L8RegimeConfidenceBand.HIGH;
  return L8RegimeConfidenceBand.FULL;
}

/**
 * §8.7.3.7 — Runtime posture that drives which cap reasons are
 * *required* during confidence derivation. The policy validator fails
 * if a required cap was not applied.
 */
export interface L8RegimeConfidenceDerivationContext {
  readonly transition_risk_score: number; // 0..1
  readonly ambiguity_score: number; // 0..1
  readonly staleness_score: number; // 0..1
  readonly degradation_score: number; // 0..1
  /** Whether any consumed L7 surface was restriction-narrowed. */
  readonly restriction_narrowed: boolean;
  /** Whether an L7 contradiction bundle remained materially unresolved. */
  readonly contradiction_unresolved: boolean;
  /** Whether the template's historical reliability is weak. */
  readonly historical_reliability_weak: boolean;
}

/**
 * §8.7.7.3 — Determine the set of cap reasons that MUST appear in the
 * applied cap chain for this derivation context. A validator uses this
 * to detect "clean-confidence masquerade" (caps required but absent).
 */
export function requiredL8RegimeCapReasons(
  ctx: L8RegimeConfidenceDerivationContext,
): readonly L8RegimeCapReason[] {
  const required: L8RegimeCapReason[] = [];
  if (ctx.transition_risk_score >= 0.6) {
    required.push(L8RegimeCapReason.CAP_TRANSITION_HIGH);
  }
  if (ctx.ambiguity_score >= 0.5) {
    required.push(L8RegimeCapReason.CAP_AMBIGUITY_HIGH);
  }
  if (ctx.staleness_score >= 0.5) {
    required.push(L8RegimeCapReason.CAP_FRESHNESS_WEAK);
  }
  if (ctx.degradation_score >= 0.5) {
    required.push(L8RegimeCapReason.CAP_DEGRADATION_MATERIAL);
  }
  if (ctx.restriction_narrowed) {
    required.push(L8RegimeCapReason.CAP_RESTRICTION_NARROWED);
  }
  if (ctx.contradiction_unresolved) {
    required.push(L8RegimeCapReason.CAP_CROSS_DOMAIN_CONTRADICTION);
  }
  if (ctx.historical_reliability_weak) {
    required.push(L8RegimeCapReason.CAP_HISTORICAL_RELIABILITY_WEAK);
  }
  return required;
}

/**
 * §8.7.3.5 — Policy configuration version. Used by the policy validator
 * to confirm the derivation followed a known policy release.
 */
export const L8_REGIME_CONFIDENCE_POLICY_VERSION = 'l8.7-confidence-policy-v1';
