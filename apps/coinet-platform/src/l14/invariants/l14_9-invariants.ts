/**
 * L14.9 — Live Operations Invariants
 *
 * §14.9.58 — INV-14.9-A through INV-14.9-L.
 */

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
} from '../contracts/l14-rollout-governance';
import {
  L14DigestPreferenceClass,
  L14Weekday,
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
} from '../contracts/l14-frequency-governance';
import {
  L14AllowedExperimentSurface,
  L14ExperimentClass,
  L14ExperimentMetricClass,
  L14ExperimentRolloutStatus,
} from '../contracts/l14-experiment-governance';
import {
  L14OperationalDashboardClass,
  L14OperationalDashboardStatus,
  L14OperationalMitigationActionClass,
  L14OperationalPlaybookClass,
  L14OperationalProhibitedActionClass,
  L14OperationalSignalClass,
  L14OperationalSignalSeverityClass,
} from '../contracts/l14-operational-governance';
import { L14AnalystOperationalActionClass } from '../contracts/l14-analyst-operations';
import {
  assignL14ExperimentVariant,
  buildL14AlertClassRolloutPolicy,
  buildL14AnalystOperationalActionRecord,
  buildL14ChannelRolloutPolicy,
  buildL14ClusterMergePolicy,
  buildL14DeduplicationLivePolicy,
  buildL14DeliveryExperiment,
  buildL14DeliveryFrequencyPolicy,
  buildL14DeliveryPreferenceProfile,
  buildL14DeliveryPreferenceSnapshot,
  buildL14DigestDowngradePolicy,
  buildL14ExperimentSamplePolicy,
  buildL14OperationalDashboardSnapshot,
  buildL14OperationalIncidentRecord,
  buildL14OperationalPlaybook,
  buildL14OperationalSignalRecord,
  buildL14PushEnablementGate,
  buildL14QuietHoursProfile,
  buildL14SeverityOverridePolicy,
  buildL14TelegramDeliveryGate,
  decideL14LiveDeliveryControl,
  getL14IncidentClassForSignal,
  getL14PlaybookClassForSignal,
  intentFromAnalystInput,
  isL14ExperimentSurfaceLegalForClass,
  isL14RolloutTransitionLegal,
} from '../operations/l14-live-operations-engines';
import {
  validateL14AnalystOperationalActionRecord,
  validateL14ChannelRolloutPolicy,
  validateL14DeliveryExperiment,
  validateL14DeliveryPreferenceProfile,
  validateL14DeliveryPreferenceSnapshot,
  validateL14ExperimentAssignment,
  validateL14ExperimentMetric,
  validateL14LiveDeliveryControlDecision,
  validateL14OperationalIncidentRecord,
  validateL14OperationalPlaybook,
  validateL14OperationalSignalRecord,
  validateL14PushEnablementGate,
  validateL14QuietHoursProfile,
  validateL14SeverityOverrideAlertEligibility,
  validateL14TelegramDeliveryGate,
} from '../validation/l14-live-operations.validators';

export interface L14_9InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_9InvariantResult {
  return { id, name, holds, evidence };
}

// ── Fixture helpers ──────────────────────────────────────────────

function channelRollout(channel = L14DeliveryChannel.TELEGRAM, status = L14LiveRolloutStatus.PRODUCTION_ENABLED) {
  return buildL14ChannelRolloutPolicy({
    channel,
    rollout_status: status,
    enabled_audience_classes: [L14AudienceClass.END_USER],
    // BTAR-TC-001: STATE_SHIFT_ALERT / SCENARIO_TRIGGER_ALERT do not exist on L14DeliveryClass;
    // mapped to existing alert delivery classes per canonical contract.
    allowed_delivery_classes: [L14DeliveryClass.ALERT_NOTIFICATION, L14DeliveryClass.ALERT_DIGEST_ITEM],
    allowed_alert_class_refs: ['l13.alert.fragility'],
    channel_health_minimum_class: L14ChannelHealthClass.HEALTHY,
    requires_user_opt_in: channel === L14DeliveryChannel.TELEGRAM,
    requires_explicit_channel_linking: channel === L14DeliveryChannel.TELEGRAM,
    rollback_policy_ref: 'l14.live.rollback.policy.v1',
  });
}

function alertClassRollout(status = L14LiveRolloutStatus.PRODUCTION_ENABLED) {
  return buildL14AlertClassRolloutPolicy({
    alert_class_ref: 'l13.alert.fragility',
    rollout_status: status,
    eligible_channels: [L14DeliveryChannel.TELEGRAM, L14DeliveryChannel.DASHBOARD],
    minimum_priority_class: L14DeliveryPriorityClass.MATERIAL,
    minimum_urgency_class: L14DeliveryUrgencyClass.NEAR_REAL_TIME,
    digest_eligible: true,
    allowed_user_scope_classes: [L14AudienceClass.END_USER],
  });
}

function preferenceProfile(overrides: Partial<{
  enabled_channels: readonly L14DeliveryChannel[];
  muted_channels: readonly L14DeliveryChannel[];
  enabled_alert_classes: readonly string[];
  muted_alert_classes: readonly string[];
  quiet_hours_profile: ReturnType<typeof buildL14QuietHoursProfile>;
  max_alerts_per_window: number;
  digest_preference: L14DigestPreferenceClass;
}> = {}) {
  return buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.hash.1',
    enabled_channels: overrides.enabled_channels ?? [L14DeliveryChannel.TELEGRAM, L14DeliveryChannel.DASHBOARD],
    muted_channels: overrides.muted_channels ?? [],
    enabled_alert_classes: overrides.enabled_alert_classes ?? ['l13.alert.fragility'],
    muted_alert_classes: overrides.muted_alert_classes ?? [],
    watchlist_scope_refs: ['l11.subject.btc'],
    quiet_hours_profile: overrides.quiet_hours_profile,
    max_alerts_per_window: overrides.max_alerts_per_window ?? 10,
    digest_preference: overrides.digest_preference ?? L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
}

function quietHoursProfile() {
  return buildL14QuietHoursProfile({
    timezone_ref: 'Europe/Berlin',
    quiet_hours_start_local: '22:00',
    quiet_hours_end_local: '07:00',
    active_weekday_mask: [L14Weekday.MONDAY, L14Weekday.TUESDAY, L14Weekday.WEDNESDAY,
      L14Weekday.THURSDAY, L14Weekday.FRIDAY, L14Weekday.SATURDAY, L14Weekday.SUNDAY],
    digest_during_quiet_hours: true,
  });
}

function digestPolicy() {
  return buildL14DigestDowngradePolicy({
    low_priority_digest_enabled: true,
    routine_priority_digest_enabled: true,
    material_priority_digest_enabled_under_cap_pressure: true,
    downgrade_during_quiet_hours: true,
    downgrade_when_channel_health_degraded: true,
    downgrade_when_frequency_cap_hit: true,
    downgrade_when_alert_class_noisy_limited: true,
  });
}

function freqPolicy() {
  const dedup = buildL14DeduplicationLivePolicy({
    duplicate_window_minutes: 5,
    duplicate_basis_classes: [L14DuplicateBasisClass.SAME_DELIVERY_ARTIFACT, L14DuplicateBasisClass.SAME_ALERT_CLASS_SAME_SUBJECT],
    allow_cross_channel_deduplication: false,
    allow_cross_alert_class_deduplication: false,
  });
  const merge = buildL14ClusterMergePolicy({
    merge_window_minutes: 15,
    merge_basis_classes: [L14ClusterMergeBasisClass.SAME_SUBJECT, L14ClusterMergeBasisClass.SAME_ALERT_CLASS],
    maximum_cluster_size: 5,
    digest_if_cluster_size_exceeds_threshold: true,
    immediate_delivery_if_any_member_is_critical: true,
  });
  return buildL14DeliveryFrequencyPolicy({
    alert_frequency_window: L14AlertFrequencyWindowClass.ONE_HOUR,
    default_max_alerts_per_window: 3,
    deduplication_policy_ref: dedup.deduplication_live_policy_id,
    cluster_merge_policy_ref: merge.cluster_merge_policy_id,
    digest_downgrade_policy_ref: digestPolicy().digest_downgrade_policy_id,
  });
}

function severityPolicy() {
  return buildL14SeverityOverridePolicy({
    eligible_priority_classes: [L14DeliveryPriorityClass.CRITICAL, L14DeliveryPriorityClass.HIGH],
    eligible_alert_class_refs: ['l13.alert.fragility'],
    may_bypass_quiet_hours: true,
    may_bypass_frequency_caps: true,
    may_bypass_digest_downgrade: false,
  });
}

// ── INV-14.9-A : Rollout status legality ─────────────────────────

export function checkINV_149_A(): L14_9InvariantResult {
  const okLegit = isL14RolloutTransitionLegal(L14LiveRolloutStatus.LIMITED_OPT_IN, L14LiveRolloutStatus.PRODUCTION_ENABLED);
  const badJump = !isL14RolloutTransitionLegal(L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE, L14LiveRolloutStatus.PRODUCTION_ENABLED);
  const sameAllowed = isL14RolloutTransitionLegal(L14LiveRolloutStatus.PRODUCTION_ENABLED, L14LiveRolloutStatus.PRODUCTION_ENABLED);
  const allHaveTransitions = Object.values(L14LiveRolloutStatus).every(s => L14_ROLLOUT_TRANSITIONS[s] !== undefined);
  const p = channelRollout();
  const v = validateL14ChannelRolloutPolicy(p);
  return inv('INV-14.9-A', 'rollout status legality',
    okLegit && badJump && sameAllowed && allHaveTransitions && v.clean,
    `okLegit=${okLegit} reservedJumpBlocked=${badJump} sameAllowed=${sameAllowed} legitClean=${v.clean}`);
}

// ── INV-14.9-B : Reserved push non-enablement ────────────────────

export function checkINV_149_B(): L14_9InvariantResult {
  const reserved = buildL14PushEnablementGate({
    current_rollout_status: L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE,
    upstream_channel_registry_certified_for_production: false,
  });
  // Adversarial: forge production_enablement_allowed=true.
  const forged = { ...reserved, production_enablement_allowed: true };
  const vReserved = validateL14PushEnablementGate(reserved);
  const vForged = validateL14PushEnablementGate(forged);
  // Adversarial: forge status to PRODUCTION_ENABLED.
  const forgedStatus = { ...reserved, current_rollout_status: L14LiveRolloutStatus.PRODUCTION_ENABLED };
  const vForgedStatus = validateL14PushEnablementGate(forgedStatus);
  return inv('INV-14.9-B', 'reserved push non-enablement',
    reserved.production_enablement_allowed === false &&
    vReserved.clean && !vForged.clean && !vForgedStatus.clean,
    `defaultBlocked=${reserved.production_enablement_allowed === false} forgedAllowedRejected=${!vForged.clean} forgedStatusRejected=${!vForgedStatus.clean}`);
}

// ── INV-14.9-C : Telegram delivery gate ──────────────────────────

export function checkINV_149_C(): L14_9InvariantResult {
  const ch = channelRollout();
  const gate = buildL14TelegramDeliveryGate({
    channel_rollout_policy_ref: ch.channel_rollout_policy_id,
    bot_integration_ref: 'l14.telegram.bot.v1',
    bot_health_required_class: L14ChannelHealthClass.HEALTHY,
    digest_fallback_allowed: true,
    retry_allowed: true,
    max_retry_attempts: 3,
  });
  const v = validateL14TelegramDeliveryGate(gate);
  // Adversarial: forge opt-in off and missing binding.
  const forged = { ...gate, user_opt_in_required: false as any, bot_integration_ref: '' };
  const vForged = validateL14TelegramDeliveryGate(forged);
  return inv('INV-14.9-C', 'Telegram delivery gate',
    v.clean && !vForged.clean &&
    (gate.user_opt_in_required as unknown) === true &&
    (gate.valid_chat_binding_required as unknown) === true,
    `legit=${v.clean} forgedRejected=${!vForged.clean}`);
}

// ── INV-14.9-D : User preference precedence ──────────────────────

export function checkINV_149_D(): L14_9InvariantResult {
  // Muted channel takes precedence over rollout enabled.
  const profile = preferenceProfile({ muted_channels: [L14DeliveryChannel.TELEGRAM] });
  const snap = buildL14DeliveryPreferenceSnapshot({
    profile, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false,
  });
  const decision = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.D',
    preference_snapshot: snap,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  // Even with override available, mute wins.
  const decisionOverride = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.D2',
    preference_snapshot: snap,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    severity_override_policy: severityPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.CRITICAL,
    observed_alert_count_in_window: 0,
    override_requested: true,
  });
  return inv('INV-14.9-D', 'user preference precedence',
    decision.final_live_control_status === L14LiveControlStatus.DELIVERY_BLOCKED_BY_USER_CONTROL &&
    decisionOverride.final_live_control_status === L14LiveControlStatus.DELIVERY_BLOCKED_BY_USER_CONTROL,
    `muteBlocks=${decision.final_live_control_status} muteOverrideStill=${decisionOverride.final_live_control_status}`);
}

// ── INV-14.9-E : Quiet hours / freq caps cannot be bypassed ad hoc ──

export function checkINV_149_E(): L14_9InvariantResult {
  const qh = quietHoursProfile();
  const profile = preferenceProfile({ quiet_hours_profile: qh });
  const snap = buildL14DeliveryPreferenceSnapshot({
    profile, captured_at: '2026-05-15T23:30:00Z', quiet_hours_active: true,
  });
  // No override → digest.
  const noOverride = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.E1',
    preference_snapshot: snap,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  // With override on eligible alert → applied legally.
  const withOverride = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.E2',
    preference_snapshot: snap,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    severity_override_policy: severityPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.CRITICAL,
    observed_alert_count_in_window: 0,
    override_requested: true,
  });
  // Override on ineligible alert class.
  const vReject = validateL14SeverityOverrideAlertEligibility(severityPolicy(), 'l13.alert.unrelated', true);
  return inv('INV-14.9-E', 'quiet hours / freq cap bypass discipline',
    noOverride.final_live_control_status === L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED &&
    withOverride.severity_override_effect === L14SeverityOverrideEffectClass.OVERRIDE_APPLIED_LEGALLY &&
    !vReject.clean,
    `noOverride=${noOverride.final_live_control_status} withOverride=${withOverride.severity_override_effect} ineligibleRejected=${!vReject.clean}`);
}

// ── INV-14.9-F : Digest downgrade honesty ───────────────────────

export function checkINV_149_F(): L14_9InvariantResult {
  // User-only digest.
  const profile = preferenceProfile({ digest_preference: L14DigestPreferenceClass.DIGEST_ONLY });
  const snap = buildL14DeliveryPreferenceSnapshot({
    profile, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false,
  });
  const decision = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.F',
    preference_snapshot: snap,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.MATERIAL,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  const isDigest = decision.digest_effect === L14DigestEffectClass.DIGEST_BY_USER_PREFERENCE &&
    decision.final_live_control_status === L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED;
  // Frequency cap → digest.
  const profile2 = preferenceProfile();
  const snap2 = buildL14DeliveryPreferenceSnapshot({
    profile: profile2, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false,
  });
  const decision2 = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.F2',
    preference_snapshot: snap2,
    channel_rollout: channelRollout(),
    alert_class_rollout: alertClassRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.MATERIAL,
    observed_alert_count_in_window: 99,
    override_requested: false,
  });
  const isFreqDigest = decision2.digest_effect === L14DigestEffectClass.DIGEST_BY_FREQUENCY_CAP &&
    decision2.frequency_effect === L14FrequencyEffectClass.CAP_REACHED_DIGEST_DOWNGRADE;
  return inv('INV-14.9-F', 'digest downgrade honesty',
    isDigest && isFreqDigest,
    `userDigest=${isDigest} freqDigest=${isFreqDigest}`);
}

// ── INV-14.9-G : Experiment non-corruption ──────────────────────

export function checkINV_149_G(): L14_9InvariantResult {
  const ex = buildL14DeliveryExperiment({
    experiment_class: L14ExperimentClass.ALERT_COPY_FORMAT,
    allowed_variation_surface: L14AllowedExperimentSurface.COPY_CONCISION_PROFILE,
    sample_policy_ref: 'l14.live.experiment.sample.x',
    evaluation_metric_classes: [L14ExperimentMetricClass.OPEN_RATE],
    rollout_status: L14ExperimentRolloutStatus.LIMITED_LIVE,
  });
  const vOk = validateL14DeliveryExperiment(ex);
  // Wrong surface for class.
  const exWrong = { ...ex, allowed_variation_surface: L14AllowedExperimentSurface.DELIVERY_TIMING_OFFSET };
  const vWrong = validateL14DeliveryExperiment(exWrong);
  // Attempts.
  const vTruth = validateL14DeliveryExperiment(ex, { truth_mutation_attempt: true });
  const vSafety = validateL14DeliveryExperiment(ex, { safety_mutation_attempt: true });
  const vGrounding = validateL14DeliveryExperiment(ex, { grounding_mutation_attempt: true });
  const vDisclosure = validateL14DeliveryExperiment(ex, { disclosure_mutation_attempt: true });
  return inv('INV-14.9-G', 'experiment non-corruption',
    vOk.clean && !vWrong.clean && !vTruth.clean && !vSafety.clean && !vGrounding.clean && !vDisclosure.clean &&
    (ex.prohibited_truth_mutation as unknown) === true,
    `ok=${vOk.clean} wrongSurface=${!vWrong.clean} truth=${!vTruth.clean} safety=${!vSafety.clean} grounding=${!vGrounding.clean} disclosure=${!vDisclosure.clean}`);
}

// ── INV-14.9-H : Deterministic experiment assignment ────────────

export function checkINV_149_H(): L14_9InvariantResult {
  const sample = buildL14ExperimentSamplePolicy({
    deterministic_bucket_salt_ref: 'salt.v1',
    eligible_audience_classes: [L14AudienceClass.END_USER],
    eligible_channels: [L14DeliveryChannel.TELEGRAM],
    max_exposure_percentage: 30,
    holdout_percentage: 10,
    require_user_opt_in_for_experiment: true,
  });
  const ex = buildL14DeliveryExperiment({
    experiment_class: L14ExperimentClass.DIGEST_CADENCE,
    allowed_variation_surface: L14AllowedExperimentSurface.DIGEST_WINDOW_SCHEDULE,
    sample_policy_ref: sample.sample_policy_id,
    evaluation_metric_classes: [L14ExperimentMetricClass.DIGEST_COMPLETION_RATE],
    rollout_status: L14ExperimentRolloutStatus.LIMITED_LIVE,
  });
  const a1 = assignL14ExperimentVariant({
    experiment: ex, sample, user_id_hash: 'u.h.1',
    variant_refs: ['variant.A', 'variant.B'], assigned_at: '2026-05-15T00:00:00Z',
  });
  const a2 = assignL14ExperimentVariant({
    experiment: ex, sample, user_id_hash: 'u.h.1',
    variant_refs: ['variant.A', 'variant.B'], assigned_at: '2026-05-15T00:00:00Z',
  });
  const det = a1.assignment_basis === 'DETERMINISTIC_HASH_BUCKET' &&
    a1.assigned_variant_ref === a2.assigned_variant_ref && a1.replay_hash === a2.replay_hash;
  // Validator rejects forged non-deterministic.
  const forged = { ...a1, assignment_basis: 'RANDOM' as any };
  const vForged = validateL14ExperimentAssignment(forged);
  return inv('INV-14.9-H', 'deterministic experiment assignment',
    det && validateL14ExperimentAssignment(a1).clean && !vForged.clean,
    `deterministic=${det} forgedRejected=${!vForged.clean}`);
}

// ── INV-14.9-I : Operational governance != truth promotion ──────

export function checkINV_149_I(): L14_9InvariantResult {
  // Engagement metric used for "correctness" (forbidden surface) must reject if not allowed.
  const vAllowed = validateL14ExperimentMetric(L14ExperimentMetricClass.OPEN_RATE);
  const vForbidden = validateL14ExperimentMetric('OUTCOME_ACCURACY_FROM_OPEN_RATE');
  // Operational dashboard derives from L14.8 read surfaces; does not promote truth.
  const dash = buildL14OperationalDashboardSnapshot({
    dashboard_class: L14OperationalDashboardClass.MUTED_ALERT_RATIO,
    observed_window_start: '2026-05-14T00:00:00Z',
    observed_window_end: '2026-05-15T00:00:00Z',
    source_read_surface_refs: ['l14.read.surface.IGNORED_ALERT_RATE_BY_CLASS_REGIME'],
    current_status: L14OperationalDashboardStatus.WATCH,
  });
  return inv('INV-14.9-I', 'operational governance ≠ truth promotion',
    vAllowed.clean && !vForbidden.clean &&
    dash.source_read_surface_refs.length > 0,
    `allowedMetric=${vAllowed.clean} forbiddenRejected=${!vForbidden.clean} dashSourced=${dash.source_read_surface_refs.length > 0}`);
}

// ── INV-14.9-J : Analyst intervention boundary ──────────────────

export function checkINV_149_J(): L14_9InvariantResult {
  const legit = buildL14AnalystOperationalActionRecord({
    action_class: L14AnalystOperationalActionClass.APPLY_GOVERNED_ROLLOUT_PAUSE,
    analyst_ref: 'analyst.A',
    subject_rollout_policy_ref: 'l14.live.channel.rollout.X',
    action_summary: 'Pause telegram rollout due to backlog risk',
  });
  const v = validateL14AnalystOperationalActionRecord(legit);
  // Intent mutation rejected.
  const mutate = intentFromAnalystInput({
    action_class: L14AnalystOperationalActionClass.ADD_OPERATIONAL_NOTE,
    analyst_ref: 'analyst.B',
    action_summary: 'attempt',
    intent_mutate_lower_layer: true,
  });
  const vMutate = validateL14AnalystOperationalActionRecord(legit, mutate);
  // Bypass user preference rejected.
  const bypass = intentFromAnalystInput({
    action_class: L14AnalystOperationalActionClass.ADD_OPERATIONAL_NOTE,
    analyst_ref: 'analyst.C',
    action_summary: 'attempt',
    intent_bypass_user_preference: true,
  });
  const vBypass = validateL14AnalystOperationalActionRecord(legit, bypass);
  // Type-pin honesty.
  const honest = (legit.lower_layer_mutation_attempted as unknown) === false &&
    (legit.historical_truth_mutation_attempted as unknown) === false &&
    (legit.user_preference_bypass_attempted as unknown) === false;
  return inv('INV-14.9-J', 'analyst intervention boundary',
    v.clean && !vMutate.clean && !vBypass.clean && honest,
    `legit=${v.clean} mutateRejected=${!vMutate.clean} bypassRejected=${!vBypass.clean} pinned=${honest}`);
}

// ── INV-14.9-K : Operational playbook legality ──────────────────

export function checkINV_149_K(): L14_9InvariantResult {
  const pb = buildL14OperationalPlaybook({
    playbook_class: L14OperationalPlaybookClass.TELEGRAM_FAILURE_PLAYBOOK,
    trigger_signal_classes: [L14OperationalSignalClass.TELEGRAM_FAILURE_SPIKE, L14OperationalSignalClass.CHANNEL_HEALTH_DEGRADED],
    allowed_mitigation_actions: [
      L14OperationalMitigationActionClass.PAUSE_CHANNEL_ROLLOUT,
      L14OperationalMitigationActionClass.ENABLE_QUEUE_BACKPRESSURE,
      L14OperationalMitigationActionClass.MONITOR_ONLY,
    ],
    may_pause_rollout: true,
    may_downgrade_to_digest: true,
    may_trigger_analyst_review: true,
    may_open_calibration_review: false,
  });
  const v = validateL14OperationalPlaybook(pb);
  // Adversarial: strip a prohibited action from the list.
  const bad = { ...pb, prohibited_actions: pb.prohibited_actions.filter(p => p !== L14OperationalProhibitedActionClass.ALTER_LOWER_LAYER_TRUTH) };
  const vBad = validateL14OperationalPlaybook(bad);
  return inv('INV-14.9-K', 'operational playbook legality',
    v.clean && !vBad.clean &&
    pb.prohibited_actions.includes(L14OperationalProhibitedActionClass.ALTER_LOWER_LAYER_TRUTH),
    `legit=${v.clean} strippedRejected=${!vBad.clean}`);
}

// ── INV-14.9-L : Audit determinism ──────────────────────────────

export function checkINV_149_L(): L14_9InvariantResult {
  const ch = channelRollout();
  const ac = alertClassRollout();
  const profile = preferenceProfile();
  const snap = buildL14DeliveryPreferenceSnapshot({
    profile, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false,
  });
  const fp = freqPolicy();
  const dp = digestPolicy();
  const d1 = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.L',
    preference_snapshot: snap,
    channel_rollout: ch, alert_class_rollout: ac, frequency_policy: fp, digest_policy: dp,
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  const d2 = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.L',
    preference_snapshot: snap,
    channel_rollout: ch, alert_class_rollout: ac, frequency_policy: fp, digest_policy: dp,
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  const sameDecision = d1.replay_hash === d2.replay_hash;
  const vDecision = validateL14LiveDeliveryControlDecision(d1);
  const sig1 = buildL14OperationalSignalRecord({
    signal_class: L14OperationalSignalClass.DELIVERY_QUEUE_BACKLOG,
    observed_window_start: '2026-05-15T09:00:00Z',
    observed_window_end: '2026-05-15T10:00:00Z',
    source_read_surface_refs: ['l14.read.surface.CHANNEL_HEALTH'],
    source_metric_refs: ['l14.metric.backlog'],
    severity_class: L14OperationalSignalSeverityClass.HIGH,
  });
  const sig2 = buildL14OperationalSignalRecord({
    signal_class: L14OperationalSignalClass.DELIVERY_QUEUE_BACKLOG,
    observed_window_start: '2026-05-15T09:00:00Z',
    observed_window_end: '2026-05-15T10:00:00Z',
    source_read_surface_refs: ['l14.read.surface.CHANNEL_HEALTH'],
    source_metric_refs: ['l14.metric.backlog'],
    severity_class: L14OperationalSignalSeverityClass.HIGH,
  });
  const sameSignal = sig1.replay_hash === sig2.replay_hash;
  const incident = buildL14OperationalIncidentRecord({
    signal: sig1,
    opened_at: '2026-05-15T10:01:00Z',
    affected_channel_refs: [L14DeliveryChannel.TELEGRAM],
    affected_alert_class_refs: ['l13.alert.fragility'],
  });
  const vIncident = validateL14OperationalIncidentRecord(incident);
  const correctIncident = incident.incident_class === getL14IncidentClassForSignal(sig1.signal_class) &&
    incident.recommended_playbook_ref.includes(getL14PlaybookClassForSignal(sig1.signal_class));
  return inv('INV-14.9-L', 'audit determinism',
    sameDecision && sameSignal && vDecision.clean && vIncident.clean && correctIncident,
    `decisionSame=${sameDecision} signalSame=${sameSignal} incident=${correctIncident}`);
}

// Keep symbols live.
void isL14ExperimentSurfaceLegalForClass;
void L14OperationalSignalClass.ALERT_SPIKE_DETECTED;
void validateL14OperationalSignalRecord;
void validateL14DeliveryPreferenceProfile;
void validateL14QuietHoursProfile;
void validateL14DeliveryPreferenceSnapshot;

export function runAllL14_9Invariants(): readonly L14_9InvariantResult[] {
  return [
    checkINV_149_A(),
    checkINV_149_B(),
    checkINV_149_C(),
    checkINV_149_D(),
    checkINV_149_E(),
    checkINV_149_F(),
    checkINV_149_G(),
    checkINV_149_H(),
    checkINV_149_I(),
    checkINV_149_J(),
    checkINV_149_K(),
    checkINV_149_L(),
  ];
}
