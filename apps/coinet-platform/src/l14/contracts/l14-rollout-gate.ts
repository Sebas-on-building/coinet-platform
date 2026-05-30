/**
 * L14.10 — Rollout Gate, Rollback Policy, and Failure Playbooks
 *
 * §14.10.40 / §14.10.41 / §14.10.42 / §14.10.43
 */

export enum L14RolloutGateCheck {
  ALL_SUBLAYERS_GREEN = 'ALL_SUBLAYERS_GREEN',
  ALL_BANDS_GREEN = 'ALL_BANDS_GREEN',
  ALL_FINAL_INVARIANTS_GREEN = 'ALL_FINAL_INVARIANTS_GREEN',
  NO_CRITICAL_BREACHES = 'NO_CRITICAL_BREACHES',
  PUSH_REMAINS_RESERVED = 'PUSH_REMAINS_RESERVED',
  TELEGRAM_GATE_VALID = 'TELEGRAM_GATE_VALID',
  USER_CONTROL_LAW_VALID = 'USER_CONTROL_LAW_VALID',
  EXPERIMENT_NON_CORRUPTION_VALID = 'EXPERIMENT_NON_CORRUPTION_VALID',
  PERSISTENCE_REPLAY_REPAIR_VALID = 'PERSISTENCE_REPLAY_REPAIR_VALID',
  CALIBRATION_NON_AUTO_MUTATION_VALID = 'CALIBRATION_NON_AUTO_MUTATION_VALID',
  UPSTREAM_REGRESSIONS_GREEN = 'UPSTREAM_REGRESSIONS_GREEN',
}
export const ALL_L14_ROLLOUT_GATE_CHECKS: readonly L14RolloutGateCheck[] =
  Object.values(L14RolloutGateCheck);

export interface L14RolloutGateCheckResult {
  readonly check: L14RolloutGateCheck;
  readonly passed: boolean;
  readonly evidence: string;
}

export interface L14RolloutGateResult {
  readonly rollout_gate_result_id: string;
  readonly gate_checks: readonly L14RolloutGateCheckResult[];
  readonly rollout_approved: boolean;
  readonly rollout_blocking_reason_codes: readonly string[];
  readonly recommended_rollout_status:
    | 'PRODUCTION_ENABLED_GOVERNED'
    | 'LIMITED_OPT_IN_ONLY'
    | 'BLOCKED';
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Rollback ─────────────────────────────────────────────────────

export enum L14RollbackTrigger {
  CHANNEL_TRUTH_BOUNDARY_BREACH = 'CHANNEL_TRUTH_BOUNDARY_BREACH',
  USER_PREFERENCE_BYPASS = 'USER_PREFERENCE_BYPASS',
  EXPERIMENT_SAFETY_WEAKENING = 'EXPERIMENT_SAFETY_WEAKENING',
  AUTO_MUTATION_PATH_DETECTED = 'AUTO_MUTATION_PATH_DETECTED',
  REPAIR_FACT_FABRICATION_DETECTED = 'REPAIR_FACT_FABRICATION_DETECTED',
  DELIVERY_SPAM_THRESHOLD_BREACH = 'DELIVERY_SPAM_THRESHOLD_BREACH',
  TELEGRAM_OPERATIONAL_FAILURE_CLUSTER = 'TELEGRAM_OPERATIONAL_FAILURE_CLUSTER',
}

export enum L14RollbackAction {
  PAUSE_TELEGRAM_EXTERNAL_DELIVERY = 'PAUSE_TELEGRAM_EXTERNAL_DELIVERY',
  PAUSE_ALERT_CLASS = 'PAUSE_ALERT_CLASS',
  FORCE_DIGEST_ONLY_FOR_AFFECTED_CLASS = 'FORCE_DIGEST_ONLY_FOR_AFFECTED_CLASS',
  PAUSE_ACTIVE_EXPERIMENT = 'PAUSE_ACTIVE_EXPERIMENT',
  OPEN_ANALYST_INCIDENT = 'OPEN_ANALYST_INCIDENT',
  OPEN_CALIBRATION_REVIEW = 'OPEN_CALIBRATION_REVIEW',
  REQUIRE_LAYER_WIDE_RECERTIFICATION = 'REQUIRE_LAYER_WIDE_RECERTIFICATION',
}

export interface L14RollbackPolicy {
  readonly rollback_policy_id: string;
  readonly rollback_triggers: readonly L14RollbackTrigger[];
  readonly rollback_actions: readonly L14RollbackAction[];
  readonly may_pause_external_delivery: true;
  readonly may_downgrade_alert_classes_to_digest: true;
  readonly may_restrict_experiments: true;
  readonly may_mutate_lower_layer_truth: false;
  readonly may_rewrite_history: false;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Failure playbooks ────────────────────────────────────────────

export enum L14FinalFailurePlaybookClass {
  LOWER_LAYER_REBUILD_ATTEMPT = 'LOWER_LAYER_REBUILD_ATTEMPT',
  ENGAGEMENT_AS_TRUTH_ATTEMPT = 'ENGAGEMENT_AS_TRUTH_ATTEMPT',
  AUTO_MUTATION_ATTEMPT = 'AUTO_MUTATION_ATTEMPT',
  USER_CONTROL_BYPASS = 'USER_CONTROL_BYPASS',
  TELEGRAM_GATE_FAILURE = 'TELEGRAM_GATE_FAILURE',
  PUSH_RESERVED_BYPASS = 'PUSH_RESERVED_BYPASS',
  EXPERIMENT_NON_CORRUPTION_FAILURE = 'EXPERIMENT_NON_CORRUPTION_FAILURE',
  REPLAY_REPAIR_HONESTY_FAILURE = 'REPLAY_REPAIR_HONESTY_FAILURE',
  CALIBRATION_PROPOSAL_AUTO_APPLY_DETECTED = 'CALIBRATION_PROPOSAL_AUTO_APPLY_DETECTED',
  ARCHITECTURE_FINGERPRINT_DRIFT = 'ARCHITECTURE_FINGERPRINT_DRIFT',
}
export const ALL_L14_FINAL_FAILURE_PLAYBOOKS: readonly L14FinalFailurePlaybookClass[] =
  Object.values(L14FinalFailurePlaybookClass);

export interface L14FinalFailurePlaybook {
  readonly final_failure_playbook_id: string;
  readonly playbook_class: L14FinalFailurePlaybookClass;
  readonly triggering_violation: string;
  readonly operational_severity: 'CRITICAL' | 'HIGH' | 'MATERIAL';
  readonly immediate_containment_action: L14RollbackAction;
  readonly rollout_impact:
    | 'NO_IMPACT'
    | 'PAUSE_CHANNEL'
    | 'PAUSE_ALERT_CLASS'
    | 'PAUSE_LAYER'
    | 'ROLLBACK_LAYER';
  readonly required_recertification_scope:
    | 'LOCAL'
    | 'LAYER_WIDE'
    | 'CROSS_LAYER'
    | 'ARCHITECTURE';
  readonly architecture_completion_revoked: boolean;
  readonly lower_layer_review_required: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
