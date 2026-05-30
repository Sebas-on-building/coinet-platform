/**
 * L14.9 — Live Operations Validators
 *
 * §14.9.13 / §14.9.23 / §14.9.34 / §14.9.49 — Consolidated validators using L14L_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  ALL_L14_LIVE_ROLLOUT_STATUSES,
  L14LiveRolloutStatus,
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
  L14LiveControlStatus,
  L14SeverityOverrideEffectClass,
  type L14DigestDowngradePolicy,
  type L14LiveDeliveryControlDecision,
  type L14SeverityOverridePolicy,
} from '../contracts/l14-frequency-governance';
import {
  L14_EXPERIMENT_CLASS_ALLOWED_SURFACES,
  L14ExperimentMetricClass,
  type L14DeliveryExperiment,
  type L14ExperimentAssignment,
} from '../contracts/l14-experiment-governance';
import {
  L14OperationalProhibitedActionClass,
  type L14OperationalIncidentRecord,
  type L14OperationalPlaybook,
  type L14OperationalSignalRecord,
} from '../contracts/l14-operational-governance';
import {
  L14AnalystOperationalActionClass,
  type L14AnalystOperationalActionRecord,
} from '../contracts/l14-analyst-operations';
import {
  intentFromAnalystInput,
  isL14ExperimentSurfaceLegalForClass,
  type L14AnalystActionIntentSignal,
  type L14AnalystOperationalActionInput,
} from '../operations/l14-live-operations-engines';
import { L14LiveOperationsViolationCode as C } from './l14-live-operations-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14LiveOperationsIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14LiveOperationsValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14LiveOperationsIssue[];
}

function result(issues: readonly L14LiveOperationsIssue[]): L14LiveOperationsValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14LiveOperationsIssue {
  return { code, severity, message };
}

// ── 1. Channel rollout ───────────────────────────────────────────

export function validateL14ChannelRolloutPolicy(
  p: L14ChannelRolloutPolicy,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!ALL_L14_LIVE_ROLLOUT_STATUSES.includes(p.rollout_status)) {
    issues.push(err(C.L14L_CHANNEL_ROLLOUT_STATUS_ILLEGAL, SEV.CRITICAL, `unknown rollout status: ${p.rollout_status}`));
  }
  // Telegram requires opt-in.
  if (p.channel === 'TELEGRAM' && !p.requires_user_opt_in) {
    issues.push(err(C.L14L_TELEGRAM_GATE_MISSING_OPT_IN, SEV.CRITICAL, 'Telegram channel rollout missing user opt-in'));
  }
  return result(issues);
}

// ── 2. Alert class rollout ───────────────────────────────────────

export function validateL14AlertClassRolloutPolicy(
  p: L14AlertClassRolloutPolicy,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!ALL_L14_LIVE_ROLLOUT_STATUSES.includes(p.rollout_status)) {
    issues.push(err(C.L14L_ALERT_CLASS_ROLLOUT_STATUS_ILLEGAL, SEV.CRITICAL, `unknown rollout status: ${p.rollout_status}`));
  }
  // Reject if channel appears in both eligible and blocked.
  for (const c of p.eligible_channels) {
    if (p.blocked_channels.includes(c)) {
      issues.push(err(C.L14L_ALERT_CLASS_CHANNEL_NOT_ALLOWED, SEV.ERROR,
        `channel ${c} appears in both eligible and blocked`));
    }
  }
  return result(issues);
}

// ── 3. Telegram delivery gate ────────────────────────────────────

export function validateL14TelegramDeliveryGate(
  g: L14TelegramDeliveryGate,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if ((g.user_opt_in_required as unknown) !== true) {
    issues.push(err(C.L14L_TELEGRAM_GATE_MISSING_OPT_IN, SEV.CRITICAL, 'user_opt_in_required must be true'));
  }
  if ((g.valid_chat_binding_required as unknown) !== true) {
    issues.push(err(C.L14L_TELEGRAM_GATE_BINDING_MISSING, SEV.CRITICAL, 'valid_chat_binding_required must be true'));
  }
  if (!g.bot_integration_ref) {
    issues.push(err(C.L14L_TELEGRAM_GATE_BINDING_MISSING, SEV.CRITICAL, 'bot_integration_ref missing'));
  }
  return result(issues);
}

// ── 4. Push enablement gate ──────────────────────────────────────

export function validateL14PushEnablementGate(
  g: L14PushEnablementGate,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (g.production_enablement_allowed === true &&
      g.current_rollout_status === L14LiveRolloutStatus.RESERVED_NOT_EMISSIBLE) {
    issues.push(err(C.L14L_RESERVED_PUSH_ENABLEMENT_ATTEMPT, SEV.CRITICAL,
      'push enablement attempted while still RESERVED_NOT_EMISSIBLE'));
  }
  if (g.current_rollout_status === L14LiveRolloutStatus.PRODUCTION_ENABLED) {
    issues.push(err(C.L14L_RESERVED_PUSH_ENABLEMENT_ATTEMPT, SEV.CRITICAL,
      'push status PRODUCTION_ENABLED is not legal without upstream L14.2 recertification'));
  }
  return result(issues);
}

// ── 5. Preference profile ────────────────────────────────────────

export function validateL14DeliveryPreferenceProfile(
  p: L14DeliveryPreferenceProfile,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  for (const c of p.enabled_channels) {
    if (p.muted_channels.includes(c)) {
      issues.push(err(C.L14L_PREFERENCE_PROFILE_CONFLICTING_CHANNEL_STATE, SEV.ERROR,
        `channel ${c} both enabled and muted`));
    }
  }
  for (const a of p.enabled_alert_classes) {
    if (p.muted_alert_classes.includes(a)) {
      issues.push(err(C.L14L_PREFERENCE_PROFILE_CONFLICTING_ALERT_CLASS_STATE, SEV.ERROR,
        `alert class ${a} both enabled and muted`));
    }
  }
  if (p.max_alerts_per_window !== undefined && p.max_alerts_per_window <= 0) {
    issues.push(err(C.L14L_PREFERENCE_PROFILE_CAP_INVALID, SEV.ERROR,
      `max_alerts_per_window must be > 0 if set (got ${p.max_alerts_per_window})`));
  }
  // Digest-only preference conflicting with implicit immediate.
  if (p.digest_preference === L14DigestPreferenceClass.IMMEDIATE_ONLY &&
      p.muted_channels.length === p.enabled_channels.length && p.enabled_channels.length > 0 &&
      p.muted_channels.every(c => p.enabled_channels.includes(c))) {
    issues.push(err(C.L14L_PREFERENCE_PROFILE_CONFLICTING_CHANNEL_STATE, SEV.ERROR,
      'IMMEDIATE_ONLY preference but all enabled channels are also muted'));
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    issues.push(err(C.L14L_PREFERENCE_PROFILE_CAP_INVALID, SEV.ERROR, 'lineage_refs missing'));
  }
  if (!p.replay_hash) {
    issues.push(err(C.L14L_PREFERENCE_PROFILE_CAP_INVALID, SEV.ERROR, 'replay_hash missing'));
  }
  return result(issues);
}

// ── 6. Quiet hours profile ──────────────────────────────────────

const TIME_HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateL14QuietHoursProfile(
  q: L14QuietHoursProfile,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!TIME_HH_MM.test(q.quiet_hours_start_local) || !TIME_HH_MM.test(q.quiet_hours_end_local)) {
    issues.push(err(C.L14L_QUIET_HOURS_PROFILE_INVALID, SEV.ERROR, 'quiet hours times must be HH:MM 24h local'));
  }
  if (!q.active_weekday_mask || q.active_weekday_mask.length === 0) {
    issues.push(err(C.L14L_QUIET_HOURS_PROFILE_INVALID, SEV.ERROR, 'active_weekday_mask empty'));
  }
  const validDays = Object.values(L14Weekday);
  for (const d of q.active_weekday_mask) {
    if (!validDays.includes(d)) {
      issues.push(err(C.L14L_QUIET_HOURS_PROFILE_INVALID, SEV.ERROR, `unknown weekday: ${d}`));
    }
  }
  return result(issues);
}

// ── 7. Preference snapshot ──────────────────────────────────────

export function validateL14DeliveryPreferenceSnapshot(
  s: L14DeliveryPreferenceSnapshot,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!s.preference_snapshot_id) {
    issues.push(err(C.L14L_PREFERENCE_SNAPSHOT_MISSING, SEV.ERROR, 'preference_snapshot_id missing'));
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    issues.push(err(C.L14L_PREFERENCE_SNAPSHOT_MISSING, SEV.ERROR, 'snapshot lineage empty'));
  }
  return result(issues);
}

// ── 8. Live control decision ────────────────────────────────────

export function validateL14LiveDeliveryControlDecision(
  d: L14LiveDeliveryControlDecision,
  policy?: L14SeverityOverridePolicy,
  digest?: L14DigestDowngradePolicy,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  // Override applied legally requires policy + eligible_alert/priority + may_bypass flags + production-enabled flag in policy.
  if (d.severity_override_effect === L14SeverityOverrideEffectClass.OVERRIDE_APPLIED_LEGALLY) {
    if (!policy) {
      issues.push(err(C.L14L_SEVERITY_OVERRIDE_POLICY_MISSING, SEV.CRITICAL,
        'override applied but no severity override policy provided'));
    } else if ((policy.requires_channel_rollout_production_enabled as unknown) !== true) {
      issues.push(err(C.L14L_QUIET_HOURS_OVERRIDE_ILLEGAL, SEV.CRITICAL,
        'override applied without production_enabled requirement'));
    }
  }
  // Final status DIGEST_DOWNGRADE_REQUIRED must have a downgrade-allowing condition in digest policy.
  if (d.final_live_control_status === L14LiveControlStatus.DIGEST_DOWNGRADE_REQUIRED && !digest) {
    issues.push(err(C.L14L_DIGEST_DOWNGRADE_POLICY_MISSING, SEV.ERROR,
      'digest downgrade required but no digest policy reference provided'));
  }
  return result(issues);
}

// ── 9. Severity override policy validity ────────────────────────

export function validateL14SeverityOverrideAlertEligibility(
  policy: L14SeverityOverridePolicy,
  alert_class_ref: string,
  attempted: boolean,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (attempted && !policy.eligible_alert_class_refs.includes(alert_class_ref)) {
    issues.push(err(C.L14L_SEVERITY_OVERRIDE_USED_ON_INELIGIBLE_ALERT, SEV.CRITICAL,
      `severity override used on ineligible alert class: ${alert_class_ref}`));
  }
  return result(issues);
}

// ── 10. Experiment ──────────────────────────────────────────────

export function validateL14DeliveryExperiment(
  e: L14DeliveryExperiment,
  attempts: {
    truth_mutation_attempt?: boolean;
    safety_mutation_attempt?: boolean;
    grounding_mutation_attempt?: boolean;
    disclosure_mutation_attempt?: boolean;
  } = {},
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!isL14ExperimentSurfaceLegalForClass(e.experiment_class, e.allowed_variation_surface)) {
    issues.push(err(C.L14L_EXPERIMENT_SURFACE_PROHIBITED, SEV.CRITICAL,
      `surface ${e.allowed_variation_surface} prohibited for class ${e.experiment_class}`));
  }
  // Type-level hard pins must remain `true`.
  if ((e.prohibited_truth_mutation as unknown) !== true) {
    issues.push(err(C.L14L_EXPERIMENT_TRUTH_MUTATION_ATTEMPT, SEV.CRITICAL, 'prohibited_truth_mutation must be true'));
  }
  if ((e.prohibited_safety_mutation as unknown) !== true) {
    issues.push(err(C.L14L_EXPERIMENT_SAFETY_MUTATION_ATTEMPT, SEV.CRITICAL, 'prohibited_safety_mutation must be true'));
  }
  if ((e.prohibited_grounding_mutation as unknown) !== true) {
    issues.push(err(C.L14L_EXPERIMENT_GROUNDING_MUTATION_ATTEMPT, SEV.CRITICAL, 'prohibited_grounding_mutation must be true'));
  }
  if ((e.prohibited_contradiction_disclosure_mutation as unknown) !== true) {
    issues.push(err(C.L14L_EXPERIMENT_DISCLOSURE_MUTATION_ATTEMPT, SEV.CRITICAL, 'prohibited_contradiction_disclosure_mutation must be true'));
  }
  if ((e.prohibited_restriction_mutation as unknown) !== true) {
    issues.push(err(C.L14L_EXPERIMENT_DISCLOSURE_MUTATION_ATTEMPT, SEV.CRITICAL, 'prohibited_restriction_mutation must be true'));
  }
  if (attempts.truth_mutation_attempt) {
    issues.push(err(C.L14L_EXPERIMENT_TRUTH_MUTATION_ATTEMPT, SEV.CRITICAL, 'experiment attempted truth mutation'));
  }
  if (attempts.safety_mutation_attempt) {
    issues.push(err(C.L14L_EXPERIMENT_SAFETY_MUTATION_ATTEMPT, SEV.CRITICAL, 'experiment attempted safety mutation'));
  }
  if (attempts.grounding_mutation_attempt) {
    issues.push(err(C.L14L_EXPERIMENT_GROUNDING_MUTATION_ATTEMPT, SEV.CRITICAL, 'experiment attempted grounding mutation'));
  }
  if (attempts.disclosure_mutation_attempt) {
    issues.push(err(C.L14L_EXPERIMENT_DISCLOSURE_MUTATION_ATTEMPT, SEV.CRITICAL, 'experiment attempted contradiction/restriction disclosure mutation'));
  }
  return result(issues);
}

// ── 11. Experiment assignment ───────────────────────────────────

export function validateL14ExperimentAssignment(
  a: L14ExperimentAssignment,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (a.assignment_basis !== 'DETERMINISTIC_HASH_BUCKET') {
    issues.push(err(C.L14L_EXPERIMENT_ASSIGNMENT_NOT_DETERMINISTIC, SEV.CRITICAL,
      'experiment assignment must be DETERMINISTIC_HASH_BUCKET'));
  }
  if (!a.replay_hash) {
    issues.push(err(C.L14L_EXPERIMENT_ASSIGNMENT_NOT_DETERMINISTIC, SEV.ERROR, 'assignment replay_hash missing'));
  }
  return result(issues);
}

// ── 12. Experiment metric legality ──────────────────────────────

const ALLOWED_EXPERIMENT_METRICS = new Set<string>(Object.values(L14ExperimentMetricClass));

export function validateL14ExperimentMetric(
  metric_class: string,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!ALLOWED_EXPERIMENT_METRICS.has(metric_class)) {
    issues.push(err(C.L14L_EXPERIMENT_METRIC_NOT_ALLOWED, SEV.CRITICAL,
      `experiment metric ${metric_class} not allowed (correctness must use L14.5)`));
  }
  return result(issues);
}

// ── 13. Operational signal ──────────────────────────────────────

export function validateL14OperationalSignalRecord(
  s: L14OperationalSignalRecord,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!s.source_read_surface_refs || s.source_read_surface_refs.length === 0) {
    issues.push(err(C.L14L_OPERATIONAL_SIGNAL_SOURCE_READ_SURFACE_MISSING, SEV.ERROR,
      'operational signal missing source read surface refs'));
  }
  return result(issues);
}

// ── 14. Operational incident ────────────────────────────────────

export function validateL14OperationalIncidentRecord(
  i: L14OperationalIncidentRecord,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if (!i.recommended_playbook_ref) {
    issues.push(err(C.L14L_OPERATIONAL_INCIDENT_WITHOUT_PLAYBOOK, SEV.ERROR,
      'operational incident must have a recommended playbook ref'));
  }
  return result(issues);
}

// ── 15. Operational playbook ────────────────────────────────────

export function validateL14OperationalPlaybook(
  p: L14OperationalPlaybook,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  const required = Object.values(L14OperationalProhibitedActionClass);
  for (const r of required) {
    if (!p.prohibited_actions.includes(r)) {
      issues.push(err(C.L14L_PLAYBOOK_PROHIBITED_ACTION_PRESENT, SEV.CRITICAL,
        `playbook missing prohibited-action declaration: ${r}`));
    }
  }
  return result(issues);
}

// ── 16. Analyst operational action ──────────────────────────────

export function validateL14AnalystOperationalActionRecord(
  r: L14AnalystOperationalActionRecord,
  intent?: L14AnalystActionIntentSignal,
): L14LiveOperationsValidationResult {
  const issues: L14LiveOperationsIssue[] = [];
  if ((r.lower_layer_mutation_attempted as unknown) !== false) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_LOWER_LAYER_MUTATION, SEV.CRITICAL,
      'lower_layer_mutation_attempted must be false'));
  }
  if ((r.historical_truth_mutation_attempted as unknown) !== false) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_HISTORY_MUTATION, SEV.CRITICAL,
      'historical_truth_mutation_attempted must be false'));
  }
  if ((r.user_preference_bypass_attempted as unknown) !== false) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_USER_PREFERENCE_BYPASS, SEV.CRITICAL,
      'user_preference_bypass_attempted must be false'));
  }
  if (intent?.intent_mutate_lower_layer) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_LOWER_LAYER_MUTATION, SEV.CRITICAL,
      'analyst intent to mutate lower layer'));
  }
  if (intent?.intent_mutate_history) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_HISTORY_MUTATION, SEV.CRITICAL,
      'analyst intent to mutate history'));
  }
  if (intent?.intent_bypass_user_preference) {
    issues.push(err(C.L14L_ANALYST_ACTION_ATTEMPTED_USER_PREFERENCE_BYPASS, SEV.CRITICAL,
      'analyst intent to bypass user preference'));
  }
  return result(issues);
}

// Convenience: validate full analyst action from input + record.
export function validateL14AnalystOperationalAction(
  input: L14AnalystOperationalActionInput,
  record: L14AnalystOperationalActionRecord,
): L14LiveOperationsValidationResult {
  return validateL14AnalystOperationalActionRecord(record, intentFromAnalystInput(input));
}
