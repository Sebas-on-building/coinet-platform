/**
 * L12.3 — Scenario contract policies (§12.3.3).
 *
 * Policy objects referenced by the scenario subject contract: they declare
 * how the scenario engine must consume L7–L11 surfaces, what trigger /
 * invalidation / shift-condition / evidence / lineage / materialization
 * laws apply, and which downstream consumption limits attach.
 */

/** L11 score-context consumption policy (§12.3.3.2). */
export interface L12ScoreContextConsumptionPolicy {
  readonly requires_score_output: true;
  readonly requires_component_breakdown: true;
  readonly requires_attribution: true;
  readonly requires_missing_data_profile: true;
  readonly requires_modifier_profile: true;
  readonly requires_calibration_hook: true;
  readonly requires_drift_status: true;
  readonly requires_restriction_profile: true;
  readonly requires_lineage: true;
  readonly requires_replay_hash: true;

  readonly score_value_only_forbidden: true;
  readonly recompute_scores_forbidden: true;

  readonly policy_version: string;
}

export const L12_DEFAULT_SCORE_CONTEXT_POLICY: L12ScoreContextConsumptionPolicy = {
  requires_score_output: true,
  requires_component_breakdown: true,
  requires_attribution: true,
  requires_missing_data_profile: true,
  requires_modifier_profile: true,
  requires_calibration_hook: true,
  requires_drift_status: true,
  requires_restriction_profile: true,
  requires_lineage: true,
  requires_replay_hash: true,
  score_value_only_forbidden: true,
  recompute_scores_forbidden: true,
  policy_version: 'l12.3.score_ctx_policy.v1',
};

/** Base case requirement policy. */
export interface L12BaseCaseRequirementPolicy {
  readonly base_case_required: boolean;
  readonly base_case_must_be_conditional: boolean;
  readonly base_case_cannot_be_final_judgment: boolean;
  readonly policy_version: string;
}

/** Alternative-path requirement policy. */
export interface L12AlternativePathRequirementPolicy {
  readonly minimum_alternative_paths: number;
  readonly require_bullish_alternative_when_bearish_exists: boolean;
  readonly require_bearish_or_recovery_when_bullish_exists: boolean;
  readonly allow_single_path_only_when_insufficient_competition: boolean;
  readonly policy_version: string;
}

/** Trigger requirement policy. */
export interface L12TriggerRequirementPolicy {
  readonly trigger_profile_required: boolean;
  readonly minimum_triggers_per_scenario: number;
  readonly require_monitorability: boolean;
  readonly forbid_guaranteed_outcome_language: boolean;
  readonly forbid_trade_action_language: boolean;
  readonly policy_version: string;
}

/** Invalidation requirement policy. */
export interface L12InvalidationRequirementPolicy {
  readonly invalidation_required: boolean;
  readonly minimum_invalidations_per_scenario: number;
  readonly require_monitorability: boolean;
  readonly require_evidence: boolean;
  readonly active_invalidation_must_cap_confidence: boolean;
  readonly policy_version: string;
}

/** Shift-condition requirement policy. */
export interface L12ShiftConditionRequirementPolicy {
  readonly required_when_spread_narrow: boolean;
  readonly required_when_secondary_close: boolean;
  readonly required_when_active_invalidation_material: boolean;
  readonly required_when_drift_material: boolean;
  readonly required_when_missing_visibility_material: boolean;
  readonly forbid_trade_language: boolean;
  readonly policy_version: string;
}

/** L7 restriction consumption policy. */
export interface L12RestrictionConsumptionPolicy {
  readonly requires_l7_restriction_profile: boolean;
  readonly requires_l11_restriction_profile: boolean;
  readonly forbid_overuse_beyond_allowed_rights: boolean;
  readonly mandatory_blocked_uses_must_be_present: boolean;
  readonly policy_version: string;
}

/** L7 contradiction consumption policy. */
export interface L12ContradictionConsumptionPolicy {
  readonly requires_l7_contradiction_posture: boolean;
  readonly cap_confidence_under_unresolved_contradiction: boolean;
  readonly forbid_clean_emission_when_contradiction_unresolved: boolean;
  readonly policy_version: string;
}

/** L11 drift consumption policy. */
export interface L12DriftConsumptionPolicy {
  readonly requires_l11_drift_status: boolean;
  readonly cap_confidence_under_material_drift: boolean;
  readonly block_clean_emission_under_critical_drift: boolean;
  readonly policy_version: string;
}

/** Evidence pack requirement policy. */
export interface L12ScenarioEvidencePackPolicy {
  readonly evidence_pack_required: boolean;
  readonly require_score_evidence: boolean;
  readonly require_input_snapshot: boolean;
  readonly require_replay_safe_ref: boolean;
  readonly forbid_raw_lower_layer_inputs_as_decisive_proof: boolean;
  readonly policy_version: string;
}

/** Materialization policy: how scenario outputs may be persisted/served. */
export interface L12ScenarioMaterializationPolicy {
  readonly persistence_via_l5_required: boolean;
  readonly forbid_direct_storage: boolean;
  readonly read_serving_via_governed_surface: boolean;
  readonly policy_version: string;
}

/** Lineage policy: lineage capture requirements. */
export interface L12ScenarioLineagePolicy {
  readonly lineage_refs_required: boolean;
  readonly include_subject_lineage: boolean;
  readonly include_set_lineage: boolean;
  readonly include_path_lineage: boolean;
  readonly include_score_context_lineage: boolean;
  readonly policy_version: string;
}

/** Convenience defaults that satisfy strict (production) policies. */
const POLICY_VERSION = 'l12.3.policy.v1';

export const L12_STRICT_BASE_CASE_POLICY: L12BaseCaseRequirementPolicy = {
  base_case_required: true,
  base_case_must_be_conditional: true,
  base_case_cannot_be_final_judgment: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_ALT_PATH_POLICY: L12AlternativePathRequirementPolicy = {
  minimum_alternative_paths: 1,
  require_bullish_alternative_when_bearish_exists: true,
  require_bearish_or_recovery_when_bullish_exists: true,
  allow_single_path_only_when_insufficient_competition: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_TRIGGER_POLICY: L12TriggerRequirementPolicy = {
  trigger_profile_required: true,
  minimum_triggers_per_scenario: 1,
  require_monitorability: true,
  forbid_guaranteed_outcome_language: true,
  forbid_trade_action_language: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_INVALIDATION_POLICY: L12InvalidationRequirementPolicy = {
  invalidation_required: true,
  minimum_invalidations_per_scenario: 1,
  require_monitorability: true,
  require_evidence: true,
  active_invalidation_must_cap_confidence: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_SHIFT_POLICY: L12ShiftConditionRequirementPolicy = {
  required_when_spread_narrow: true,
  required_when_secondary_close: true,
  required_when_active_invalidation_material: true,
  required_when_drift_material: true,
  required_when_missing_visibility_material: true,
  forbid_trade_language: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_RESTRICTION_POLICY: L12RestrictionConsumptionPolicy = {
  requires_l7_restriction_profile: true,
  requires_l11_restriction_profile: true,
  forbid_overuse_beyond_allowed_rights: true,
  mandatory_blocked_uses_must_be_present: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_CONTRADICTION_POLICY: L12ContradictionConsumptionPolicy = {
  requires_l7_contradiction_posture: true,
  cap_confidence_under_unresolved_contradiction: true,
  forbid_clean_emission_when_contradiction_unresolved: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_DRIFT_POLICY: L12DriftConsumptionPolicy = {
  requires_l11_drift_status: true,
  cap_confidence_under_material_drift: true,
  block_clean_emission_under_critical_drift: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_EVIDENCE_POLICY: L12ScenarioEvidencePackPolicy = {
  evidence_pack_required: true,
  require_score_evidence: true,
  require_input_snapshot: true,
  require_replay_safe_ref: true,
  forbid_raw_lower_layer_inputs_as_decisive_proof: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_MATERIALIZATION_POLICY: L12ScenarioMaterializationPolicy = {
  persistence_via_l5_required: true,
  forbid_direct_storage: true,
  read_serving_via_governed_surface: true,
  policy_version: POLICY_VERSION,
};

export const L12_STRICT_LINEAGE_POLICY: L12ScenarioLineagePolicy = {
  lineage_refs_required: true,
  include_subject_lineage: true,
  include_set_lineage: true,
  include_path_lineage: true,
  include_score_context_lineage: true,
  policy_version: POLICY_VERSION,
};
