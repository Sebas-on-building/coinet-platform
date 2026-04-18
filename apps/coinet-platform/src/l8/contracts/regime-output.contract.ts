/**
 * L8.3 — Regime Output Contract
 *
 * §8.3.3 — The executable regime-result object. Every field required by
 * §8.3.3.2 and §8.3.3.3 is typed here; the L8.3 output validator
 * enforces the runtime cleanliness law (§8.3.3.7) and contract
 * completeness.
 *
 * The L8.2 `L8RegimeState` remains legal for in-memory prototyping; this
 * L8.3 contract is the shape every runtime must emit, persist, and
 * replay against.
 */

import type {
  L8RegimeFamily,
  L8RegimeScopeType,
} from './regime-family';
import type { L8RegimeClass } from './regime-class';
import type {
  L8RegimeConfidenceBand,
  L8RegimeCoexistenceClass,
  L8TransitionRiskClass,
  L8RegimeMaterializationMode,
} from './regime-state';
import type { L8MaterializationPolicyClass } from './regime-subject.contract';

/**
 * §8.3.3.3 — Late-data class. Regime outputs in live mode are clean by
 * default; replay and repair may carry LATE_MATERIAL or LATE_CRITICAL.
 */
export type L8LateDataClass =
  | 'NONE'
  | 'LATE_MINOR'
  | 'LATE_MATERIAL'
  | 'LATE_CRITICAL';

/**
 * §8.3.3.3 — Replay identity mode. Same vocabulary as L7.3 so later
 * layers can reason uniformly.
 */
export type L8ReplayIdentityMode =
  | 'LIVE'
  | 'REPLAY'
  | 'REPAIR'
  | 'HISTORICAL_RECONSTRUCTION';

/**
 * §8.3.3.3 — Runtime integrity flags. A runtime computes these during
 * emission; the output validator checks them.
 */
export interface L8RuntimeIntegrityFlags {
  readonly input_snapshot_hash_match: boolean;
  readonly contract_version_match: boolean;
  readonly replay_hash_stable: boolean;
  readonly evidence_refs_resolvable: boolean;
  readonly subject_contract_resolvable: boolean;
  readonly validation_refs_within_restriction: boolean;
}

/**
 * §8.3.3.1 — The full executable regime output contract.
 */
export interface L8RegimeOutputContract {
  // Identity (§8.3.3.2)
  readonly regime_result_id: string;
  readonly regime_subject_id: string;
  readonly subject_contract_ref: string;

  // Contract versioning (§8.3.7.1)
  readonly output_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Regime identity (§8.3.3.2)
  readonly regime_family: L8RegimeFamily;
  readonly primary_regime: L8RegimeClass;
  readonly secondary_regime: L8RegimeClass | null;

  // Scope and time (§8.3.3.2)
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Confidence snapshot (§8.3.3.2)
  readonly regime_confidence_score: number; // 0..1
  readonly regime_confidence_band: L8RegimeConfidenceBand;
  readonly secondary_regime_confidence: number | null;
  readonly confidence_profile_ref: string;

  // Transition snapshot (§8.3.3.2)
  readonly transition_risk_score: number; // 0..1
  readonly transition_risk_class: L8TransitionRiskClass;
  readonly transition_profile_ref: string;

  // Multiplier linkage (§8.3.3.2)
  readonly multiplier_profile_ref: string;

  // Support / coexistence / cleanliness (§8.3.3.2 / §8.3.3.3)
  readonly support_strength_score: number; // 0..1
  readonly ambiguity_score: number; // 0..1
  readonly staleness_score: number; // 0..1
  readonly degradation_score: number; // 0..1
  readonly coexistence_class: L8RegimeCoexistenceClass;
  readonly contradicting_surface_refs: readonly string[];
  readonly supporting_surface_refs: readonly string[];

  // Validation + evidence linkage (§8.3.3.2)
  readonly validation_refs: readonly string[];
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  // Materialization + replay (§8.3.3.3)
  readonly materialization_mode: L8RegimeMaterializationMode;
  readonly materialization_policy: L8MaterializationPolicyClass;
  readonly replay_mode_flag: L8ReplayIdentityMode;
  readonly repair_mode_flag: boolean;
  readonly late_data_class: L8LateDataClass;

  // Replay identity
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly runtime_integrity_flags: L8RuntimeIntegrityFlags;

  // Lineage (§8.3.3.3)
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

export const L8_OUTPUT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'regime_result_id', 'regime_subject_id', 'subject_contract_ref',
  'output_contract_version', 'schema_version', 'policy_version',
  'regime_family', 'primary_regime',
  'scope_type', 'scope_id', 'as_of',
  'regime_confidence_score', 'regime_confidence_band',
  'confidence_profile_ref',
  'transition_risk_score', 'transition_risk_class', 'transition_profile_ref',
  'multiplier_profile_ref',
  'support_strength_score', 'ambiguity_score', 'staleness_score',
  'degradation_score', 'coexistence_class',
  'validation_refs', 'evidence_pack_ref', 'input_snapshot_ref',
  'materialization_mode', 'materialization_policy',
  'replay_mode_flag', 'late_data_class',
  'compute_run_id', 'replay_hash', 'runtime_integrity_flags',
  'lineage_refs',
];

/**
 * §8.3.3.7 — cleanliness law. Output must not be in a clean-single
 * coexistence / stable transition / high-confidence shape when any
 * material score or posture signal says otherwise.
 */
export interface L8OutputCleanlinessThresholds {
  readonly ambiguityMaterial: number;
  readonly stalenessMaterial: number;
  readonly degradationMaterial: number;
  readonly transitionMaterial: number;
}

export const L8_OUTPUT_CLEANLINESS_THRESHOLDS: L8OutputCleanlinessThresholds = {
  ambiguityMaterial: 0.3,
  stalenessMaterial: 0.3,
  degradationMaterial: 0.3,
  transitionMaterial: 0.6,
};

export function outputIsMaterialAmbiguous(
  o: Pick<L8RegimeOutputContract, 'ambiguity_score'>,
  t: L8OutputCleanlinessThresholds = L8_OUTPUT_CLEANLINESS_THRESHOLDS,
): boolean {
  return o.ambiguity_score > t.ambiguityMaterial;
}

export function outputIsMaterialStale(
  o: Pick<L8RegimeOutputContract, 'staleness_score'>,
  t: L8OutputCleanlinessThresholds = L8_OUTPUT_CLEANLINESS_THRESHOLDS,
): boolean {
  return o.staleness_score > t.stalenessMaterial;
}

export function outputIsMaterialDegraded(
  o: Pick<L8RegimeOutputContract, 'degradation_score'>,
  t: L8OutputCleanlinessThresholds = L8_OUTPUT_CLEANLINESS_THRESHOLDS,
): boolean {
  return o.degradation_score > t.degradationMaterial;
}

export function outputIsHighTransition(
  o: Pick<L8RegimeOutputContract, 'transition_risk_score'>,
  t: L8OutputCleanlinessThresholds = L8_OUTPUT_CLEANLINESS_THRESHOLDS,
): boolean {
  return o.transition_risk_score > t.transitionMaterial;
}

/**
 * §8.3.3.7 / §8.3.8.4 — Output violates cleanliness when it claims
 * CLEAN_SINGLE coexistence with material ambiguity, or STABLE transition
 * with a high transition_risk_score, etc.
 */
export function outputViolatesCleanliness(
  o: Pick<
    L8RegimeOutputContract,
    | 'coexistence_class'
    | 'ambiguity_score'
    | 'staleness_score'
    | 'degradation_score'
    | 'transition_risk_score'
    | 'transition_risk_class'
    | 'regime_confidence_band'
  >,
  thresholds: L8OutputCleanlinessThresholds = L8_OUTPUT_CLEANLINESS_THRESHOLDS,
): {
  readonly cleanWhileAmbiguous: boolean;
  readonly cleanWhileStale: boolean;
  readonly cleanWhileDegraded: boolean;
  readonly cleanWhileTransitionHigh: boolean;
} {
  const cleanCoex = o.coexistence_class === 'CLEAN_SINGLE';
  const stableTransition =
    o.transition_risk_class === 'STABLE' ||
    o.transition_risk_class === 'MILD';
  const highConfBand =
    o.regime_confidence_band === 'HIGH' || o.regime_confidence_band === 'FULL';
  return {
    cleanWhileAmbiguous:
      cleanCoex && o.ambiguity_score > thresholds.ambiguityMaterial,
    cleanWhileStale:
      highConfBand && o.staleness_score > thresholds.stalenessMaterial,
    cleanWhileDegraded:
      highConfBand && o.degradation_score > thresholds.degradationMaterial,
    cleanWhileTransitionHigh:
      stableTransition && o.transition_risk_score > thresholds.transitionMaterial,
  };
}
