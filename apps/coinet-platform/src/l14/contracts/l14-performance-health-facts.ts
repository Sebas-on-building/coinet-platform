/**
 * L14.8 — Alert Performance, Channel Health, Delivery Failure
 *
 * §14.8.14 / §14.8.15 / §14.8.16
 */

import { L14DeliveryChannel } from './delivery-channel';

// ── Alert performance fact ────────────────────────────────────────

export interface L14AlertPerformanceFact {
  readonly alert_performance_fact_id: string;
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
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Channel health ────────────────────────────────────────────────

export enum L14ChannelHealthClass {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  FAILING = 'FAILING',
  PAUSED_OR_RESERVED = 'PAUSED_OR_RESERVED',
  UNKNOWN = 'UNKNOWN',
}

export enum L14ChannelRetryPressureClass {
  NONE = 'NONE',
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface L14ChannelHealthFact {
  readonly channel_health_fact_id: string;
  readonly channel: L14DeliveryChannel;
  readonly observed_window_start: string;
  readonly observed_window_end: string;
  readonly attempted_delivery_count: number;
  readonly successful_delivery_count: number;
  readonly failed_delivery_count: number;
  readonly retry_eligible_failure_count: number;
  readonly exhausted_retry_count: number;
  readonly suppression_count_by_policy?: number;
  readonly success_rate: number;
  readonly failure_rate: number;
  readonly health_class: L14ChannelHealthClass;
  readonly retry_pressure_class: L14ChannelRetryPressureClass;
  readonly last_success_at?: string;
  readonly last_failure_at?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Delivery failure record ───────────────────────────────────────

export enum L14DeliveryFailureStage {
  PRE_PROVIDER = 'PRE_PROVIDER',
  PROVIDER_HANDOFF = 'PROVIDER_HANDOFF',
  PROVIDER_RESPONSE = 'PROVIDER_RESPONSE',
  POST_PROVIDER_MATERIALIZATION = 'POST_PROVIDER_MATERIALIZATION',
}

export enum L14DeliveryFailureClass {
  PROVIDER_REJECTED = 'PROVIDER_REJECTED',
  PROVIDER_TIMEOUT = 'PROVIDER_TIMEOUT',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  CHANNEL_DISABLED = 'CHANNEL_DISABLED',
  RECIPIENT_UNREACHABLE = 'RECIPIENT_UNREACHABLE',
  PAYLOAD_INVALID = 'PAYLOAD_INVALID',
  POLICY_BLOCKED_AT_DISPATCH = 'POLICY_BLOCKED_AT_DISPATCH',
  UNKNOWN_FAILURE = 'UNKNOWN_FAILURE',
}

export enum L14DeliveryFailureRecoveryAction {
  RETRY_LATER = 'RETRY_LATER',
  ESCALATE_FOR_REVIEW = 'ESCALATE_FOR_REVIEW',
  ABANDON_DELIVERY = 'ABANDON_DELIVERY',
  ROUTE_TO_DIGEST = 'ROUTE_TO_DIGEST',
  NO_ACTION = 'NO_ACTION',
}

export interface L14DeliveryFailureRecord {
  readonly delivery_failure_id: string;
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
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
