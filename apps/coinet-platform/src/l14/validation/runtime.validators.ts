/**
 * L14.3 — Runtime Validators
 *
 * §14.3.51 — Per-shape validators for every runtime artifact.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from '../contracts/delivery-channel';
import {
  L14_RUNTIME_STAGE_ORDER,
  L14DeliveryRuntimeStage,
  l14StageIndex,
  type L14DeliveryRuntimeContext,
} from '../contracts/delivery-runtime-stage';
import type {
  L14DeliveryCandidate,
  L14DeliveryRuntimeRequest,
} from '../contracts/delivery-runtime-request';
import {
  L14DeliveryCandidateStatus,
} from '../contracts/delivery-runtime-request';
import type {
  L14AudienceResolutionResult,
  L14ChannelResolutionResult,
  L14DeliveryEligibilityResult,
  L14PreferenceEntitlementBinding,
} from '../contracts/delivery-resolution';
import {
  L14DeliveryEligibilityStatus,
  L14PreferenceBindingStatus,
} from '../contracts/delivery-resolution';
import type {
  L14DeliveryPriorityProfile,
  L14DeliveryUrgencyProfile,
} from '../contracts/delivery-priority-urgency';
import { L14DeliveryUrgencyClass, L14DeliveryPriorityClass } from '../contracts/delivery-priority';
import {
  L14CooldownStatus,
  L14DeliveryDisposition,
  L14DuplicationStatus,
  type L14CooldownEvaluationResult,
  type L14DeliveryDispositionDecision,
  type L14DeliverySuppressionRecord,
  type L14DuplicationCheckResult,
} from '../contracts/delivery-disposition';
import type {
  L14ChannelPayloadAssemblyResult,
  L14DeliveryEventMaterializationIntent,
  L14DeliveryExecutionRecord,
  L14DeliveryFeedbackExpectation,
} from '../contracts/delivery-execution';
import {
  L14DeliveryExecutionStatus,
  L14FeedbackExpectationStatus,
  L14PayloadAssemblyStatus,
} from '../contracts/delivery-execution';
import { getL14DeliveryChannelDefinition } from '../registry/delivery-channel.registry';
import { L14RuntimeViolationCode as C } from './l14-runtime-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14RuntimeIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14RuntimeValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14RuntimeIssue[];
}

import { L14RuntimeViolationCode } from './l14-runtime-violation-codes';

function result(issues: readonly L14RuntimeIssue[]): L14RuntimeValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: L14RuntimeViolationCode, severity: L14ConstitutionalAuditSeverity, message: string): L14RuntimeIssue {
  return { code, severity, message };
}

// ── Runtime request ──────────────────────────────────────────────

export function validateL14DeliveryRuntimeRequest(
  r: L14DeliveryRuntimeRequest,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!r.delivery_runtime_request_id) issues.push(err(C.L14R_RUNTIME_REQUEST_MISSING, SEV.ERROR, 'delivery_runtime_request_id missing'));
  if (!r.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'request replay_hash missing'));
  if (r.lineage_refs.length === 0) issues.push(err(C.L14R_LINEAGE_MISSING, SEV.ERROR, 'request lineage_refs empty'));
  return result(issues);
}

// ── Runtime context (stage ordering) ─────────────────────────────

export function validateL14DeliveryRuntimeContext(
  ctx: L14DeliveryRuntimeContext,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!ctx.runtime_run_id) issues.push(err(C.L14R_RUNTIME_CONTEXT_MISSING, SEV.ERROR, 'runtime_run_id missing'));
  if (!ctx.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'context replay_hash missing'));
  // Sealed stages must be a forward-only prefix of L14_RUNTIME_STAGE_ORDER.
  for (let i = 0; i < ctx.sealed_stages.length; i++) {
    if (ctx.sealed_stages[i] !== L14_RUNTIME_STAGE_ORDER[i]) {
      issues.push(err(C.L14R_STAGE_ORDER_ILLEGAL, SEV.CRITICAL, `sealed stage[${i}] is ${ctx.sealed_stages[i]} (expected ${L14_RUNTIME_STAGE_ORDER[i]})`));
      break;
    }
  }
  const curIdx = l14StageIndex(ctx.current_stage);
  if (curIdx === -1) issues.push(err(C.L14R_STAGE_ORDER_ILLEGAL, SEV.CRITICAL, `current_stage ${ctx.current_stage} not in canonical order`));
  return result(issues);
}

// ── Candidate ────────────────────────────────────────────────────

export function validateL14DeliveryCandidate(
  c: L14DeliveryCandidate,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!c.delivery_candidate_id) issues.push(err(C.L14R_DELIVERY_CANDIDATE_MISSING, SEV.ERROR, 'delivery_candidate_id missing'));
  if (!c.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'candidate replay_hash missing'));
  if (c.lineage_refs.length === 0) issues.push(err(C.L14R_LINEAGE_MISSING, SEV.ERROR, 'candidate lineage_refs empty'));
  if (c.candidate_status === L14DeliveryCandidateStatus.INELIGIBLE_SOURCE) {
    issues.push(err(C.L14R_CANDIDATE_SOURCE_UNGOVERNED, SEV.CRITICAL, 'candidate source ungoverned'));
  }
  return result(issues);
}

// ── Eligibility ─────────────────────────────────────────────────

export function validateL14DeliveryEligibility(
  e: L14DeliveryEligibilityResult,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!e.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'eligibility replay_hash missing'));
  if (e.eligible && e.eligibility_status !== L14DeliveryEligibilityStatus.ELIGIBLE) {
    issues.push(err(C.L14R_ELIGIBILITY_FALSE_GREEN, SEV.CRITICAL, 'eligible=true but status not ELIGIBLE'));
  }
  if (!e.eligible && e.eligibility_status === L14DeliveryEligibilityStatus.ELIGIBLE) {
    issues.push(err(C.L14R_ELIGIBILITY_FALSE_GREEN, SEV.CRITICAL, 'eligible=false but status ELIGIBLE'));
  }
  return result(issues);
}

// ── Audience ────────────────────────────────────────────────────

export function validateL14AudienceResolution(
  a: L14AudienceResolutionResult,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!a.audience_resolution_id) issues.push(err(C.L14R_AUDIENCE_RESOLUTION_MISSING, SEV.ERROR, 'audience_resolution_id missing'));
  if (!a.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'audience replay_hash missing'));
  return result(issues);
}

// ── Channel resolution ─────────────────────────────────────────

export function validateL14ChannelResolution(
  r: L14ChannelResolutionResult,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!r.channel_resolution_id) issues.push(err(C.L14R_CHANNEL_RESOLUTION_MISSING, SEV.ERROR, 'channel_resolution_id missing'));
  const def = getL14DeliveryChannelDefinition(r.selected_channel);
  if (def?.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) {
    issues.push(err(C.L14R_CHANNEL_RESERVED_ROUTED, SEV.CRITICAL, `routed to reserved channel ${r.selected_channel}`));
  }
  return result(issues);
}

// ── Preference binding ─────────────────────────────────────────

export function validateL14PreferenceBinding(
  p: L14PreferenceEntitlementBinding,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!p.preference_binding_id) issues.push(err(C.L14R_ENTITLEMENT_BINDING_MISSING, SEV.ERROR, 'preference_binding_id missing'));
  if (!p.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'preference replay_hash missing'));
  return result(issues);
}

// ── Priority ───────────────────────────────────────────────────

export function validateL14DeliveryPriority(
  p: L14DeliveryPriorityProfile,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!p.priority_profile_id) issues.push(err(C.L14R_PRIORITY_PROFILE_MISSING, SEV.ERROR, 'priority_profile_id missing'));
  if (p.final_priority_score < 0 || p.final_priority_score > 100) {
    issues.push(err(C.L14R_PRIORITY_SCORE_OUT_OF_BOUNDS, SEV.ERROR, `final_priority_score=${p.final_priority_score} out of bounds`));
  }
  // Class must agree with score.
  let expected: L14DeliveryPriorityClass;
  const s = p.final_priority_score;
  if (s >= 90) expected = L14DeliveryPriorityClass.CRITICAL;
  else if (s >= 75) expected = L14DeliveryPriorityClass.HIGH;
  else if (s >= 55) expected = L14DeliveryPriorityClass.MATERIAL;
  else if (s >= 35) expected = L14DeliveryPriorityClass.ROUTINE;
  else if (s >= 1) expected = L14DeliveryPriorityClass.LOW;
  else expected = L14DeliveryPriorityClass.SUPPRESSED;
  if (expected !== p.priority_class) {
    issues.push(err(C.L14R_PRIORITY_CLASS_MISMATCH, SEV.ERROR, `priority_class ${p.priority_class} does not match score ${s}`));
  }
  if (p.capped_by_restriction && p.priority_class === L14DeliveryPriorityClass.CRITICAL) {
    issues.push(err(C.L14R_PRIORITY_IGNORES_RESTRICTION_CAP, SEV.CRITICAL, 'restriction cap declared but priority still CRITICAL'));
  }
  return result(issues);
}

// ── Urgency ────────────────────────────────────────────────────

export function validateL14DeliveryUrgency(
  u: L14DeliveryUrgencyProfile,
  priority: L14DeliveryPriorityProfile,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!u.urgency_profile_id) issues.push(err(C.L14R_URGENCY_PROFILE_MISSING, SEV.ERROR, 'urgency_profile_id missing'));
  if (u.urgency_class === L14DeliveryUrgencyClass.IMMEDIATE && priority.priority_class !== L14DeliveryPriorityClass.CRITICAL && !u.urgency_reason_codes.some(r => r.includes('INVALIDATION') || r.includes('TRIGGER'))) {
    issues.push(err(C.L14R_FALSE_URGENCY_ESCALATION, SEV.CRITICAL, 'IMMEDIATE urgency without CRITICAL priority or active invalidation/trigger'));
  }
  return result(issues);
}

// ── Duplication ────────────────────────────────────────────────

export function validateL14Duplication(
  d: L14DuplicationCheckResult,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!d.duplication_result_id) issues.push(err(C.L14R_DUPLICATION_CHECK_MISSING, SEV.ERROR, 'duplication_result_id missing'));
  return result(issues);
}

// ── Cooldown ──────────────────────────────────────────────────

export function validateL14Cooldown(
  c: L14CooldownEvaluationResult,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!c.cooldown_evaluation_id) issues.push(err(C.L14R_COOLDOWN_CHECK_MISSING, SEV.ERROR, 'cooldown_evaluation_id missing'));
  if ((c.result_status === L14CooldownStatus.COOLDOWN_OVERRIDE_CRITICAL_ESCALATION || c.result_status === L14CooldownStatus.COOLDOWN_OVERRIDE_NEW_INVALIDATION || c.result_status === L14CooldownStatus.COOLDOWN_OVERRIDE_MATERIAL_CONTRADICTION_CHANGE) && !c.cooldown_override_reason) {
    issues.push(err(C.L14R_COOLDOWN_OVERRIDE_WITHOUT_REASON, SEV.CRITICAL, 'override status without override reason'));
  }
  return result(issues);
}

// ── Suppression ───────────────────────────────────────────────

export function validateL14Suppression(
  s: L14DeliverySuppressionRecord,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!s.suppression_id) issues.push(err(C.L14R_SUPPRESSION_REQUIRED_BUT_MISSING, SEV.CRITICAL, 'suppression_id missing'));
  if (!s.replay_hash) issues.push(err(C.L14R_REPLAY_HASH_MISSING, SEV.ERROR, 'suppression replay_hash missing'));
  return result(issues);
}

// ── Disposition ───────────────────────────────────────────────

export function validateL14Disposition(
  d: L14DeliveryDispositionDecision,
  suppression?: L14DeliverySuppressionRecord,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!d.disposition_decision_id) issues.push(err(C.L14R_SUPPRESSION_REQUIRED_BUT_MISSING, SEV.ERROR, 'disposition_decision_id missing'));
  if (d.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD && !suppression) {
    issues.push(err(C.L14R_SUPPRESSION_SILENT, SEV.CRITICAL, 'SUPPRESS_WITH_RECORD disposition without suppression record'));
  }
  if (d.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD && suppression && !d.suppression_record_ref) {
    issues.push(err(C.L14R_SUPPRESSION_SILENT, SEV.CRITICAL, 'suppression record present but decision missing ref'));
  }
  return result(issues);
}

// ── Payload assembly ──────────────────────────────────────────

export function validateL14PayloadAssembly(
  a: L14ChannelPayloadAssemblyResult,
  disposition: L14DeliveryDispositionDecision,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!a.payload_assembly_id) issues.push(err(C.L14R_PAYLOAD_ASSEMBLY_RENDERING_ILLEGAL, SEV.ERROR, 'payload_assembly_id missing'));
  if (!a.disposition_decision_ref || a.disposition_decision_ref !== disposition.disposition_decision_id) {
    issues.push(err(C.L14R_PAYLOAD_ASSEMBLY_BEFORE_DISPOSITION, SEV.CRITICAL, 'payload assembly does not reference disposition'));
  }
  if (a.assembly_status === L14PayloadAssemblyStatus.BLOCKED_MISSING_RENDERING_PROFILE || a.assembly_status === L14PayloadAssemblyStatus.BLOCKED_RENDERING_CONTRACT || a.assembly_status === L14PayloadAssemblyStatus.BLOCKED_SOURCE_SEMANTICS_RISK) {
    issues.push(err(C.L14R_PAYLOAD_ASSEMBLY_RENDERING_ILLEGAL, SEV.CRITICAL, `assembly blocked: ${a.assembly_status}`));
  }
  return result(issues);
}

// ── Execution ─────────────────────────────────────────────────

export function validateL14Execution(
  e: L14DeliveryExecutionRecord,
  disposition: L14DeliveryDispositionDecision,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!e.delivery_payload_ref) issues.push(err(C.L14R_EXECUTION_WITHOUT_PAYLOAD, SEV.CRITICAL, 'execution missing delivery_payload_ref'));
  if (disposition.disposition === L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY && e.delivery_status !== L14DeliveryExecutionStatus.BLOCKED_BEFORE_PROVIDER) {
    issues.push(err(C.L14R_EXECUTION_BEFORE_DELIVERABILITY, SEV.CRITICAL, 'illegal disposition but execution not BLOCKED_BEFORE_PROVIDER'));
  }
  if ((disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD || disposition.disposition === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY) &&
      (e.delivery_status === L14DeliveryExecutionStatus.SENT || e.delivery_status === L14DeliveryExecutionStatus.SENT_WITH_PROVIDER_ACK)) {
    issues.push(err(C.L14R_EXECUTION_BEFORE_DELIVERABILITY, SEV.CRITICAL, 'execution sent despite suppress/internal disposition'));
  }
  return result(issues);
}

// ── Materialization intent ────────────────────────────────────

export function validateL14MaterializationIntent(
  m: L14DeliveryEventMaterializationIntent,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!m.materialization_intent_id) issues.push(err(C.L14R_MATERIALIZATION_INTENT_MISSING, SEV.ERROR, 'materialization_intent_id missing'));
  return result(issues);
}

// ── Feedback expectation ──────────────────────────────────────

export function validateL14FeedbackExpectation(
  exp: L14DeliveryFeedbackExpectation,
  disposition: L14DeliveryDispositionDecision,
  channel: L14DeliveryChannel,
): L14RuntimeValidationResult {
  const issues: L14RuntimeIssue[] = [];
  if (!exp.feedback_expectation_id) issues.push(err(C.L14R_FEEDBACK_EXPECTATION_MISSING, SEV.ERROR, 'feedback_expectation_id missing'));
  const d = disposition.disposition;
  const channelDef = getL14DeliveryChannelDefinition(channel);
  const internal = channelDef?.internal_only === true || d === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY;
  const userFacingExecuting = (d === L14DeliveryDisposition.EXECUTE_IMMEDIATELY || d === L14DeliveryDisposition.EXECUTE_NEAR_REAL_TIME || d === L14DeliveryDisposition.DEFER_TO_DIGEST) && !internal;
  const onDemand = channel === L14DeliveryChannel.DASHBOARD || channel === L14DeliveryChannel.TOKEN_REPORT_PAGE;
  if (userFacingExecuting && !onDemand && exp.expectation_status !== L14FeedbackExpectationStatus.REGISTERED) {
    issues.push(err(C.L14R_FEEDBACK_EXPECTATION_MISSING, SEV.CRITICAL, 'user-facing executing delivery missing REGISTERED expectation'));
  }
  return result(issues);
}
