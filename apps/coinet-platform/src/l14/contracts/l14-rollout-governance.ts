/**
 * L14.9 — Rollout Governance Contracts
 *
 * §14.9.7 / §14.9.8 / §14.9.9 / §14.9.10 / §14.9.11
 */

import { L14DeliveryChannel } from './delivery-channel';
import { L14DeliveryClass } from './delivery-class';
import { L14AudienceClass } from './audience-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from './delivery-priority';
import { L14ChannelHealthClass } from './l14-performance-health-facts';

// ── Rollout statuses ─────────────────────────────────────────────

export enum L14LiveRolloutStatus {
  RESERVED_NOT_EMISSIBLE = 'RESERVED_NOT_EMISSIBLE',
  SHADOW_ONLY = 'SHADOW_ONLY',
  INTERNAL_CANARY = 'INTERNAL_CANARY',
  LIMITED_OPT_IN = 'LIMITED_OPT_IN',
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  PAUSED_OPERATIONAL = 'PAUSED_OPERATIONAL',
  ROLLED_BACK = 'ROLLED_BACK',
}
export const ALL_L14_LIVE_ROLLOUT_STATUSES: readonly L14LiveRolloutStatus[] =
  Object.values(L14LiveRolloutStatus);

// Transition map (§14.9.7.2) — from → allowed next.
export const L14_ROLLOUT_TRANSITIONS: Readonly<Record<L14LiveRolloutStatus, readonly L14LiveRolloutStatus[]>> = {
  [L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE]: [L14LiveRolloutStatus.SHADOW_ONLY],
  [L14LiveRolloutStatus.SHADOW_ONLY]: [L14LiveRolloutStatus.INTERNAL_CANARY],
  [L14LiveRolloutStatus.INTERNAL_CANARY]: [L14LiveRolloutStatus.LIMITED_OPT_IN, L14LiveRolloutStatus.PAUSED_OPERATIONAL],
  [L14LiveRolloutStatus.LIMITED_OPT_IN]: [L14LiveRolloutStatus.PRODUCTION_ENABLED, L14LiveRolloutStatus.PAUSED_OPERATIONAL],
  [L14LiveRolloutStatus.PRODUCTION_ENABLED]: [L14LiveRolloutStatus.PAUSED_OPERATIONAL, L14LiveRolloutStatus.ROLLED_BACK],
  [L14LiveRolloutStatus.PAUSED_OPERATIONAL]: [
    L14LiveRolloutStatus.LIMITED_OPT_IN,
    L14LiveRolloutStatus.PRODUCTION_ENABLED,
    L14LiveRolloutStatus.ROLLED_BACK,
  ],
  [L14LiveRolloutStatus.ROLLED_BACK]: [L14LiveRolloutStatus.SHADOW_ONLY],
};

// ── Channel rollout policy ───────────────────────────────────────

export interface L14ChannelRolloutPolicy {
  readonly channel_rollout_policy_id: string;
  readonly channel: L14DeliveryChannel;
  readonly rollout_status: L14LiveRolloutStatus;
  readonly enabled_audience_classes: readonly L14AudienceClass[];
  readonly allowed_delivery_classes: readonly L14DeliveryClass[];
  readonly allowed_alert_class_refs: readonly string[];
  readonly blocked_alert_class_refs: readonly string[];
  readonly channel_health_minimum_class: L14ChannelHealthClass;
  readonly queue_backlog_threshold_ref?: string;
  readonly requires_user_opt_in: boolean;
  readonly requires_explicit_channel_linking: boolean;
  readonly fallback_channel_policy_ref?: string;
  readonly rollback_policy_ref: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Alert class rollout policy ───────────────────────────────────

export interface L14AlertClassRolloutPolicy {
  readonly alert_class_rollout_policy_id: string;
  readonly alert_class_ref: string;
  readonly rollout_status: L14LiveRolloutStatus;
  readonly eligible_channels: readonly L14DeliveryChannel[];
  readonly blocked_channels: readonly L14DeliveryChannel[];
  readonly minimum_priority_class: L14DeliveryPriorityClass;
  readonly minimum_urgency_class: L14DeliveryUrgencyClass;
  readonly digest_eligible: boolean;
  readonly severity_override_policy_ref?: string;
  readonly allowed_user_scope_classes: readonly L14AudienceClass[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Telegram delivery gate ───────────────────────────────────────

export interface L14TelegramDeliveryGate {
  readonly telegram_delivery_gate_id: string;
  readonly channel_rollout_policy_ref: string;
  readonly bot_integration_ref: string;
  readonly bot_health_required_class: L14ChannelHealthClass;
  readonly user_opt_in_required: true;
  readonly valid_chat_binding_required: true;
  readonly quiet_hours_applicable: true;
  readonly frequency_caps_applicable: true;
  readonly digest_fallback_allowed: boolean;
  readonly retry_allowed: boolean;
  readonly max_retry_attempts: number;
  readonly severe_alert_override_policy_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Push enablement gate ─────────────────────────────────────────

export interface L14PushEnablementGate {
  readonly push_enablement_gate_id: string;
  readonly channel: 'PUSH_ALERT';
  readonly current_rollout_status: L14LiveRolloutStatus;
  readonly upstream_channel_registry_must_be_production_certified: true;
  readonly explicit_user_permission_required: true;
  readonly platform_token_binding_required: true;
  readonly quiet_hours_policy_required: true;
  readonly frequency_cap_policy_required: true;
  readonly digest_downgrade_policy_required: true;
  readonly production_enablement_allowed: boolean;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
