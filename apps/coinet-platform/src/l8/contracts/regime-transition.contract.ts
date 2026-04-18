/**
 * L8.3 — Regime Transition Profile Contract
 *
 * §8.3.5 — Transition risk is too important to bury as a single score
 * field on the regime output. A first-class transition profile carries
 * transition signatures, candidate flips, instability reasons, and the
 * coexistence class under which transition applies.
 */

import type {
  L8RegimeCoexistenceClass,
  L8TransitionRiskClass,
} from './regime-state';
import type { L8RegimeClass } from './regime-class';

/**
 * §8.3.5.3 — Transition risk classes. Mirrors the L8.2 `L8TransitionRiskClass`
 * plus an explicit `UNRESOLVED` band for cases where the engine refuses to
 * commit to a risk classification.
 */
export type L8TransitionRiskProfileClass =
  | L8TransitionRiskClass
  | 'UNRESOLVED';

/**
 * §8.3.5.2 — Candidate flip. A transition signal identifying a plausible
 * next regime class within the same family.
 */
export interface L8TransitionCandidateFlip {
  readonly candidate_id: string;
  readonly candidate_class: L8RegimeClass;
  readonly likelihood: number; // 0..1
  readonly readiness: 'IMMATURE' | 'EMERGING' | 'ACTIVE' | 'LATE';
  readonly evidence_refs: readonly string[];
}

/**
 * §8.3.5.2 — Transition signature. A named posture signal that feeds
 * transition-risk computation. The runtime uses these refs to link
 * transition evidence back to governed L6/L7 surfaces.
 */
export interface L8TransitionSignatureRef {
  readonly signature_id: string;
  readonly signature_name: string;
  readonly weight: number; // 0..1
  readonly source_refs: readonly string[];
}

/**
 * §8.3.5.4 — Instability reason codes. Narrow, typed list so consumers
 * can reason about why transition risk exists.
 */
export type L8InstabilityReason =
  | 'MOMENTUM_BREAKING'
  | 'LEVERAGE_UNWIND'
  | 'LIQUIDITY_REGIME_SHIFT'
  | 'NARRATIVE_DECAY'
  | 'MACRO_PIVOT'
  | 'UNLOCK_OVERHANG'
  | 'SECTOR_ROTATION_PRESSURE'
  | 'CROSS_FAMILY_DISSONANCE'
  | 'STALE_INPUT_PRESSURE'
  | 'DEGRADATION_PRESSURE';

export const ALL_L8_INSTABILITY_REASONS: readonly L8InstabilityReason[] = [
  'MOMENTUM_BREAKING',
  'LEVERAGE_UNWIND',
  'LIQUIDITY_REGIME_SHIFT',
  'NARRATIVE_DECAY',
  'MACRO_PIVOT',
  'UNLOCK_OVERHANG',
  'SECTOR_ROTATION_PRESSURE',
  'CROSS_FAMILY_DISSONANCE',
  'STALE_INPUT_PRESSURE',
  'DEGRADATION_PRESSURE',
];

/**
 * §8.3.5.2 — The full executable transition profile contract.
 */
export interface L8RegimeTransitionContract {
  // Identity
  readonly transition_profile_id: string;
  readonly regime_subject_id: string;
  readonly regime_result_id: string;

  // Versioning
  readonly transition_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Risk posture
  readonly transition_risk_score: number; // 0..1
  readonly transition_risk_class: L8TransitionRiskProfileClass;

  // Coexistence linkage
  readonly coexistence_class: L8RegimeCoexistenceClass;

  // Transition evidence
  readonly transition_signature_refs: readonly L8TransitionSignatureRef[];
  readonly candidate_flip_refs: readonly L8TransitionCandidateFlip[];

  // Instability reasons (required when risk is HIGH/CRITICAL)
  readonly instability_reasons: readonly L8InstabilityReason[];

  // Lineage + replay
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L8_TRANSITION_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'transition_profile_id', 'regime_subject_id', 'regime_result_id',
  'transition_contract_version', 'schema_version', 'policy_version',
  'transition_risk_score', 'transition_risk_class', 'coexistence_class',
  'transition_signature_refs', 'candidate_flip_refs', 'instability_reasons',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

/**
 * §8.3.5.3 — Score-to-class resolver. Consistent thresholds with the
 * L8.2 `L8TransitionRiskClass` resolver so the two stay in sync.
 */
export function resolveL8TransitionRiskClass(
  score: number,
): L8TransitionRiskProfileClass {
  if (!Number.isFinite(score) || score < 0) return 'UNRESOLVED';
  if (score < 0.15) return 'STABLE' as L8TransitionRiskClass;
  if (score < 0.35) return 'MILD' as L8TransitionRiskClass;
  if (score < 0.6) return 'ELEVATED' as L8TransitionRiskClass;
  if (score < 0.85) return 'HIGH' as L8TransitionRiskClass;
  return 'CRITICAL' as L8TransitionRiskClass;
}

/**
 * §8.3.5.4 — A transition profile is "high-risk" when it surfaces one
 * of the HIGH/CRITICAL classes. Engines must supply `instability_reasons`
 * when this is true.
 */
export function transitionIsHighRisk(
  t: Pick<L8RegimeTransitionContract, 'transition_risk_class'>,
): boolean {
  return t.transition_risk_class === 'HIGH' ||
    t.transition_risk_class === 'CRITICAL';
}
