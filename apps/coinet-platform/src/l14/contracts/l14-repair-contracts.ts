/**
 * L14.8 — Repair Contracts
 *
 * §14.8.34 / §14.8.35 / §14.8.36 / §14.8.37 / §14.8.38
 */

export enum L14RepairReason {
  MISSING_DELIVERY_EXECUTION_MATERIALIZATION = 'MISSING_DELIVERY_EXECUTION_MATERIALIZATION',
  MISSING_DELIVERY_SUPPRESSION_MATERIALIZATION = 'MISSING_DELIVERY_SUPPRESSION_MATERIALIZATION',
  DELIVERY_FAILURE_FACT_REBUILD = 'DELIVERY_FAILURE_FACT_REBUILD',
  ALERT_PERFORMANCE_FACT_RECOMPUTE = 'ALERT_PERFORMANCE_FACT_RECOMPUTE',
  CHANNEL_HEALTH_FACT_RECOMPUTE = 'CHANNEL_HEALTH_FACT_RECOMPUTE',
  CURRENT_DELIVERY_POLICY_REGISTRY_REBUILD = 'CURRENT_DELIVERY_POLICY_REGISTRY_REBUILD',
  CURRENT_ALERT_PERFORMANCE_REGISTRY_REBUILD = 'CURRENT_ALERT_PERFORMANCE_REGISTRY_REBUILD',
  CURRENT_CALIBRATION_REVIEW_REGISTRY_REBUILD = 'CURRENT_CALIBRATION_REVIEW_REGISTRY_REBUILD',
  CURRENT_CHANNEL_HEALTH_REGISTRY_REBUILD = 'CURRENT_CHANNEL_HEALTH_REGISTRY_REBUILD',
}

export enum L14RepairStatus {
  COMPLETED_MATERIALIZATION_REPAIR = 'COMPLETED_MATERIALIZATION_REPAIR',
  COMPLETED_DERIVED_FACT_RECOMPUTE = 'COMPLETED_DERIVED_FACT_RECOMPUTE',
  COMPLETED_CURRENT_REGISTRY_REBUILD = 'COMPLETED_CURRENT_REGISTRY_REBUILD',
  BLOCKED_SOURCE_HISTORY_INCOMPLETE = 'BLOCKED_SOURCE_HISTORY_INCOMPLETE',
  BLOCKED_MUTATION_ATTEMPT = 'BLOCKED_MUTATION_ATTEMPT',
  BLOCKED_USER_INTERACTION_INVENTION = 'BLOCKED_USER_INTERACTION_INVENTION',
  BLOCKED_OUTCOME_FABRICATION = 'BLOCKED_OUTCOME_FABRICATION',
  BLOCKED_POLICY_CONTEXT_MISSING = 'BLOCKED_POLICY_CONTEXT_MISSING',
}

export enum L14RepairBlockingReasonCode {
  SOURCE_HISTORY_REFS_MISSING = 'SOURCE_HISTORY_REFS_MISSING',
  ORIGINAL_POLICY_REF_MISSING = 'ORIGINAL_POLICY_REF_MISSING',
  ORIGINAL_PREFERENCE_SNAPSHOT_MISSING = 'ORIGINAL_PREFERENCE_SNAPSHOT_MISSING',
  ATTEMPTED_HISTORICAL_MUTATION = 'ATTEMPTED_HISTORICAL_MUTATION',
  ATTEMPTED_USER_INTERACTION_INVENTION = 'ATTEMPTED_USER_INTERACTION_INVENTION',
  ATTEMPTED_FEEDBACK_REWRITE = 'ATTEMPTED_FEEDBACK_REWRITE',
  ATTEMPTED_OUTCOME_FABRICATION = 'ATTEMPTED_OUTCOME_FABRICATION',
  REPAIR_SUBJECT_NOT_RECONSTRUCTABLE = 'REPAIR_SUBJECT_NOT_RECONSTRUCTABLE',
}

export type L14RepairRequestSource =
  | 'SYSTEM_REPAIR_JOB'
  | 'REPLAY_DIAGNOSTIC'
  | 'ANALYST_REPAIR_REQUEST';

export interface L14RepairRequest {
  readonly repair_request_id: string;
  readonly repair_reason: L14RepairReason;
  readonly repair_subject_ref: string;
  readonly source_history_refs: readonly string[];
  readonly parent_record_ref?: string;
  readonly original_policy_ref?: string;
  readonly original_preference_snapshot_ref?: string;
  readonly requested_by: L14RepairRequestSource;
  // Intent flags — must be set to false; engines reject true with critical violations.
  readonly intent_invent_user_interaction?: boolean;
  readonly intent_rewrite_feedback?: boolean;
  readonly intent_fabricate_outcome?: boolean;
  readonly intent_mutate_historical_fact?: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14RepairResult {
  readonly repair_result_id: string;
  readonly repair_request_ref: string;
  readonly repair_status: L14RepairStatus;
  readonly rebuilt_record_refs: readonly string[];
  readonly superseded_current_registry_refs: readonly string[];
  readonly historical_records_mutated: false;
  readonly user_interactions_invented: false;
  readonly outcomes_fabricated: false;
  readonly blocking_reason_codes: readonly L14RepairBlockingReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
