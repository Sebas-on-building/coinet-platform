/**
 * L14.8 — Performance / Health / Failure Fact Builders + Current Registry Writers
 *
 * §14.8.14 / §14.8.15 / §14.8.16 / §14.8.13
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import {
  L14ChannelHealthClass,
  L14ChannelRetryPressureClass,
  L14DeliveryFailureClass,
  L14DeliveryFailureRecoveryAction,
  L14DeliveryFailureStage,
  type L14AlertPerformanceFact,
  type L14ChannelHealthFact,
  type L14DeliveryFailureRecord,
} from '../contracts/l14-performance-health-facts';
import {
  L14CurrentRegistryId,
  type L14CurrentAlertPerformanceRecord,
  type L14CurrentCalibrationReviewRecord,
  type L14CurrentChannelHealthRecord,
  type L14CurrentDeliveryPolicyRecord,
  type L14DeliveryPolicyScope,
} from '../contracts/l14-current-registries';
import {
  L14CalibrationProposalClass,
  L14CalibrationProposalStatus,
  type L14ProposalAffectedLayer,
} from '../contracts/calibration-proposal-core';
import { L14ProposalReviewQueueClass } from '../contracts/calibration-proposal-handoff';

const POLICY_V = 'l14.persistence.v1';

// ── Alert performance fact ────────────────────────────────────────

export interface L14AlertPerformanceFactInput {
  readonly alert_class_ref: string;
  readonly regime_ref?: string;
  readonly horizon_ref?: string;
  readonly channel_ref?: L14DeliveryChannel;
  readonly observed_window_start: string;
  readonly observed_window_end: string;
  readonly delivered_count: number;
  readonly opened_count: number;
  readonly clicked_count: number;
  readonly ignored_count: number;
  readonly dismissed_count: number;
  readonly saved_or_watchlisted_count: number;
  readonly deeper_investigation_count: number;
  readonly aligned_outcome_count: number;
  readonly partially_aligned_outcome_count: number;
  readonly misaligned_outcome_count: number;
  readonly inconclusive_outcome_count: number;
  readonly false_positive_count: number;
  readonly false_negative_count: number;
  readonly source_execution_refs: readonly string[];
  readonly source_interaction_refs: readonly string[];
  readonly source_outcome_refs: readonly string[];
}

export function buildL14AlertPerformanceFact(input: L14AlertPerformanceFactInput): L14AlertPerformanceFact {
  const replayHash = fnv1a([
    input.alert_class_ref, input.regime_ref ?? '', input.horizon_ref ?? '',
    input.channel_ref ?? '', input.observed_window_start, input.observed_window_end,
    String(input.delivered_count), String(input.opened_count), String(input.clicked_count),
    String(input.ignored_count), String(input.dismissed_count), String(input.saved_or_watchlisted_count),
    String(input.deeper_investigation_count), String(input.aligned_outcome_count),
    String(input.partially_aligned_outcome_count), String(input.misaligned_outcome_count),
    String(input.inconclusive_outcome_count), String(input.false_positive_count),
    String(input.false_negative_count),
    input.source_execution_refs.slice().sort().join(','),
    input.source_interaction_refs.slice().sort().join(','),
    input.source_outcome_refs.slice().sort().join(','),
    POLICY_V,
  ].join('|'));
  return {
    alert_performance_fact_id: `l14.alertperf.${replayHash}`,
    alert_class_ref: input.alert_class_ref,
    regime_ref: input.regime_ref,
    horizon_ref: input.horizon_ref,
    channel_ref: input.channel_ref,
    observed_window_start: input.observed_window_start,
    observed_window_end: input.observed_window_end,
    delivered_count: input.delivered_count,
    opened_count: input.opened_count,
    clicked_count: input.clicked_count,
    ignored_count: input.ignored_count,
    dismissed_count: input.dismissed_count,
    saved_or_watchlisted_count: input.saved_or_watchlisted_count,
    deeper_investigation_count: input.deeper_investigation_count,
    aligned_outcome_count: input.aligned_outcome_count,
    partially_aligned_outcome_count: input.partially_aligned_outcome_count,
    misaligned_outcome_count: input.misaligned_outcome_count,
    inconclusive_outcome_count: input.inconclusive_outcome_count,
    false_positive_count: input.false_positive_count,
    false_negative_count: input.false_negative_count,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Channel health fact ──────────────────────────────────────────

export interface L14ChannelHealthFactInput {
  readonly channel: L14DeliveryChannel;
  readonly observed_window_start: string;
  readonly observed_window_end: string;
  readonly attempted_delivery_count: number;
  readonly successful_delivery_count: number;
  readonly failed_delivery_count: number;
  readonly retry_eligible_failure_count: number;
  readonly exhausted_retry_count: number;
  readonly suppression_count_by_policy?: number;
  readonly last_success_at?: string;
  readonly last_failure_at?: string;
}

export function buildL14ChannelHealthFact(input: L14ChannelHealthFactInput): L14ChannelHealthFact {
  const attempted = input.attempted_delivery_count;
  const success = input.successful_delivery_count;
  const failed = input.failed_delivery_count;
  const successRate = attempted > 0 ? success / attempted : 0;
  const failureRate = attempted > 0 ? failed / attempted : 0;
  let health: L14ChannelHealthClass;
  if (attempted === 0) health = L14ChannelHealthClass.UNKNOWN;
  else if (failureRate >= 0.5) health = L14ChannelHealthClass.FAILING;
  else if (failureRate >= 0.1) health = L14ChannelHealthClass.DEGRADED;
  else health = L14ChannelHealthClass.HEALTHY;
  let pressure: L14ChannelRetryPressureClass;
  const retryRatio = attempted > 0 ? input.retry_eligible_failure_count / attempted : 0;
  if (input.exhausted_retry_count > 0 && retryRatio > 0.3) pressure = L14ChannelRetryPressureClass.CRITICAL;
  else if (retryRatio > 0.3) pressure = L14ChannelRetryPressureClass.HIGH;
  else if (retryRatio > 0.15) pressure = L14ChannelRetryPressureClass.MODERATE;
  else if (retryRatio > 0.05) pressure = L14ChannelRetryPressureClass.LOW;
  else pressure = L14ChannelRetryPressureClass.NONE;
  const replayHash = fnv1a([
    input.channel, input.observed_window_start, input.observed_window_end,
    String(attempted), String(success), String(failed),
    String(input.retry_eligible_failure_count), String(input.exhausted_retry_count),
    String(input.suppression_count_by_policy ?? ''),
    String(successRate), String(failureRate), health, pressure,
    input.last_success_at ?? '', input.last_failure_at ?? '',
    POLICY_V,
  ].join('|'));
  return {
    channel_health_fact_id: `l14.chhealth.${replayHash}`,
    channel: input.channel,
    observed_window_start: input.observed_window_start,
    observed_window_end: input.observed_window_end,
    attempted_delivery_count: attempted,
    successful_delivery_count: success,
    failed_delivery_count: failed,
    retry_eligible_failure_count: input.retry_eligible_failure_count,
    exhausted_retry_count: input.exhausted_retry_count,
    suppression_count_by_policy: input.suppression_count_by_policy,
    success_rate: successRate,
    failure_rate: failureRate,
    health_class: health,
    retry_pressure_class: pressure,
    last_success_at: input.last_success_at,
    last_failure_at: input.last_failure_at,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Delivery failure record ──────────────────────────────────────

export interface L14DeliveryFailureRecordInput {
  readonly source_delivery_execution_ref?: string;
  readonly source_delivery_payload_ref?: string;
  readonly channel: L14DeliveryChannel;
  readonly failure_stage: L14DeliveryFailureStage;
  readonly failure_class: L14DeliveryFailureClass;
  readonly provider_failure_ref?: string;
  readonly sanitized_failure_summary: string;
  readonly retry_eligible: boolean;
  readonly retry_count_at_failure: number;
  readonly recovery_action: L14DeliveryFailureRecoveryAction;
  readonly occurred_at: string;
}

export function buildL14DeliveryFailureRecord(input: L14DeliveryFailureRecordInput): L14DeliveryFailureRecord {
  const replayHash = fnv1a([
    input.channel, input.failure_stage, input.failure_class,
    input.source_delivery_execution_ref ?? '', input.source_delivery_payload_ref ?? '',
    input.sanitized_failure_summary, input.recovery_action,
    String(input.retry_eligible), String(input.retry_count_at_failure),
    input.occurred_at, POLICY_V,
  ].join('|'));
  return {
    delivery_failure_id: `l14.failure.${replayHash}`,
    source_delivery_execution_ref: input.source_delivery_execution_ref,
    source_delivery_payload_ref: input.source_delivery_payload_ref,
    channel: input.channel,
    failure_stage: input.failure_stage,
    failure_class: input.failure_class,
    provider_failure_ref: input.provider_failure_ref,
    sanitized_failure_summary: input.sanitized_failure_summary,
    retry_eligible: input.retry_eligible,
    retry_count_at_failure: input.retry_count_at_failure,
    recovery_action: input.recovery_action,
    occurred_at: input.occurred_at,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Current registry writers ─────────────────────────────────────

export interface L14CurrentDeliveryPolicyInput {
  readonly delivery_policy_ref: string;
  readonly policy_scope: L14DeliveryPolicyScope;
  readonly active_policy_version: string;
  readonly effective_from: string;
  readonly supersedes_policy_ref?: string;
  readonly ratification_or_governance_ref?: string;
}

export function buildL14CurrentDeliveryPolicyRecord(input: L14CurrentDeliveryPolicyInput): L14CurrentDeliveryPolicyRecord {
  const replayHash = fnv1a([
    input.delivery_policy_ref, input.policy_scope, input.active_policy_version,
    input.effective_from, input.supersedes_policy_ref ?? '',
    input.ratification_or_governance_ref ?? '', POLICY_V,
  ].join('|'));
  return {
    current_delivery_policy_record_id: `l14.cur.deliverypolicy.${replayHash}`,
    delivery_policy_ref: input.delivery_policy_ref,
    policy_scope: input.policy_scope,
    active_policy_version: input.active_policy_version,
    effective_from: input.effective_from,
    supersedes_policy_ref: input.supersedes_policy_ref,
    ratification_or_governance_ref: input.ratification_or_governance_ref,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
  };
}

export interface L14CurrentAlertPerformanceInput {
  readonly alert_class_ref: string;
  readonly regime_ref?: string;
  readonly horizon_ref?: string;
  readonly latest_performance_fact_ref: string;
  readonly aligned_rate?: number;
  readonly ignored_rate?: number;
  readonly false_positive_rate?: number;
  readonly deeper_investigation_rate?: number;
  readonly evidence_window_ref: string;
}

export function buildL14CurrentAlertPerformanceRecord(input: L14CurrentAlertPerformanceInput): L14CurrentAlertPerformanceRecord {
  const replayHash = fnv1a([
    input.alert_class_ref, input.regime_ref ?? '', input.horizon_ref ?? '',
    input.latest_performance_fact_ref, String(input.aligned_rate ?? ''),
    String(input.ignored_rate ?? ''), String(input.false_positive_rate ?? ''),
    String(input.deeper_investigation_rate ?? ''), input.evidence_window_ref, POLICY_V,
  ].join('|'));
  return {
    current_alert_performance_record_id: `l14.cur.alertperf.${replayHash}`,
    alert_class_ref: input.alert_class_ref,
    regime_ref: input.regime_ref,
    horizon_ref: input.horizon_ref,
    latest_performance_fact_ref: input.latest_performance_fact_ref,
    aligned_rate: input.aligned_rate,
    ignored_rate: input.ignored_rate,
    false_positive_rate: input.false_positive_rate,
    deeper_investigation_rate: input.deeper_investigation_rate,
    evidence_window_ref: input.evidence_window_ref,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
  };
}

export interface L14CurrentCalibrationReviewInput {
  readonly calibration_proposal_ref: string;
  readonly proposal_class: L14CalibrationProposalClass;
  readonly affected_layer: L14ProposalAffectedLayer;
  readonly latest_review_status: L14CalibrationProposalStatus;
  readonly current_review_queue_ref: L14ProposalReviewQueueClass;
  readonly latest_handoff_ref?: string;
  readonly latest_review_note_ref?: string;
  readonly created_at: string;
  readonly last_status_change_at: string;
}

export function buildL14CurrentCalibrationReviewRecord(input: L14CurrentCalibrationReviewInput): L14CurrentCalibrationReviewRecord {
  const replayHash = fnv1a([
    input.calibration_proposal_ref, input.proposal_class, input.affected_layer,
    input.latest_review_status, input.current_review_queue_ref,
    input.latest_handoff_ref ?? '', input.latest_review_note_ref ?? '',
    input.created_at, input.last_status_change_at, POLICY_V,
  ].join('|'));
  return {
    current_calibration_review_record_id: `l14.cur.calreview.${replayHash}`,
    calibration_proposal_ref: input.calibration_proposal_ref,
    proposal_class: input.proposal_class,
    affected_layer: input.affected_layer,
    latest_review_status: input.latest_review_status,
    current_review_queue_ref: input.current_review_queue_ref,
    latest_handoff_ref: input.latest_handoff_ref,
    latest_review_note_ref: input.latest_review_note_ref,
    created_at: input.created_at,
    last_status_change_at: input.last_status_change_at,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
  };
}

export interface L14CurrentChannelHealthInput {
  readonly channel: L14DeliveryChannel;
  readonly latest_channel_health_fact_ref: string;
  readonly health_class: L14ChannelHealthClass;
  readonly retry_pressure_class: L14ChannelRetryPressureClass;
  readonly last_success_at?: string;
  readonly last_failure_at?: string;
  readonly observed_window_ref: string;
}

export function buildL14CurrentChannelHealthRecord(input: L14CurrentChannelHealthInput): L14CurrentChannelHealthRecord {
  const replayHash = fnv1a([
    input.channel, input.latest_channel_health_fact_ref, input.health_class,
    input.retry_pressure_class, input.last_success_at ?? '', input.last_failure_at ?? '',
    input.observed_window_ref, POLICY_V,
  ].join('|'));
  return {
    current_channel_health_record_id: `l14.cur.chhealth.${replayHash}`,
    channel: input.channel,
    latest_channel_health_fact_ref: input.latest_channel_health_fact_ref,
    health_class: input.health_class,
    retry_pressure_class: input.retry_pressure_class,
    last_success_at: input.last_success_at,
    last_failure_at: input.last_failure_at,
    observed_window_ref: input.observed_window_ref,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
  };
}

// ── Current registry id helpers ──────────────────────────────────

export function registryIdForAlertPerformance(): L14CurrentRegistryId {
  return L14CurrentRegistryId.CURRENT_ALERT_PERFORMANCE_REGISTRY;
}
export function registryIdForChannelHealth(): L14CurrentRegistryId {
  return L14CurrentRegistryId.CURRENT_CHANNEL_HEALTH_REGISTRY;
}
export function registryIdForCalibrationReview(): L14CurrentRegistryId {
  return L14CurrentRegistryId.CURRENT_CALIBRATION_REVIEW_REGISTRY;
}
export function registryIdForDeliveryPolicy(): L14CurrentRegistryId {
  return L14CurrentRegistryId.CURRENT_DELIVERY_POLICY_REGISTRY;
}
