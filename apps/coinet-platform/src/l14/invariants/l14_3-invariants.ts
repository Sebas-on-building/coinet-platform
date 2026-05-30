/**
 * L14.3 — Delivery Runtime Invariants
 *
 * §14.3.54 — INV-14.3-A through INV-14.3-J.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import { L14AudienceClass } from '../contracts/audience-class';
import { L14DeliverableSourceArtifactClass } from '../contracts/deliverable-source-artifact';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../contracts/delivery-priority';
import { L14DeliveryRuntimeTrigger, type L14DeliveryRuntimeRequest } from '../contracts/delivery-runtime-request';
import {
  L14DeliveryDisposition,
} from '../contracts/delivery-disposition';
import { L14DeliveryExecutionStatus, L14FeedbackExpectationStatus } from '../contracts/delivery-execution';
import {
  runL14DeliveryRuntime,
  type L14RuntimeOrchestratorInput,
  type L14RuntimeOrchestratorResult,
} from '../runtime/delivery-runtime-engines';
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
} from '../validation/runtime.validators';

const POLICY_V = 'l14.runtime.v1';

export interface L14_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_3InvariantResult {
  return { id, name, holds, evidence };
}

function buildRequest(opts: {
  source: L14DeliverableSourceArtifactClass;
  trigger: L14DeliveryRuntimeTrigger;
  channel?: L14DeliveryChannel;
  audience?: L14AudienceClass;
  user?: string;
  subject?: string;
  reqId?: string;
}): L14DeliveryRuntimeRequest {
  const id = opts.reqId ?? `l14.req.${fnv1a([opts.source, opts.trigger, opts.channel ?? '', opts.audience ?? '', POLICY_V].join('|'))}`;
  return {
    delivery_runtime_request_id: id,
    source_artifact_class: opts.source,
    source_artifact_ref: 'l14.cert.src',
    preferred_channel_hint: opts.channel,
    preferred_audience_hint: opts.audience,
    user_scope_ref: opts.user,
    subject_scope_ref: opts.subject,
    originating_layer: 'L13',
    runtime_trigger: opts.trigger,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

function defaultOrchestratorInput(
  request: L14DeliveryRuntimeRequest,
  overrides: Partial<L14RuntimeOrchestratorInput> = {},
): L14RuntimeOrchestratorInput {
  return {
    request,
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
    ...overrides,
  };
}

function runRuntime(
  overrides: Partial<L14RuntimeOrchestratorInput> = {},
  reqOpts: Partial<Parameters<typeof buildRequest>[0]> = {},
): L14RuntimeOrchestratorResult {
  const request = buildRequest({
    source: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    trigger: L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED,
    channel: L14DeliveryChannel.TELEGRAM,
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
    ...reqOpts,
  });
  return runL14DeliveryRuntime(defaultOrchestratorInput(request, overrides));
}

// ── INV-14.3-A : DAG determinism law ────────────────────────────

export function checkINV_143_A(): L14_3InvariantResult {
  const a = runRuntime();
  const b = runRuntime();
  const stable =
    a.candidate.replay_hash === b.candidate.replay_hash &&
    a.eligibility.replay_hash === b.eligibility.replay_hash &&
    a.channel.replay_hash === b.channel.replay_hash &&
    a.audience.replay_hash === b.audience.replay_hash &&
    a.priority.replay_hash === b.priority.replay_hash &&
    a.urgency.replay_hash === b.urgency.replay_hash &&
    a.disposition.replay_hash === b.disposition.replay_hash &&
    a.execution.replay_hash === b.execution.replay_hash;
  return inv('INV-14.3-A', 'DAG determinism law', stable, `stable=${stable}`);
}

// ── INV-14.3-B : no execution before legality law ───────────────

export function checkINV_143_B(): L14_3InvariantResult {
  // Push alert preferred channel must produce illegal block.
  const pushAttempt = runRuntime({}, { channel: L14DeliveryChannel.PUSH_ALERT });
  // AI chat with non-final source must fail eligibility.
  const chatBad = runRuntime({}, {
    source: L14DeliverableSourceArtifactClass.L11_SCORE_SNAPSHOT,
    trigger: L14DeliveryRuntimeTrigger.SCORE_THRESHOLD_CROSSED,
    channel: L14DeliveryChannel.AI_CHAT,
    audience: L14AudienceClass.END_USER,
  });
  const pushBlocked = !pushAttempt.eligibility.eligible || pushAttempt.disposition.disposition === L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY || pushAttempt.execution.delivery_status === L14DeliveryExecutionStatus.BLOCKED_BEFORE_PROVIDER;
  const chatBlocked = !chatBad.eligibility.eligible;
  return inv('INV-14.3-B', 'no execution before legality law', pushBlocked && chatBlocked, `pushBlocked=${pushBlocked} chatBlocked=${chatBlocked}`);
}

// ── INV-14.3-C : preference + entitlement law ───────────────────

export function checkINV_143_C(): L14_3InvariantResult {
  const muted = runRuntime({ channel_enabled: false });
  const quiet = runRuntime({ quiet_hours_active: true, priority_inputs: { source_importance_score: 50, scenario_shift_score: 50, trigger_invalidation_score: 30, score_change_significance_score: 50, confidence_readiness_score: 80, novelty_score: 50, audience_relevance_score: 50 }, urgency_inputs: { time_sensitivity_score: 50, decay_risk_score: 50, trigger_recency_score: 50, audience_time_relevance_score: 50, quiet_hours_cap: true } });
  const freq = runRuntime({ frequency_cap_reached: true });
  const ent = runRuntime({ entitlement_clean: false });
  const mutedSup = muted.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD && !!muted.suppression;
  const quietDefer = quiet.disposition.disposition === L14DeliveryDisposition.DEFER_TO_DIGEST;
  const freqSup = freq.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
  const entSup = ent.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
  return inv('INV-14.3-C', 'preference and entitlement law', mutedSup && quietDefer && freqSup && entSup, `muted=${mutedSup} quiet=${quietDefer} freq=${freqSup} ent=${entSup}`);
}

// ── INV-14.3-D : priority honesty law ───────────────────────────

export function checkINV_143_D(): L14_3InvariantResult {
  const r = runRuntime();
  const restCapped = runRuntime({
    priority_inputs: { source_importance_score: 95, scenario_shift_score: 90, trigger_invalidation_score: 95, score_change_significance_score: 80, confidence_readiness_score: 95, novelty_score: 95, audience_relevance_score: 95, restriction_cap_applies: true },
  });
  const v = validateL14DeliveryPriority(r.priority);
  const cap = restCapped.priority.capped_by_restriction && restCapped.priority.priority_class !== L14DeliveryPriorityClass.CRITICAL;
  return inv('INV-14.3-D', 'priority honesty law', v.clean && cap, `validator=${v.clean} cap=${cap}`);
}

// ── INV-14.3-E : urgency honesty law ────────────────────────────

export function checkINV_143_E(): L14_3InvariantResult {
  const r = runRuntime();
  // Routine state change must not produce IMMEDIATE.
  const routine = runRuntime({
    priority_inputs: { source_importance_score: 30, scenario_shift_score: 20, trigger_invalidation_score: 10, score_change_significance_score: 20, confidence_readiness_score: 70, novelty_score: 20, audience_relevance_score: 30 },
    urgency_inputs: { time_sensitivity_score: 20, decay_risk_score: 10, trigger_recency_score: 10, audience_time_relevance_score: 20 },
  });
  const v = validateL14DeliveryUrgency(r.urgency, r.priority);
  const notFalseImmediate = routine.urgency.urgency_class !== L14DeliveryUrgencyClass.IMMEDIATE;
  return inv('INV-14.3-E', 'urgency honesty law', v.clean && notFalseImmediate, `validator=${v.clean} notFalseImmediate=${notFalseImmediate}`);
}

// ── INV-14.3-F : duplication and cooldown law ───────────────────

export function checkINV_143_F(): L14_3InvariantResult {
  const dupe = runRuntime({
    matched_delivery_refs: ['l14.prior.delivery.1'],
    materially_new_invalidation: false,
    materially_new_trigger: false,
  });
  const cooldown = runRuntime({
    cooldown_active: true,
    materially_new_invalidation: false,
  });
  const override = runRuntime({
    cooldown_active: true,
    materially_new_invalidation: true,
  });
  const dupeSup = dupe.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD && !!dupe.suppression;
  const cdSup = cooldown.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
  const overrideAllowed = override.cooldown.cooldown_override_allowed === true;
  return inv('INV-14.3-F', 'duplication and cooldown law', dupeSup && cdSup && overrideAllowed, `dupeSup=${dupeSup} cdSup=${cdSup} overrideAllowed=${overrideAllowed}`);
}

// ── INV-14.3-G : suppression non-silence law ────────────────────

export function checkINV_143_G(): L14_3InvariantResult {
  const muted = runRuntime({ channel_enabled: false });
  const ent = runRuntime({ entitlement_clean: false });
  const cooldownActive = runRuntime({ cooldown_active: true });
  const allHaveRecord =
    !!muted.suppression && !!ent.suppression && !!cooldownActive.suppression;
  const vM = validateL14Suppression(muted.suppression!);
  const vE = validateL14Suppression(ent.suppression!);
  const vC = validateL14Suppression(cooldownActive.suppression!);
  const decisionValidatorRejectsSilent = (() => {
    // Build an inconsistent decision: SUPPRESS but no record.
    const decision = {
      ...muted.disposition,
      suppression_record_ref: undefined,
    };
    return !validateL14Disposition(decision, undefined).clean;
  })();
  return inv('INV-14.3-G', 'suppression non-silence law', allHaveRecord && vM.clean && vE.clean && vC.clean && decisionValidatorRejectsSilent, `allHaveRecord=${allHaveRecord} validatorRejectsSilent=${decisionValidatorRejectsSilent}`);
}

// ── INV-14.3-H : execution retry law ────────────────────────────

export function checkINV_143_H(): L14_3InvariantResult {
  const failed = runRuntime({ provider_failed: true, retry_eligible: true, retry_count: 1, executed: false });
  const v = validateL14Execution(failed.execution, failed.disposition);
  const retryFlag = failed.execution.retry_eligible === true;
  return inv('INV-14.3-H', 'execution retry law', v.clean && retryFlag, `validator=${v.clean} retryEligible=${retryFlag}`);
}

// ── INV-14.3-I : feedback expectation law ───────────────────────

export function checkINV_143_I(): L14_3InvariantResult {
  const r = runRuntime();
  const v = validateL14FeedbackExpectation(r.expectation, r.disposition, r.channel.selected_channel);
  const registered = r.expectation.expectation_status === L14FeedbackExpectationStatus.REGISTERED;
  // Internal-only must produce NOT_REQUIRED_INTERNAL_REVIEW_ONLY.
  const internal = runRuntime({}, {
    source: L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT,
    trigger: L14DeliveryRuntimeTrigger.INTERNAL_ANALYST_REVIEW_REQUEST,
    channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    audience: L14AudienceClass.INTERNAL_ANALYST,
  });
  const internalOk = internal.expectation.expectation_status === L14FeedbackExpectationStatus.NOT_REQUIRED_INTERNAL_REVIEW_ONLY;
  return inv('INV-14.3-I', 'feedback expectation law', v.clean && registered && internalOk, `validator=${v.clean} registered=${registered} internalOk=${internalOk}`);
}

// ── INV-14.3-J : lineage and replay law ─────────────────────────

export function checkINV_143_J(): L14_3InvariantResult {
  const r = runRuntime();
  const c = validateL14DeliveryCandidate(r.candidate);
  const e = validateL14DeliveryEligibility(r.eligibility);
  const p = validateL14PayloadAssembly(r.assembly, r.disposition);
  const m = validateL14MaterializationIntent(r.materialization);
  const allHaveLineage = [r.candidate, r.eligibility, r.priority, r.urgency, r.disposition, r.assembly, r.execution, r.materialization, r.expectation].every(o => o.lineage_refs.length > 0);
  const allHaveReplay = [r.candidate, r.eligibility, r.priority, r.urgency, r.disposition, r.assembly, r.execution, r.materialization, r.expectation].every(o => o.replay_hash.length > 0);
  return inv('INV-14.3-J', 'lineage and replay law', c.clean && e.clean && p.clean && m.clean && allHaveLineage && allHaveReplay, `candidate=${c.clean} eligibility=${e.clean} payload=${p.clean} mat=${m.clean} lineage=${allHaveLineage} replay=${allHaveReplay}`);
}

export function runAllL14_3Invariants(): readonly L14_3InvariantResult[] {
  return [
    checkINV_143_A(),
    checkINV_143_B(),
    checkINV_143_C(),
    checkINV_143_D(),
    checkINV_143_E(),
    checkINV_143_F(),
    checkINV_143_G(),
    checkINV_143_H(),
    checkINV_143_I(),
    checkINV_143_J(),
  ];
}
