/**
 * L14.8 — Replay Contracts
 *
 * §14.8.27 / §14.8.28 / §14.8.29 / §14.8.30 / §14.8.31
 */

export enum L14ReplaySubjectClass {
  DELIVERY_SENT_DECISION = 'DELIVERY_SENT_DECISION',
  DELIVERY_SUPPRESSION_DECISION = 'DELIVERY_SUPPRESSION_DECISION',
  DELIVERY_FAILURE_DECISION = 'DELIVERY_FAILURE_DECISION',
  DELIVERY_INTERACTION_TIMELINE = 'DELIVERY_INTERACTION_TIMELINE',
  ALERT_PERFORMANCE_FACT_RECONSTRUCTION = 'ALERT_PERFORMANCE_FACT_RECONSTRUCTION',
  CHANNEL_HEALTH_FACT_RECONSTRUCTION = 'CHANNEL_HEALTH_FACT_RECONSTRUCTION',
  CURRENT_REGISTRY_RECONSTRUCTION = 'CURRENT_REGISTRY_RECONSTRUCTION',
}

export enum L14ReplayStatus {
  EXACT_RECONSTRUCTION = 'EXACT_RECONSTRUCTION',
  LEGALLY_EQUIVALENT_RECONSTRUCTION = 'LEGALLY_EQUIVALENT_RECONSTRUCTION',
  ROUTING_POLICY_MISMATCH = 'ROUTING_POLICY_MISMATCH',
  PREFERENCE_SNAPSHOT_MISMATCH = 'PREFERENCE_SNAPSHOT_MISMATCH',
  DELIVERY_ARTIFACT_MISMATCH = 'DELIVERY_ARTIFACT_MISMATCH',
  SUPPRESSION_REASON_MISMATCH = 'SUPPRESSION_REASON_MISMATCH',
  INTERACTION_TIMELINE_MISMATCH = 'INTERACTION_TIMELINE_MISMATCH',
  SOURCE_HISTORY_INCOMPLETE = 'SOURCE_HISTORY_INCOMPLETE',
  BLOCKED_ILLEGAL_REPLAY = 'BLOCKED_ILLEGAL_REPLAY',
}

export enum L14ReplayMismatchReasonCode {
  ORIGINAL_POLICY_REF_MISSING = 'ORIGINAL_POLICY_REF_MISSING',
  ORIGINAL_PREFERENCE_SNAPSHOT_MISSING = 'ORIGINAL_PREFERENCE_SNAPSHOT_MISSING',
  ORIGINAL_DELIVERY_PAYLOAD_MISSING = 'ORIGINAL_DELIVERY_PAYLOAD_MISSING',
  ORIGINAL_EXECUTION_RECORD_MISSING = 'ORIGINAL_EXECUTION_RECORD_MISSING',
  ORIGINAL_SUPPRESSION_RECORD_MISSING = 'ORIGINAL_SUPPRESSION_RECORD_MISSING',
  INTERACTION_CHAIN_INCOMPLETE = 'INTERACTION_CHAIN_INCOMPLETE',
  POLICY_VERSION_CHANGED = 'POLICY_VERSION_CHANGED',
  REPLAY_OUTPUT_NOT_LEGALLY_EQUIVALENT = 'REPLAY_OUTPUT_NOT_LEGALLY_EQUIVALENT',
}

export interface L14ReplayRequest {
  readonly replay_request_id: string;
  readonly replay_subject_class: L14ReplaySubjectClass;
  readonly source_record_ref: string;
  readonly expected_policy_version?: string;
  readonly expected_delivery_policy_ref?: string;
  readonly expected_preference_snapshot_ref?: string;
  readonly replay_window_start?: string;
  readonly replay_window_end?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14ReplayResult {
  readonly replay_result_id: string;
  readonly replay_request_ref: string;
  readonly replay_subject_class: L14ReplaySubjectClass;
  readonly replay_status: L14ReplayStatus;
  readonly original_decision_ref?: string;
  readonly reconstructed_decision_ref?: string;
  readonly policy_ref_match: boolean;
  readonly preference_snapshot_match?: boolean;
  readonly delivered_artifact_match?: boolean;
  readonly suppression_reason_match?: boolean;
  readonly interaction_timeline_match?: boolean;
  readonly mismatch_reason_codes: readonly L14ReplayMismatchReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
