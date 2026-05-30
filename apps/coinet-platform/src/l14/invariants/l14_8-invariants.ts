/**
 * L14.8 — Persistence / Read / Replay / Repair Invariants
 *
 * §14.8.48 — INV-14.8-A through INV-14.8-L.
 */

import {
  ALL_L14_DURABLE_SURFACES,
  L14DurableSurfaceId,
  L14MaterializationMode,
} from '../contracts/l14-persistence-surfaces';
import {
  ALL_L14_HISTORICAL_FAMILIES,
  L14HistoricalFactFamily,
  L14_FAMILY_SOURCE_SURFACES,
} from '../contracts/l14-historical-facts';
import {
  ALL_L14_CURRENT_REGISTRIES,
  L14CurrentRegistryId,
} from '../contracts/l14-current-registries';
import {
  ALL_L14_READ_SURFACES,
  L14ReadConsumerClass,
  L14ReadFreshnessClass,
  L14ReadCompletenessClass,
  L14ReadMode,
  L14ReadSurfaceId,
} from '../contracts/l14-read-surfaces';
import {
  L14ReplayMismatchReasonCode,
  L14ReplayStatus,
  L14ReplaySubjectClass,
} from '../contracts/l14-replay-contracts';
import {
  L14RepairReason,
  L14RepairStatus,
} from '../contracts/l14-repair-contracts';
import { L14DeliveryChannel } from '../contracts/delivery-channel';
import {
  L14DeliveryFailureClass,
  L14DeliveryFailureRecoveryAction,
  L14DeliveryFailureStage,
} from '../contracts/l14-performance-health-facts';
import { L14CalibrationProposalClass, L14CalibrationProposalStatus } from '../contracts/calibration-proposal-core';
import { L14ProposalReviewQueueClass } from '../contracts/calibration-proposal-handoff';
import {
  buildL14HistoricalFactRecord,
  buildL14PersistenceEnvelope,
  getAllL14DurableSurfaceDescriptors,
  getL14DurableSurfaceDescriptor,
} from '../persistence/l14-persistence-engines';
import {
  buildL14AlertPerformanceFact,
  buildL14ChannelHealthFact,
  buildL14CurrentAlertPerformanceRecord,
  buildL14CurrentCalibrationReviewRecord,
  buildL14CurrentChannelHealthRecord,
  buildL14DeliveryFailureRecord,
} from '../persistence/l14-fact-builders';
import {
  buildL14GovernedReadResult,
  buildL14ReadRequest,
} from '../read/l14-read-engines';
import {
  buildL14ReplayRequest,
  replayL14DeliveryDecision,
} from '../replay/l14-replay-engines';
import {
  buildL14RepairRequest,
  processL14RepairRequest,
} from '../repair/l14-repair-engines';
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
} from '../validation/l14-persistence.validators';

export interface L14_8InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_8InvariantResult {
  return { id, name, holds, evidence };
}

// ── Fixtures ─────────────────────────────────────────────────────

function legitEnvelope() {
  return buildL14PersistenceEnvelope({
    target_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    materialization_mode: L14MaterializationMode.EVENT_APPEND,
    source_object_ref: 'l14.exec.A',
    source_sublayer_ref: 'L14.3',
    l5_route_ref: 'l5.route.delivery.exec',
    write_authority_ref: 'l5.writer.delivery',
  });
}

function legitHistFact() {
  return buildL14HistoricalFactRecord({
    fact_family: L14HistoricalFactFamily.TS_DELIVERY_EVENT_V1,
    source_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    source_record_ref: 'l14.exec.A',
    occurred_at: '2026-05-15T00:00:00Z',
  });
}

// ── INV-14.8-A : L5-only persistence law ──────────────────────────

export function checkINV_148_A(): L14_8InvariantResult {
  const e = legitEnvelope();
  const v = validateL14PersistenceEnvelope(e);
  // Direct write: missing l5_route_ref.
  const direct = buildL14PersistenceEnvelope({
    ...({} as any),
    target_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    materialization_mode: L14MaterializationMode.EVENT_APPEND,
    source_object_ref: 'l14.exec.B',
    source_sublayer_ref: 'L14.3',
    l5_route_ref: '',
    write_authority_ref: '',
  });
  const vDirect = validateL14PersistenceEnvelope(direct);
  return inv('INV-14.8-A', 'L5-only persistence law',
    v.clean && !vDirect.clean,
    `legit=${v.clean} directRejected=${!vDirect.clean}`);
}

// ── INV-14.8-B : Durable surface completeness law ─────────────────

export function checkINV_148_B(): L14_8InvariantResult {
  const surfaces = getAllL14DurableSurfaceDescriptors();
  const ok =
    ALL_L14_DURABLE_SURFACES.length === 11 &&
    surfaces.length === 11 &&
    ALL_L14_HISTORICAL_FAMILIES.length === 8 &&
    ALL_L14_CURRENT_REGISTRIES.length === 4 &&
    surfaces.every(s => s.lineage_required === true && s.replay_hash_required === true && s.l5_route_required === true);
  return inv('INV-14.8-B', 'durable surface completeness',
    ok,
    `surfaces=${surfaces.length} families=${ALL_L14_HISTORICAL_FAMILIES.length} registries=${ALL_L14_CURRENT_REGISTRIES.length}`);
}

// ── INV-14.8-C : Current vs historical authority separation ──────

export function checkINV_148_C(): L14_8InvariantResult {
  // Attempt CURRENT_REGISTRY_SUPERSESSION on append-only surface → must reject.
  const bad = buildL14PersistenceEnvelope({
    target_surface_id: L14DurableSurfaceId.USER_INTERACTION_EVENTS,
    materialization_mode: L14MaterializationMode.CURRENT_REGISTRY_SUPERSESSION,
    source_object_ref: 'l14.interaction.X',
    source_sublayer_ref: 'L14.4',
    l5_route_ref: 'l5.route',
    write_authority_ref: 'l5.writer',
  });
  const vBad = validateL14PersistenceEnvelope(bad);
  // Derived surfaces ARE supersedable (alert performance / channel health).
  const derivedRegistry = buildL14CurrentAlertPerformanceRecord({
    alert_class_ref: 'l13.alert.X', latest_performance_fact_ref: 'l14.alertperf.X',
    evidence_window_ref: 'l14.evidence.window.X',
  });
  return inv('INV-14.8-C', 'current vs historical authority separation',
    !vBad.clean && !!derivedRegistry.current_alert_performance_record_id,
    `appendOnlySupersessionRejected=${!vBad.clean} registryWrite=${!!derivedRegistry.current_alert_performance_record_id}`);
}

// ── INV-14.8-D : Historical append safety law ────────────────────

export function checkINV_148_D(): L14_8InvariantResult {
  const f = legitHistFact();
  const v = validateL14HistoricalFactRecord(f);
  // Family/source mismatch.
  const mismatched = buildL14HistoricalFactRecord({
    fact_family: L14HistoricalFactFamily.TS_USER_INTERACTION_V1,
    source_surface_id: L14DurableSurfaceId.DELIVERY_EXECUTION_RECORDS,
    source_record_ref: 'l14.exec.A',
    occurred_at: '2026-05-15T00:00:00Z',
  });
  const vMis = validateL14HistoricalFactRecord(mismatched);
  // Every family has at least one source surface.
  const allFamiliesMapped = ALL_L14_HISTORICAL_FAMILIES.every(
    f => L14_FAMILY_SOURCE_SURFACES[f] && L14_FAMILY_SOURCE_SURFACES[f].length > 0,
  );
  return inv('INV-14.8-D', 'historical append safety',
    v.clean && !vMis.clean && allFamiliesMapped,
    `legit=${v.clean} mismatchRejected=${!vMis.clean} familiesMapped=${allFamiliesMapped}`);
}

// ── INV-14.8-E : Governed read surface law ───────────────────────

export function checkINV_148_E(): L14_8InvariantResult {
  const req = buildL14ReadRequest({
    read_surface_id: L14ReadSurfaceId.ALERT_PERFORMANCE_BY_CLASS,
    read_mode: L14ReadMode.CURRENT_REGISTRY,
    consumer_class: L14ReadConsumerClass.INTERNAL_ANALYST_CONSOLE,
  });
  const v = validateL14ReadRequest(req);
  // Illegal consumer.
  const reqBadConsumer = buildL14ReadRequest({
    read_surface_id: L14ReadSurfaceId.ALERT_PERFORMANCE_BY_CLASS,
    read_mode: L14ReadMode.CURRENT_REGISTRY,
    consumer_class: L14ReadConsumerClass.CHANNEL_HEALTH_MONITOR,
  });
  const vBad = validateL14ReadRequest(reqBadConsumer);
  // Result must not claim cache authority.
  const res = buildL14GovernedReadResult({
    request: req, rows: [], completeness: L14ReadCompletenessClass.COMPLETE,
    freshness: L14ReadFreshnessClass.CURRENT,
  });
  const vRes = validateL14GovernedReadResult(res);
  // Adversarial cache authority.
  const cached = { ...res, cache_authoritative: true } as any;
  const vCached = validateL14GovernedReadResult(cached);
  return inv('INV-14.8-E', 'governed read surface law',
    v.clean && !vBad.clean && vRes.clean && !vCached.clean &&
    ALL_L14_READ_SURFACES.length === 12,
    `legit=${v.clean} badConsumerRejected=${!vBad.clean} resultClean=${vRes.clean} cacheAuthRejected=${!vCached.clean}`);
}

// ── INV-14.8-F : Delivery replay reconstruction law ──────────────

export function checkINV_148_F(): L14_8InvariantResult {
  const req = buildL14ReplayRequest({
    replay_subject_class: L14ReplaySubjectClass.DELIVERY_SENT_DECISION,
    source_record_ref: 'l14.exec.F',
    expected_policy_version: 'l14.runtime.v1',
    expected_delivery_policy_ref: 'l14.policy.F',
    expected_preference_snapshot_ref: 'l14.pref.snap.F',
  });
  // Exact reconstruction.
  const exact = replayL14DeliveryDecision({
    request: req,
    original_decision_ref: 'l14.dec.F',
    reconstructed_decision_ref: 'l14.dec.F',
    original_policy_ref: 'l14.policy.F',
    original_preference_snapshot_ref: 'l14.pref.snap.F',
    original_payload_ref: 'l14.payload.F',
    reconstructed_payload_ref: 'l14.payload.F',
    interaction_timeline_match: true,
  });
  const vExact = validateL14ReplayResult(exact);
  // Missing original policy → blocked.
  const blocked = replayL14DeliveryDecision({
    request: req,
    original_policy_ref: undefined,
    original_preference_snapshot_ref: 'l14.pref.snap.F',
    original_payload_ref: 'l14.payload.F',
    reconstructed_payload_ref: 'l14.payload.F',
  });
  const vBlocked = validateL14ReplayResult(blocked);
  return inv('INV-14.8-F', 'delivery replay reconstruction',
    exact.replay_status === L14ReplayStatus.EXACT_RECONSTRUCTION &&
    vExact.clean &&
    blocked.replay_status === L14ReplayStatus.BLOCKED_ILLEGAL_REPLAY &&
    blocked.mismatch_reason_codes.includes(L14ReplayMismatchReasonCode.ORIGINAL_POLICY_REF_MISSING) &&
    !vBlocked.clean,
    `exact=${exact.replay_status} blocked=${blocked.replay_status} blockedRejected=${!vBlocked.clean}`);
}

// ── INV-14.8-G : Interaction timeline replay law ─────────────────

export function checkINV_148_G(): L14_8InvariantResult {
  const req = buildL14ReplayRequest({
    replay_subject_class: L14ReplaySubjectClass.DELIVERY_INTERACTION_TIMELINE,
    source_record_ref: 'l14.exec.G',
    expected_policy_version: 'l14.runtime.v1',
    expected_delivery_policy_ref: 'l14.policy.G',
  });
  // Mismatch.
  const mismatch = replayL14DeliveryDecision({
    request: req,
    original_policy_ref: 'l14.policy.G',
    interaction_timeline_match: false,
  });
  const v = validateL14ReplayResult(mismatch);
  return inv('INV-14.8-G', 'interaction timeline replay',
    mismatch.replay_status === L14ReplayStatus.INTERACTION_TIMELINE_MISMATCH &&
    mismatch.mismatch_reason_codes.includes(L14ReplayMismatchReasonCode.INTERACTION_CHAIN_INCOMPLETE) &&
    !v.clean,
    `status=${mismatch.replay_status} validatorRejects=${!v.clean}`);
}

// ── INV-14.8-H : Repair non-invention law ────────────────────────

export function checkINV_148_H(): L14_8InvariantResult {
  // Invented interaction.
  const reqInvent = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.X',
    source_history_refs: ['l14.exec.1'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_invent_user_interaction: true,
  });
  const vInvent = validateL14RepairRequest(reqInvent);
  const resInvent = processL14RepairRequest({ request: reqInvent });
  // Fabricated outcome.
  const reqFab = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.Y',
    source_history_refs: ['l14.exec.2'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_fabricate_outcome: true,
  });
  const vFab = validateL14RepairRequest(reqFab);
  const resFab = processL14RepairRequest({ request: reqFab });
  // Feedback rewrite.
  const reqFb = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.Z',
    source_history_refs: ['l14.exec.3'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_rewrite_feedback: true,
  });
  const resFb = processL14RepairRequest({ request: reqFb });
  // Mutated historical fact.
  const reqMut = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.W',
    source_history_refs: ['l14.exec.4'],
    requested_by: 'SYSTEM_REPAIR_JOB',
    intent_mutate_historical_fact: true,
  });
  const resMut = processL14RepairRequest({ request: reqMut });
  return inv('INV-14.8-H', 'repair non-invention',
    !vInvent.clean && !vFab.clean &&
    resInvent.repair_status === L14RepairStatus.BLOCKED_USER_INTERACTION_INVENTION &&
    resFab.repair_status === L14RepairStatus.BLOCKED_OUTCOME_FABRICATION &&
    resFb.repair_status === L14RepairStatus.BLOCKED_MUTATION_ATTEMPT &&
    resMut.repair_status === L14RepairStatus.BLOCKED_MUTATION_ATTEMPT &&
    resInvent.historical_records_mutated === false &&
    resInvent.user_interactions_invented === false &&
    resInvent.outcomes_fabricated === false,
    `invent=${resInvent.repair_status} fab=${resFab.repair_status} fb=${resFb.repair_status} mut=${resMut.repair_status}`);
}

// ── INV-14.8-I : Derived fact recomputation honesty ──────────────

export function checkINV_148_I(): L14_8InvariantResult {
  const alertFact = buildL14AlertPerformanceFact({
    alert_class_ref: 'l13.alert.I',
    observed_window_start: '2026-05-01T00:00:00Z',
    observed_window_end: '2026-05-15T00:00:00Z',
    delivered_count: 200, opened_count: 100, clicked_count: 60,
    ignored_count: 30, dismissed_count: 10, saved_or_watchlisted_count: 40,
    deeper_investigation_count: 20,
    aligned_outcome_count: 120, partially_aligned_outcome_count: 40,
    misaligned_outcome_count: 30, inconclusive_outcome_count: 10,
    false_positive_count: 15, false_negative_count: 5,
    source_execution_refs: ['l14.exec.I'],
    source_interaction_refs: ['l14.interaction.I'],
    source_outcome_refs: ['l14.outcome.I'],
  });
  const vAlert = validateL14AlertPerformanceFact(alertFact, 1, 1, 1);
  // Incomplete source.
  const vAlertIncomplete = validateL14AlertPerformanceFact(alertFact, 0, 1, 1);
  const channelFact = buildL14ChannelHealthFact({
    channel: L14DeliveryChannel.TELEGRAM,
    observed_window_start: '2026-05-14T00:00:00Z',
    observed_window_end: '2026-05-15T00:00:00Z',
    attempted_delivery_count: 100,
    successful_delivery_count: 95,
    failed_delivery_count: 5,
    retry_eligible_failure_count: 3,
    exhausted_retry_count: 0,
  });
  const vChannel = validateL14ChannelHealthFact(channelFact);
  // Window declared.
  const windowOk = !!alertFact.observed_window_start && !!alertFact.observed_window_end &&
    !!channelFact.observed_window_start && !!channelFact.observed_window_end;
  return inv('INV-14.8-I', 'derived fact recomputation honesty',
    vAlert.clean && !vAlertIncomplete.clean && vChannel.clean && windowOk,
    `alert=${vAlert.clean} incompleteRejected=${!vAlertIncomplete.clean} channel=${vChannel.clean} window=${windowOk}`);
}

// ── INV-14.8-J : Current registry reconstructability law ─────────

export function checkINV_148_J(): L14_8InvariantResult {
  // Every current registry write requires lineage to a durable fact ref.
  const alert = buildL14CurrentAlertPerformanceRecord({
    alert_class_ref: 'l13.alert.J',
    latest_performance_fact_ref: 'l14.alertperf.J',
    evidence_window_ref: 'l14.evidence.window.J',
  });
  const chan = buildL14CurrentChannelHealthRecord({
    channel: L14DeliveryChannel.PUSH_ALERT,
    latest_channel_health_fact_ref: 'l14.chhealth.J',
    health_class: 'PAUSED_OR_RESERVED' as any,
    retry_pressure_class: 'NONE' as any,
    observed_window_ref: 'l14.window.J',
  });
  const reconstructable = !!alert.latest_performance_fact_ref && !!chan.latest_channel_health_fact_ref;
  return inv('INV-14.8-J', 'current registry reconstructability',
    reconstructable && alert.lineage_refs.length > 0 && chan.lineage_refs.length > 0,
    `reconstructable=${reconstructable}`);
}

// ── INV-14.8-K : Calibration proposal queue durability law ───────

export function checkINV_148_K(): L14_8InvariantResult {
  const rec = buildL14CurrentCalibrationReviewRecord({
    calibration_proposal_ref: 'l14.proposal.K',
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    affected_layer: 'L11',
    latest_review_status: L14CalibrationProposalStatus.READY_FOR_REVIEW_QUEUE,
    current_review_queue_ref: L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE,
    latest_handoff_ref: 'l14.proposal.handoff.K',
    created_at: '2026-05-15T00:00:00Z',
    last_status_change_at: '2026-05-15T00:00:00Z',
  });
  const ok = rec.calibration_proposal_ref === 'l14.proposal.K' &&
    rec.current_review_queue_ref === L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE &&
    !!rec.latest_handoff_ref;
  return inv('INV-14.8-K', 'calibration proposal queue durability',
    ok,
    `reconciled=${ok}`);
}

// ── INV-14.8-L : Audit determinism + replay identity law ─────────

export function checkINV_148_L(): L14_8InvariantResult {
  const e1 = legitEnvelope();
  const e2 = legitEnvelope();
  const sameEnv = e1.replay_hash === e2.replay_hash;
  const h1 = legitHistFact();
  const h2 = legitHistFact();
  const sameHist = h1.replay_hash === h2.replay_hash;
  const failure = buildL14DeliveryFailureRecord({
    channel: L14DeliveryChannel.TELEGRAM,
    failure_stage: L14DeliveryFailureStage.PROVIDER_RESPONSE,
    failure_class: L14DeliveryFailureClass.PROVIDER_TIMEOUT,
    sanitized_failure_summary: 'fixture',
    retry_eligible: true,
    retry_count_at_failure: 1,
    recovery_action: L14DeliveryFailureRecoveryAction.RETRY_LATER,
    occurred_at: '2026-05-15T00:00:00Z',
    source_delivery_execution_ref: 'l14.exec.L',
  });
  const vFailure = validateL14DeliveryFailureRecord(failure);
  // Repair result determinism.
  const reqRep = buildL14RepairRequest({
    repair_reason: L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
    repair_subject_ref: 'l14.alertperf.L',
    source_history_refs: ['l14.exec.L1', 'l14.exec.L2'],
    requested_by: 'SYSTEM_REPAIR_JOB',
  });
  const r1 = processL14RepairRequest({ request: reqRep });
  const r2 = processL14RepairRequest({ request: reqRep });
  const sameRep = r1.replay_hash === r2.replay_hash;
  const vRep = validateL14RepairResult(r1);
  return inv('INV-14.8-L', 'audit determinism + replay identity',
    sameEnv && sameHist && sameRep && vFailure.clean && vRep.clean &&
    e1.lineage_refs.length > 0 && h1.lineage_refs.length > 0 && r1.lineage_refs.length > 0,
    `envSame=${sameEnv} histSame=${sameHist} repairSame=${sameRep} failureClean=${vFailure.clean}`);
}

// Keep some references live.
void L14CurrentRegistryId.CURRENT_DELIVERY_POLICY_REGISTRY;
void getL14DurableSurfaceDescriptor;

export function runAllL14_8Invariants(): readonly L14_8InvariantResult[] {
  return [
    checkINV_148_A(),
    checkINV_148_B(),
    checkINV_148_C(),
    checkINV_148_D(),
    checkINV_148_E(),
    checkINV_148_F(),
    checkINV_148_G(),
    checkINV_148_H(),
    checkINV_148_I(),
    checkINV_148_J(),
    checkINV_148_K(),
    checkINV_148_L(),
  ];
}
