/**
 * L13.12 — Rollout / Rollback / Failure Playbook Contracts
 *
 * §13.12.15–§13.12.17 — Closed sets governing rollout decisions,
 * rollback triggers/actions, and incident playbooks.
 */

export enum L13RolloutDecision {
  APPROVED = 'APPROVED',
  BLOCKED = 'BLOCKED',
  CONDITIONAL = 'CONDITIONAL',
}

export interface L13RolloutGateResult {
  readonly rollout_gate_result_id: string;
  readonly decision: L13RolloutDecision;
  readonly all_sublayers_green: boolean;
  readonly all_bands_green_pre_l: boolean;
  readonly band_l_green: boolean;
  readonly zero_critical_violations: boolean;
  readonly zero_rollout_blocking_regressions: boolean;
  readonly replay_substrate_complete: boolean;
  readonly safety_gate_active: boolean;
  readonly persistence_surfaces_active: boolean;
  readonly l14_handoff_contract_approved: boolean;
  readonly rollback_policy_present: boolean;
  readonly failure_playbooks_present: boolean;
  readonly blocking_reasons: readonly string[];
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export enum L13RollbackTriggerClass {
  CRITICAL_RECOMMENDATION_LEAK = 'CRITICAL_RECOMMENDATION_LEAK',
  SAFETY_GATE_BYPASS = 'SAFETY_GATE_BYPASS',
  UNSUPPORTED_CLAIM_EMISSION_INCIDENT = 'UNSUPPORTED_CLAIM_EMISSION_INCIDENT',
  REPLAY_LEGALITY_DRIFT = 'REPLAY_LEGALITY_DRIFT',
  MAJOR_CONTRADICTION_OMISSION = 'MAJOR_CONTRADICTION_OMISSION',
  PERSISTENT_OUTPUT_MATERIALIZATION_FAILURE = 'PERSISTENT_OUTPUT_MATERIALIZATION_FAILURE',
  ADVERSARIAL_SUITE_REGRESSION = 'ADVERSARIAL_SUITE_REGRESSION',
  MASTER_CERTIFICATION_DEGRADATION = 'MASTER_CERTIFICATION_DEGRADATION',
}

export enum L13RollbackAction {
  DISABLE_ROLLOUT = 'DISABLE_ROLLOUT',
  ROUTE_TO_REFUSAL_ONLY = 'ROUTE_TO_REFUSAL_ONLY',
  PRESERVE_AUDIT = 'PRESERVE_AUDIT',
  EMIT_FAILURE_PLAYBOOK = 'EMIT_FAILURE_PLAYBOOK',
  FREEZE_NEW_EMISSIONS = 'FREEZE_NEW_EMISSIONS',
  REQUIRE_RECERTIFICATION = 'REQUIRE_RECERTIFICATION',
}

export interface L13RollbackPolicy {
  readonly rollback_policy_id: string;
  readonly triggers: readonly L13RollbackTriggerClass[];
  readonly actions: readonly L13RollbackAction[];
  readonly recertification_required_on_trigger: true;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export enum L13FailurePlaybookClass {
  UNSUPPORTED_CLAIM_EMISSION_INCIDENT = 'UNSUPPORTED_CLAIM_EMISSION_INCIDENT',
  BUY_SELL_RECOMMENDATION_LEAK = 'BUY_SELL_RECOMMENDATION_LEAK',
  SAFETY_GATE_BYPASS = 'SAFETY_GATE_BYPASS',
  GROUNDING_GATE_BYPASS = 'GROUNDING_GATE_BYPASS',
  CONTRADICTION_DISCLOSURE_OMISSION = 'CONTRADICTION_DISCLOSURE_OMISSION',
  SCENARIO_CONDITIONALITY_COLLAPSE = 'SCENARIO_CONDITIONALITY_COLLAPSE',
  MULTILINGUAL_SAFETY_REGRESSION = 'MULTILINGUAL_SAFETY_REGRESSION',
  PROMPT_INJECTION_BYPASS = 'PROMPT_INJECTION_BYPASS',
  REPLAY_LEGALITY_MISMATCH = 'REPLAY_LEGALITY_MISMATCH',
  REPAIR_AUDITABILITY_BREACH = 'REPAIR_AUDITABILITY_BREACH',
  L5_PERSISTENCE_FAILURE = 'L5_PERSISTENCE_FAILURE',
  FEEDBACK_QUALITY_MATERIALIZATION_FAILURE = 'FEEDBACK_QUALITY_MATERIALIZATION_FAILURE',
}

export const ALL_L13_FAILURE_PLAYBOOK_CLASSES:
  readonly L13FailurePlaybookClass[] =
  Object.values(L13FailurePlaybookClass);

export interface L13FailurePlaybook {
  readonly failure_playbook_id: string;
  readonly incident_class: L13FailurePlaybookClass;
  readonly detection_source: string;
  readonly immediate_action: L13RollbackAction;
  readonly degraded_operation_mode: string;
  readonly audit_required: boolean;
  readonly rollback_required: boolean;
  readonly recertification_required: boolean;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
