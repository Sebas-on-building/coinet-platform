/**
 * L13.11 — Replay Result Contract
 *
 * §13.11.3 / §13.11.4 / §13.11.5 / §13.11.6 / §13.11.7 —
 * Closed sets for replay status, mode, equivalence axis/class,
 * and mismatch reason codes plus the durable replay-result shape.
 */

export enum L13ReplayMode {
  CAPTURED_RESPONSE_REPLAY = 'CAPTURED_RESPONSE_REPLAY',
  FRESH_GENERATION_EQUIVALENCE_REPLAY = 'FRESH_GENERATION_EQUIVALENCE_REPLAY',
  VALIDATION_ONLY_REPLAY = 'VALIDATION_ONLY_REPLAY',
  REPAIR_VALIDATION_REPLAY = 'REPAIR_VALIDATION_REPLAY',
  ADVERSARIAL_REPLAY = 'ADVERSARIAL_REPLAY',
}

export const ALL_L13_REPLAY_MODES: readonly L13ReplayMode[] =
  Object.values(L13ReplayMode);

export enum L13ReplayStatus {
  CAPTURED_REPLAY_MATCH = 'CAPTURED_REPLAY_MATCH',
  LEGALLY_EQUIVALENT_FRESH_REPLAY = 'LEGALLY_EQUIVALENT_FRESH_REPLAY',
  SEMANTICALLY_EQUIVALENT_WITH_WORDING_DRIFT = 'SEMANTICALLY_EQUIVALENT_WITH_WORDING_DRIFT',
  DISCLOSURE_DRIFT_DETECTED = 'DISCLOSURE_DRIFT_DETECTED',
  GROUNDING_DRIFT_DETECTED = 'GROUNDING_DRIFT_DETECTED',
  SAFETY_DRIFT_DETECTED = 'SAFETY_DRIFT_DETECTED',
  RESTRICTION_DRIFT_DETECTED = 'RESTRICTION_DRIFT_DETECTED',
  SEMANTIC_DRIFT_DETECTED = 'SEMANTIC_DRIFT_DETECTED',
  BLOCKED_REPLAY = 'BLOCKED_REPLAY',
  REPLAY_FAILED_INCOMPLETE_SUBSTRATE = 'REPLAY_FAILED_INCOMPLETE_SUBSTRATE',
}

export const ALL_L13_REPLAY_STATUSES: readonly L13ReplayStatus[] =
  Object.values(L13ReplayStatus);

export enum L13ReplayEquivalenceClass {
  EXACT_MATCH = 'EXACT_MATCH',
  SEMANTICALLY_EQUIVALENT = 'SEMANTICALLY_EQUIVALENT',
  LEGALLY_EQUIVALENT = 'LEGALLY_EQUIVALENT',
  DISCLOSURE_CHANGED = 'DISCLOSURE_CHANGED',
  GROUNDING_CHANGED = 'GROUNDING_CHANGED',
  SAFETY_CHANGED = 'SAFETY_CHANGED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L13_REPLAY_EQUIVALENCE_CLASSES:
  readonly L13ReplayEquivalenceClass[] =
  Object.values(L13ReplayEquivalenceClass);

export enum L13ReplayEquivalenceAxis {
  INPUT_PACKAGE = 'INPUT_PACKAGE',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
  POLICY_VERSION = 'POLICY_VERSION',
  GROUNDING = 'GROUNDING',
  SAFETY = 'SAFETY',
  RESTRICTION = 'RESTRICTION',
  DISCLOSURE = 'DISCLOSURE',
  CONDITIONALITY = 'CONDITIONALITY',
  OBSERVATION_INFERENCE_SEPARATION = 'OBSERVATION_INFERENCE_SEPARATION',
  MODE_COMPLETENESS = 'MODE_COMPLETENESS',
  STYLE_INTEGRITY = 'STYLE_INTEGRITY',
}

export enum L13ReplayMismatchReasonCode {
  INPUT_PACKAGE_HASH_CHANGED = 'INPUT_PACKAGE_HASH_CHANGED',
  PROMPT_TEMPLATE_HASH_CHANGED = 'PROMPT_TEMPLATE_HASH_CHANGED',
  PROMPT_ASSEMBLY_HASH_CHANGED = 'PROMPT_ASSEMBLY_HASH_CHANGED',
  MODEL_GATEWAY_CONFIG_CHANGED = 'MODEL_GATEWAY_CONFIG_CHANGED',
  POLICY_VERSION_CHANGED = 'POLICY_VERSION_CHANGED',
  GROUNDED_CLAIM_SET_CHANGED = 'GROUNDED_CLAIM_SET_CHANGED',
  BLOCKED_CLAIM_SET_CHANGED = 'BLOCKED_CLAIM_SET_CHANGED',
  UNSUPPORTED_CLAIM_EMERGED = 'UNSUPPORTED_CLAIM_EMERGED',
  CONTRADICTION_DISCLOSURE_LOST = 'CONTRADICTION_DISCLOSURE_LOST',
  UNCERTAINTY_DISCLOSURE_LOST = 'UNCERTAINTY_DISCLOSURE_LOST',
  TRIGGER_DISCLOSURE_LOST = 'TRIGGER_DISCLOSURE_LOST',
  INVALIDATION_DISCLOSURE_LOST = 'INVALIDATION_DISCLOSURE_LOST',
  RESTRICTION_DISCLOSURE_LOST = 'RESTRICTION_DISCLOSURE_LOST',
  SAFETY_CLASS_ESCALATED = 'SAFETY_CLASS_ESCALATED',
  RECOMMENDATION_LEAK_APPEARED = 'RECOMMENDATION_LEAK_APPEARED',
  CERTAINTY_LEAK_APPEARED = 'CERTAINTY_LEAK_APPEARED',
  MANIPULATION_LANGUAGE_APPEARED = 'MANIPULATION_LANGUAGE_APPEARED',
  CONDITIONAL_SCENARIO_BECAME_PREDICTION = 'CONDITIONAL_SCENARIO_BECAME_PREDICTION',
  OBSERVATION_INFERENCE_MIXED = 'OBSERVATION_INFERENCE_MIXED',
  MODE_REQUIRED_SECTION_MISSING = 'MODE_REQUIRED_SECTION_MISSING',
  STYLE_REMOVED_REQUIRED_ANCHOR = 'STYLE_REMOVED_REQUIRED_ANCHOR',
}

export const ALL_L13_REPLAY_MISMATCH_REASON_CODES:
  readonly L13ReplayMismatchReasonCode[] =
  Object.values(L13ReplayMismatchReasonCode);

export enum L13RepairReasonCode {
  REPAIR_REPLAY_DRIFT = 'REPAIR_REPLAY_DRIFT',
  REPAIR_SAFETY_DRIFT = 'REPAIR_SAFETY_DRIFT',
  REPAIR_GROUNDING_DRIFT = 'REPAIR_GROUNDING_DRIFT',
  REPAIR_DISCLOSURE_DRIFT = 'REPAIR_DISCLOSURE_DRIFT',
  REPAIR_RESTRICTION_DRIFT = 'REPAIR_RESTRICTION_DRIFT',
  REPAIR_CONDITIONALITY_DRIFT = 'REPAIR_CONDITIONALITY_DRIFT',
  REPAIR_FAILURE_RECOVERY = 'REPAIR_FAILURE_RECOVERY',
  REPAIR_FEEDBACK_ESCALATION = 'REPAIR_FEEDBACK_ESCALATION',
  REPAIR_POLICY_MIGRATION = 'REPAIR_POLICY_MIGRATION',
}

export const ALL_L13_REPAIR_REASON_CODES:
  readonly L13RepairReasonCode[] =
  Object.values(L13RepairReasonCode);

export interface L13ReplayResult {
  readonly replay_result_id: string;
  readonly replay_mode: L13ReplayMode;
  readonly source_output_id: string;
  readonly replay_output_id?: string;
  readonly source_runtime_run_id: string;
  readonly replay_runtime_run_id?: string;
  readonly input_package_hash_match: boolean;
  readonly prompt_template_hash_match: boolean;
  readonly prompt_assembly_hash_match: boolean;
  readonly model_gateway_config_hash_match: boolean;
  readonly policy_hash_match: boolean;
  readonly captured_provider_artifact_match?: boolean;
  readonly grounding_equivalence: L13ReplayEquivalenceClass;
  readonly safety_equivalence: L13ReplayEquivalenceClass;
  readonly restriction_equivalence: L13ReplayEquivalenceClass;
  readonly disclosure_equivalence: L13ReplayEquivalenceClass;
  readonly conditionality_equivalence: L13ReplayEquivalenceClass;
  readonly mode_equivalence: L13ReplayEquivalenceClass;
  readonly style_equivalence: L13ReplayEquivalenceClass;
  readonly semantic_drift_detected: boolean;
  readonly wording_drift_detected: boolean;
  readonly legal_drift_detected: boolean;
  readonly replay_status: L13ReplayStatus;
  readonly mismatch_reason_codes: readonly L13ReplayMismatchReasonCode[];
  readonly required_repair: boolean;
  readonly repair_reason_codes: readonly L13RepairReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
