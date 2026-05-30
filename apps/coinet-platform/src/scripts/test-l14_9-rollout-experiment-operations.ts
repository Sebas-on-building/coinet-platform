/**
 * L14.9 — Live Operations Certification (Bands A..H)
 *
 * §14.9.59 — Proves rollout, user controls, frequency/digest/override,
 * experiments, operational governance, analyst review, audit, invariants.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import { L14DeliveryChannel } from '../l14/contracts/delivery-channel';
import { L14DeliveryClass } from '../l14/contracts/delivery-class';
import { L14AudienceClass } from '../l14/contracts/audience-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../l14/contracts/delivery-priority';
import { L14ChannelHealthClass } from '../l14/contracts/l14-performance-health-facts';
import {
  ALL_L14_LIVE_ROLLOUT_STATUSES,
  L14LiveRolloutStatus,
  L14_ROLLOUT_TRANSITIONS,
} from '../l14/contracts/l14-rollout-governance';
import {
  L14DigestPreferenceClass,
  L14Weekday,
} from '../l14/contracts/l14-user-delivery-controls';
import {
  L14AlertFrequencyWindowClass,
  L14ClusterMergeBasisClass,
  L14DigestEffectClass,
  L14DuplicateBasisClass,
  L14FrequencyEffectClass,
  L14LiveControlStatus,
  L14QuietHoursEffectClass,
  L14SeverityOverrideEffectClass,
} from '../l14/contracts/l14-frequency-governance';
import {
  L14AllowedExperimentSurface,
  L14ExperimentClass,
  L14ExperimentMetricClass,
  L14ExperimentRolloutStatus,
} from '../l14/contracts/l14-experiment-governance';
import {
  L14OperationalDashboardClass,
  L14OperationalDashboardStatus,
  L14OperationalMitigationActionClass,
  L14OperationalPlaybookClass,
  L14OperationalProhibitedActionClass,
  L14OperationalSignalClass,
  L14OperationalSignalSeverityClass,
} from '../l14/contracts/l14-operational-governance';
import { L14AnalystOperationalActionClass } from '../l14/contracts/l14-analyst-operations';
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
} from '../l14/operations/l14-live-operations-engines';
import {
  validateL14AlertClassRolloutPolicy,
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
} from '../l14/validation/l14-live-operations.validators';
import { L14LiveOperationsViolationCode } from '../l14/validation/l14-live-operations-violation-codes';
import {
  L14LiveOperationsAuditSubjectClass,
  emitL14LiveOperationsAuditRecord,
  getL14LiveOperationsAuditLog,
  getL14LiveOperationsCriticalViolations,
  isL14LiveOperationsBlockingCode,
  resetL14LiveOperationsAuditLog,
  severityForL14LiveOperationsCode,
} from '../l14/constitution/l14-live-operations-audit';
import { runAllL14_9Invariants } from '../l14/invariants/l14_9-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; failures.push(msg); console.log(`  ✗ ${msg}`); }
}
function band(name: string): void { console.log(''); console.log(`── ${name} ──`); }

function chRollout(channel = L14DeliveryChannel.TELEGRAM, status = L14LiveRolloutStatus.PRODUCTION_ENABLED) {
  return buildL14ChannelRolloutPolicy({
    channel, rollout_status: status,
    enabled_audience_classes: [L14AudienceClass.END_USER],
    allowed_delivery_classes: [L14DeliveryClass.ALERT_NOTIFICATION],
    allowed_alert_class_refs: ['l13.alert.fragility'],
    channel_health_minimum_class: L14ChannelHealthClass.HEALTHY,
    requires_user_opt_in: channel === L14DeliveryChannel.TELEGRAM,
    requires_explicit_channel_linking: channel === L14DeliveryChannel.TELEGRAM,
    rollback_policy_ref: 'l14.live.rollback.v1',
  });
}

function aRollout(status = L14LiveRolloutStatus.PRODUCTION_ENABLED) {
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

function quietHours() {
  return buildL14QuietHoursProfile({
    timezone_ref: 'Europe/Berlin',
    quiet_hours_start_local: '22:00',
    quiet_hours_end_local: '07:00',
    active_weekday_mask: [L14Weekday.MONDAY, L14Weekday.TUESDAY, L14Weekday.WEDNESDAY,
      L14Weekday.THURSDAY, L14Weekday.FRIDAY, L14Weekday.SATURDAY, L14Weekday.SUNDAY],
    digest_during_quiet_hours: true,
  });
}

function freqPolicy() {
  const dedup = buildL14DeduplicationLivePolicy({
    duplicate_window_minutes: 5,
    duplicate_basis_classes: [L14DuplicateBasisClass.SAME_DELIVERY_ARTIFACT],
    allow_cross_channel_deduplication: false,
    allow_cross_alert_class_deduplication: false,
  });
  const merge = buildL14ClusterMergePolicy({
    merge_window_minutes: 15,
    merge_basis_classes: [L14ClusterMergeBasisClass.SAME_SUBJECT],
    maximum_cluster_size: 5,
    digest_if_cluster_size_exceeds_threshold: true,
    immediate_delivery_if_any_member_is_critical: true,
  });
  const digest = digestPolicy();
  return buildL14DeliveryFrequencyPolicy({
    alert_frequency_window: L14AlertFrequencyWindowClass.ONE_HOUR,
    default_max_alerts_per_window: 3,
    deduplication_policy_ref: dedup.deduplication_live_policy_id,
    cluster_merge_policy_ref: merge.cluster_merge_policy_id,
    digest_downgrade_policy_ref: digest.digest_downgrade_policy_id,
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

function sevPolicy() {
  return buildL14SeverityOverridePolicy({
    eligible_priority_classes: [L14DeliveryPriorityClass.CRITICAL, L14DeliveryPriorityClass.HIGH],
    eligible_alert_class_refs: ['l13.alert.fragility'],
    may_bypass_quiet_hours: true,
    may_bypass_frequency_caps: true,
    may_bypass_digest_downgrade: false,
  });
}

console.log('L14.9 — Live Operations Certification');

// ── BAND A : Rollout governance ──────────────────────────────────
band('BAND A — rollout governance');

{
  assert(ALL_L14_LIVE_ROLLOUT_STATUSES.length === 7, `A.1 7 rollout statuses registered (got ${ALL_L14_LIVE_ROLLOUT_STATUSES.length})`);
  for (const s of ALL_L14_LIVE_ROLLOUT_STATUSES) {
    assert(L14_ROLLOUT_TRANSITIONS[s] !== undefined, `A.2 ${s} has transitions`);
  }
  assert(isL14RolloutTransitionLegal(L14LiveRolloutStatus.SHADOW_ONLY, L14LiveRolloutStatus.INTERNAL_CANARY), 'A.3 SHADOW_ONLY → INTERNAL_CANARY legal');
  assert(!isL14RolloutTransitionLegal(L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE, L14LiveRolloutStatus.PRODUCTION_ENABLED), 'A.4 RESERVED → PRODUCTION direct jump illegal');
  assert(!isL14RolloutTransitionLegal(L14LiveRolloutStatus.PRODUCTION_ENABLED, L14LiveRolloutStatus.INTERNAL_CANARY), 'A.5 PRODUCTION → INTERNAL_CANARY illegal');
  // Push reserved enablement blocked.
  const push = buildL14PushEnablementGate({
    current_rollout_status: L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE,
    upstream_channel_registry_certified_for_production: false,
  });
  assert(push.production_enablement_allowed === false, 'A.6 push reserved → production_enablement_allowed=false');
  assert(validateL14PushEnablementGate(push).clean, 'A.7 push reserved gate validator clean');
  const pushForged = { ...push, production_enablement_allowed: true };
  assert(!validateL14PushEnablementGate(pushForged).clean, 'A.8 forced push enablement rejected');
  // Telegram rollout requires opt-in.
  const ch = chRollout();
  assert(ch.requires_user_opt_in === true, 'A.9 telegram channel rollout requires opt-in');
  assert(validateL14ChannelRolloutPolicy(ch).clean, 'A.10 telegram channel rollout validator clean');
  const telBad = { ...ch, requires_user_opt_in: false };
  assert(!validateL14ChannelRolloutPolicy(telBad).clean, 'A.11 telegram without opt-in rejected');
  // Alert class rollout legality.
  const a = aRollout();
  assert(validateL14AlertClassRolloutPolicy(a).clean, 'A.12 alert class rollout validator clean');
  const aBad = buildL14AlertClassRolloutPolicy({
    alert_class_ref: 'l13.alert.bad',
    rollout_status: L14LiveRolloutStatus.PRODUCTION_ENABLED,
    eligible_channels: [L14DeliveryChannel.TELEGRAM],
    blocked_channels: [L14DeliveryChannel.TELEGRAM],
    minimum_priority_class: L14DeliveryPriorityClass.MATERIAL,
    minimum_urgency_class: L14DeliveryUrgencyClass.NEAR_REAL_TIME,
    digest_eligible: true,
    allowed_user_scope_classes: [L14AudienceClass.END_USER],
  });
  assert(!validateL14AlertClassRolloutPolicy(aBad).clean, 'A.13 alert class both eligible+blocked rejected');
}

// ── BAND B : User controls and preference law ────────────────────
band('BAND B — user controls + preference law');

{
  const p = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.B.1',
    enabled_channels: [L14DeliveryChannel.TELEGRAM],
    muted_channels: [],
    enabled_alert_classes: ['l13.alert.fragility'],
    muted_alert_classes: [],
    watchlist_scope_refs: ['l11.btc'],
    max_alerts_per_window: 5,
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  assert(validateL14DeliveryPreferenceProfile(p).clean, 'B.1 legit profile clean');
  const conflict = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.B.2',
    enabled_channels: [L14DeliveryChannel.TELEGRAM],
    muted_channels: [L14DeliveryChannel.TELEGRAM],
    enabled_alert_classes: ['l13.alert.fragility'],
    muted_alert_classes: ['l13.alert.fragility'],
    watchlist_scope_refs: [],
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  assert(!validateL14DeliveryPreferenceProfile(conflict).clean, 'B.2 conflicting mute/enabled rejected');
  const badCap = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.B.3',
    enabled_channels: [L14DeliveryChannel.TELEGRAM],
    muted_channels: [],
    enabled_alert_classes: [],
    muted_alert_classes: [],
    watchlist_scope_refs: [],
    max_alerts_per_window: 0,
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  assert(!validateL14DeliveryPreferenceProfile(badCap).clean, 'B.3 zero-cap rejected');
  // Quiet hours.
  const qh = quietHours();
  assert(validateL14QuietHoursProfile(qh).clean, 'B.4 quiet hours valid');
  const qhBad = { ...qh, quiet_hours_start_local: '25:00' };
  assert(!validateL14QuietHoursProfile(qhBad).clean, 'B.5 quiet hours malformed time rejected');
  // Snapshot.
  const snap = buildL14DeliveryPreferenceSnapshot({ profile: p, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false });
  assert(validateL14DeliveryPreferenceSnapshot(snap).clean, 'B.6 snapshot validator clean');
  // Snapshot deterministic.
  const snap2 = buildL14DeliveryPreferenceSnapshot({ profile: p, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false });
  assert(snap.replay_hash === snap2.replay_hash, 'B.7 snapshot replay deterministic');
  // Precedence: muted channel blocks even with PRODUCTION rollout.
  const muted = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.B.4',
    enabled_channels: [],
    muted_channels: [L14DeliveryChannel.TELEGRAM],
    enabled_alert_classes: ['l13.alert.fragility'],
    muted_alert_classes: [],
    watchlist_scope_refs: [],
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  const snapMuted = buildL14DeliveryPreferenceSnapshot({ profile: muted, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false });
  const decision = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.B',
    preference_snapshot: snapMuted,
    channel_rollout: chRollout(),
    alert_class_rollout: aRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  assert(decision.final_live_control_status === L14LiveControlStatus.DELIVERY_BLOCKED_BY_USER_CONTROL, 'B.8 muted channel precedence over rollout');
}

// ── BAND C : Frequency / caps / digest / override ────────────────
band('BAND C — frequency / caps / digest / override');

{
  const profile = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.C.1',
    enabled_channels: [L14DeliveryChannel.TELEGRAM],
    muted_channels: [],
    enabled_alert_classes: ['l13.alert.fragility'],
    muted_alert_classes: [],
    watchlist_scope_refs: [],
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  const snap = buildL14DeliveryPreferenceSnapshot({ profile, captured_at: '2026-05-15T10:00:00Z', quiet_hours_active: false });
  // Cap hit → digest.
  const decision = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.C1',
    preference_snapshot: snap,
    channel_rollout: chRollout(),
    alert_class_rollout: aRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 99,
    override_requested: false,
  });
  assert(decision.frequency_effect === L14FrequencyEffectClass.CAP_REACHED_DIGEST_DOWNGRADE, 'C.1 cap hit → DIGEST_DOWNGRADE');
  assert(decision.final_live_control_status === L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED, 'C.2 final status DIGEST_DOWNGRADE_REQUIRED');
  // Cap bypassed legally.
  const decisionOk = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.C2',
    preference_snapshot: snap,
    channel_rollout: chRollout(),
    alert_class_rollout: aRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    severity_override_policy: sevPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.CRITICAL,
    observed_alert_count_in_window: 99,
    override_requested: true,
  });
  assert(decisionOk.severity_override_effect === L14SeverityOverrideEffectClass.OVERRIDE_APPLIED_LEGALLY, 'C.3 override applied legally');
  assert(decisionOk.frequency_effect === L14FrequencyEffectClass.CAP_BYPASSED_BY_POLICY_OVERRIDE, 'C.4 cap bypass via override');
  // Override request on ineligible alert class.
  const vIne = validateL14SeverityOverrideAlertEligibility(sevPolicy(), 'l13.alert.other', true);
  assert(!vIne.clean, 'C.5 override on ineligible alert class rejected');
  // Quiet hours digest.
  const qhProfile = buildL14DeliveryPreferenceProfile({
    user_id_hash: 'u.C.3',
    enabled_channels: [L14DeliveryChannel.TELEGRAM],
    muted_channels: [],
    enabled_alert_classes: ['l13.alert.fragility'],
    muted_alert_classes: [],
    watchlist_scope_refs: [],
    quiet_hours_profile: quietHours(),
    digest_preference: L14DigestPreferenceClass.IMMEDIATE_ONLY,
  });
  const qhSnap = buildL14DeliveryPreferenceSnapshot({ profile: qhProfile, captured_at: '2026-05-15T23:30:00Z', quiet_hours_active: true });
  const qhDecision = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.C4',
    preference_snapshot: qhSnap,
    channel_rollout: chRollout(),
    alert_class_rollout: aRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.fragility',
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 0,
    override_requested: false,
  });
  assert(qhDecision.quiet_hours_effect === L14QuietHoursEffectClass.ACTIVE_ALLOW_DIGEST, 'C.6 quiet hours → ALLOW_DIGEST');
  assert(qhDecision.digest_effect === L14DigestEffectClass.DIGEST_BY_QUIET_HOURS, 'C.7 digest by quiet hours');
  // Override requested but rejected.
  const noOverride = decideL14LiveDeliveryControl({
    source_delivery_candidate_ref: 'l14.cand.C5',
    preference_snapshot: snap,
    channel_rollout: chRollout(),
    alert_class_rollout: aRollout(),
    frequency_policy: freqPolicy(),
    digest_policy: digestPolicy(),
    severity_override_policy: sevPolicy(),
    candidate_channel: L14DeliveryChannel.TELEGRAM,
    candidate_alert_class_ref: 'l13.alert.other', // not eligible
    candidate_priority_class: L14DeliveryPriorityClass.HIGH,
    observed_alert_count_in_window: 99,
    override_requested: true,
  });
  assert(noOverride.severity_override_effect === L14SeverityOverrideEffectClass.OVERRIDE_REQUESTED_BUT_REJECTED, 'C.8 ineligible override → REQUESTED_BUT_REJECTED');
  // Decision validator.
  assert(validateL14LiveDeliveryControlDecision(decisionOk, sevPolicy(), digestPolicy()).clean, 'C.9 decision validator clean');
}

// ── BAND D : Experimentation ─────────────────────────────────────
band('BAND D — experimentation');

{
  // Legal experiment.
  const sample = buildL14ExperimentSamplePolicy({
    deterministic_bucket_salt_ref: 'salt.D',
    eligible_audience_classes: [L14AudienceClass.END_USER],
    eligible_channels: [L14DeliveryChannel.TELEGRAM],
    max_exposure_percentage: 30,
    holdout_percentage: 10,
    require_user_opt_in_for_experiment: true,
  });
  const ex = buildL14DeliveryExperiment({
    experiment_class: L14ExperimentClass.CHANNEL_TIMING,
    allowed_variation_surface: L14AllowedExperimentSurface.DELIVERY_TIMING_OFFSET,
    sample_policy_ref: sample.sample_policy_id,
    evaluation_metric_classes: [L14ExperimentMetricClass.OPEN_RATE, L14ExperimentMetricClass.DEEPER_INVESTIGATION_RATE],
    rollout_status: L14ExperimentRolloutStatus.LIMITED_LIVE,
  });
  assert(validateL14DeliveryExperiment(ex).clean, 'D.1 legit experiment clean');
  assert(isL14ExperimentSurfaceLegalForClass(L14ExperimentClass.CHANNEL_TIMING, L14AllowedExperimentSurface.DELIVERY_TIMING_OFFSET), 'D.2 surface legal for class');
  assert(!isL14ExperimentSurfaceLegalForClass(L14ExperimentClass.CHANNEL_TIMING, L14AllowedExperimentSurface.COPY_CONCISION_PROFILE), 'D.3 wrong surface for class');
  // Truth/safety/grounding/disclosure variations rejected.
  assert(!validateL14DeliveryExperiment(ex, { truth_mutation_attempt: true }).clean, 'D.4 truth mutation rejected');
  assert(!validateL14DeliveryExperiment(ex, { safety_mutation_attempt: true }).clean, 'D.5 safety mutation rejected');
  assert(!validateL14DeliveryExperiment(ex, { grounding_mutation_attempt: true }).clean, 'D.6 grounding mutation rejected');
  assert(!validateL14DeliveryExperiment(ex, { disclosure_mutation_attempt: true }).clean, 'D.7 disclosure mutation rejected');
  // Deterministic assignment.
  const a1 = assignL14ExperimentVariant({
    experiment: ex, sample, user_id_hash: 'u.D.user',
    variant_refs: ['variant.A', 'variant.B'], assigned_at: '2026-05-15T00:00:00Z',
  });
  const a2 = assignL14ExperimentVariant({
    experiment: ex, sample, user_id_hash: 'u.D.user',
    variant_refs: ['variant.A', 'variant.B'], assigned_at: '2026-05-15T00:00:00Z',
  });
  assert(a1.assigned_variant_ref === a2.assigned_variant_ref && a1.replay_hash === a2.replay_hash, 'D.8 deterministic assignment');
  assert(validateL14ExperimentAssignment(a1).clean, 'D.9 assignment validator clean');
  // Forged non-deterministic.
  const forged = { ...a1, assignment_basis: 'RANDOM' as any };
  assert(!validateL14ExperimentAssignment(forged).clean, 'D.10 non-deterministic assignment rejected');
  // Metrics legality.
  assert(validateL14ExperimentMetric(L14ExperimentMetricClass.OPEN_RATE).clean, 'D.11 OPEN_RATE metric allowed');
  assert(!validateL14ExperimentMetric('OUTCOME_ACCURACY_FROM_OPEN_RATE').clean, 'D.12 correctness-as-engagement metric rejected');
  // Wrong surface in experiment rejected.
  const wrongEx = buildL14DeliveryExperiment({
    experiment_class: L14ExperimentClass.CHANNEL_TIMING,
    allowed_variation_surface: L14AllowedExperimentSurface.COPY_CONCISION_PROFILE,
    sample_policy_ref: sample.sample_policy_id,
    evaluation_metric_classes: [L14ExperimentMetricClass.OPEN_RATE],
    rollout_status: L14ExperimentRolloutStatus.LIMITED_LIVE,
  });
  assert(!validateL14DeliveryExperiment(wrongEx).clean, 'D.13 wrong surface for class rejected');
}

// ── BAND E : Operational governance ──────────────────────────────
band('BAND E — operational governance');

{
  const signals: readonly L14OperationalSignalClass[] = [
    L14OperationalSignalClass.CHANNEL_HEALTH_DEGRADED,
    L14OperationalSignalClass.TELEGRAM_FAILURE_SPIKE,
    L14OperationalSignalClass.DELIVERY_QUEUE_BACKLOG,
    L14OperationalSignalClass.ALERT_SPIKE_DETECTED,
    L14OperationalSignalClass.MUTED_ALERT_RATIO_ELEVATED,
    L14OperationalSignalClass.FALSE_POSITIVE_WATCHLIST_TRIGGERED,
    L14OperationalSignalClass.CALIBRATION_REVIEW_BACKLOG_ELEVATED,
    L14OperationalSignalClass.HIGH_RISK_REGIME_ALERT_OVERLOAD,
  ];
  for (const s of signals) {
    const rec = buildL14OperationalSignalRecord({
      signal_class: s,
      observed_window_start: '2026-05-15T00:00:00Z',
      observed_window_end: '2026-05-15T01:00:00Z',
      source_read_surface_refs: ['l14.read.surface.CHANNEL_HEALTH'],
      source_metric_refs: ['l14.metric.x'],
      severity_class: L14OperationalSignalSeverityClass.MATERIAL,
    });
    assert(validateL14OperationalSignalRecord(rec).clean, `E.${s} signal emitted + clean`);
    assert(getL14PlaybookClassForSignal(s) !== undefined, `E.${s} maps to playbook`);
    assert(getL14IncidentClassForSignal(s) !== undefined, `E.${s} maps to incident`);
  }
  // Incident attaches playbook.
  const sig = buildL14OperationalSignalRecord({
    signal_class: L14OperationalSignalClass.TELEGRAM_FAILURE_SPIKE,
    observed_window_start: '2026-05-15T00:00:00Z',
    observed_window_end: '2026-05-15T01:00:00Z',
    source_read_surface_refs: ['l14.read.surface.CHANNEL_HEALTH'],
    source_metric_refs: ['l14.metric.telegram.fail'],
    severity_class: L14OperationalSignalSeverityClass.HIGH,
  });
  const incident = buildL14OperationalIncidentRecord({
    signal: sig, opened_at: '2026-05-15T01:01:00Z',
    affected_channel_refs: [L14DeliveryChannel.TELEGRAM],
    affected_alert_class_refs: ['l13.alert.fragility'],
  });
  assert(validateL14OperationalIncidentRecord(incident).clean, 'E.incident incident validator clean');
  assert(incident.recommended_playbook_ref.includes(getL14PlaybookClassForSignal(sig.signal_class)), 'E.incident playbook ref matches mapping');
  // Dashboard snapshot legal.
  const dash = buildL14OperationalDashboardSnapshot({
    dashboard_class: L14OperationalDashboardClass.TELEGRAM_FAILURES,
    observed_window_start: '2026-05-15T00:00:00Z',
    observed_window_end: '2026-05-15T01:00:00Z',
    source_read_surface_refs: ['l14.read.surface.CHANNEL_HEALTH'],
    current_status: L14OperationalDashboardStatus.ACTION_REQUIRED,
  });
  assert(dash.source_read_surface_refs.length > 0, 'E.dashboard derives from L14.8 read surfaces');
}

// ── BAND F : Analyst review operations ───────────────────────────
band('BAND F — analyst review operations');

{
  // Acknowledge.
  const ack = buildL14AnalystOperationalActionRecord({
    action_class: L14AnalystOperationalActionClass.ACKNOWLEDGE_INCIDENT,
    analyst_ref: 'analyst.F',
    subject_incident_ref: 'l14.live.incident.X',
    action_summary: 'Ack incident',
  });
  assert(validateL14AnalystOperationalActionRecord(ack).clean, 'F.1 acknowledge action clean');
  // Apply rollout pause.
  const pause = buildL14AnalystOperationalActionRecord({
    action_class: L14AnalystOperationalActionClass.APPLY_GOVERNED_ROLLOUT_PAUSE,
    analyst_ref: 'analyst.F',
    subject_rollout_policy_ref: 'l14.live.channel.rollout.X',
    action_summary: 'Pause Telegram rollout',
  });
  assert(validateL14AnalystOperationalActionRecord(pause).clean, 'F.2 governed rollout pause clean');
  // Open calibration review.
  const cal = buildL14AnalystOperationalActionRecord({
    action_class: L14AnalystOperationalActionClass.OPEN_CALIBRATION_REVIEW,
    analyst_ref: 'analyst.F',
    subject_proposal_ref: 'l14.proposal.X',
    action_summary: 'Open calibration review',
  });
  assert(validateL14AnalystOperationalActionRecord(cal).clean, 'F.3 open calibration review clean');
  // Lower-layer mutation intent rejected.
  const inputMutate = {
    action_class: L14AnalystOperationalActionClass.ADD_OPERATIONAL_NOTE,
    analyst_ref: 'analyst.F',
    action_summary: 'attempt',
    intent_mutate_lower_layer: true,
  };
  const intent = intentFromAnalystInput(inputMutate);
  assert(!validateL14AnalystOperationalActionRecord(ack, intent).clean, 'F.4 lower-layer mutation intent rejected');
  // History mutation intent rejected.
  const intentHist = intentFromAnalystInput({
    action_class: L14AnalystOperationalActionClass.ADD_OPERATIONAL_NOTE,
    analyst_ref: 'analyst.F',
    action_summary: 'attempt',
    intent_mutate_history: true,
  });
  assert(!validateL14AnalystOperationalActionRecord(ack, intentHist).clean, 'F.5 history mutation intent rejected');
  // User preference bypass intent rejected.
  const intentBypass = intentFromAnalystInput({
    action_class: L14AnalystOperationalActionClass.ADD_OPERATIONAL_NOTE,
    analyst_ref: 'analyst.F',
    action_summary: 'attempt',
    intent_bypass_user_preference: true,
  });
  assert(!validateL14AnalystOperationalActionRecord(ack, intentBypass).clean, 'F.6 user preference bypass intent rejected');
}

// ── BAND G : Audit + adversarial ─────────────────────────────────
band('BAND G — audit + adversarial');

{
  resetL14LiveOperationsAuditLog();
  const a1 = emitL14LiveOperationsAuditRecord({
    subjectClass: L14LiveOperationsAuditSubjectClass.PUSH_ENABLEMENT_GATE,
    subjectRef: 'l14.live.push.gate.G',
    violationCodes: [L14LiveOperationsViolationCode.L14L_RESERVED_PUSH_ENABLEMENT_ATTEMPT],
    message: 'cert: push enablement attempt',
  });
  const a2 = emitL14LiveOperationsAuditRecord({
    subjectClass: L14LiveOperationsAuditSubjectClass.PUSH_ENABLEMENT_GATE,
    subjectRef: 'l14.live.push.gate.G',
    violationCodes: [L14LiveOperationsViolationCode.L14L_RESERVED_PUSH_ENABLEMENT_ATTEMPT],
    message: 'cert: push enablement attempt',
  });
  assert(a1.replay_hash === a2.replay_hash, 'G.1 audit replay hash deterministic');
  assert(a1.severity === L14ConstitutionalAuditSeverity.CRITICAL && a1.blocking, 'G.2 push enablement attempt is CRITICAL + blocking');
  assert(severityForL14LiveOperationsCode(L14LiveOperationsViolationCode.L14L_EXPERIMENT_SAFETY_MUTATION_ATTEMPT) === L14ConstitutionalAuditSeverity.CRITICAL, 'G.3 experiment safety mutation classified CRITICAL');
  assert(severityForL14LiveOperationsCode(L14LiveOperationsViolationCode.L14L_PREFERENCE_PROFILE_CAP_INVALID) === L14ConstitutionalAuditSeverity.ERROR, 'G.4 preference cap invalid classified ERROR');
  assert(!isL14LiveOperationsBlockingCode(L14LiveOperationsViolationCode.L14L_PREFERENCE_PROFILE_CAP_INVALID), 'G.5 cap invalid not blocking');
  assert(isL14LiveOperationsBlockingCode(L14LiveOperationsViolationCode.L14L_ANALYST_ACTION_ATTEMPTED_LOWER_LAYER_MUTATION), 'G.6 analyst lower-layer mutation blocking');
  assert(isL14LiveOperationsBlockingCode(L14LiveOperationsViolationCode.L14L_QUIET_HOURS_OVERRIDE_ILLEGAL), 'G.7 quiet-hour-override-illegal blocking');
  assert(getL14LiveOperationsAuditLog().length === 2, 'G.8 audit log queryable');
  assert(getL14LiveOperationsCriticalViolations().length === 2, 'G.9 critical violations queryable');
  // Crafted offender: telegram gate missing opt-in.
  const ch = chRollout();
  const gate = buildL14TelegramDeliveryGate({
    channel_rollout_policy_ref: ch.channel_rollout_policy_id,
    bot_integration_ref: '',
    bot_health_required_class: L14ChannelHealthClass.HEALTHY,
    digest_fallback_allowed: true, retry_allowed: true, max_retry_attempts: 3,
  });
  const v = validateL14TelegramDeliveryGate(gate);
  assert(!v.clean && v.issues.some(i => i.code === L14LiveOperationsViolationCode.L14L_TELEGRAM_GATE_BINDING_MISSING), 'G.10 telegram binding missing emits precise code');
  // Crafted: playbook missing prohibited action.
  const pbBad = buildL14OperationalPlaybook({
    playbook_class: L14OperationalPlaybookClass.ALERT_SPIKE_PLAYBOOK,
    trigger_signal_classes: [L14OperationalSignalClass.ALERT_SPIKE_DETECTED],
    allowed_mitigation_actions: [L14OperationalMitigationActionClass.MONITOR_ONLY],
    may_pause_rollout: false, may_downgrade_to_digest: true,
    may_trigger_analyst_review: true, may_open_calibration_review: false,
  });
  const stripped = { ...pbBad, prohibited_actions: pbBad.prohibited_actions.filter(p => p !== L14OperationalProhibitedActionClass.ALTER_LOWER_LAYER_TRUTH) };
  const vPb = validateL14OperationalPlaybook(stripped);
  assert(!vPb.clean && vPb.issues.some(i => i.code === L14LiveOperationsViolationCode.L14L_PLAYBOOK_PROHIBITED_ACTION_PRESENT), 'G.11 stripped prohibited-actions emits precise code');
}

// ── BAND H : Invariants + full regression ────────────────────────
band('BAND H — invariants + full regression');

{
  const invs = runAllL14_9Invariants();
  assert(invs.length === 12, `H.1 twelve invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `H.2 ${i.id} ${i.name} (${i.evidence})`);
  }
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
