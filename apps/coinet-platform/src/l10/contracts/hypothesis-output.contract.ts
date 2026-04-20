/**
 * L10.3 — Hypothesis Output Contract
 *
 * §10.3.5 — The executable per-candidate explanatory verdict. This is
 * the contract surface that a later runtime/materializer will emit as
 * the candidate-level result.
 *
 * §10.3.5.4 — A hypothesis output is illegal if support, contradiction,
 * confirmations, invalidations, spread, restriction profile, replay
 * lineage, or lower-layer posture consumption is missing where
 * required.
 *
 * The L10.2 `L10HypothesisAssessment` remains legal for in-memory
 * prototyping; this L10.3 contract is the shape every runtime must
 * emit, persist, and replay against.
 */

import type {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
  L10ScopeType,
} from './hypothesis-subject-class';
import type {
  L10HypothesisConfidenceBand,
  L10HypothesisReadinessClass,
} from './hypothesis-assessment';
import type {
  L10HypothesisMaterializationPolicy,
  L10HypothesisLateDataClass,
  L10HypothesisReplayIdentityMode,
  L10HypothesisEmissionReadinessClass,
} from './hypothesis-materialization-policy';

/**
 * §10.3.5.3 — Runtime integrity flags. A runtime computes these during
 * emission; the output validator checks them.
 */
export interface L10HypothesisRuntimeIntegrityFlags {
  readonly input_snapshot_hash_match: boolean;
  readonly contract_version_match: boolean;
  readonly replay_hash_stable: boolean;
  readonly evidence_refs_resolvable: boolean;
  readonly subject_contract_resolvable: boolean;
  readonly support_set_resolvable: boolean;
  readonly contradiction_set_resolvable: boolean;
  readonly confirmation_set_resolvable: boolean;
  readonly invalidation_set_resolvable: boolean;
  readonly restriction_profile_resolvable: boolean;
  readonly ranking_ref_resolvable: boolean;
}

/**
 * §10.3.5.2 — Causal-restraint flag set carried on every emitted
 * output. Mirrors the L10.2 assessment posture but elevated to
 * contract so consumers never need to reach into the L10.2 object.
 */
export interface L10HypothesisOutputCausalRestraintFlags {
  readonly hypothesis_is_explanation_candidate: true;
  readonly not_final_judgment_disclaimer: string;
  readonly scenario_excluded: true;
  readonly recommendation_excluded: true;
  readonly judgment_excluded: true;
  readonly score_is_not_probability_of_truth: true;
  readonly adjacency_is_not_causality_disclaimer: string;
}

/**
 * §10.3.5.3 / §10.3.9.3 — Lower-layer posture-consumption refs.
 * Contract requires the output to surface these explicitly so later
 * layers can audit that L7/L8/L9 posture was actually consumed.
 */
export interface L10LowerLayerPostureConsumptionRefs {
  readonly validation_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly confidence_refs: readonly string[];
  readonly restriction_refs: readonly string[];
  readonly regime_refs: readonly string[];
  readonly sequence_refs: readonly string[];
  readonly lead_lag_refs: readonly string[];
  readonly phase_refs: readonly string[];
  readonly decay_refs: readonly string[];
  readonly sequence_restriction_refs: readonly string[];
}

/**
 * §10.3.5.1 — The full executable hypothesis output contract.
 */
export interface L10HypothesisOutputContract {
  // Identity (§10.3.5.2)
  readonly hypothesis_assessment_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly subject_contract_ref: string;
  readonly candidate_contract_ref: string;

  // Contract versioning (§10.3.8.1)
  readonly output_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Family / template (§10.3.5.2)
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly template_version: string;
  readonly hypothesis_name: string;

  // Scope / time (§10.3.5.2)
  readonly subject_class: L10HypothesisSubjectClass;
  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly as_of: string;

  // Evidence object refs (§10.3.5.2 / §10.3.4)
  readonly support_set_ref: string;
  readonly contradiction_set_ref: string;
  readonly confirmation_set_ref: string;
  readonly invalidation_set_ref: string;

  // Evidence item refs (§10.3.4)
  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];
  readonly required_confirmation_refs: readonly string[];
  readonly invalidation_signal_refs: readonly string[];

  // Scores (§10.3.5.2 — 0..1, never probabilities of truth)
  readonly support_strength_score: number;
  readonly contradiction_pressure_score: number;
  readonly confirmation_gap_score: number;
  readonly invalidation_risk_score: number;
  readonly hypothesis_confidence_score: number;
  readonly hypothesis_confidence_band: L10HypothesisConfidenceBand;

  // Ranking posture (§10.3.5.2 / §10.3.5.6)
  readonly ranking_ref: string;
  readonly rank_position: number;
  readonly rank_spread_to_next: number;
  readonly competition_size: number;

  // Restriction + shift (§10.3.5.2)
  readonly restriction_profile_ref: string;
  readonly shift_condition_set_ref: string | null;
  readonly spread_profile_ref: string;

  // Evidence + persistence (§10.3.5.2)
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  // Cleanliness posture (§10.3.5.5)
  readonly narrow_spread_flag: boolean;
  readonly contradiction_material_flag: boolean;
  readonly confirmation_gap_material_flag: boolean;
  readonly invalidation_material_flag: boolean;
  readonly staleness_score: number;
  readonly degradation_score: number;

  // Readiness + restraint (§10.3.5.3 / §10.3.9.2)
  readonly readiness_class: L10HypothesisReadinessClass;
  readonly emission_readiness_class: L10HypothesisEmissionReadinessClass;
  readonly causal_restraint_flags: L10HypothesisOutputCausalRestraintFlags;

  // Materialization + replay (§10.3.5.3)
  readonly materialization_mode: L10HypothesisReplayIdentityMode;
  readonly materialization_policy: L10HypothesisMaterializationPolicy;
  readonly replay_mode_flag: L10HypothesisReplayIdentityMode;
  readonly repair_mode_flag: boolean;
  readonly late_data_class: L10HypothesisLateDataClass;

  // Replay identity (§10.3.5.3 / §10.3.8.2)
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly runtime_integrity_flags: L10HypothesisRuntimeIntegrityFlags;

  // Lower-layer posture consumption (§10.3.5.3 / INV-10.3-E)
  readonly lower_layer_posture_consumption_refs: L10LowerLayerPostureConsumptionRefs;

  // Lineage (§10.3.5.3)
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };

  // Description (checked for leakage)
  readonly description: string;
}

export const L10_OUTPUT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'hypothesis_assessment_id', 'hypothesis_subject_id',
  'hypothesis_candidate_id', 'subject_contract_ref',
  'candidate_contract_ref',
  'output_contract_version', 'schema_version', 'policy_version',
  'hypothesis_family', 'hypothesis_template_id',
  'subject_class', 'scope_type', 'scope_id', 'as_of',
  'support_set_ref', 'contradiction_set_ref',
  'confirmation_set_ref', 'invalidation_set_ref',
  'support_strength_score', 'contradiction_pressure_score',
  'confirmation_gap_score', 'invalidation_risk_score',
  'hypothesis_confidence_score', 'hypothesis_confidence_band',
  'ranking_ref', 'rank_position', 'rank_spread_to_next',
  'competition_size',
  'restriction_profile_ref', 'spread_profile_ref',
  'evidence_pack_ref', 'input_snapshot_ref',
  'readiness_class', 'emission_readiness_class',
  'causal_restraint_flags',
  'materialization_mode', 'materialization_policy',
  'replay_mode_flag', 'late_data_class',
  'compute_run_id', 'replay_hash', 'runtime_integrity_flags',
  'lower_layer_posture_consumption_refs',
  'lineage_refs',
];
