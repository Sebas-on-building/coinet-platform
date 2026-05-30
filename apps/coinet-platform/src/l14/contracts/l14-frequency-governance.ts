/**
 * L14.9 — Frequency / Dedup / Cluster Merge / Digest / Severity Override /
 * Live Delivery Control Decision Contracts
 *
 * §14.9.19 / §14.9.20 / §14.9.21 / §14.9.22 / §14.9.24 / §14.9.25
 */

import { L14DeliveryPriorityClass } from './delivery-priority';

export enum L14AlertFrequencyWindowClass {
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  ONE_HOUR = 'ONE_HOUR',
  SIX_HOURS = 'SIX_HOURS',
  ONE_DAY = 'ONE_DAY',
}

export interface L14DeliveryFrequencyPolicy {
  readonly delivery_frequency_policy_id: string;
  readonly alert_frequency_window: L14AlertFrequencyWindowClass;
  readonly default_max_alerts_per_window: number;
  readonly respect_user_custom_cap: true;
  readonly deduplication_policy_ref: string;
  readonly cluster_merge_policy_ref: string;
  readonly digest_downgrade_policy_ref: string;
  readonly severity_override_policy_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14DuplicateBasisClass {
  SAME_DELIVERY_ARTIFACT = 'SAME_DELIVERY_ARTIFACT',
  SAME_ALERT_CLASS_SAME_SUBJECT = 'SAME_ALERT_CLASS_SAME_SUBJECT',
  SAME_SCENARIO_SHIFT_SAME_SUBJECT = 'SAME_SCENARIO_SHIFT_SAME_SUBJECT',
  SAME_TRIGGER_INVALIDATION_CLUSTER = 'SAME_TRIGGER_INVALIDATION_CLUSTER',
}

export interface L14DeduplicationLivePolicy {
  readonly deduplication_live_policy_id: string;
  readonly duplicate_window_minutes: number;
  readonly duplicate_basis_classes: readonly L14DuplicateBasisClass[];
  readonly allow_cross_channel_deduplication: boolean;
  readonly allow_cross_alert_class_deduplication: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14ClusterMergeBasisClass {
  SAME_SUBJECT = 'SAME_SUBJECT',
  SAME_ALERT_CLASS = 'SAME_ALERT_CLASS',
  SAME_SCENARIO_FAMILY = 'SAME_SCENARIO_FAMILY',
  SAME_WATCHLIST_GROUP = 'SAME_WATCHLIST_GROUP',
}

export interface L14ClusterMergePolicy {
  readonly cluster_merge_policy_id: string;
  readonly merge_window_minutes: number;
  readonly merge_basis_classes: readonly L14ClusterMergeBasisClass[];
  readonly maximum_cluster_size: number;
  readonly digest_if_cluster_size_exceeds_threshold: boolean;
  readonly immediate_delivery_if_any_member_is_critical: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14DigestDowngradePolicy {
  readonly digest_downgrade_policy_id: string;
  readonly low_priority_digest_enabled: boolean;
  readonly routine_priority_digest_enabled: boolean;
  readonly material_priority_digest_enabled_under_cap_pressure: boolean;
  readonly downgrade_during_quiet_hours: boolean;
  readonly downgrade_when_channel_health_degraded: boolean;
  readonly downgrade_when_frequency_cap_hit: boolean;
  readonly downgrade_when_alert_class_noisy_limited: boolean;
  readonly severity_override_policy_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14SeverityOverridePolicy {
  readonly severity_override_policy_id: string;
  readonly eligible_priority_classes: readonly L14DeliveryPriorityClass[];
  readonly eligible_alert_class_refs: readonly string[];
  readonly may_bypass_quiet_hours: boolean;
  readonly may_bypass_frequency_caps: boolean;
  readonly may_bypass_digest_downgrade: boolean;
  readonly requires_full_restriction_clearance: true;
  readonly requires_channel_rollout_production_enabled: true;
  readonly audit_every_override: true;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Live decision ────────────────────────────────────────────────

export enum L14QuietHoursEffectClass {
  NOT_ACTIVE = 'NOT_ACTIVE',
  ACTIVE_ALLOW_DIGEST = 'ACTIVE_ALLOW_DIGEST',
  ACTIVE_BLOCK_IMMEDIATE = 'ACTIVE_BLOCK_IMMEDIATE',
  ACTIVE_BYPASSED_BY_POLICY_OVERRIDE = 'ACTIVE_BYPASSED_BY_POLICY_OVERRIDE',
}

export enum L14FrequencyEffectClass {
  BELOW_CAP = 'BELOW_CAP',
  CAP_REACHED_SUPPRESS = 'CAP_REACHED_SUPPRESS',
  CAP_REACHED_DIGEST_DOWNGRADE = 'CAP_REACHED_DIGEST_DOWNGRADE',
  CAP_BYPASSED_BY_POLICY_OVERRIDE = 'CAP_BYPASSED_BY_POLICY_OVERRIDE',
}

export enum L14DigestEffectClass {
  NO_DIGEST_EFFECT = 'NO_DIGEST_EFFECT',
  DIGEST_BY_USER_PREFERENCE = 'DIGEST_BY_USER_PREFERENCE',
  DIGEST_BY_QUIET_HOURS = 'DIGEST_BY_QUIET_HOURS',
  DIGEST_BY_FREQUENCY_CAP = 'DIGEST_BY_FREQUENCY_CAP',
  DIGEST_BY_NOISY_CLASS_LIMITING = 'DIGEST_BY_NOISY_CLASS_LIMITING',
}

export enum L14SeverityOverrideEffectClass {
  NO_OVERRIDE = 'NO_OVERRIDE',
  OVERRIDE_APPLIED_LEGALLY = 'OVERRIDE_APPLIED_LEGALLY',
  OVERRIDE_REQUESTED_BUT_REJECTED = 'OVERRIDE_REQUESTED_BUT_REJECTED',
}

export enum L14LiveControlStatus {
  IMMEDIATE_DELIVERY_ALLOWED = 'IMMEDIATE_DELIVERY_ALLOWED',
  DIGEST_DOWNGRADE_REQUIRED = 'DIGEST_DOWNGRADE_REQUIRED',
  SUPPRESSION_REQUIRED = 'SUPPRESSION_REQUIRED',
  DELIVERY_BLOCKED_BY_USER_CONTROL = 'DELIVERY_BLOCKED_BY_USER_CONTROL',
  DELIVERY_BLOCKED_BY_ROLLOUT_POLICY = 'DELIVERY_BLOCKED_BY_ROLLOUT_POLICY',
}

export interface L14LiveDeliveryControlDecision {
  readonly live_delivery_control_decision_id: string;
  readonly source_delivery_candidate_ref: string;
  readonly preference_snapshot_ref: string;
  readonly channel_rollout_policy_ref: string;
  readonly alert_class_rollout_policy_ref: string;
  readonly frequency_policy_ref: string;
  readonly quiet_hours_effect: L14QuietHoursEffectClass;
  readonly frequency_effect: L14FrequencyEffectClass;
  readonly digest_effect: L14DigestEffectClass;
  readonly severity_override_effect: L14SeverityOverrideEffectClass;
  readonly final_live_control_status: L14LiveControlStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
