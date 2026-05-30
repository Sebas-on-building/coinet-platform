/**
 * L14.3 — Payload Assembly, Execution, Materialization, Expectation
 *
 * §14.3.38–§14.3.47 — Consolidated execution-stage contracts.
 */

import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

// ── Channel payload assembly ───────────────────────────────────────

export enum L14PayloadAssemblyStatus {
  ASSEMBLED_CLEAN = 'ASSEMBLED_CLEAN',
  ASSEMBLED_WITH_DISCLOSURE = 'ASSEMBLED_WITH_DISCLOSURE',
  BLOCKED_RENDERING_CONTRACT = 'BLOCKED_RENDERING_CONTRACT',
  BLOCKED_MISSING_RENDERING_PROFILE = 'BLOCKED_MISSING_RENDERING_PROFILE',
  BLOCKED_SOURCE_SEMANTICS_RISK = 'BLOCKED_SOURCE_SEMANTICS_RISK',
}

export interface L14ChannelPayloadAssemblyResult {
  readonly payload_assembly_id: string;
  readonly candidate_delivery_ref: string;
  readonly disposition_decision_ref: string;
  readonly delivery_payload_ref: string;
  readonly channel_payload_ref: string;
  readonly channel: L14DeliveryChannel;
  readonly delivery_class: L14DeliveryClass;
  readonly rendering_profile_ref: string;
  readonly disclosure_profile_ref: string;
  readonly restriction_profile_ref: string;
  readonly assembly_status: L14PayloadAssemblyStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Execution ──────────────────────────────────────────────────────

export enum L14DeliveryExecutionStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  SENT_WITH_PROVIDER_ACK = 'SENT_WITH_PROVIDER_ACK',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  FAILED_NON_RETRYABLE = 'FAILED_NON_RETRYABLE',
  CANCELLED_BY_SUPPRESSION_REEVALUATION = 'CANCELLED_BY_SUPPRESSION_REEVALUATION',
  BLOCKED_BEFORE_PROVIDER = 'BLOCKED_BEFORE_PROVIDER',
}

export enum L14DeliveryExecutionFailureReasonCode {
  PROVIDER_NETWORK = 'PROVIDER_NETWORK',
  PROVIDER_REJECTED = 'PROVIDER_REJECTED',
  AUTH_FAILED = 'AUTH_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_INVALID = 'PAYLOAD_INVALID',
  SUPPRESSION_RACE = 'SUPPRESSION_RACE',
  CHANNEL_OUTAGE = 'CHANNEL_OUTAGE',
}

export interface L14DeliveryExecutionRecord {
  readonly delivery_execution_id: string;
  readonly delivery_payload_ref: string;
  readonly channel: L14DeliveryChannel;
  readonly delivery_status: L14DeliveryExecutionStatus;
  readonly sent_at?: string;
  readonly failed_at?: string;
  readonly provider_message_ref?: string;
  readonly retry_eligible: boolean;
  readonly retry_count: number;
  readonly execution_failure_reason_codes?:
    readonly L14DeliveryExecutionFailureReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Materialization intent ─────────────────────────────────────────

export interface L14DeliveryEventMaterializationIntent {
  readonly materialization_intent_id: string;
  readonly runtime_run_id: string;
  readonly candidate_delivery_ref: string;
  readonly suppression_record_ref?: string;
  readonly merge_record_ref?: string;
  readonly delivery_payload_ref?: string;
  readonly execution_record_ref?: string;
  readonly should_persist_delivery_candidate: boolean;
  readonly should_persist_suppression: boolean;
  readonly should_persist_merge_record: boolean;
  readonly should_persist_execution_record: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Feedback expectation ──────────────────────────────────────────

export enum L14ExpectedInteractionType {
  ALERT_OPEN = 'ALERT_OPEN',
  ALERT_CLICK = 'ALERT_CLICK',
  ALERT_IGNORE_WINDOW_ELAPSED = 'ALERT_IGNORE_WINDOW_ELAPSED',
  TOKEN_REPORT_VIEW = 'TOKEN_REPORT_VIEW',
  WATCHLIST_ADD = 'WATCHLIST_ADD',
  FOLLOW_UP_QUESTION = 'FOLLOW_UP_QUESTION',
  USER_FEEDBACK = 'USER_FEEDBACK',
}

export enum L14ExpectedOutcomeEvaluationClass {
  ALERT_OUTCOME_ALIGNMENT = 'ALERT_OUTCOME_ALIGNMENT',
  SCORE_CALIBRATION_ALIGNMENT = 'SCORE_CALIBRATION_ALIGNMENT',
  SCENARIO_TRIGGER_ALIGNMENT = 'SCENARIO_TRIGGER_ALIGNMENT',
  HYPOTHESIS_OUTCOME_ALIGNMENT = 'HYPOTHESIS_OUTCOME_ALIGNMENT',
}

export enum L14FeedbackExpectationStatus {
  REGISTERED = 'REGISTERED',
  NOT_REQUIRED_ON_DEMAND_SURFACE = 'NOT_REQUIRED_ON_DEMAND_SURFACE',
  NOT_REQUIRED_INTERNAL_REVIEW_ONLY = 'NOT_REQUIRED_INTERNAL_REVIEW_ONLY',
  BLOCKED_NO_EXECUTION_CONTEXT = 'BLOCKED_NO_EXECUTION_CONTEXT',
}

export interface L14DeliveryFeedbackExpectation {
  readonly feedback_expectation_id: string;
  readonly delivery_execution_ref?: string;
  readonly suppression_record_ref?: string;
  readonly digest_bucket_ref?: string;
  readonly expected_interaction_window_ms: number;
  readonly expected_outcome_evaluation_window_ms?: number;
  readonly eligible_interaction_types:
    readonly L14ExpectedInteractionType[];
  readonly eligible_outcome_evaluation_classes:
    readonly L14ExpectedOutcomeEvaluationClass[];
  readonly expectation_status: L14FeedbackExpectationStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
