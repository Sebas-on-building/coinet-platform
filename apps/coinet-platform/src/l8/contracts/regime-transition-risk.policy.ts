/**
 * L8.7 — Regime Transition Risk Policy
 *
 * §8.7.4 — Transition-risk doctrine. Defines the governance-level
 * transition risk profile, class thresholds, independence law, and
 * flip-pressure shape.
 *
 * §8.7.4.2 — Transition risk must remain independent of regime
 * confidence. This policy exists so validators can enforce that.
 */

import type { L8RegimeCoexistenceClass } from './regime-state';

/**
 * §8.7.4.5 — Governance-level transition risk class, identical to the
 * L8.3 `L8TransitionRiskClass` plus an explicit `UNRESOLVED` band.
 */
export type L8RegimeTransitionRiskClass =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'UNRESOLVED';

export const ALL_L8_REGIME_TRANSITION_RISK_CLASSES:
  readonly L8RegimeTransitionRiskClass[] = [
    'LOW', 'MEDIUM', 'HIGH', 'UNRESOLVED',
  ];

/**
 * §8.7.4.5 — Banded thresholds for the governance-level transition
 * risk score. `UNRESOLVED` is reserved for non-finite scores.
 */
export function resolveL8RegimeTransitionRiskClass(
  score: number,
): L8RegimeTransitionRiskClass {
  if (!Number.isFinite(score) || score < 0) return 'UNRESOLVED';
  if (score < 0.25) return 'LOW';
  if (score < 0.55) return 'MEDIUM';
  return 'HIGH';
}

/**
 * §8.7.4.6 — Typed instability reason codes. These are the canonical
 * source categories that the governance engine may produce.
 */
export enum L8RegimeInstabilityReasonCode {
  CANDIDATE_PROXIMITY = 'CANDIDATE_PROXIMITY',
  PRIMARY_SECONDARY_GAP_NARROW = 'PRIMARY_SECONDARY_GAP_NARROW',
  AMBIGUITY_PRESSURE = 'AMBIGUITY_PRESSURE',
  FAMILY_TRANSITION_SIGNATURE = 'FAMILY_TRANSITION_SIGNATURE',
  CONTRADICTION_ESCALATION = 'CONTRADICTION_ESCALATION',
  STALENESS_ESCALATION = 'STALENESS_ESCALATION',
  DEGRADATION_ESCALATION = 'DEGRADATION_ESCALATION',
  HISTORICAL_INSTABILITY_PATTERN = 'HISTORICAL_INSTABILITY_PATTERN',
  PRIOR_REGIME_FLIP = 'PRIOR_REGIME_FLIP',
}

export const ALL_L8_REGIME_INSTABILITY_REASON_CODES:
  readonly L8RegimeInstabilityReasonCode[] =
    Object.values(L8RegimeInstabilityReasonCode);

/**
 * §8.7.4.4 — Governance-level transition risk profile. Extends the
 * L8.3 `L8RegimeTransitionContract` with two policy-level fields:
 *   - `primary_secondary_flip_pressure`
 *   - `family_transition_pressure`
 *
 * The L8.4 `transition-detection-engine` produces runtime candidates;
 * this profile is the reliance-governance view.
 */
export interface L8RegimeTransitionRiskProfile {
  readonly transition_profile_id: string;
  readonly regime_subject_id: string;
  readonly regime_result_id: string;

  readonly transition_risk_score: number; // 0..1
  readonly transition_risk_class: L8RegimeTransitionRiskClass;

  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly candidate_flip_refs: readonly string[];

  /** §8.7.4.4 — flip pressure between declared primary and secondary. */
  readonly primary_secondary_flip_pressure: number; // 0..1
  /** §8.7.4.4 — family-local transition pressure aggregate. */
  readonly family_transition_pressure: number; // 0..1

  readonly instability_reason_codes:
    readonly L8RegimeInstabilityReasonCode[];

  readonly policy_version: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

/**
 * §8.7.4.7 — Instability reasons required when risk is HIGH. A
 * profile with HIGH class and no reasons is illegal.
 */
export function transitionRiskIsHigh(
  cls: L8RegimeTransitionRiskClass,
): boolean {
  return cls === 'HIGH';
}

/**
 * §8.7.3.5 — Policy version.
 */
export const L8_REGIME_TRANSITION_RISK_POLICY_VERSION =
  'l8.7-transition-policy-v1';
