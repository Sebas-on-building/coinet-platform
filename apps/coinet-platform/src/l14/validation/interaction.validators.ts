/**
 * L14.4 — Interaction Validators
 *
 * §14.4.42 — Consolidated per-shape validators.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14InteractionActorClass,
  L14InteractionAttributionQuality,
  L14InteractionType,
  type L14UserInteractionEvent,
} from '../contracts/interaction-event';
import type {
  L14DeeperInvestigationConversionRecord,
  L14FeedbackInteractionBridge,
  L14IgnoredAlertDerivationRecord,
  L14InteractionDeduplicationKey,
  L14InteractionExpectationResolution,
} from '../contracts/interaction-derivation';
import {
  L14IgnoredAlertClassificationStatus,
  L14InteractionExpectationResolutionStatus,
} from '../contracts/interaction-derivation';
import {
  L14ForbiddenBehavioralConclusion,
  type L14InteractionInterpretationPolicy,
} from '../contracts/interaction-interpretation';
import { L14InteractionViolationCode as C } from './l14-interaction-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;
const RAW_USER_HINTS = [/@/, /^user_[0-9]+$/i, /^email:/i];

export interface L14InteractionIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14InteractionValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14InteractionIssue[];
}

function result(issues: readonly L14InteractionIssue[]): L14InteractionValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14InteractionIssue {
  return { code, severity, message };
}

// ── 1. Interaction event ─────────────────────────────────────────

export function validateL14UserInteractionEvent(
  e: L14UserInteractionEvent,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!e.interaction_event_id) issues.push(err(C.L14I_INTERACTION_EVENT_ID_MISSING, SEV.ERROR, 'interaction_event_id missing'));
  if (!e.interaction_type) issues.push(err(C.L14I_INTERACTION_TYPE_MISSING, SEV.ERROR, 'interaction_type missing'));
  if (!e.interaction_context) issues.push(err(C.L14I_INTERACTION_CONTEXT_MISSING, SEV.ERROR, 'interaction_context missing'));
  if (!e.occurred_at) issues.push(err(C.L14I_OCCURRED_AT_MISSING, SEV.ERROR, 'occurred_at missing'));
  if (!e.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  if (e.lineage_refs.length === 0) issues.push(err(C.L14I_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  // Privacy: raw user identifier in user_id_hash field must be hashed.
  if (e.user_id_hash) {
    for (const p of RAW_USER_HINTS) {
      if (p.test(e.user_id_hash)) {
        issues.push(err(C.L14I_RAW_USER_IDENTIFIER_PRESENT, SEV.CRITICAL, 'raw user identifier present in user_id_hash'));
        break;
      }
    }
  }
  // User-actor events require user_id_hash OR session_id_hash.
  if (e.actor_class === L14InteractionActorClass.USER && !e.user_id_hash && !e.session_id_hash) {
    issues.push(err(C.L14I_USER_HASH_REQUIRED_BUT_MISSING, SEV.ERROR, 'user-actor event missing user/session hash'));
  }
  // Source-ref admissibility law.
  const t = e.interaction_type;
  if ([L14InteractionType.ALERT_DELIVERED, L14InteractionType.ALERT_OPENED, L14InteractionType.ALERT_CLICKED, L14InteractionType.ALERT_DISMISSED].includes(t) && !e.source_execution_ref) {
    issues.push(err(C.L14I_ALERT_EVENT_MISSING_EXECUTION_REF, SEV.ERROR, `${t} missing source_execution_ref`));
  }
  if (t === L14InteractionType.ALERT_IGNORED) {
    if (!e.source_execution_ref) issues.push(err(C.L14I_ALERT_EVENT_MISSING_EXECUTION_REF, SEV.ERROR, 'ALERT_IGNORED missing source_execution_ref'));
    if (!e.source_feedback_expectation_ref) issues.push(err(C.L14I_EXPECTATION_RESOLUTION_MISSING_EXPECTATION_REF, SEV.CRITICAL, 'ALERT_IGNORED missing expectation_ref'));
    if (!e.derived_from_window_resolution) issues.push(err(C.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED, SEV.CRITICAL, 'ALERT_IGNORED must be derived from window resolution'));
  }
  if (t === L14InteractionType.TOKEN_REPORT_SAVED && !e.interaction_context.related_report_ref) {
    issues.push(err(C.L14I_REPORT_SAVE_MISSING_REPORT_REF, SEV.ERROR, 'TOKEN_REPORT_SAVED missing related_report_ref'));
  }
  if ((t === L14InteractionType.WATCHLIST_ADD || t === L14InteractionType.WATCHLIST_REMOVE) && !e.interaction_context.related_asset_scope_ref) {
    issues.push(err(C.L14I_WATCHLIST_ACTION_MISSING_SCOPE_REF, SEV.ERROR, `${t} missing related_asset_scope_ref`));
  }
  if (t === L14InteractionType.CHAT_FOLLOW_UP_ASKED) {
    if (!e.interaction_context.related_chat_thread_ref) issues.push(err(C.L14I_CHAT_FOLLOWUP_MISSING_PRIOR_OUTPUT_REF, SEV.ERROR, 'CHAT_FOLLOW_UP_ASKED missing chat thread ref'));
    if (!e.source_output_ref) issues.push(err(C.L14I_CHAT_FOLLOWUP_MISSING_PRIOR_OUTPUT_REF, SEV.ERROR, 'CHAT_FOLLOW_UP_ASKED missing source_output_ref'));
  }
  // Attribution honesty.
  if (e.attribution_quality === L14InteractionAttributionQuality.DIRECT) {
    if (!e.source_execution_ref && !e.source_output_ref) {
      issues.push(err(C.L14I_DIRECT_ATTRIBUTION_WITHOUT_SOURCE_REF, SEV.CRITICAL, 'DIRECT attribution without source ref'));
    }
  }
  return result(issues);
}

// ── 2. Deduplication key ────────────────────────────────────────

export function validateL14InteractionDeduplicationKey(
  k: L14InteractionDeduplicationKey,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!k.deduplication_key_id) issues.push(err(C.L14I_DEDUPLICATION_KEY_MISSING, SEV.ERROR, 'deduplication_key_id missing'));
  if (!k.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'dedup replay_hash missing'));
  return result(issues);
}

// ── 3. Ignored derivation ──────────────────────────────────────

export function validateL14IgnoredAlertDerivation(
  r: L14IgnoredAlertDerivationRecord,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!r.ignored_derivation_id) issues.push(err(C.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED, SEV.ERROR, 'ignored_derivation_id missing'));
  if (!r.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'derivation replay_hash missing'));
  if (r.ignored_classification_status === L14IgnoredAlertClassificationStatus.CLASSIFIED_IGNORED) {
    if (!r.observation_window_elapsed) {
      issues.push(err(C.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED, SEV.CRITICAL, 'classified IGNORED before window elapsed'));
    }
    if (!r.delivered_successfully) {
      issues.push(err(C.L14I_IGNORED_DERIVED_AFTER_FAILED_DELIVERY, SEV.CRITICAL, 'classified IGNORED after failed delivery'));
    }
    if (r.qualifying_interaction_refs.length > 0) {
      issues.push(err(C.L14I_IGNORED_DERIVED_DESPITE_QUALIFYING_INTERACTION, SEV.CRITICAL, 'classified IGNORED despite qualifying interactions'));
    }
    if (!r.source_feedback_expectation_ref) {
      issues.push(err(C.L14I_EXPECTATION_RESOLUTION_MISSING_EXPECTATION_REF, SEV.CRITICAL, 'classified IGNORED without expectation_ref'));
    }
  }
  return result(issues);
}

// ── 4. Conversion record ───────────────────────────────────────

export function validateL14DeeperInvestigationConversion(
  c: L14DeeperInvestigationConversionRecord,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!c.target_ref) issues.push(err(C.L14I_CONVERSION_RECORD_MISSING_TARGET, SEV.ERROR, 'conversion record missing target_ref'));
  if (!c.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'conversion replay_hash missing'));
  if (c.attribution_quality === L14InteractionAttributionQuality.DIRECT && !c.originating_delivery_ref) {
    issues.push(err(C.L14I_CONVERSION_ATTRIBUTION_ILLEGAL, SEV.CRITICAL, 'DIRECT conversion without originating delivery ref'));
  }
  return result(issues);
}

// ── 5. Feedback bridge ─────────────────────────────────────────

export function validateL14FeedbackInteractionBridge(
  b: L14FeedbackInteractionBridge,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!b.l13_feedback_record_ref) issues.push(err(C.L14I_FEEDBACK_EVENT_MISSING_L13_FEEDBACK_REF, SEV.ERROR, 'feedback bridge missing L13 ref'));
  if (!b.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'feedback bridge replay_hash missing'));
  return result(issues);
}

// ── 6. Expectation resolution ──────────────────────────────────

export function validateL14InteractionExpectationResolution(
  r: L14InteractionExpectationResolution,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (!r.feedback_expectation_ref) issues.push(err(C.L14I_EXPECTATION_RESOLUTION_MISSING_EXPECTATION_REF, SEV.ERROR, 'feedback_expectation_ref missing'));
  if (!r.replay_hash) issues.push(err(C.L14I_REPLAY_HASH_MISSING, SEV.ERROR, 'expectation resolution replay_hash missing'));
  if (r.observation_window_elapsed && r.expectation_status === L14InteractionExpectationResolutionStatus.EXPECTATION_UNSATISFIED_WINDOW_OPEN) {
    issues.push(err(C.L14I_EXPECTATION_EXPIRED_WITHOUT_RESOLUTION, SEV.CRITICAL, 'window elapsed but expectation still marked UNSATISFIED_WINDOW_OPEN'));
  }
  return result(issues);
}

// ── 7. Interpretation policy validator ─────────────────────────

export function validateL14InteractionInterpretationPolicy(
  p: L14InteractionInterpretationPolicy,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  // Forbidden conclusions must include FACTUAL_CORRECTNESS or AUTOMATIC_ERROR for high-risk types.
  const t = p.interaction_type;
  const forbids = new Set(p.cannot_prove);
  if (t === L14InteractionType.ALERT_OPENED && !forbids.has(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS)) {
    issues.push(err(C.L14I_BEHAVIOR_INTERPRETED_AS_CORRECTNESS, SEV.CRITICAL, 'ALERT_OPENED policy missing FACTUAL_CORRECTNESS prohibition'));
  }
  if (t === L14InteractionType.FEEDBACK_POSITIVE && !forbids.has(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS)) {
    issues.push(err(C.L14I_FEEDBACK_INTERPRETED_AS_TRUTH, SEV.CRITICAL, 'FEEDBACK_POSITIVE policy missing FACTUAL_CORRECTNESS prohibition'));
  }
  if (t === L14InteractionType.FEEDBACK_NEGATIVE && !forbids.has(L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR)) {
    issues.push(err(C.L14I_FEEDBACK_INTERPRETED_AS_TRUTH, SEV.CRITICAL, 'FEEDBACK_NEGATIVE policy missing AUTOMATIC_ERROR prohibition'));
  }
  if (t === L14InteractionType.TOKEN_REPORT_SAVED && !forbids.has(L14ForbiddenBehavioralConclusion.FACTUAL_CORRECTNESS)) {
    issues.push(err(C.L14I_REPORT_SAVE_INTERPRETED_AS_FACTUAL_VALIDATION, SEV.CRITICAL, 'TOKEN_REPORT_SAVED policy missing FACTUAL_CORRECTNESS prohibition'));
  }
  if (t === L14InteractionType.ALERT_IGNORED && !forbids.has(L14ForbiddenBehavioralConclusion.AUTOMATIC_ERROR)) {
    issues.push(err(C.L14I_ALERT_IGNORE_INTERPRETED_AS_WRONG_ALERT, SEV.CRITICAL, 'ALERT_IGNORED policy missing AUTOMATIC_ERROR prohibition'));
  }
  // Calibration directness must be false.
  if (p.may_feed_truth_calibration_directly !== false) {
    issues.push(err(C.L14I_BEHAVIOR_INTERPRETED_AS_CORRECTNESS, SEV.CRITICAL, 'policy must not feed truth calibration directly'));
  }
  return result(issues);
}

// ── 8. Dismissed vs ignored conflation ────────────────────────

export function validateL14DismissedIgnoredSeparation(
  dismissed: L14UserInteractionEvent,
  ignored: L14IgnoredAlertDerivationRecord,
): L14InteractionValidationResult {
  const issues: L14InteractionIssue[] = [];
  if (
    dismissed.interaction_type === L14InteractionType.ALERT_DISMISSED &&
    dismissed.source_execution_ref &&
    ignored.source_execution_ref === dismissed.source_execution_ref &&
    ignored.ignored_classification_status === L14IgnoredAlertClassificationStatus.CLASSIFIED_IGNORED
  ) {
    issues.push(err(C.L14I_DISMISSED_AND_IGNORED_CONFLATED, SEV.CRITICAL, 'same execution_ref classified both dismissed and ignored'));
  }
  return result(issues);
}
