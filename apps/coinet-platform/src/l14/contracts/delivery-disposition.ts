/**
 * L14.3 — Deduplication / Cooldown / Suppression / Merge / Disposition
 *
 * §14.3.23–§14.3.37 — Consolidated runtime-decision contracts.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliverableSourceArtifactClass } from './deliverable-source-artifact';
import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

// ── Deduplication ──────────────────────────────────────────────────

export interface L14DeliveryDeduplicationKey {
  readonly deduplication_key_id: string;
  readonly channel: L14DeliveryChannel;
  readonly audience_class: L14AudienceClass;
  readonly user_scope_ref?: string;
  readonly subject_scope_ref?: string;
  readonly delivery_class: L14DeliveryClass;
  readonly source_artifact_class: L14DeliverableSourceArtifactClass;
  readonly semantic_cluster_key: string;
  readonly event_family_key: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14DuplicationStatus {
  NO_DUPLICATE = 'NO_DUPLICATE',
  EXACT_DUPLICATE = 'EXACT_DUPLICATE',
  NEAR_DUPLICATE = 'NEAR_DUPLICATE',
}

export interface L14DuplicationCheckResult {
  readonly duplication_result_id: string;
  readonly candidate_delivery_ref: string;
  readonly deduplication_key_ref: string;
  readonly status: L14DuplicationStatus;
  readonly matched_delivery_refs: readonly string[];
  readonly materially_new_invalidation: boolean;
  readonly materially_new_trigger: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Cooldown ───────────────────────────────────────────────────────

export enum L14CooldownStatus {
  NO_COOLDOWN_MATCH = 'NO_COOLDOWN_MATCH',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  COOLDOWN_OVERRIDE_CRITICAL_ESCALATION = 'COOLDOWN_OVERRIDE_CRITICAL_ESCALATION',
  COOLDOWN_OVERRIDE_NEW_INVALIDATION = 'COOLDOWN_OVERRIDE_NEW_INVALIDATION',
  COOLDOWN_OVERRIDE_MATERIAL_CONTRADICTION_CHANGE = 'COOLDOWN_OVERRIDE_MATERIAL_CONTRADICTION_CHANGE',
}

export enum L14CooldownOverrideReason {
  CRITICAL_ESCALATION = 'CRITICAL_ESCALATION',
  NEW_INVALIDATION = 'NEW_INVALIDATION',
  MATERIAL_CONTRADICTION_CHANGE = 'MATERIAL_CONTRADICTION_CHANGE',
}

export interface L14CooldownEvaluationResult {
  readonly cooldown_evaluation_id: string;
  readonly candidate_delivery_ref: string;
  readonly deduplication_key_ref: string;
  readonly cooldown_window_ms: number;
  readonly last_delivery_ref?: string;
  readonly last_delivery_at?: string;
  readonly cooldown_active: boolean;
  readonly cooldown_override_allowed: boolean;
  readonly cooldown_override_reason?: L14CooldownOverrideReason;
  readonly result_status: L14CooldownStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Suppression ────────────────────────────────────────────────────

export enum L14SuppressionReason {
  DUPLICATE_ALERT = 'DUPLICATE_ALERT',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  USER_MUTED_CHANNEL = 'USER_MUTED_CHANNEL',
  USER_MUTED_ALERT_CLASS = 'USER_MUTED_ALERT_CLASS',
  LOW_DELIVERY_CONFIDENCE = 'LOW_DELIVERY_CONFIDENCE',
  RESTRICTION_PROFILE_BLOCKED = 'RESTRICTION_PROFILE_BLOCKED',
  INTERNAL_REVIEW_ONLY = 'INTERNAL_REVIEW_ONLY',
  KNOWN_NOISY_ALERT_CLASS_LIMITED = 'KNOWN_NOISY_ALERT_CLASS_LIMITED',
  QUIET_HOURS_ACTIVE = 'QUIET_HOURS_ACTIVE',
  FREQUENCY_CAP_REACHED = 'FREQUENCY_CAP_REACHED',
  CHANNEL_RESERVED = 'CHANNEL_RESERVED',
  ENTITLEMENT_NOT_SATISFIED = 'ENTITLEMENT_NOT_SATISFIED',
  DIGEST_DOWNGRADE_POLICY = 'DIGEST_DOWNGRADE_POLICY',
}

export interface L14DeliverySuppressionRecord {
  readonly suppression_id: string;
  readonly candidate_delivery_ref: string;
  readonly suppression_reason: L14SuppressionReason;
  readonly suppression_policy_ref: string;
  readonly user_scope_ref?: string;
  readonly channel: L14DeliveryChannel;
  readonly could_be_delivered_later: boolean;
  readonly digest_eligible: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Merge ──────────────────────────────────────────────────────────

export enum L14MergeReason {
  SAME_SUBJECT_SAME_WINDOW = 'SAME_SUBJECT_SAME_WINDOW',
  SAME_ALERT_CLASS_MULTIPLE_EVENTS = 'SAME_ALERT_CLASS_MULTIPLE_EVENTS',
  ROUTINE_EVENTS_DIGESTED = 'ROUTINE_EVENTS_DIGESTED',
  NEAR_DUPLICATE_SEMANTIC_CLUSTER = 'NEAR_DUPLICATE_SEMANTIC_CLUSTER',
}

export interface L14DeliveryMergeRecord {
  readonly merge_record_id: string;
  readonly source_candidate_refs: readonly string[];
  readonly merged_delivery_candidate_ref: string;
  readonly merge_reason: L14MergeReason;
  readonly digest_eligible: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Disposition ────────────────────────────────────────────────────

export enum L14DeliveryDisposition {
  EXECUTE_IMMEDIATELY = 'EXECUTE_IMMEDIATELY',
  EXECUTE_NEAR_REAL_TIME = 'EXECUTE_NEAR_REAL_TIME',
  DEFER_TO_DIGEST = 'DEFER_TO_DIGEST',
  MERGE_INTO_EXISTING_PENDING_DELIVERY = 'MERGE_INTO_EXISTING_PENDING_DELIVERY',
  SUPPRESS_WITH_RECORD = 'SUPPRESS_WITH_RECORD',
  INTERNAL_REVIEW_ONLY = 'INTERNAL_REVIEW_ONLY',
  BLOCKED_ILLEGAL_DELIVERY = 'BLOCKED_ILLEGAL_DELIVERY',
}

export enum L14DeliveryDispositionReasonCode {
  CRITICAL_INVALIDATION = 'CRITICAL_INVALIDATION',
  HIGH_PRIORITY_IMMEDIATE = 'HIGH_PRIORITY_IMMEDIATE',
  MATERIAL_DIGEST = 'MATERIAL_DIGEST',
  DUPLICATE_SUPPRESSED = 'DUPLICATE_SUPPRESSED',
  COOLDOWN_SUPPRESSED = 'COOLDOWN_SUPPRESSED',
  QUIET_HOURS_DEFER = 'QUIET_HOURS_DEFER',
  MUTED_CHANNEL_SUPPRESSED = 'MUTED_CHANNEL_SUPPRESSED',
  FREQUENCY_CAP_SUPPRESSED = 'FREQUENCY_CAP_SUPPRESSED',
  ENTITLEMENT_SUPPRESSED = 'ENTITLEMENT_SUPPRESSED',
  INTERNAL_REVIEW_ROUTE = 'INTERNAL_REVIEW_ROUTE',
  CHANNEL_RESERVED_BLOCK = 'CHANNEL_RESERVED_BLOCK',
  RESTRICTION_PROFILE_BLOCK = 'RESTRICTION_PROFILE_BLOCK',
  MERGE_INTO_DIGEST = 'MERGE_INTO_DIGEST',
}

export interface L14DeliveryDispositionDecision {
  readonly disposition_decision_id: string;
  readonly candidate_delivery_ref: string;
  readonly disposition: L14DeliveryDisposition;
  readonly suppression_record_ref?: string;
  readonly merge_target_ref?: string;
  readonly digest_bucket_ref?: string;
  readonly decision_reason_codes: readonly L14DeliveryDispositionReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const EXECUTING = new Set<L14DeliveryDisposition>([
  L14DeliveryDisposition.EXECUTE_IMMEDIATELY,
  L14DeliveryDisposition.EXECUTE_NEAR_REAL_TIME,
]);

export function l14DispositionIsExecuting(
  d: L14DeliveryDisposition,
): boolean {
  return EXECUTING.has(d);
}
