/**
 * L14.3 — Delivery Runtime Certification (Bands A..G)
 *
 * §14.3.55 — Proves the deterministic runtime DAG, eligibility,
 * resolution, priority/urgency, dedup/cooldown/suppression/merge,
 * payload assembly, execution, materialization, and feedback
 * expectation laws.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import { L14AudienceClass } from '../l14/contracts/audience-class';
import { L14DeliverableSourceArtifactClass } from '../l14/contracts/deliverable-source-artifact';
import { L14DeliveryChannel } from '../l14/contracts/delivery-channel';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../l14/contracts/delivery-priority';
import {
  L14DeliveryDisposition,
} from '../l14/contracts/delivery-disposition';
import {
  L14DeliveryExecutionStatus,
  L14FeedbackExpectationStatus,
} from '../l14/contracts/delivery-execution';
import {
  ALL_L14_DELIVERY_RUNTIME_STAGES,
  L14_RUNTIME_STAGE_ORDER,
  L14DeliveryRuntimeStage,
} from '../l14/contracts/delivery-runtime-stage';
import { L14DeliveryRuntimeTrigger } from '../l14/contracts/delivery-runtime-request';
import {
  runL14DeliveryRuntime,
  buildL14MergeRecord,
} from '../l14/runtime/delivery-runtime-engines';
import { L14MergeReason } from '../l14/contracts/delivery-disposition';
import {
  validateL14DeliveryCandidate,
  validateL14DeliveryEligibility,
  validateL14DeliveryPriority,
  validateL14DeliveryUrgency,
  validateL14Disposition,
  validateL14Execution,
  validateL14FeedbackExpectation,
  validateL14MaterializationIntent,
  validateL14PayloadAssembly,
  validateL14Suppression,
} from '../l14/validation/runtime.validators';
import { L14RuntimeViolationCode } from '../l14/validation/l14-runtime-violation-codes';
import {
  L14RuntimeDeliveryAuditSubjectClass,
  emitL14RuntimeDeliveryAuditRecord,
  getL14RuntimeDeliveryAuditLog,
  getL14RuntimeDeliveryCriticalViolations,
  isL14RuntimeBlockingCode,
  resetL14RuntimeDeliveryAuditLog,
  severityForL14RuntimeCode,
} from '../l14/constitution/l14-runtime-delivery-audit';
import { runAllL14_3Invariants } from '../l14/invariants/l14_3-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

function band(title: string): void {
  console.log(`\n── ${title} ──`);
}

const POLICY_V = 'l14.runtime.v1';

function buildRequest(opts: {
  source: L14DeliverableSourceArtifactClass;
  trigger: L14DeliveryRuntimeTrigger;
  channel?: L14DeliveryChannel;
  audience?: L14AudienceClass;
  user?: string;
  subject?: string;
}) {
  return {
    delivery_runtime_request_id: `l14.cert.req.${opts.source}.${opts.trigger}.${opts.channel ?? ''}.${opts.audience ?? ''}`,
    source_artifact_class: opts.source,
    source_artifact_ref: 'l14.cert.src',
    preferred_channel_hint: opts.channel,
    preferred_audience_hint: opts.audience,
    user_scope_ref: opts.user,
    subject_scope_ref: opts.subject,
    originating_layer: 'L13' as const,
    runtime_trigger: opts.trigger,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: 'cert.req',
    policy_version: POLICY_V,
  };
}

function defaultGreenInput(req: ReturnType<typeof buildRequest>) {
  return {
    request: req,
    entitlement_profile_ref: 'l14.cert.ent',
    channel_enabled: true,
    alert_class_enabled: true,
    quiet_hours_active: false,
    frequency_cap_reached: false,
    entitlement_clean: true,
    priority_inputs: {
      source_importance_score: 70,
      scenario_shift_score: 60,
      trigger_invalidation_score: 80,
      score_change_significance_score: 60,
      confidence_readiness_score: 80,
      novelty_score: 70,
      audience_relevance_score: 80,
    },
    urgency_inputs: {
      time_sensitivity_score: 80,
      decay_risk_score: 60,
      trigger_recency_score: 80,
      audience_time_relevance_score: 80,
      active_invalidation: true,
    },
    semantic_cluster_key: 'btc.invalidation',
    event_family_key: 'scenario.invalidation',
    cooldown_window_ms: 15 * 60 * 1000,
    cooldown_active: false,
    rendering_profile_ref: 'l14.cert.render',
    disclosure_profile_ref: 'l14.cert.disc',
    restriction_profile_ref: 'l14.cert.restr',
    delivery_payload_ref: 'l14.cert.payload',
    executed: true,
  };
}

// ── Band A : runtime DAG and stage law ─────────────────────────

band('BAND A — runtime DAG and stage law');

{
  assert(ALL_L14_DELIVERY_RUNTIME_STAGES.length === 12, `A.1 12 runtime stages registered (got ${ALL_L14_DELIVERY_RUNTIME_STAGES.length})`);
  assert(L14_RUNTIME_STAGE_ORDER.length === 12, 'A.2 stage order length is 12');
  for (let i = 0; i < L14_RUNTIME_STAGE_ORDER.length; i++) {
    assert(L14_RUNTIME_STAGE_ORDER[i] === ALL_L14_DELIVERY_RUNTIME_STAGES[i], `A.3 stage[${i}] order canonical`);
  }
  // First stage is CANDIDATE_ASSEMBLY; last is FEEDBACK_EXPECTATION_REGISTRATION.
  assert(L14_RUNTIME_STAGE_ORDER[0] === L14DeliveryRuntimeStage.CANDIDATE_ASSEMBLY, 'A.4 first stage = CANDIDATE_ASSEMBLY');
  assert(L14_RUNTIME_STAGE_ORDER[11] === L14DeliveryRuntimeStage.FEEDBACK_EXPECTATION_REGISTRATION, 'A.5 last stage = FEEDBACK_EXPECTATION_REGISTRATION');
  // Identical-input runs replay identically.
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const a = runL14DeliveryRuntime(defaultGreenInput(req));
  const b = runL14DeliveryRuntime(defaultGreenInput(req));
  assert(a.candidate.replay_hash === b.candidate.replay_hash, 'A.6 candidate replay deterministic');
  assert(a.priority.replay_hash === b.priority.replay_hash, 'A.7 priority replay deterministic');
  assert(a.disposition.replay_hash === b.disposition.replay_hash, 'A.8 disposition replay deterministic');
  assert(a.execution.replay_hash === b.execution.replay_hash, 'A.9 execution replay deterministic');
}

// ── Band B : candidate, eligibility, audience, channel ────────

band('BAND B — candidate, eligibility, audience, channel');

{
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.L13_ALERT_PAYLOAD_READY,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const r = runL14DeliveryRuntime(defaultGreenInput(req));
  assert(validateL14DeliveryCandidate(r.candidate).clean, 'B.1 valid L13 alert becomes delivery candidate');
  assert(r.eligibility.eligible, 'B.2 valid candidate eligible');
  assert(r.channel.selected_channel === L14DeliveryChannel.TELEGRAM, `B.3 channel resolved to Telegram (got ${r.channel.selected_channel})`);
  assert(r.audience.resolved_audience_class === L14AudienceClass.ALERT_SUBSCRIBER, 'B.4 audience resolved to ALERT_SUBSCRIBER');
  // Ineligible source.
  const badReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L11_SCORE_SNAPSHOT,
    trigger: L14DeliveryRuntimeTrigger.SCORE_THRESHOLD_CROSSED,
    channel: L14DeliveryChannel.AI_CHAT,
    audience: L14AudienceClass.END_USER,
  });
  const bad = runL14DeliveryRuntime(defaultGreenInput(badReq));
  assert(!bad.eligibility.eligible, 'B.5 AI chat with non-final L13 source rejected');
  // Push channel rejected.
  const pushReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.L13_ALERT_PAYLOAD_READY,
    channel: L14DeliveryChannel.PUSH_ALERT,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const push = runL14DeliveryRuntime(defaultGreenInput(pushReq));
  assert(!push.eligibility.eligible, 'B.6 push alert preference rejected at eligibility');
  // AI chat candidate routed only through final L13 artifact context.
  const chatReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_CHAT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.NEW_GOVERNED_ARTIFACT,
    channel: L14DeliveryChannel.AI_CHAT,
    audience: L14AudienceClass.END_USER,
  });
  const chat = runL14DeliveryRuntime(defaultGreenInput(chatReq));
  assert(chat.eligibility.eligible && chat.channel.selected_channel === L14DeliveryChannel.AI_CHAT, 'B.7 AI chat candidate routed via final L13 chat artifact');
}

// ── Band C : preference, entitlement, user controls ───────────

band('BAND C — preference, entitlement, user controls');

{
  const baseReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.L13_ALERT_PAYLOAD_READY,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  // Telegram requires entitlement clean.
  const noEnt = runL14DeliveryRuntime({ ...defaultGreenInput(baseReq), entitlement_clean: false });
  assert(noEnt.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD, 'C.1 Telegram entitlement blocked suppressed');
  // Muted channel suppresses.
  const muted = runL14DeliveryRuntime({ ...defaultGreenInput(baseReq), channel_enabled: false });
  assert(muted.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD && !!muted.suppression, 'C.2 muted channel suppresses with record');
  // Muted alert class suppresses.
  const mutedClass = runL14DeliveryRuntime({ ...defaultGreenInput(baseReq), alert_class_enabled: false });
  assert(mutedClass.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD, 'C.3 muted alert class suppresses');
  // Quiet hours defer non-critical (priority HIGH or below).
  const quiet = runL14DeliveryRuntime({
    ...defaultGreenInput(baseReq),
    quiet_hours_active: true,
    priority_inputs: { source_importance_score: 50, scenario_shift_score: 50, trigger_invalidation_score: 30, score_change_significance_score: 50, confidence_readiness_score: 80, novelty_score: 50, audience_relevance_score: 50 },
    urgency_inputs: { time_sensitivity_score: 50, decay_risk_score: 50, trigger_recency_score: 50, audience_time_relevance_score: 50, quiet_hours_cap: true },
  });
  assert(quiet.disposition.disposition === L14DeliveryDisposition.DEFER_TO_DIGEST, 'C.4 quiet hours defers non-critical alert');
  // Frequency cap suppresses.
  const freq = runL14DeliveryRuntime({ ...defaultGreenInput(baseReq), frequency_cap_reached: true });
  assert(freq.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD, 'C.5 frequency cap suppresses');
  // Internal analyst console: end-user preference does not apply; internal role required.
  const internalReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT,
    trigger: L14DeliveryRuntimeTrigger.INTERNAL_ANALYST_REVIEW_REQUEST,
    channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    audience: L14AudienceClass.INTERNAL_ANALYST,
  });
  const internal = runL14DeliveryRuntime(defaultGreenInput(internalReq));
  assert(internal.disposition.disposition === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY, 'C.6 internal console routes INTERNAL_REVIEW_ONLY');
}

// ── Band D : priority and urgency ─────────────────────────────

band('BAND D — priority and urgency');

{
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const critical = runL14DeliveryRuntime({
    ...defaultGreenInput(req),
    priority_inputs: { source_importance_score: 95, scenario_shift_score: 95, trigger_invalidation_score: 95, score_change_significance_score: 90, confidence_readiness_score: 95, novelty_score: 90, audience_relevance_score: 95 },
  });
  assert(critical.priority.priority_class === L14DeliveryPriorityClass.CRITICAL, `D.1 critical-grade inputs produce CRITICAL (got ${critical.priority.priority_class})`);
  assert(critical.urgency.urgency_class === L14DeliveryUrgencyClass.IMMEDIATE, `D.2 active invalidation + CRITICAL yields IMMEDIATE (got ${critical.urgency.urgency_class})`);
  assert(critical.disposition.disposition === L14DeliveryDisposition.EXECUTE_IMMEDIATELY, 'D.3 critical → EXECUTE_IMMEDIATELY');
  // Routine state change → on-demand or material/digest, never IMMEDIATE.
  const routineReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.USER_ON_DEMAND_VIEW,
    channel: L14DeliveryChannel.DASHBOARD,
    audience: L14AudienceClass.END_USER,
  });
  const routine = runL14DeliveryRuntime({
    ...defaultGreenInput(routineReq),
    priority_inputs: { source_importance_score: 30, scenario_shift_score: 20, trigger_invalidation_score: 10, score_change_significance_score: 20, confidence_readiness_score: 70, novelty_score: 20, audience_relevance_score: 30 },
    urgency_inputs: { time_sensitivity_score: 20, decay_risk_score: 10, trigger_recency_score: 10, audience_time_relevance_score: 20, on_demand_surface: true },
  });
  assert(routine.urgency.urgency_class === L14DeliveryUrgencyClass.ON_DEMAND_ONLY, 'D.4 routine dashboard state → ON_DEMAND_ONLY');
  assert(routine.disposition.disposition === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY, 'D.5 routine on-demand → no push (internal/queued)');
  // Restriction cap narrows priority.
  const restCap = runL14DeliveryRuntime({
    ...defaultGreenInput(req),
    priority_inputs: { source_importance_score: 95, scenario_shift_score: 90, trigger_invalidation_score: 95, score_change_significance_score: 80, confidence_readiness_score: 95, novelty_score: 95, audience_relevance_score: 95, restriction_cap_applies: true },
  });
  assert(restCap.priority.capped_by_restriction && restCap.priority.priority_class !== L14DeliveryPriorityClass.CRITICAL, 'D.6 restriction cap narrows priority below CRITICAL');
  // Validators clean for green run.
  assert(validateL14DeliveryPriority(critical.priority).clean, 'D.7 priority validator clean');
  assert(validateL14DeliveryUrgency(critical.urgency, critical.priority).clean, 'D.8 urgency validator clean');
}

// ── Band E : duplicate, cooldown, suppression, merge ─────────

band('BAND E — duplicate, cooldown, suppression, merge');

{
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.L13_ALERT_PAYLOAD_READY,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const dupe = runL14DeliveryRuntime({
    ...defaultGreenInput(req),
    matched_delivery_refs: ['l14.prior.delivery.1'],
    materially_new_invalidation: false,
    materially_new_trigger: false,
  });
  assert(dupe.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD, 'E.1 exact duplicate suppressed');
  assert(!!dupe.suppression && dupe.disposition.suppression_record_ref === dupe.suppression.suppression_id, 'E.2 suppression record present and referenced');
  const cooldown = runL14DeliveryRuntime({
    ...defaultGreenInput(req),
    cooldown_active: true,
    materially_new_invalidation: false,
  });
  assert(cooldown.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD, 'E.3 active cooldown suppresses');
  const override = runL14DeliveryRuntime({
    ...defaultGreenInput(req),
    cooldown_active: true,
    materially_new_invalidation: true,
  });
  assert(override.cooldown.cooldown_override_allowed === true, 'E.4 new invalidation legally overrides cooldown');
  // Merge record buildable.
  const merge = buildL14MergeRecord([dupe.candidate, cooldown.candidate], 'l14.merged.candidate.1', L14MergeReason.SAME_ALERT_CLASS_MULTIPLE_EVENTS, true);
  assert(!!merge.merge_record_id, 'E.5 merge record buildable');
  // Silent suppression must be detected by validator.
  const fakeDecision = { ...dupe.disposition, suppression_record_ref: undefined };
  assert(!validateL14Disposition(fakeDecision, undefined).clean, 'E.6 silent suppression rejected by validator');
}

// ── Band F : payload assembly, execution, materialization, expectation ─

band('BAND F — payload assembly, execution, materialization, expectation');

{
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const r = runL14DeliveryRuntime(defaultGreenInput(req));
  assert(r.assembly.disposition_decision_ref === r.disposition.disposition_decision_id, 'F.1 payload assembly references disposition');
  assert(validateL14PayloadAssembly(r.assembly, r.disposition).clean, 'F.2 payload assembly validator clean');
  assert(r.execution.delivery_status === L14DeliveryExecutionStatus.SENT || r.execution.delivery_status === L14DeliveryExecutionStatus.SENT_WITH_PROVIDER_ACK, 'F.3 green execution status SENT');
  // Retry path is lawful.
  const retry = runL14DeliveryRuntime({ ...defaultGreenInput(req), provider_failed: true, retry_eligible: true, retry_count: 1, executed: false });
  assert(retry.execution.delivery_status === L14DeliveryExecutionStatus.FAILED_RETRYABLE && retry.execution.retry_eligible === true, 'F.4 failed-retryable status set when retry eligible');
  // Materialization intent emitted.
  assert(!!r.materialization.materialization_intent_id && validateL14MaterializationIntent(r.materialization).clean, 'F.5 materialization intent emitted + validates');
  // Feedback expectation registered for outbound user-facing delivery.
  assert(r.expectation.expectation_status === L14FeedbackExpectationStatus.REGISTERED, 'F.6 outbound user-facing delivery registers expectation');
  assert(validateL14FeedbackExpectation(r.expectation, r.disposition, r.channel.selected_channel).clean, 'F.7 expectation validator clean');
  // No expectation emitted for internal-only review.
  const internalReq = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT,
    trigger: L14DeliveryRuntimeTrigger.INTERNAL_ANALYST_REVIEW_REQUEST,
    channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    audience: L14AudienceClass.INTERNAL_ANALYST,
  });
  const internal = runL14DeliveryRuntime(defaultGreenInput(internalReq));
  assert(internal.expectation.expectation_status === L14FeedbackExpectationStatus.NOT_REQUIRED_INTERNAL_REVIEW_ONLY, 'F.8 internal-only review emits no expectation');
}

// ── Band G : audit and invariants ─────────────────────────────

band('BAND G — audit and invariants');

{
  resetL14RuntimeDeliveryAuditLog();
  const a = emitL14RuntimeDeliveryAuditRecord({
    subjectClass: L14RuntimeDeliveryAuditSubjectClass.EXECUTION_RECORD,
    subjectRef: 'l14.cert.execution',
    violationCodes: [L14RuntimeViolationCode.L14R_EXECUTION_BEFORE_DELIVERABILITY],
    message: 'cert: execution before deliverability',
  });
  const b = emitL14RuntimeDeliveryAuditRecord({
    subjectClass: L14RuntimeDeliveryAuditSubjectClass.EXECUTION_RECORD,
    subjectRef: 'l14.cert.execution',
    violationCodes: [L14RuntimeViolationCode.L14R_EXECUTION_BEFORE_DELIVERABILITY],
    message: 'cert: execution before deliverability',
  });
  assert(a.replay_hash === b.replay_hash, 'G.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'G.2 execution-before-deliverability is CRITICAL + blocking');
  assert(severityForL14RuntimeCode(L14RuntimeViolationCode.L14R_PRIORITY_PROFILE_MISSING) === L14ConstitutionalAuditSeverity.ERROR, 'G.3 priority profile missing classified ERROR');
  assert(!isL14RuntimeBlockingCode(L14RuntimeViolationCode.L14R_PRIORITY_PROFILE_MISSING), 'G.4 priority profile missing not blocking');
  assert(isL14RuntimeBlockingCode(L14RuntimeViolationCode.L14R_DUPLICATE_ALERT_EXECUTED), 'G.5 duplicate-alert-executed is blocking');
  assert(getL14RuntimeDeliveryAuditLog().length === 2, 'G.6 audit log queryable');
  assert(getL14RuntimeDeliveryCriticalViolations().length === 2, 'G.7 critical violations queryable');
  // Invariants.
  const invs = runAllL14_3Invariants();
  assert(invs.length === 10, `G.8 ten invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `G.9 ${i.id} ${i.name} (${i.evidence})`);
  }
  // Validator suite over a green run.
  const req = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
  });
  const r = runL14DeliveryRuntime(defaultGreenInput(req));
  assert(validateL14DeliveryCandidate(r.candidate).clean, 'G.10 candidate validator clean');
  assert(validateL14DeliveryEligibility(r.eligibility).clean, 'G.11 eligibility validator clean');
  assert(validateL14Execution(r.execution, r.disposition).clean, 'G.12 execution validator clean');
  if (r.suppression) assert(validateL14Suppression(r.suppression).clean, 'G.13 suppression validator clean');
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
