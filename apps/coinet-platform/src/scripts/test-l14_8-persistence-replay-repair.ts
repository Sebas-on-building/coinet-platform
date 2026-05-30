/**
 * L14.8 — Persistence / Read / Replay / Repair Certification (Bands A..H)
 *
 * §14.8.49 — Proves durable surfaces, L5 envelope law, historical/current
 * registries, read surfaces, replay, repair, audit, invariants.
 */

import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import {
  ALL_L14_DURABLE_SURFACES,
  L14DurableSurfaceId,
  L14MaterializationMode,
  L14MutationDiscipline,
  L14StorageAuthorityClass,
} from '../l14/contracts/l14-persistence-surfaces';
import {
  ALL_L14_HISTORICAL_FAMILIES,
  L14HistoricalFactFamily,
  L14_FAMILY_SOURCE_SURFACES,
} from '../l14/contracts/l14-historical-facts';
import {
  ALL_L14_CURRENT_REGISTRIES,
  L14CurrentRegistryId,
} from '../l14/contracts/l14-current-registries';
import {
  ALL_L14_READ_SURFACES,
  L14ReadCompletenessClass,
  L14ReadConsumerClass,
  L14ReadFreshnessClass,
  L14ReadMode,
  L14ReadSurfaceId,
} from '../l14/contracts/l14-read-surfaces';
import {
  L14ReplayMismatchReasonCode,
  L14ReplayStatus,
  L14ReplaySubjectClass,
} from '../l14/contracts/l14-replay-contracts';
import {
  L14RepairReason,
  L14RepairStatus,
} from '../l14/contracts/l14-repair-contracts';
import { L14DeliveryChannel } from '../l14/contracts/delivery-channel';
import {
  L14ChannelHealthClass,
  L14ChannelRetryPressureClass,
  L14DeliveryFailureClass,
  L14DeliveryFailureRecoveryAction,
  L14DeliveryFailureStage,
} from '../l14/contracts/l14-performance-health-facts';
import {
  L14CalibrationProposalClass,
  L14CalibrationProposalStatus,
} from '../l14/contracts/calibration-proposal-core';
import { L14ProposalReviewQueueClass } from '../l14/contracts/calibration-proposal-handoff';
import {
  buildL14HistoricalFactRecord,
  buildL14PersistenceEnvelope,
  getAllL14DurableSurfaceDescriptors,
  getL14DurableSurfaceDescriptor,
  isHistoricalFamilySourceSurfaceLegal,
  isL14CurrentRegistryRegistered,
  isL14DurableSurfaceRegistered,
  isL14HistoricalFamilyRegistered,
  isMaterializationModeLegalForSurface,
} from '../l14/persistence/l14-persistence-engines';
import {
  buildL14AlertPerformanceFact,
  buildL14ChannelHealthFact,
  buildL14CurrentAlertPerformanceRecord,
  buildL14CurrentCalibrationReviewRecord,
  buildL14CurrentChannelHealthRecord,
  buildL14CurrentDeliveryPolicyRecord,
  buildL14DeliveryFailureRecord,
} from '../l14/persistence/l14-fact-builders';
import {
  admitL14ReadRequest,
  buildL14GovernedReadResult,
  buildL14ReadRequest,
  getAllL14ReadSurfaceDescriptors,
  getL14ReadSurfaceDescriptor,
  isL14ReadSurfaceRegistered,
} from '../l14/read/l14-read-engines';
import {
  buildL14ReplayRequest,
  replayL14DeliveryDecision,
} from '../l14/replay/l14-replay-engines';
import {
  buildL14RepairRequest,
  processL14RepairRequest,
} from '../l14/repair/l14-repair-engines';
import {
  validateL14AlertPerformanceFact,
  validateL14ChannelHealthFact,
  validateL14DeliveryFailureRecord,
  validateL14GovernedReadResult,
  validateL14HistoricalFactRecord,
  validateL14PersistenceEnvelope,
  validateL14ReadRequest,
  validateL14RepairRequest,
  validateL14RepairResult,
  validateL14ReplayResult,
} from '../l14/validation/l14-persistence.validators';
import { L14PersistenceViolationCode } from '../l14/validation/l14-persistence-violation-codes';
import {
  L14PersistenceAuditSubjectClass,
  emitL14PersistenceAuditRecord,
  getL14PersistenceAuditLog,
  getL14PersistenceCriticalViolations,
  isL14PersistenceBlockingCode,
  resetL14PersistenceAuditLog,
  severityForL14PersistenceCode,
} from '../l14/constitution/l14-persistence-audit';
import { runAllL14_8Invariants } from '../l14/invariants/l14_8-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; failures.push(msg); console.log(`  ✗ ${msg}`); }
}
function band(name: string): void { console.log(''); console.log(`── ${name} ──`); }

function legitEnv() {
  return buildL14PersistenceEnvelope({
    target_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    materialization_mode: L14MaterializationMode.EVENT_APPEND,
    source_object_ref: 'l14.exec.A',
    source_sublayer_ref: 'L14.3',
    l5_route_ref: 'l5.route.delivery.exec',
    write_authority_ref: 'l5.writer.delivery',
  });
}

console.log('L14.8 — Persistence / Replay / Repair Certification');

// ── BAND A : Durable surface + authority constitution ────────────
band('BAND A — durable surface and authority constitution');

{
  assert(ALL_L14_DURABLE_SURFACES.length === 11, `A.1 11 durable surfaces registered (got ${ALL_L14_DURABLE_SURFACES.length})`);
  assert(ALL_L14_HISTORICAL_FAMILIES.length === 8, `A.2 8 historical fact families registered (got ${ALL_L14_HISTORICAL_FAMILIES.length})`);
  assert(ALL_L14_CURRENT_REGISTRIES.length === 4, `A.3 4 current registries registered (got ${ALL_L14_CURRENT_REGISTRIES.length})`);
  const descs = getAllL14DurableSurfaceDescriptors();
  assert(descs.length === 11, 'A.4 every surface returns descriptor');
  // Authority class correctness on key surfaces.
  const exec = getL14DurableSurfaceDescriptor(L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS)!;
  assert(exec.storage_authority_class === L14StorageAuthorityClass.APPEND_ONLY_OPERATIONAL_FACT, 'A.5 delivery exec is APPEND_ONLY_OPERATIONAL_FACT');
  const alertPerf = getL14DurableSurfaceDescriptor(L14DurableSurfaceId.ALERT_PERFORMANCE_FACTS)!;
  assert(alertPerf.storage_authority_class === L14StorageAuthorityClass.DERIVED_RECOMPUTABLE_FACT, 'A.6 alert performance is DERIVED_RECOMPUTABLE_FACT');
  const audit = getL14DurableSurfaceDescriptor(L14DurableSurfaceId.AUDIT_EVENTS)!;
  assert(audit.storage_authority_class === L14StorageAuthorityClass.APPEND_ONLY_AUDIT_FACT, 'A.7 audit events is APPEND_ONLY_AUDIT_FACT');
  // Mutation discipline on append-only surfaces.
  assert(exec.mutation_discipline.includes(L14MutationDiscipline.APPEND_ONLY), 'A.8 delivery exec append-only discipline');
  assert(exec.mutation_discipline.includes(L14MutationDiscipline.NEVER_DIRECT_MUTATION), 'A.9 delivery exec also NEVER_DIRECT_MUTATION');
  // Unknown surface rejects.
  assert(!isL14DurableSurfaceRegistered('l14.unknown.surface'), 'A.10 unknown surface not registered');
  assert(isL14HistoricalFamilyRegistered('ts_delivery_event_v1'), 'A.11 ts_delivery_event_v1 registered');
  assert(!isL14HistoricalFamilyRegistered('ts_unknown_v1'), 'A.12 unknown family not registered');
  assert(isL14CurrentRegistryRegistered(L14CurrentRegistryId.CURRENT_DELIVERY_POLICY_REGISTRY), 'A.13 current delivery policy registry registered');
}

// ── BAND B : L5 persistence envelope + materialization law ───────
band('BAND B — L5 envelope + materialization law');

{
  const env = legitEnv();
  assert(validateL14PersistenceEnvelope(env).clean, 'B.1 legit envelope clean');
  // Direct write (no l5 route).
  const direct = buildL14PersistenceEnvelope({
    target_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    materialization_mode: L14MaterializationMode.EVENT_APPEND,
    source_object_ref: 'l14.exec.B',
    source_sublayer_ref: 'L14.3',
    l5_route_ref: '',
    write_authority_ref: '',
  });
  assert(!validateL14PersistenceEnvelope(direct).clean, 'B.2 direct write (no L5 route) rejected');
  // Unknown surface.
  const unknown = buildL14PersistenceEnvelope({
    target_surface_id: 'l14.unknown.surface' as any,
    materialization_mode: L14MaterializationMode.EVENT_APPEND,
    source_object_ref: 'x',
    source_sublayer_ref: 'L14.3',
    l5_route_ref: 'l5.route',
    write_authority_ref: 'l5.writer',
  });
  assert(!validateL14PersistenceEnvelope(unknown).clean, 'B.3 unknown surface rejected');
  // Illegal materialization mode (CURRENT_REGISTRY_SUPERSESSION on append-only).
  const bad = buildL14PersistenceEnvelope({
    target_surface_id: L14DurableSurfaceId.USER_INTERACTION_EVENTS,
    materialization_mode: L14MaterializationMode.CURRENT_REGISTRY_SUPERSESSION,
    source_object_ref: 'l14.interaction.X',
    source_sublayer_ref: 'L14.4',
    l5_route_ref: 'l5.route',
    write_authority_ref: 'l5.writer',
  });
  assert(!validateL14PersistenceEnvelope(bad).clean, 'B.4 supersession on append-only rejected');
  // Audit event must use AUDIT_APPEND.
  assert(!isMaterializationModeLegalForSurface(L14DurableSurfaceId.AUDIT_EVENTS, L14MaterializationMode.EVENT_APPEND), 'B.5 audit events forbid EVENT_APPEND');
  assert(isMaterializationModeLegalForSurface(L14DurableSurfaceId.AUDIT_EVENTS, L14MaterializationMode.AUDIT_APPEND), 'B.6 audit events allow AUDIT_APPEND');
  // Replay determinism on envelope.
  assert(env.replay_hash === legitEnv().replay_hash, 'B.7 envelope replay hash deterministic');
}

// ── BAND C : Historical facts and current registries ─────────────
band('BAND C — historical facts and current registries');

{
  const hist = buildL14HistoricalFactRecord({
    fact_family: L14HistoricalFactFamily.TS_DELIVERY_EVENT_V1,
    source_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    source_record_ref: 'l14.exec.C',
    occurred_at: '2026-05-15T00:00:00Z',
  });
  assert(validateL14HistoricalFactRecord(hist).clean, 'C.1 historical fact (delivery event) clean');
  // Family/source mismatch.
  const mis = buildL14HistoricalFactRecord({
    fact_family: L14HistoricalFactFamily.TS_USER_INTERACTION_V1,
    source_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    source_record_ref: 'l14.exec.C',
    occurred_at: '2026-05-15T00:00:00Z',
  });
  assert(!validateL14HistoricalFactRecord(mis).clean, 'C.2 family/source mismatch rejected');
  // Each historical family has at least one source surface.
  for (const f of ALL_L14_HISTORICAL_FAMILIES) {
    assert(L14_FAMILY_SOURCE_SURFACES[f].length > 0, `C.3 ${f} maps to at least one source surface`);
  }
  // Current registry builders.
  const delPol = buildL14CurrentDeliveryPolicyRecord({
    delivery_policy_ref: 'l14.policy.C',
    policy_scope: 'GLOBAL',
    active_policy_version: 'l14.runtime.v1',
    effective_from: '2026-05-15T00:00:00Z',
  });
  assert(!!delPol.current_delivery_policy_record_id, 'C.4 current delivery policy record built');
  const alertPerf = buildL14CurrentAlertPerformanceRecord({
    alert_class_ref: 'l13.alert.C',
    latest_performance_fact_ref: 'l14.alertperf.C',
    evidence_window_ref: 'l14.evidence.window.C',
  });
  assert(!!alertPerf.latest_performance_fact_ref, 'C.5 current alert performance reconstructable via fact ref');
  const chHealth = buildL14CurrentChannelHealthRecord({
    channel: L14DeliveryChannel.DASHBOARD,
    latest_channel_health_fact_ref: 'l14.chhealth.C',
    health_class: L14ChannelHealthClass.HEALTHY,
    retry_pressure_class: L14ChannelRetryPressureClass.NONE,
    observed_window_ref: 'l14.window.C',
  });
  assert(chHealth.health_class === L14ChannelHealthClass.HEALTHY, 'C.6 current channel health derived');
  const calReview = buildL14CurrentCalibrationReviewRecord({
    calibration_proposal_ref: 'l14.proposal.C',
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    affected_layer: 'L11',
    latest_review_status: L14CalibrationProposalStatus.READY_FOR_REVIEW_QUEUE,
    current_review_queue_ref: L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE,
    created_at: '2026-05-15T00:00:00Z',
    last_status_change_at: '2026-05-15T00:00:00Z',
  });
  assert(calReview.current_review_queue_ref === L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE, 'C.7 current calibration review record matches proposal queue');
  // Delivery failure record.
  const fail = buildL14DeliveryFailureRecord({
    channel: L14DeliveryChannel.TELEGRAM,
    failure_stage: L14DeliveryFailureStage.PROVIDER_RESPONSE,
    failure_class: L14DeliveryFailureClass.PROVIDER_TIMEOUT,
    sanitized_failure_summary: 'cert',
    retry_eligible: true,
    retry_count_at_failure: 1,
    recovery_action: L14DeliveryFailureRecoveryAction.RETRY_LATER,
    occurred_at: '2026-05-15T00:00:00Z',
    source_delivery_execution_ref: 'l14.exec.failC',
  });
  assert(validateL14DeliveryFailureRecord(fail).clean, 'C.8 delivery failure record clean');
}

// ── BAND D : Read surfaces ───────────────────────────────────────
band('BAND D — read surfaces');

{
  assert(ALL_L14_READ_SURFACES.length === 12, `D.1 12 read surfaces registered (got ${ALL_L14_READ_SURFACES.length})`);
  assert(getAllL14ReadSurfaceDescriptors().length === 12, 'D.2 all read surfaces have descriptors');
  assert(isL14ReadSurfaceRegistered(L14ReadSurfaceId.CALIBRATION_PROPOSAL_QUEUE), 'D.3 calibration proposal queue registered');
  // Legal request.
  const okReq = buildL14ReadRequest({
    read_surface_id: L14ReadSurfaceId.CALIBRATION_PROPOSAL_QUEUE,
    read_mode: L14ReadMode.CURRENT_REGISTRY,
    consumer_class: L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
  });
  assert(validateL14ReadRequest(okReq).clean, 'D.4 legal read request accepted');
  // Illegal mode for calibration queue (only CURRENT_REGISTRY allowed).
  const badMode = buildL14ReadRequest({
    read_surface_id: L14ReadSurfaceId.CALIBRATION_PROPOSAL_QUEUE,
    read_mode: L14ReadMode.HISTORICAL_WINDOW,
    consumer_class: L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
  });
  assert(!validateL14ReadRequest(badMode).clean, 'D.5 illegal read mode rejected');
  // Illegal consumer on confidence-accuracy dashboard.
  const badConsumer = buildL14ReadRequest({
    read_surface_id: L14ReadSurfaceId.CONFIDENCE_ACCURACY_DASHBOARD,
    read_mode: L14ReadMode.HISTORICAL_WINDOW,
    consumer_class: L14ReadConsumerClass.CHANNEL_HEALTH_MONITOR,
  });
  assert(!validateL14ReadRequest(badConsumer).clean, 'D.6 illegal consumer rejected');
  // Unknown surface.
  const unknownSurface = buildL14ReadRequest({
    read_surface_id: 'UNKNOWN_SURFACE' as any,
    read_mode: L14ReadMode.HISTORICAL_WINDOW,
    consumer_class: L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
  });
  assert(!validateL14ReadRequest(unknownSurface).clean, 'D.7 unknown read surface rejected');
  // Result lineage-bound and cache non-authoritative.
  const res = buildL14GovernedReadResult({
    request: okReq, rows: [],
    completeness: L14ReadCompletenessClass.COMPLETE,
    freshness: L14ReadFreshnessClass.CURRENT,
  });
  assert(res.cache_authoritative === false, 'D.8 read result hard-pins cache_authoritative=false');
  assert(validateL14GovernedReadResult(res).clean, 'D.9 read result validator clean');
  // Cache-as-authority adversarial.
  const cached = { ...res, cache_authoritative: true } as any;
  assert(!validateL14GovernedReadResult(cached).clean, 'D.10 cache-as-authority rejected');
  // Confidence accuracy dashboard descriptor — history-backed.
  const confDesc = getL14ReadSurfaceDescriptor(L14ReadSurfaceId.CONFIDENCE_ACCURACY_DASHBOARD)!;
  assert(confDesc.history_backed === true, 'D.11 confidence accuracy dashboard history-backed');
  // Admission engine spot check.
  const admission = admitL14ReadRequest(okReq);
  assert(admission.admitted, 'D.12 admit legal request');
}

// ── BAND E : Replay ──────────────────────────────────────────────
band('BAND E — replay');

{
  const req = buildL14ReplayRequest({
    replay_subject_class: L14ReplaySubjectClass.DELIVERY_SENT_DECISION,
    source_record_ref: 'l14.exec.E',
    expected_policy_version: 'l14.runtime.v1',
    expected_delivery_policy_ref: 'l14.policy.E',
    expected_preference_snapshot_ref: 'l14.pref.snap.E',
  });
  const exact = replayL14DeliveryDecision({
    request: req,
    original_decision_ref: 'l14.dec.E',
    reconstructed_decision_ref: 'l14.dec.E',
    original_policy_ref: 'l14.policy.E',
    original_preference_snapshot_ref: 'l14.pref.snap.E',
    original_payload_ref: 'l14.payload.E',
    reconstructed_payload_ref: 'l14.payload.E',
    interaction_timeline_match: true,
  });
  assert(exact.replay_status === L14ReplayStatus.EXACT_RECONSTRUCTION, 'E.1 exact reconstruction status');
  assert(validateL14ReplayResult(exact).clean, 'E.2 exact replay validator clean');
  // Routing policy mismatch.
  const policyMismatch = replayL14DeliveryDecision({
    request: req,
    original_decision_ref: 'l14.dec.E',
    reconstructed_decision_ref: 'l14.dec.E',
    original_policy_ref: 'l14.policy.E.OLD',
    original_preference_snapshot_ref: 'l14.pref.snap.E',
    original_payload_ref: 'l14.payload.E',
    reconstructed_payload_ref: 'l14.payload.E',
  });
  assert(policyMismatch.replay_status === L14ReplayStatus.ROUTING_POLICY_MISMATCH, 'E.3 routing policy mismatch detected');
  // Missing original policy.
  const blocked = replayL14DeliveryDecision({
    request: req,
    original_policy_ref: undefined,
    original_preference_snapshot_ref: 'l14.pref.snap.E',
  });
  assert(blocked.replay_status === L14ReplayStatus.BLOCKED_ILLEGAL_REPLAY, 'E.4 missing original policy → BLOCKED_ILLEGAL_REPLAY');
  assert(blocked.mismatch_reason_codes.includes(L14ReplayMismatchReasonCode.ORIGINAL_POLICY_REF_MISSING), 'E.5 blocked carries ORIGINAL_POLICY_REF_MISSING');
  // Suppression replay.
  const supReq = buildL14ReplayRequest({
    replay_subject_class: L14ReplaySubjectClass.DELIVERY_SUPPRESSION_DECISION,
    source_record_ref: 'l14.sup.E',
    expected_delivery_policy_ref: 'l14.policy.E',
  });
  const supExact = replayL14DeliveryDecision({
    request: supReq,
    original_decision_ref: 'l14.dec.sup.E',
    reconstructed_decision_ref: 'l14.dec.sup.E',
    original_policy_ref: 'l14.policy.E',
    original_suppression_reason: 'SUPPRESS_DUPLICATE',
    reconstructed_suppression_reason: 'SUPPRESS_DUPLICATE',
  });
  assert(supExact.replay_status === L14ReplayStatus.EXACT_RECONSTRUCTION, 'E.6 suppression replay exact reconstruction');
  const supMis = replayL14DeliveryDecision({
    request: supReq,
    original_policy_ref: 'l14.policy.E',
    original_suppression_reason: 'SUPPRESS_DUPLICATE',
    reconstructed_suppression_reason: 'SUPPRESS_COOLDOWN',
  });
  assert(supMis.replay_status === L14ReplayStatus.SUPPRESSION_REASON_MISMATCH, 'E.7 suppression reason mismatch detected');
  // Preference snapshot mismatch.
  const prefMis = replayL14DeliveryDecision({
    request: req,
    original_policy_ref: 'l14.policy.E',
    original_preference_snapshot_ref: 'l14.pref.OLD',
    original_payload_ref: 'l14.payload.E',
    reconstructed_payload_ref: 'l14.payload.E',
  });
  assert(prefMis.replay_status === L14ReplayStatus.PREFERENCE_SNAPSHOT_MISMATCH, 'E.8 preference snapshot mismatch detected');
}

// ── BAND F : Repair ──────────────────────────────────────────────
band('BAND F — repair');

{
  // Legal repair: alert performance recompute with source history.
  const reqOk = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F',
    source_history_refs: ['l14.exec.F1', 'l14.exec.F2'],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  assert(validateL14RepairRequest(reqOk).clean, 'F.1 legit repair request clean');
  const resOk = processL14RepairRequest({ request: reqOk, rebuilt_record_refs: ['l14.alertperf.F.new'] });
  assert(resOk.repair_status === L14RepairStatus.COMPLETED_DERIVED_FACT_RECOMPUTE, 'F.2 recompute → COMPLETED_DERIVED_FACT_RECOMPUTE');
  assert(validateL14RepairResult(resOk).clean, 'F.3 repair result validator clean');
  // Channel health recompute.
  const reqCh = buildL14RepairRequest({
    repair_reason: L14RepairReason.CHANNEL_HEALTH_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.chhealth.F',
    source_history_refs: ['l14.exec.F3'],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  const resCh = processL14RepairRequest({ request: reqCh });
  assert(resCh.repair_status === L14RepairStatus.COMPLETED_DERIVED_FACT_RECOMPUTE, 'F.4 channel health recompute → COMPLETED_DERIVED_FACT_RECOMPUTE');
  // Current registry rebuild.
  const reqReg = buildL14RepairRequest({
    repair_reason: L14RepairReason.CURRENT_CHANNEL_HEALTH_REGISTRY_REBUILD,
    repair_subject_ref: 'l14.cur.chhealth.F',
    source_history_refs: ['l14.chhealth.F'],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  const resReg = processL14RepairRequest({ request: reqReg });
  assert(resReg.repair_status === L14RepairStatus.COMPLETED_CURRENT_REGISTRY_REBUILD, 'F.5 registry rebuild → COMPLETED_CURRENT_REGISTRY_REBUILD');
  // Repair missing source history.
  const reqNoSrc = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F2',
    source_history_refs: [],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  const resNoSrc = processL14RepairRequest({ request: reqNoSrc });
  assert(resNoSrc.repair_status === L14RepairStatus.BLOCKED_SOURCE_HISTORY_INCOMPLETE, 'F.6 missing source history → BLOCKED');
  // Invent user interaction.
  const reqInvent = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F3',
    source_history_refs: ['l14.exec.F4'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_invent_user_interaction: true,
  });
  assert(!validateL14RepairRequest(reqInvent).clean, 'F.7 invent-interaction repair rejected by validator');
  const resInvent = processL14RepairRequest({ request: reqInvent });
  assert(resInvent.repair_status === L14RepairStatus.BLOCKED_USER_INTERACTION_INVENTION, 'F.8 invent-interaction → BLOCKED');
  // Fabricate outcome.
  const reqFab = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F4',
    source_history_refs: ['l14.exec.F5'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_fabricate_outcome: true,
  });
  const resFab = processL14RepairRequest({ request: reqFab });
  assert(resFab.repair_status === L14RepairStatus.BLOCKED_OUTCOME_FABRICATION, 'F.9 fabricate-outcome → BLOCKED');
  // Rewrite feedback.
  const reqFb = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F5',
    source_history_refs: ['l14.exec.F6'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_rewrite_feedback: true,
  });
  const resFb = processL14RepairRequest({ request: reqFb });
  assert(resFb.repair_status === L14RepairStatus.BLOCKED_MUTATION_ATTEMPT, 'F.10 rewrite-feedback → BLOCKED');
  // Mutate historical fact.
  const reqMut = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.F6',
    source_history_refs: ['l14.exec.F7'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_mutate_historical_fact: true,
  });
  const resMut = processL14RepairRequest({ request: reqMut });
  assert(resMut.repair_status === L14RepairStatus.BLOCKED_MUTATION_ATTEMPT, 'F.11 mutate-historical → BLOCKED');
  // Missing original policy on materialization repair.
  const reqNoPolicy = buildL14RepairRequest({
    repair_reason: L14RepairReason.MISSING_DELIVERY_EXECUTION_MATERIALIZATION,
    repair_subject_ref: 'l14.exec.F8',
    source_history_refs: ['l14.exec.F8.source'],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  const resNoPolicy = processL14RepairRequest({ request: reqNoPolicy });
  assert(resNoPolicy.repair_status === L14RepairStatus.BLOCKED_POLICY_CONTEXT_MISSING, 'F.12 missing original policy → BLOCKED');
}

// ── BAND G : Audit + adversarial misuse ──────────────────────────
band('BAND G — audit + adversarial misuse');

{
  resetL14PersistenceAuditLog();
  const a = emitL14PersistenceAuditRecord({
    subjectClass: L14PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
    subjectRef: 'l14.persistence.envelope.G',
    violationCodes: [L14PersistenceViolationCode.L14P_DIRECT_WRITE_ATTEMPT],
    message: 'cert',
  });
  const b = emitL14PersistenceAuditRecord({
    subjectClass: L14PersistenceAuditSubjectClass.PERSISTENCE_ENVELOPE,
    subjectRef: 'l14.persistence.envelope.G',
    violationCodes: [L14PersistenceViolationCode.L14P_DIRECT_WRITE_ATTEMPT],
    message: 'cert',
  });
  assert(a.replay_hash === b.replay_hash, 'G.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'G.2 direct write attempt is CRITICAL + blocking');
  assert(severityForL14PersistenceCode(L14PersistenceViolationCode.L14P_LINEAGE_REFS_MISSING) === L14ConstitutionalAuditSeverity.ERROR, 'G.3 lineage-missing classified ERROR');
  assert(!isL14PersistenceBlockingCode(L14PersistenceViolationCode.L14P_LINEAGE_REFS_MISSING), 'G.4 lineage-missing not blocking');
  assert(isL14PersistenceBlockingCode(L14PersistenceViolationCode.L14P_CACHE_CLAIMED_AUTHORITY), 'G.5 cache-as-authority is blocking');
  assert(isL14PersistenceBlockingCode(L14PersistenceViolationCode.L14P_REPAIR_ATTEMPTED_INTERACTION_INVENTION), 'G.6 repair-interaction-invention blocking');
  assert(isL14PersistenceBlockingCode(L14PersistenceViolationCode.L14P_DELIVERY_REPLAY_POLICY_REF_MISSING), 'G.7 replay-missing-policy blocking');
  assert(getL14PersistenceAuditLog().length === 2, 'G.8 audit log queryable');
  assert(getL14PersistenceCriticalViolations().length === 2, 'G.9 critical violations queryable');
  // History/source legality helper.
  assert(isHistoricalFamilySourceSurfaceLegal(L14HistoricalFactFamily.TS_DELIVERY_EVENT_V1, L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS), 'G.10 ts_delivery_event_v1 legal source surface');
  assert(!isHistoricalFamilySourceSurfaceLegal(L14HistoricalFactFamily.TS_USER_INTERACTION_V1, L14DurableSurfaceId.OUTCOME_EVALUATIONS), 'G.11 ts_user_interaction_v1 illegal source surface rejected');
}

// ── BAND H : Invariants + alert/channel fact validation ──────────
band('BAND H — invariants + fact validation');

{
  const alertFact = buildL14AlertPerformanceFact({
    alert_class_ref: 'l13.alert.H',
    observed_window_start: '2026-05-01T00:00:00Z',
    observed_window_end: '2026-05-15T00:00:00Z',
    delivered_count: 100, opened_count: 60, clicked_count: 40,
    ignored_count: 20, dismissed_count: 5, saved_or_watchlisted_count: 30,
    deeper_investigation_count: 15,
    aligned_outcome_count: 50, partially_aligned_outcome_count: 20,
    misaligned_outcome_count: 20, inconclusive_outcome_count: 10,
    false_positive_count: 10, false_negative_count: 5,
    source_execution_refs: ['l14.exec.H'],
    source_interaction_refs: ['l14.interaction.H'],
    source_outcome_refs: ['l14.outcome.H'],
  });
  assert(validateL14AlertPerformanceFact(alertFact, 1, 1, 1).clean, 'H.1 alert performance fact clean with all sources');
  assert(!validateL14AlertPerformanceFact(alertFact, 0, 1, 1).clean, 'H.2 alert performance fact rejects missing execution refs');
  const channelHealth = buildL14ChannelHealthFact({
    channel: L14DeliveryChannel.AI_CHAT,
    observed_window_start: '2026-05-14T00:00:00Z',
    observed_window_end: '2026-05-15T00:00:00Z',
    attempted_delivery_count: 50,
    successful_delivery_count: 48,
    failed_delivery_count: 2,
    retry_eligible_failure_count: 1,
    exhausted_retry_count: 0,
  });
  assert(channelHealth.health_class === L14ChannelHealthClass.HEALTHY, 'H.3 channel health derives HEALTHY');
  assert(validateL14ChannelHealthFact(channelHealth).clean, 'H.4 channel health fact clean');
  const invs = runAllL14_8Invariants();
  assert(invs.length === 12, `H.5 twelve invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `H.6 ${i.id} ${i.name} (${i.evidence})`);
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
