/**
 * L14.9 — Live Operations Engines
 *
 * §14.9.53 — Consolidated engines: rollout, user controls,
 * frequency control, experiments, operational governance.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import { L14AudienceClass } from '../contracts/audience-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../contracts/delivery-priority';
import { L14ChannelHealthClass } from '../contracts/l14-performance-health-facts';
import {
  L14LiveRolloutStatus,
  L14_ROLLOUT_TRANSITIONS,
  type L14AlertClassRolloutPolicy,
  type L14ChannelRolloutPolicy,
  type L14PushEnablementGate,
  type L14TelegramDeliveryGate,
} from '../contracts/l14-rollout-governance';
import {
  L14DigestPreferenceClass,
  L14Weekday,
  type L14DeliveryPreferenceProfile,
  type L14DeliveryPreferenceSnapshot,
  type L14QuietHoursProfile,
} from '../contracts/l14-user-delivery-controls';
import {
  L14AlertFrequencyWindowClass,
  L14ClusterMergeBasisClass,
  L14DigestEffectClass,
  L14DuplicateBasisClass,
  L14FrequencyEffectClass,
  L14LiveControlStatus,
  L14QuietHoursEffectClass,
  L14SeverityOverrideEffectClass,
  type L14ClusterMergePolicy,
  type L14DeduplicationLivePolicy,
  type L14DeliveryFrequencyPolicy,
  type L14DigestDowngradePolicy,
  type L14LiveDeliveryControlDecision,
  type L14SeverityOverridePolicy,
} from '../contracts/l14-frequency-governance';
import {
  L14AllowedExperimentSurface,
  L14ExperimentClass,
  L14ExperimentMetricClass,
  L14ExperimentRolloutStatus,
  L14_EXPERIMENT_CLASS_ALLOWED_SURFACES,
  type L14DeliveryExperiment,
  type L14ExperimentAssignment,
  type L14ExperimentExposureRecord,
  type L14ExperimentSamplePolicy,
} from '../contracts/l14-experiment-governance';
import {
  L14OperationalDashboardClass,
  L14OperationalDashboardStatus,
  L14OperationalIncidentClass,
  L14OperationalIncidentStatus,
  L14OperationalMitigationActionClass,
  L14OperationalPlaybookClass,
  L14OperationalProhibitedActionClass,
  L14OperationalSignalClass,
  L14OperationalSignalSeverityClass,
  type L14OperationalDashboardSnapshot,
  type L14OperationalIncidentRecord,
  type L14OperationalPlaybook,
  type L14OperationalSignalRecord,
} from '../contracts/l14-operational-governance';
import {
  L14AnalystOperationalActionClass,
  type L14AnalystOperationalActionRecord,
} from '../contracts/l14-analyst-operations';

const POLICY_V = 'l14.live.v1';

// ── Rollout transition validator ─────────────────────────────────

export function isL14RolloutTransitionLegal(
  from: L14LiveRolloutStatus,
  to: L14LiveRolloutStatus,
): boolean {
  if (from === to) return true;
  return L14_ROLLOUT_TRANSITIONS[from].includes(to);
}

// ── Channel rollout builder ──────────────────────────────────────

export interface L14ChannelRolloutInput {
  readonly channel: L14DeliveryChannel;
  readonly rollout_status: L14LiveRolloutStatus;
  readonly enabled_audience_classes: readonly L14AudienceClass[];
  readonly allowed_delivery_classes: readonly L14DeliveryClass[];
  readonly allowed_alert_class_refs: readonly string[];
  readonly blocked_alert_class_refs?: readonly string[];
  readonly channel_health_minimum_class: L14ChannelHealthClass;
  readonly queue_backlog_threshold_ref?: string;
  readonly requires_user_opt_in: boolean;
  readonly requires_explicit_channel_linking: boolean;
  readonly fallback_channel_policy_ref?: string;
  readonly rollback_policy_ref: string;
}

export function buildL14ChannelRolloutPolicy(input: L14ChannelRolloutInput): L14ChannelRolloutPolicy {
  const id = `l14.live.channel.rollout.${fnv1a([
    input.channel, input.rollout_status,
    input.enabled_audience_classes.slice().sort().join(','),
    input.allowed_delivery_classes.slice().sort().join(','),
    input.allowed_alert_class_refs.slice().sort().join(','),
    (input.blocked_alert_class_refs ?? []).slice().sort().join(','),
    input.channel_health_minimum_class, String(input.requires_user_opt_in),
    String(input.requires_explicit_channel_linking),
    input.queue_backlog_threshold_ref ?? '',
    input.fallback_channel_policy_ref ?? '',
    input.rollback_policy_ref, POLICY_V,
  ].join('|'))}`;
  return {
    channel_rollout_policy_id: id,
    channel: input.channel,
    rollout_status: input.rollout_status,
    enabled_audience_classes: input.enabled_audience_classes,
    allowed_delivery_classes: input.allowed_delivery_classes,
    allowed_alert_class_refs: input.allowed_alert_class_refs,
    blocked_alert_class_refs: input.blocked_alert_class_refs ?? [],
    channel_health_minimum_class: input.channel_health_minimum_class,
    queue_backlog_threshold_ref: input.queue_backlog_threshold_ref,
    requires_user_opt_in: input.requires_user_opt_in,
    requires_explicit_channel_linking: input.requires_explicit_channel_linking,
    fallback_channel_policy_ref: input.fallback_channel_policy_ref,
    rollback_policy_ref: input.rollback_policy_ref,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Alert class rollout builder ──────────────────────────────────

export interface L14AlertClassRolloutInput {
  readonly alert_class_ref: string;
  readonly rollout_status: L14LiveRolloutStatus;
  readonly eligible_channels: readonly L14DeliveryChannel[];
  readonly blocked_channels?: readonly L14DeliveryChannel[];
  readonly minimum_priority_class: L14DeliveryPriorityClass;
  readonly minimum_urgency_class: L14DeliveryUrgencyClass;
  readonly digest_eligible: boolean;
  readonly severity_override_policy_ref?: string;
  readonly allowed_user_scope_classes: readonly L14AudienceClass[];
}

export function buildL14AlertClassRolloutPolicy(input: L14AlertClassRolloutInput): L14AlertClassRolloutPolicy {
  const id = `l14.live.alertclass.rollout.${fnv1a([
    input.alert_class_ref, input.rollout_status,
    input.eligible_channels.slice().sort().join(','),
    (input.blocked_channels ?? []).slice().sort().join(','),
    input.minimum_priority_class, input.minimum_urgency_class,
    String(input.digest_eligible), input.severity_override_policy_ref ?? '',
    input.allowed_user_scope_classes.slice().sort().join(','), POLICY_V,
  ].join('|'))}`;
  return {
    alert_class_rollout_policy_id: id,
    alert_class_ref: input.alert_class_ref,
    rollout_status: input.rollout_status,
    eligible_channels: input.eligible_channels,
    blocked_channels: input.blocked_channels ?? [],
    minimum_priority_class: input.minimum_priority_class,
    minimum_urgency_class: input.minimum_urgency_class,
    digest_eligible: input.digest_eligible,
    severity_override_policy_ref: input.severity_override_policy_ref,
    allowed_user_scope_classes: input.allowed_user_scope_classes,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Telegram gate builder ────────────────────────────────────────

export interface L14TelegramDeliveryGateInput {
  readonly channel_rollout_policy_ref: string;
  readonly bot_integration_ref: string;
  readonly bot_health_required_class: L14ChannelHealthClass;
  readonly digest_fallback_allowed: boolean;
  readonly retry_allowed: boolean;
  readonly max_retry_attempts: number;
  readonly severe_alert_override_policy_ref?: string;
}

export function buildL14TelegramDeliveryGate(input: L14TelegramDeliveryGateInput): L14TelegramDeliveryGate {
  const id = `l14.live.telegram.gate.${fnv1a([
    input.channel_rollout_policy_ref, input.bot_integration_ref,
    input.bot_health_required_class, String(input.digest_fallback_allowed),
    String(input.retry_allowed), String(input.max_retry_attempts),
    input.severe_alert_override_policy_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    telegram_delivery_gate_id: id,
    channel_rollout_policy_ref: input.channel_rollout_policy_ref,
    bot_integration_ref: input.bot_integration_ref,
    bot_health_required_class: input.bot_health_required_class,
    user_opt_in_required: true,
    valid_chat_binding_required: true,
    quiet_hours_applicable: true,
    frequency_caps_applicable: true,
    digest_fallback_allowed: input.digest_fallback_allowed,
    retry_allowed: input.retry_allowed,
    max_retry_attempts: input.max_retry_attempts,
    severe_alert_override_policy_ref: input.severe_alert_override_policy_ref,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Push enablement gate ─────────────────────────────────────────

export interface L14PushEnablementGateInput {
  readonly current_rollout_status: L14LiveRolloutStatus;
  // Push remains reserved per L14.2 until recertified — `false` here.
  readonly upstream_channel_registry_certified_for_production: boolean;
}

export function buildL14PushEnablementGate(input: L14PushEnablementGateInput): L14PushEnablementGate {
  // Push production enablement only allowed if upstream certified AND not still reserved.
  const allowed = input.upstream_channel_registry_certified_for_production &&
    input.current_rollout_status !== L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE;
  const id = `l14.live.push.gate.${fnv1a([
    input.current_rollout_status, String(input.upstream_channel_registry_certified_for_production),
    String(allowed), POLICY_V,
  ].join('|'))}`;
  return {
    push_enablement_gate_id: id,
    channel: 'PUSH_ALERT',
    current_rollout_status: input.current_rollout_status,
    upstream_channel_registry_must_be_production_certified: true,
    explicit_user_permission_required: true,
    platform_token_binding_required: true,
    quiet_hours_policy_required: true,
    frequency_cap_policy_required: true,
    digest_downgrade_policy_required: true,
    production_enablement_allowed: allowed,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Preference profile + snapshot ────────────────────────────────

export interface L14DeliveryPreferenceProfileInput {
  readonly user_id_hash: string;
  readonly enabled_channels: readonly L14DeliveryChannel[];
  readonly muted_channels: readonly L14DeliveryChannel[];
  readonly enabled_alert_classes: readonly string[];
  readonly muted_alert_classes: readonly string[];
  readonly watchlist_scope_refs: readonly string[];
  readonly quiet_hours_profile?: L14QuietHoursProfile;
  readonly max_alerts_per_window?: number;
  readonly digest_preference: L14DigestPreferenceClass;
}

export function buildL14DeliveryPreferenceProfile(input: L14DeliveryPreferenceProfileInput): L14DeliveryPreferenceProfile {
  const id = `l14.live.pref.${fnv1a([
    input.user_id_hash,
    input.enabled_channels.slice().sort().join(','),
    input.muted_channels.slice().sort().join(','),
    input.enabled_alert_classes.slice().sort().join(','),
    input.muted_alert_classes.slice().sort().join(','),
    input.watchlist_scope_refs.slice().sort().join(','),
    input.quiet_hours_profile?.quiet_hours_profile_id ?? '',
    String(input.max_alerts_per_window ?? ''),
    input.digest_preference, POLICY_V,
  ].join('|'))}`;
  return {
    preference_profile_id: id,
    user_id_hash: input.user_id_hash,
    enabled_channels: input.enabled_channels,
    muted_channels: input.muted_channels,
    enabled_alert_classes: input.enabled_alert_classes,
    muted_alert_classes: input.muted_alert_classes,
    watchlist_scope_refs: input.watchlist_scope_refs,
    quiet_hours_profile: input.quiet_hours_profile,
    max_alerts_per_window: input.max_alerts_per_window,
    digest_preference: input.digest_preference,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export interface L14QuietHoursProfileInput {
  readonly timezone_ref: string;
  readonly quiet_hours_start_local: string;
  readonly quiet_hours_end_local: string;
  readonly active_weekday_mask: readonly L14Weekday[];
  readonly digest_during_quiet_hours: boolean;
  readonly severity_override_policy_ref?: string;
}

export function buildL14QuietHoursProfile(input: L14QuietHoursProfileInput): L14QuietHoursProfile {
  const id = `l14.live.quiethours.${fnv1a([
    input.timezone_ref, input.quiet_hours_start_local, input.quiet_hours_end_local,
    input.active_weekday_mask.slice().sort().join(','),
    String(input.digest_during_quiet_hours),
    input.severity_override_policy_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    quiet_hours_profile_id: id,
    timezone_ref: input.timezone_ref,
    quiet_hours_start_local: input.quiet_hours_start_local,
    quiet_hours_end_local: input.quiet_hours_end_local,
    active_weekday_mask: input.active_weekday_mask,
    digest_during_quiet_hours: input.digest_during_quiet_hours,
    severity_override_policy_ref: input.severity_override_policy_ref,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export interface L14DeliveryPreferenceSnapshotInput {
  readonly profile: L14DeliveryPreferenceProfile;
  readonly captured_at: string;
  readonly quiet_hours_active: boolean;
}

export function buildL14DeliveryPreferenceSnapshot(input: L14DeliveryPreferenceSnapshotInput): L14DeliveryPreferenceSnapshot {
  const p = input.profile;
  const id = `l14.live.pref.snap.${fnv1a([
    p.preference_profile_id, input.captured_at, String(input.quiet_hours_active),
    p.enabled_channels.slice().sort().join(','),
    p.muted_channels.slice().sort().join(','),
    p.enabled_alert_classes.slice().sort().join(','),
    p.muted_alert_classes.slice().sort().join(','),
    p.watchlist_scope_refs.slice().sort().join(','),
    p.digest_preference, String(p.max_alerts_per_window ?? ''), POLICY_V,
  ].join('|'))}`;
  return {
    preference_snapshot_id: id,
    source_preference_profile_ref: p.preference_profile_id,
    captured_at: input.captured_at,
    resolved_enabled_channels: p.enabled_channels,
    resolved_muted_channels: p.muted_channels,
    resolved_enabled_alert_classes: p.enabled_alert_classes,
    resolved_muted_alert_classes: p.muted_alert_classes,
    resolved_watchlist_scope_refs: p.watchlist_scope_refs,
    quiet_hours_active: input.quiet_hours_active,
    active_quiet_hours_profile_ref: p.quiet_hours_profile?.quiet_hours_profile_id,
    max_alerts_per_window: p.max_alerts_per_window,
    digest_preference: p.digest_preference,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Frequency policy + companions ────────────────────────────────

export function buildL14DeliveryFrequencyPolicy(input: {
  alert_frequency_window: L14AlertFrequencyWindowClass;
  default_max_alerts_per_window: number;
  deduplication_policy_ref: string;
  cluster_merge_policy_ref: string;
  digest_downgrade_policy_ref: string;
  severity_override_policy_ref?: string;
}): L14DeliveryFrequencyPolicy {
  const id = `l14.live.freq.${fnv1a([
    input.alert_frequency_window, String(input.default_max_alerts_per_window),
    input.deduplication_policy_ref, input.cluster_merge_policy_ref,
    input.digest_downgrade_policy_ref, input.severity_override_policy_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    delivery_frequency_policy_id: id,
    alert_frequency_window: input.alert_frequency_window,
    default_max_alerts_per_window: input.default_max_alerts_per_window,
    respect_user_custom_cap: true,
    deduplication_policy_ref: input.deduplication_policy_ref,
    cluster_merge_policy_ref: input.cluster_merge_policy_ref,
    digest_downgrade_policy_ref: input.digest_downgrade_policy_ref,
    severity_override_policy_ref: input.severity_override_policy_ref,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14DeduplicationLivePolicy(input: {
  duplicate_window_minutes: number;
  duplicate_basis_classes: readonly L14DuplicateBasisClass[];
  allow_cross_channel_deduplication: boolean;
  allow_cross_alert_class_deduplication: boolean;
}): L14DeduplicationLivePolicy {
  const id = `l14.live.dedup.${fnv1a([
    String(input.duplicate_window_minutes),
    input.duplicate_basis_classes.slice().sort().join(','),
    String(input.allow_cross_channel_deduplication),
    String(input.allow_cross_alert_class_deduplication), POLICY_V,
  ].join('|'))}`;
  return {
    deduplication_live_policy_id: id,
    duplicate_window_minutes: input.duplicate_window_minutes,
    duplicate_basis_classes: input.duplicate_basis_classes,
    allow_cross_channel_deduplication: input.allow_cross_channel_deduplication,
    allow_cross_alert_class_deduplication: input.allow_cross_alert_class_deduplication,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14ClusterMergePolicy(input: {
  merge_window_minutes: number;
  merge_basis_classes: readonly L14ClusterMergeBasisClass[];
  maximum_cluster_size: number;
  digest_if_cluster_size_exceeds_threshold: boolean;
  immediate_delivery_if_any_member_is_critical: boolean;
}): L14ClusterMergePolicy {
  const id = `l14.live.merge.${fnv1a([
    String(input.merge_window_minutes), input.merge_basis_classes.slice().sort().join(','),
    String(input.maximum_cluster_size), String(input.digest_if_cluster_size_exceeds_threshold),
    String(input.immediate_delivery_if_any_member_is_critical), POLICY_V,
  ].join('|'))}`;
  return {
    cluster_merge_policy_id: id,
    merge_window_minutes: input.merge_window_minutes,
    merge_basis_classes: input.merge_basis_classes,
    maximum_cluster_size: input.maximum_cluster_size,
    digest_if_cluster_size_exceeds_threshold: input.digest_if_cluster_size_exceeds_threshold,
    immediate_delivery_if_any_member_is_critical: input.immediate_delivery_if_any_member_is_critical,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14DigestDowngradePolicy(input: {
  low_priority_digest_enabled: boolean;
  routine_priority_digest_enabled: boolean;
  material_priority_digest_enabled_under_cap_pressure: boolean;
  downgrade_during_quiet_hours: boolean;
  downgrade_when_channel_health_degraded: boolean;
  downgrade_when_frequency_cap_hit: boolean;
  downgrade_when_alert_class_noisy_limited: boolean;
  severity_override_policy_ref?: string;
}): L14DigestDowngradePolicy {
  const id = `l14.live.digest.${fnv1a([
    String(input.low_priority_digest_enabled), String(input.routine_priority_digest_enabled),
    String(input.material_priority_digest_enabled_under_cap_pressure),
    String(input.downgrade_during_quiet_hours), String(input.downgrade_when_channel_health_degraded),
    String(input.downgrade_when_frequency_cap_hit), String(input.downgrade_when_alert_class_noisy_limited),
    input.severity_override_policy_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    digest_downgrade_policy_id: id,
    ...input,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14SeverityOverridePolicy(input: {
  eligible_priority_classes: readonly L14DeliveryPriorityClass[];
  eligible_alert_class_refs: readonly string[];
  may_bypass_quiet_hours: boolean;
  may_bypass_frequency_caps: boolean;
  may_bypass_digest_downgrade: boolean;
}): L14SeverityOverridePolicy {
  const id = `l14.live.override.${fnv1a([
    input.eligible_priority_classes.slice().sort().join(','),
    input.eligible_alert_class_refs.slice().sort().join(','),
    String(input.may_bypass_quiet_hours), String(input.may_bypass_frequency_caps),
    String(input.may_bypass_digest_downgrade), POLICY_V,
  ].join('|'))}`;
  return {
    severity_override_policy_id: id,
    eligible_priority_classes: input.eligible_priority_classes,
    eligible_alert_class_refs: input.eligible_alert_class_refs,
    may_bypass_quiet_hours: input.may_bypass_quiet_hours,
    may_bypass_frequency_caps: input.may_bypass_frequency_caps,
    may_bypass_digest_downgrade: input.may_bypass_digest_downgrade,
    requires_full_restriction_clearance: true,
    requires_channel_rollout_production_enabled: true,
    audit_every_override: true,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Live delivery control decision engine ────────────────────────

export interface L14LiveDeliveryControlInput {
  readonly source_delivery_candidate_ref: string;
  readonly preference_snapshot: L14DeliveryPreferenceSnapshot;
  readonly channel_rollout: L14ChannelRolloutPolicy;
  readonly alert_class_rollout: L14AlertClassRolloutPolicy;
  readonly frequency_policy: L14DeliveryFrequencyPolicy;
  readonly digest_policy: L14DigestDowngradePolicy;
  readonly severity_override_policy?: L14SeverityOverridePolicy;
  readonly candidate_channel: L14DeliveryChannel;
  readonly candidate_alert_class_ref: string;
  readonly candidate_priority_class: L14DeliveryPriorityClass;
  readonly observed_alert_count_in_window: number;
  readonly user_custom_cap?: number;
  readonly override_requested: boolean;
}

export function decideL14LiveDeliveryControl(input: L14LiveDeliveryControlInput): L14LiveDeliveryControlDecision {
  // Precedence: rollout > user mute > quiet hours > frequency cap > digest > override.
  let status: L14LiveControlStatus = L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED;
  let quietEffect: L14QuietHoursEffectClass = L14QuietHoursEffectClass.NOT_ACTIVE;
  let freqEffect: L14FrequencyEffectClass = L14FrequencyEffectClass.BELOW_CAP;
  let digestEffect: L14DigestEffectClass = L14DigestEffectClass.NO_DIGEST_EFFECT;
  let overrideEffect: L14SeverityOverrideEffectClass = L14SeverityOverrideEffectClass.NO_OVERRIDE;

  // Rollout block (channel or alert class).
  const channelLive = input.channel_rollout.rollout_status === L14LiveRolloutStatus.PRODUCTION_ENABLED ||
    input.channel_rollout.rollout_status === L14LiveRolloutStatus.LIMITED_OPT_IN;
  const alertLive = input.alert_class_rollout.rollout_status === L14LiveRolloutStatus.PRODUCTION_ENABLED ||
    input.alert_class_rollout.rollout_status === L14LiveRolloutStatus.LIMITED_OPT_IN;
  if (!channelLive || !alertLive) {
    status = L14LiveControlStatus.DELIVERY_BLOCKED_BY_ROLLOUT_POLICY;
  }

  // User channel mute.
  if (status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED &&
      input.preference_snapshot.resolved_muted_channels.includes(input.candidate_channel)) {
    status = L14LiveControlStatus.DELIVERY_BLOCKED_BY_USER_CONTROL;
  }

  // User alert class mute.
  if (status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED &&
      input.preference_snapshot.resolved_muted_alert_classes.includes(input.candidate_alert_class_ref)) {
    status = L14LiveControlStatus.DELIVERY_BLOCKED_BY_USER_CONTROL;
  }

  // Override determination — only applies if not blocked by user/rollout.
  const overrideEligible = !!input.severity_override_policy &&
    input.severity_override_policy.eligible_priority_classes.includes(input.candidate_priority_class) &&
    input.severity_override_policy.eligible_alert_class_refs.includes(input.candidate_alert_class_ref);
  const overrideUsable = status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED &&
    input.channel_rollout.rollout_status === L14LiveRolloutStatus.PRODUCTION_ENABLED &&
    overrideEligible;

  // Quiet hours.
  if (status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED && input.preference_snapshot.quiet_hours_active) {
    const digestDuringQuiet = input.preference_snapshot.digest_preference === L14DigestPreferenceClass.QUIET_HOURS_DIGEST ||
      input.digest_policy.downgrade_during_quiet_hours;
    if (input.override_requested && overrideUsable && input.severity_override_policy?.may_bypass_quiet_hours) {
      quietEffect = L14QuietHoursEffectClass.ACTIVE_BYPASSED_BY_POLICY_OVERRIDE;
      overrideEffect = L14SeverityOverrideEffectClass.OVERRIDE_APPLIED_LEGALLY;
    } else if (digestDuringQuiet) {
      quietEffect = L14QuietHoursEffectClass.ACTIVE_ALLOW_DIGEST;
      digestEffect = L14DigestEffectClass.DIGEST_BY_QUIET_HOURS;
      status = L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED;
    } else {
      quietEffect = L14QuietHoursEffectClass.ACTIVE_BLOCK_IMMEDIATE;
      status = L14LiveControlStatus.SUPPRESSION_REQUIRED;
    }
  }

  // Frequency caps.
  if (status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED) {
    const cap = input.user_custom_cap ?? input.frequency_policy.default_max_alerts_per_window;
    if (input.observed_alert_count_in_window >= cap) {
      if (input.override_requested && overrideUsable && input.severity_override_policy?.may_bypass_frequency_caps) {
        freqEffect = L14FrequencyEffectClass.CAP_BYPASSED_BY_POLICY_OVERRIDE;
        overrideEffect = L14SeverityOverrideEffectClass.OVERRIDE_APPLIED_LEGALLY;
      } else if (input.digest_policy.downgrade_when_frequency_cap_hit) {
        freqEffect = L14FrequencyEffectClass.CAP_REACHED_DIGEST_DOWNGRADE;
        digestEffect = L14DigestEffectClass.DIGEST_BY_FREQUENCY_CAP;
        status = L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED;
      } else {
        freqEffect = L14FrequencyEffectClass.CAP_REACHED_SUPPRESS;
        status = L14LiveControlStatus.SUPPRESSION_REQUIRED;
      }
    }
  }

  // Digest by user preference if still immediate.
  if (status === L14LiveControlStatus.IMMEDIATE_DELIVERY_ALLOWED &&
      input.preference_snapshot.digest_preference === L14DigestPreferenceClass.DIGEST_ONLY) {
    digestEffect = L14DigestEffectClass.DIGEST_BY_USER_PREFERENCE;
    status = L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED;
  }

  // Override requested but rejected (status forced override but ineligible).
  if (input.override_requested && overrideEffect === L14SeverityOverrideEffectClass.NO_OVERRIDE && !overrideUsable) {
    overrideEffect = L14SeverityOverrideEffectClass.OVERRIDE_REQUESTED_BUT_REJECTED;
  }

  const replayHash = fnv1a([
    input.source_delivery_candidate_ref, input.preference_snapshot.preference_snapshot_id,
    input.channel_rollout.channel_rollout_policy_id, input.alert_class_rollout.alert_class_rollout_policy_id,
    input.frequency_policy.delivery_frequency_policy_id,
    quietEffect, freqEffect, digestEffect, overrideEffect, status, POLICY_V,
  ].join('|'));
  return {
    live_delivery_control_decision_id: `l14.live.decision.${replayHash}`,
    source_delivery_candidate_ref: input.source_delivery_candidate_ref,
    preference_snapshot_ref: input.preference_snapshot.preference_snapshot_id,
    channel_rollout_policy_ref: input.channel_rollout.channel_rollout_policy_id,
    alert_class_rollout_policy_ref: input.alert_class_rollout.alert_class_rollout_policy_id,
    frequency_policy_ref: input.frequency_policy.delivery_frequency_policy_id,
    quiet_hours_effect: quietEffect,
    frequency_effect: freqEffect,
    digest_effect: digestEffect,
    severity_override_effect: overrideEffect,
    final_live_control_status: status,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Experiment engines ───────────────────────────────────────────

export function isL14ExperimentSurfaceLegalForClass(
  cls: L14ExperimentClass,
  surface: L14AllowedExperimentSurface,
): boolean {
  return L14_EXPERIMENT_CLASS_ALLOWED_SURFACES[cls].includes(surface);
}

export function buildL14DeliveryExperiment(input: {
  experiment_class: L14ExperimentClass;
  allowed_variation_surface: L14AllowedExperimentSurface;
  sample_policy_ref: string;
  evaluation_metric_classes: readonly L14ExperimentMetricClass[];
  rollout_status: L14ExperimentRolloutStatus;
}): L14DeliveryExperiment {
  const id = `l14.live.experiment.${fnv1a([
    input.experiment_class, input.allowed_variation_surface, input.sample_policy_ref,
    input.evaluation_metric_classes.slice().sort().join(','), input.rollout_status, POLICY_V,
  ].join('|'))}`;
  return {
    experiment_id: id,
    experiment_class: input.experiment_class,
    allowed_variation_surface: input.allowed_variation_surface,
    prohibited_truth_mutation: true,
    prohibited_safety_mutation: true,
    prohibited_grounding_mutation: true,
    prohibited_contradiction_disclosure_mutation: true,
    prohibited_restriction_mutation: true,
    sample_policy_ref: input.sample_policy_ref,
    evaluation_metric_refs: input.evaluation_metric_classes.map(m => `l14.live.metric.${m}`),
    rollout_status: input.rollout_status,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14ExperimentSamplePolicy(input: {
  deterministic_bucket_salt_ref: string;
  eligible_audience_classes: readonly L14AudienceClass[];
  eligible_channels: readonly L14DeliveryChannel[];
  max_exposure_percentage: number;
  holdout_percentage: number;
  require_user_opt_in_for_experiment: boolean;
}): L14ExperimentSamplePolicy {
  const id = `l14.live.experiment.sample.${fnv1a([
    input.deterministic_bucket_salt_ref,
    input.eligible_audience_classes.slice().sort().join(','),
    input.eligible_channels.slice().sort().join(','),
    String(input.max_exposure_percentage), String(input.holdout_percentage),
    String(input.require_user_opt_in_for_experiment), POLICY_V,
  ].join('|'))}`;
  return {
    sample_policy_id: id,
    ...input,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// Deterministic bucket assignment: 0-99 bucket from fnv1a(salt + user_id_hash).
export function assignL14ExperimentVariant(input: {
  experiment: L14DeliveryExperiment;
  sample: L14ExperimentSamplePolicy;
  user_id_hash: string;
  variant_refs: readonly string[];
  assigned_at: string;
}): L14ExperimentAssignment {
  const bucketHash = fnv1a([input.sample.deterministic_bucket_salt_ref, input.user_id_hash].join('|'));
  // Parse the first 8 hex chars and mod 100.
  const bucket = parseInt(bucketHash.substring(0, 8), 16) % 100;
  const holdoutThreshold = Math.max(0, Math.min(100, Math.floor(input.sample.holdout_percentage)));
  const exposureThreshold = Math.max(holdoutThreshold,
    Math.min(100, holdoutThreshold + Math.floor(input.sample.max_exposure_percentage)));
  const holdout = bucket < holdoutThreshold;
  let variant: string;
  if (holdout) {
    variant = 'HOLDOUT';
  } else if (bucket < exposureThreshold && input.variant_refs.length > 0) {
    const idx = (bucket - holdoutThreshold) % input.variant_refs.length;
    variant = input.variant_refs[idx];
  } else {
    variant = 'CONTROL';
  }
  const id = `l14.live.experiment.assign.${fnv1a([
    input.experiment.experiment_id, input.user_id_hash, variant,
    String(holdout), input.assigned_at, POLICY_V,
  ].join('|'))}`;
  return {
    experiment_assignment_id: id,
    experiment_ref: input.experiment.experiment_id,
    user_id_hash: input.user_id_hash,
    assigned_variant_ref: variant,
    assignment_basis: 'DETERMINISTIC_HASH_BUCKET',
    holdout_assigned: holdout,
    assigned_at: input.assigned_at,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14ExperimentExposureRecord(input: {
  experiment_ref: string;
  assignment_ref: string;
  exposure_surface: L14AllowedExperimentSurface;
  variant_ref: string;
  occurred_at: string;
  source_delivery_payload_ref?: string;
  source_dashboard_component_ref?: string;
  source_digest_ref?: string;
}): L14ExperimentExposureRecord {
  const id = `l14.live.experiment.exposure.${fnv1a([
    input.experiment_ref, input.assignment_ref, input.exposure_surface,
    input.variant_ref, input.occurred_at,
    input.source_delivery_payload_ref ?? '', input.source_dashboard_component_ref ?? '',
    input.source_digest_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    experiment_exposure_id: id,
    experiment_ref: input.experiment_ref,
    assignment_ref: input.assignment_ref,
    exposure_surface: input.exposure_surface,
    variant_ref: input.variant_ref,
    source_delivery_payload_ref: input.source_delivery_payload_ref,
    source_dashboard_component_ref: input.source_dashboard_component_ref,
    source_digest_ref: input.source_digest_ref,
    occurred_at: input.occurred_at,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Operational governance engines ───────────────────────────────

const SIGNAL_TO_PLAYBOOK: Readonly<Record<L14OperationalSignalClass, L14OperationalPlaybookClass>> = {
  [L14OperationalSignalClass.CHANNEL_HEALTH_DEGRADED]: L14OperationalPlaybookClass.TELEGRAM_FAILURE_PLAYBOOK,
  [L14OperationalSignalClass.TELEGRAM_FAILURE_SPIKE]: L14OperationalPlaybookClass.TELEGRAM_FAILURE_PLAYBOOK,
  [L14OperationalSignalClass.DELIVERY_QUEUE_BACKLOG]: L14OperationalPlaybookClass.DELIVERY_BACKLOG_PLAYBOOK,
  [L14OperationalSignalClass.ALERT_SPIKE_DETECTED]: L14OperationalPlaybookClass.ALERT_SPIKE_PLAYBOOK,
  [L14OperationalSignalClass.MUTED_ALERT_RATIO_ELEVATED]: L14OperationalPlaybookClass.MUTED_ALERT_RATIO_PLAYBOOK,
  [L14OperationalSignalClass.FALSE_POSITIVE_WATCHLIST_TRIGGERED]: L14OperationalPlaybookClass.FALSE_POSITIVE_WATCHLIST_PLAYBOOK,
  [L14OperationalSignalClass.CALIBRATION_REVIEW_BACKLOG_ELEVATED]: L14OperationalPlaybookClass.CALIBRATION_REVIEW_BACKLOG_PLAYBOOK,
  [L14OperationalSignalClass.HIGH_RISK_REGIME_ALERT_OVERLOAD]: L14OperationalPlaybookClass.HIGH_RISK_REGIME_ALERT_OVERLOAD_PLAYBOOK,
};

const SIGNAL_TO_INCIDENT: Readonly<Record<L14OperationalSignalClass, L14OperationalIncidentClass>> = {
  [L14OperationalSignalClass.CHANNEL_HEALTH_DEGRADED]: L14OperationalIncidentClass.TELEGRAM_OUTAGE,
  [L14OperationalSignalClass.TELEGRAM_FAILURE_SPIKE]: L14OperationalIncidentClass.TELEGRAM_OUTAGE,
  [L14OperationalSignalClass.DELIVERY_QUEUE_BACKLOG]: L14OperationalIncidentClass.DELIVERY_BACKLOG_RISK,
  [L14OperationalSignalClass.ALERT_SPIKE_DETECTED]: L14OperationalIncidentClass.ALERT_SPAM_RISK,
  [L14OperationalSignalClass.MUTED_ALERT_RATIO_ELEVATED]: L14OperationalIncidentClass.MUTED_ALERT_RATE_RISK,
  [L14OperationalSignalClass.FALSE_POSITIVE_WATCHLIST_TRIGGERED]: L14OperationalIncidentClass.FALSE_POSITIVE_REVIEW_RISK,
  [L14OperationalSignalClass.CALIBRATION_REVIEW_BACKLOG_ELEVATED]: L14OperationalIncidentClass.CALIBRATION_QUEUE_STALL,
  [L14OperationalSignalClass.HIGH_RISK_REGIME_ALERT_OVERLOAD]: L14OperationalIncidentClass.HIGH_RISK_REGIME_ALERT_OVERLOAD_RISK,
};

export function getL14PlaybookClassForSignal(s: L14OperationalSignalClass): L14OperationalPlaybookClass {
  return SIGNAL_TO_PLAYBOOK[s];
}

export function getL14IncidentClassForSignal(s: L14OperationalSignalClass): L14OperationalIncidentClass {
  return SIGNAL_TO_INCIDENT[s];
}

export function buildL14OperationalSignalRecord(input: {
  signal_class: L14OperationalSignalClass;
  observed_window_start: string;
  observed_window_end: string;
  source_read_surface_refs: readonly string[];
  source_metric_refs: readonly string[];
  severity_class: L14OperationalSignalSeverityClass;
}): L14OperationalSignalRecord {
  const playbookCls = SIGNAL_TO_PLAYBOOK[input.signal_class];
  const id = `l14.live.signal.${fnv1a([
    input.signal_class, input.observed_window_start, input.observed_window_end,
    input.source_read_surface_refs.slice().sort().join(','),
    input.source_metric_refs.slice().sort().join(','),
    input.severity_class, playbookCls, POLICY_V,
  ].join('|'))}`;
  return {
    operational_signal_id: id,
    signal_class: input.signal_class,
    observed_window_start: input.observed_window_start,
    observed_window_end: input.observed_window_end,
    source_read_surface_refs: input.source_read_surface_refs,
    source_metric_refs: input.source_metric_refs,
    severity_class: input.severity_class,
    recommended_playbook_ref: `l14.live.playbook.${playbookCls}`,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14OperationalIncidentRecord(input: {
  signal: L14OperationalSignalRecord;
  opened_at: string;
  affected_channel_refs: readonly L14DeliveryChannel[];
  affected_alert_class_refs: readonly string[];
  analyst_owner_ref?: string;
}): L14OperationalIncidentRecord {
  const cls = SIGNAL_TO_INCIDENT[input.signal.signal_class];
  const playbook = SIGNAL_TO_PLAYBOOK[input.signal.signal_class];
  const id = `l14.live.incident.${fnv1a([
    cls, input.signal.operational_signal_id, input.opened_at,
    input.affected_channel_refs.slice().sort().join(','),
    input.affected_alert_class_refs.slice().sort().join(','),
    input.analyst_owner_ref ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    operational_incident_id: id,
    incident_class: cls,
    trigger_signal_ref: input.signal.operational_signal_id,
    opened_at: input.opened_at,
    current_status: L14OperationalIncidentStatus.OPEN,
    affected_channel_refs: input.affected_channel_refs,
    affected_alert_class_refs: input.affected_alert_class_refs,
    recommended_playbook_ref: `l14.live.playbook.${playbook}`,
    analyst_owner_ref: input.analyst_owner_ref,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14OperationalDashboardSnapshot(input: {
  dashboard_class: L14OperationalDashboardClass;
  observed_window_start: string;
  observed_window_end: string;
  source_read_surface_refs: readonly string[];
  current_status: L14OperationalDashboardStatus;
  threshold_breach_refs?: readonly string[];
  recommended_playbook_refs?: readonly string[];
}): L14OperationalDashboardSnapshot {
  const id = `l14.live.dashboard.${fnv1a([
    input.dashboard_class, input.observed_window_start, input.observed_window_end,
    input.source_read_surface_refs.slice().sort().join(','),
    input.current_status,
    (input.threshold_breach_refs ?? []).slice().sort().join(','),
    (input.recommended_playbook_refs ?? []).slice().sort().join(','), POLICY_V,
  ].join('|'))}`;
  return {
    operational_dashboard_snapshot_id: id,
    dashboard_class: input.dashboard_class,
    observed_window_start: input.observed_window_start,
    observed_window_end: input.observed_window_end,
    source_read_surface_refs: input.source_read_surface_refs,
    current_status: input.current_status,
    threshold_breach_refs: input.threshold_breach_refs ?? [],
    recommended_playbook_refs: input.recommended_playbook_refs ?? [],
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

export function buildL14OperationalPlaybook(input: {
  playbook_class: L14OperationalPlaybookClass;
  trigger_signal_classes: readonly L14OperationalSignalClass[];
  allowed_mitigation_actions: readonly L14OperationalMitigationActionClass[];
  may_pause_rollout: boolean;
  may_downgrade_to_digest: boolean;
  may_trigger_analyst_review: boolean;
  may_open_calibration_review: boolean;
}): L14OperationalPlaybook {
  // Prohibited actions are constitutional and identical for all playbooks.
  const prohibited: readonly L14OperationalProhibitedActionClass[] = [
    L14OperationalProhibitedActionClass.ALTER_LOWER_LAYER_TRUTH,
    L14OperationalProhibitedActionClass.SUPPRESS_REQUIRED_DISCLOSURES,
    L14OperationalProhibitedActionClass.OVERRIDE_USER_MUTES,
    L14OperationalProhibitedActionClass.OVERRIDE_CHANNEL_RESERVED_STATUS,
    L14OperationalProhibitedActionClass.MUTATE_HISTORICAL_DELIVERY_FACTS,
    L14OperationalProhibitedActionClass.ALTER_EXPERIMENT_RESULTS,
  ];
  const id = `l14.live.playbook.${input.playbook_class}.${fnv1a([
    input.trigger_signal_classes.slice().sort().join(','),
    input.allowed_mitigation_actions.slice().sort().join(','),
    String(input.may_pause_rollout), String(input.may_downgrade_to_digest),
    String(input.may_trigger_analyst_review), String(input.may_open_calibration_review),
    POLICY_V,
  ].join('|'))}`;
  return {
    operational_playbook_id: id,
    playbook_class: input.playbook_class,
    trigger_signal_classes: input.trigger_signal_classes,
    allowed_mitigation_actions: input.allowed_mitigation_actions,
    may_pause_rollout: input.may_pause_rollout,
    may_downgrade_to_digest: input.may_downgrade_to_digest,
    may_trigger_analyst_review: input.may_trigger_analyst_review,
    may_open_calibration_review: input.may_open_calibration_review,
    prohibited_actions: prohibited,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Analyst action builder ───────────────────────────────────────

export interface L14AnalystOperationalActionInput {
  readonly action_class: L14AnalystOperationalActionClass;
  readonly analyst_ref: string;
  readonly subject_incident_ref?: string;
  readonly subject_rollout_policy_ref?: string;
  readonly subject_proposal_ref?: string;
  readonly action_summary: string;
  readonly governed_result_ref?: string;
  readonly intent_mutate_lower_layer?: boolean;
  readonly intent_mutate_history?: boolean;
  readonly intent_bypass_user_preference?: boolean;
}

export function buildL14AnalystOperationalActionRecord(input: L14AnalystOperationalActionInput): L14AnalystOperationalActionRecord {
  const id = `l14.live.analyst.action.${fnv1a([
    input.action_class, input.analyst_ref,
    input.subject_incident_ref ?? '', input.subject_rollout_policy_ref ?? '',
    input.subject_proposal_ref ?? '', input.action_summary,
    input.governed_result_ref ?? '',
    String(input.intent_mutate_lower_layer === true),
    String(input.intent_mutate_history === true),
    String(input.intent_bypass_user_preference === true),
    POLICY_V,
  ].join('|'))}`;
  return {
    analyst_operational_action_id: id,
    action_class: input.action_class,
    analyst_ref: input.analyst_ref,
    subject_incident_ref: input.subject_incident_ref,
    subject_rollout_policy_ref: input.subject_rollout_policy_ref,
    subject_proposal_ref: input.subject_proposal_ref,
    action_summary: input.action_summary,
    governed_result_ref: input.governed_result_ref,
    lower_layer_mutation_attempted: false,
    historical_truth_mutation_attempted: false,
    user_preference_bypass_attempted: false,
    lineage_refs: ['l14.live.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// Preserve intent flags as separate signal back to the validator.
export interface L14AnalystActionIntentSignal {
  readonly intent_mutate_lower_layer: boolean;
  readonly intent_mutate_history: boolean;
  readonly intent_bypass_user_preference: boolean;
}

export function intentFromAnalystInput(input: L14AnalystOperationalActionInput): L14AnalystActionIntentSignal {
  return {
    intent_mutate_lower_layer: input.intent_mutate_lower_layer === true,
    intent_mutate_history: input.intent_mutate_history === true,
    intent_bypass_user_preference: input.intent_bypass_user_preference === true,
  };
}
