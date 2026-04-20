/**
 * L9.4 — Sequence & Temporal Engine: Runtime, Deterministic DAG, and
 * Engine Components — Certification Test Suite
 *
 * 5 Bands (§9.4.19.2):
 *   A — DAG and runtime legality (stages, edges, cycles, toposort,
 *       run lineage, execution context)
 *   B — Subject assembly, input resolution, and ordered-signal
 *       resolution
 *   C — Temporal structure (lead-lag, phase, change-point, decay,
 *       post-event windows)
 *   D — Classification, confidence handoff, restriction handoff
 *   E — Evidence pack, materialization, replay, repair, audit,
 *       and INV-9.4-A..H invariants
 */

// ── Runtime ──
import {
  L9DagNodeClass, ALL_L9_DAG_NODE_CLASSES,
  L9DagStage, L9_STAGE_ORDER, L9_STAGE_INDEX,
  L9_NODE_CLASS_STAGE,
  buildL9DagNodeId, compareL9NodesDeterministic,
  L9DagEdgeClass, ALL_L9_DAG_EDGE_CLASSES,
  L9_LEGAL_EDGE_TRANSITIONS, isLegalL9Edge, buildL9DagEdgeId,
  detectL9Cycles, l9Toposort,
  buildL9SequenceDag,
  L9SequenceRunMode, ALL_L9_RUN_MODES,
  validateL9SequenceRun, finaliseL9SequenceRun,
  createL9ExecutionContext, sealL9Stage, isL9StageSealed,
} from '../l9/runtime';

// ── Engines ──
import {
  assembleSequenceSubject,
  resolveTemporalInputs,
  resolveOrderedSignals,
  computeLeadLagProfile,
  emitPhaseProgression,
  detectChangePoints,
  emitDecayProfile,
  emitPostEventWindows,
  classifySequence,
  buildConfidenceHandoff,
  buildRestrictionProfile,
  buildSequenceEvidencePack,
} from '../l9/engine';

// ── Materializer / replay / repair ──
import { materializeSequenceOutput } from '../l9/materializer';
import { verifyL9ReplayIdentity } from '../l9/replay/l9-replay-adapter';
import { verifyL9Repair } from '../l9/replay/l9-repair-adapter';

// ── Validation / runtime audit ──
import {
  L9RuntimeViolationCode,
  ALL_L9_RUNTIME_VIOLATION_CODES,
  L9RuntimeError,
} from '../l9/validation/l9-runtime-violation-codes';
import {
  buildL9RuntimeAudit,
  classifyL9ViolationSeverity,
  hasL9BlockingViolations,
  L9RuntimeViolationSeverity,
} from '../l9/validation/l9-runtime-audit';

// ── Contracts ──
import {
  L9SequenceState,
} from '../l9/contracts/sequence-state';
import {
  L9SequenceCoexistenceClass,
} from '../l9/contracts/sequence-coexistence';
import { L9SequenceFamily } from '../l9/contracts/sequence-family';
import {
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../l9/contracts/lead-lag-relation';
import {
  L9PhaseClass,
} from '../l9/contracts/phase-state';
import {
  L9DecayClass,
  L9DecayReasonCode,
} from '../l9/contracts/decay-profile';
import {
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../l9/contracts/change-point';
import {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../l9/contracts/post-event-window';

// ── Invariants + green pipeline ──
import {
  runGreenL94Pipeline,
  buildGreenL94Subject,
  buildGreenL94Run,
} from '../l9/invariants/l9_4-green-pipeline';
import {
  checkINV_94_A, checkINV_94_B, checkINV_94_C, checkINV_94_D,
  checkINV_94_E, checkINV_94_F, checkINV_94_G, checkINV_94_H,
  runAllL9_4Invariants,
} from '../l9/invariants/l9_4-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

function pipeline() { return runGreenL94Pipeline(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — DAG and Runtime Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: DAG and Runtime Legality ═══');

assert(ALL_L9_DAG_NODE_CLASSES.length === 14,
  `A.01 14 node classes (got ${ALL_L9_DAG_NODE_CLASSES.length})`);
assert(ALL_L9_DAG_EDGE_CLASSES.length === 18,
  `A.02 18 edge classes (got ${ALL_L9_DAG_EDGE_CLASSES.length})`);
assert(L9_STAGE_ORDER.length === 14, 'A.03 14 stages');
assert(L9_STAGE_ORDER[0] === L9DagStage.S01_INPUT, 'A.04 first stage INPUT');
assert(L9_STAGE_ORDER[L9_STAGE_ORDER.length - 1] ===
  L9DagStage.S14_MATERIALIZATION, 'A.05 last stage MATERIALIZATION');
assert(L9_STAGE_INDEX[L9DagStage.S10_CLASSIFICATION] === 9,
  'A.06 classification at index 9');

for (const cls of ALL_L9_DAG_NODE_CLASSES) {
  assert(L9_NODE_CLASS_STAGE[cls] !== undefined, `A.stage.${cls}`);
}

for (const edge of ALL_L9_DAG_EDGE_CLASSES) {
  const legal = L9_LEGAL_EDGE_TRANSITIONS[edge];
  assert(legal !== undefined && legal.length >= 1, `A.legal.${edge}`);
}
assert(isLegalL9Edge(L9DagEdgeClass.INPUT_TO_SUBJECT,
  L9DagNodeClass.INPUT_NODE, L9DagNodeClass.SUBJECT_NODE),
  'A.10 INPUT_TO_SUBJECT legal');
assert(!isLegalL9Edge(L9DagEdgeClass.INPUT_TO_SUBJECT,
  L9DagNodeClass.DECAY_NODE, L9DagNodeClass.SUBJECT_NODE),
  'A.11 wrong-class INPUT_TO_SUBJECT blocked');

// Node id builder determinism
const nid1 = buildL9DagNodeId({
  node_class: L9DagNodeClass.SUBJECT_NODE,
  sequence_run_id: 'r', sequence_subject_id: 's',
  scope_type: 'ASSET', scope_id: 'eth',
});
const nid2 = buildL9DagNodeId({
  node_class: L9DagNodeClass.SUBJECT_NODE,
  sequence_run_id: 'r', sequence_subject_id: 's',
  scope_type: 'ASSET', scope_id: 'eth',
});
assert(nid1 === nid2, 'A.12 node id deterministic');
assert(nid1.startsWith('SUBJECT_NODE'), 'A.13 node id prefix');

// Edge id builder
const eid = buildL9DagEdgeId(L9DagEdgeClass.INPUT_TO_SUBJECT, 'from', 'to');
assert(typeof eid === 'string' && eid.includes('INPUT_TO_SUBJECT'),
  'A.14 edge id carries class');

// Node comparator
const nodeA = {
  node_id: 'A', node_class: L9DagNodeClass.INPUT_NODE,
  stage: L9DagStage.S01_INPUT, sequence_subject_id: 'x',
  sequence_family: 'ACCUMULATION_TO_EXPANSION', scope_type: 'ASSET',
  scope_id: 'eth', deterministic_inputs: [],
  engine_id: 'e', engine_version: 'v', created_at_ordinal: 0,
};
const nodeB = { ...nodeA, node_id: 'B' };
assert(compareL9NodesDeterministic(nodeA, nodeB) < 0, 'A.15 compare by id');
assert(compareL9NodesDeterministic(nodeA, nodeA) === 0, 'A.16 compare same');

// Cycle detection
const cycleRes = detectL9Cycles(['X', 'Y', 'Z'], [
  { edge_id: '1', edge_class: L9DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'X', to_node_id: 'Y' },
  { edge_id: '2', edge_class: L9DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'Y', to_node_id: 'Z' },
  { edge_id: '3', edge_class: L9DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'Z', to_node_id: 'X' },
]);
assert(!cycleRes.acyclic, 'A.17 cycle detected');
assert(cycleRes.cycles.length >= 1, 'A.18 at least one cycle');
assert(detectL9Cycles(['X'], []).acyclic, 'A.19 empty edges acyclic');

// Toposort empty
const topoEmpty = l9Toposort([], []);
assert(topoEmpty.ok && topoEmpty.order.length === 0, 'A.20 empty toposort ok');

// Green pipeline DAG
const pA = pipeline();
const dagBuild = buildL9SequenceDag(pA.run, [pA.subject],
  pA.run.engine_version_set);
assert(dagBuild.dag !== null, 'A.21 green DAG built');
assert(dagBuild.violations.length === 0, 'A.22 no DAG violations');
assert(dagBuild.dag!.nodes.length === 14, 'A.23 14 nodes per subject');
assert(dagBuild.dag!.edges.length === 18, 'A.24 18 edges per subject');
assert(dagBuild.dag!.topological_order.length === 14,
  'A.25 toposort covers all nodes');

// Determinism: rebuild and compare order
const dagBuild2 = buildL9SequenceDag(pA.run, [pA.subject],
  pA.run.engine_version_set);
for (let i = 0; i < dagBuild.dag!.topological_order.length; i++) {
  assert(
    dagBuild.dag!.topological_order[i] ===
      dagBuild2.dag!.topological_order[i],
    `A.order.${i}`,
  );
}

// Run lineage
const rv = validateL9SequenceRun(pA.run);
assert(rv.valid, 'A.26 run lineage valid');
assert(ALL_L9_RUN_MODES.length >= 3, 'A.27 ≥3 run modes');
assert(validateL9SequenceRun({ ...pA.run, sequence_run_id: '' }).valid
  === false, 'A.28 missing run id rejected');
assert(validateL9SequenceRun({
  ...pA.run, mode: L9SequenceRunMode.REPLAY, parent_run_id: null,
}).valid === false, 'A.29 REPLAY without parent rejected');
assert(validateL9SequenceRun({
  ...pA.run, mode: L9SequenceRunMode.REPAIR,
  parent_run_id: 'p', repair_reason: null,
}).valid === false, 'A.30 REPAIR without reason rejected');
const finished = finaliseL9SequenceRun(pA.run, '2026-04-17T12:10:00Z');
assert(finished.completed_at === '2026-04-17T12:10:00Z', 'A.31 run finalised');

// Runtime violation codes breadth
assert(ALL_L9_RUNTIME_VIOLATION_CODES.length >= 80,
  `A.32 ≥80 runtime codes (got ${ALL_L9_RUNTIME_VIOLATION_CODES.length})`);
const runtimeErr = new L9RuntimeError(
  L9RuntimeViolationCode.DAG_CYCLE_DETECTED, 'test',
);
assert(runtimeErr.code === L9RuntimeViolationCode.DAG_CYCLE_DETECTED,
  'A.33 L9RuntimeError carries code');

// Execution context
const ctx = createL9ExecutionContext(pA.run);
assert(ctx.subjects.size === 0, 'A.34 ctx subjects empty at start');
sealL9Stage(ctx, L9DagStage.S01_INPUT);
assert(isL9StageSealed(ctx, L9DagStage.S01_INPUT), 'A.35 stage sealed');
assert(!isL9StageSealed(ctx, L9DagStage.S02_SUBJECT),
  'A.36 other stages not sealed');

// ═══════════════════════════════════════════════════════════════
// BAND B — Subject Assembly, Input Resolution, Ordered Signals
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Assembly / Inputs / Ordered Signals ═══');

const pB = pipeline();
const { subject } = pB;

// Green assembly
const greenAssembly = assembleSequenceSubject({
  subject,
  surface_availability: [
    { ref: 'l7:validation/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L7_VALIDATION' },
    { ref: 'l6:event/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L6_EVENT' },
    { ref: 'l6:feature/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L6_FEATURE' },
    { ref: 'l8:regime/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L8_REGIME' },
  ],
  trace_id: 't', manifest_id: 'm',
});
assert(greenAssembly.ok, 'B.01 green assembly ok');
assert(greenAssembly.value!.bound_validation_refs.length >= 1,
  'B.02 validation refs bound');

// Missing identity
const noId = assembleSequenceSubject({
  subject: { ...subject, sequence_subject_id: '' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!noId.ok, 'B.03 missing id blocked');

// Unregistered family
const fakeFamily = assembleSequenceSubject({
  subject: { ...subject,
    sequence_family: 'FAKE_FAMILY' as L9SequenceFamily },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!fakeFamily.ok, 'B.04 unregistered family blocked');

// Judgment leak in description
const leak = assembleSequenceSubject({
  subject: { ...subject,
    description: 'final judgment carries recommendation for entry' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!leak.ok, 'B.05 judgment leak blocked');
assert(leak.violations.some(v =>
  v.code === L9RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK),
  'B.06 judgment-leak code');

// Missing lineage
const noLineage = assembleSequenceSubject({
  subject: { ...subject,
    lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] } },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!noLineage.ok, 'B.07 no lineage blocked');

// Input resolution — green
const greenInputs = resolveTemporalInputs({
  subject,
  instance: greenAssembly.value!,
  surface_statuses: [
    mkStatus('l7:validation/accum-eth'),
    mkStatus('l6:event/accum-eth'),
    mkStatus('l6:feature/accum-eth'),
    mkStatus('l8:regime/accum-eth'),
  ],
  restriction_profile_refs: ['l7:restriction/accum'],
});
assert(greenInputs.ok, 'B.08 green inputs resolve');
assert(greenInputs.value!.readiness_class.length > 0,
  'B.09 readiness class assigned');

// Missing required validation
const noValidation = resolveTemporalInputs({
  subject, instance: greenAssembly.value!,
  surface_statuses: [
    mkStatus('l6:event/accum-eth'),
    mkStatus('l6:feature/accum-eth'),
    mkStatus('l8:regime/accum-eth'),
  ],
  restriction_profile_refs: [],
});
assert(!noValidation.ok, 'B.10 missing validation blocked');
assert(noValidation.violations.some(v =>
  v.code === L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_VALIDATION),
  'B.11 missing validation code');

// Evidence-only used as hard
const evOnlyHard = resolveTemporalInputs({
  subject, instance: greenAssembly.value!,
  surface_statuses: [
    mkStatus('l7:validation/accum-eth', { evidence_only: true }),
    mkStatus('l6:event/accum-eth'),
    mkStatus('l6:feature/accum-eth'),
    mkStatus('l8:regime/accum-eth'),
  ],
  restriction_profile_refs: [],
});
assert(evOnlyHard.violations.some(v =>
  v.code === L9RuntimeViolationCode.INPUT_EVIDENCE_ONLY_USED_AS_HARD),
  'B.12 evidence-only as hard code');

// Blocked validation
const blocked = resolveTemporalInputs({
  subject, instance: greenAssembly.value!,
  surface_statuses: [
    mkStatus('l7:validation/accum-eth', { blocked: true }),
    mkStatus('l6:event/accum-eth'),
    mkStatus('l6:feature/accum-eth'),
    mkStatus('l8:regime/accum-eth'),
  ],
  restriction_profile_refs: [],
});
assert(blocked.violations.some(v =>
  v.code === L9RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED),
  'B.13 blocked validation code');

// Regime omission
const noRegime = resolveTemporalInputs({
  subject, instance: greenAssembly.value!,
  surface_statuses: [
    mkStatus('l7:validation/accum-eth'),
    mkStatus('l6:event/accum-eth'),
    mkStatus('l6:feature/accum-eth'),
  ],
  restriction_profile_refs: [],
});
assert(noRegime.violations.some(v =>
  v.code === L9RuntimeViolationCode.INPUT_REGIME_OMITTED_WHERE_REQUIRED),
  'B.14 regime omission code');

// Ordered-signal resolver — green
const goodOrdered = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('sig_init', '2026-04-17T10:00:00Z'),
    mkCandidate('sig_conf', '2026-04-17T11:00:00Z'),
  ],
});
assert(goodOrdered.ok, 'B.15 green ordered signals ok');
assert(goodOrdered.value!.ordered_signals.length === 2,
  'B.16 2 ordered signals');
assert(goodOrdered.value!.ordered_signals[0]!.signal_ref === 'sig_init',
  'B.17 deterministic order');

// Ordered-signal: missing evidence
const noEv = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('sig_init', '2026-04-17T10:00:00Z',
      { ordering_evidence_refs: [] }),
  ],
});
assert(!noEv.ok, 'B.18 ordered signal without evidence blocked');
assert(noEv.violations.some(v =>
  v.code === L9RuntimeViolationCode.ORDERED_SIGNAL_MISSING_EVIDENCE),
  'B.19 missing evidence code');

// Ordered-signal: evidence-only-as-node
const evOnlyAsNode = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('sig_ev', '2026-04-17T10:00:00Z', { evidence_only: true }),
  ],
});
assert(!evOnlyAsNode.ok, 'B.20 evidence-only-as-node blocked');
assert(evOnlyAsNode.violations.some(v =>
  v.code === L9RuntimeViolationCode.ORDERED_SIGNAL_EVIDENCE_ONLY_AS_NODE),
  'B.21 evidence-only-as-node code');

// Ordered-signal: tie-break stable
const ties1 = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('b', '2026-04-17T10:00:00Z'),
    mkCandidate('a', '2026-04-17T10:00:00Z'),
  ],
});
const ties2 = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('a', '2026-04-17T10:00:00Z'),
    mkCandidate('b', '2026-04-17T10:00:00Z'),
  ],
});
assert(
  ties1.value!.ordered_signals.map(o => o.signal_ref).join(',')
    === 'a,b' &&
  ties2.value!.ordered_signals.map(o => o.signal_ref).join(',')
    === 'a,b',
  'B.22 tie-break deterministic');
assert(ties1.value!.tie_break_reasons.length >= 1,
  'B.23 tie-break reasons emitted');

// Ordered-signal: ambiguity preserved
const ambigRes = resolveOrderedSignals({
  subject, resolved_inputs: greenInputs.value!,
  candidates: [
    mkCandidate('sig_a', '2026-04-17T10:00:00Z', { ambiguous: true }),
  ],
});
assert(ambigRes.value?.has_ambiguity === true,
  'B.24 ambiguity preserved on resolved set');

// ═══════════════════════════════════════════════════════════════
// BAND C — Temporal Structure
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Temporal Structure ═══');

const pC = pipeline();

const orderedSignalsStub = {
  ordered_signals: [],
  has_ambiguity: false,
  tie_break_reasons: [],
  late_count: 0,
  stale_count: 0,
} as never;

// Lead-lag: green
const goodLL = computeLeadLagProfile({
  subject: pC.subject,
  ordered_signals: orderedSignalsStub,
  relations: [{
    leading_signal_ref: 'sig_init',
    lagging_signal_ref: 'sig_conf',
    lag_duration_ms: 3_600_000,
    support_strength: L9LagSupportStrength.STRONG_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0.1, historical_reliability: 0.8,
    lag_window_ref: 'win_ll_eth_4h',
    ordering_evidence_refs: ['ev'],
    restriction_consumption_refs: [{
      restriction_profile_ref: 'l7:restriction/accum',
      consumed_rights: ['TEMPORAL_CONDITIONING'],
    }],
    regime_conditioning_refs: [{
      regime_result_ref: 'l8:regime/accum-eth',
      regime_family: 'MACRO', regime_confidence_band: 'HIGH',
    }],
    validation_conditioning_refs: [{
      validation_ref: 'l7:validation/accum-eth',
      validation_class: 'NORMAL',
    }],
  }],
  contract_versions: {
    lead_lag_contract_version: '9.3.0',
    schema_version: '9.3.0',
    policy_version: 'l9.3-policy-v1',
  },
  compute_run_id: pC.run.sequence_run_id,
}).ok;
assert(goodLL, 'C.01 green lead-lag ok');

// Lead-lag: negative duration
const negDur = computeLeadLagProfile({
  subject: pC.subject,
  ordered_signals: orderedSignalsStub,
  relations: [{
    leading_signal_ref: 'a', lagging_signal_ref: 'b',
    lag_duration_ms: -10,
    support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0, historical_reliability: 0.5,
    lag_window_ref: 'w', ordering_evidence_refs: ['e'],
    restriction_consumption_refs: [], regime_conditioning_refs: [],
    validation_conditioning_refs: [],
  }],
  contract_versions: {
    lead_lag_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(negDur.violations.some(v =>
  v.code === L9RuntimeViolationCode.LEAD_LAG_NEGATIVE_DURATION),
  'C.02 negative lag duration code');

// Lead-lag: without ordering evidence
const noOrdering = computeLeadLagProfile({
  subject: pC.subject,
  ordered_signals: orderedSignalsStub,
  relations: [{
    leading_signal_ref: 'a', lagging_signal_ref: 'b',
    lag_duration_ms: 1000,
    support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0, historical_reliability: 0.5,
    lag_window_ref: 'w', ordering_evidence_refs: [],
    restriction_consumption_refs: [], regime_conditioning_refs: [],
    validation_conditioning_refs: [],
  }],
  contract_versions: {
    lead_lag_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(noOrdering.violations.some(v =>
  v.code === L9RuntimeViolationCode.LEAD_LAG_WITHOUT_ORDERING_EVIDENCE),
  'C.03 lead-lag without ordering evidence code');

// Decay: green
const greenDecay = emitDecayProfile({
  subject: pC.subject,
  decay_required: true,
  decay_score: 0.05,
  decaying_signal_refs: [],
  surviving_signal_refs: ['a'],
  decay_reason_codes: [L9DecayReasonCode.TIME_BURDEN],
  time_burden_ms: 100,
  contract_versions: {
    decay_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(greenDecay.ok, 'C.04 green decay ok');

// Decay: score out of range
const decayOOR = emitDecayProfile({
  subject: pC.subject,
  decay_required: true,
  decay_score: 1.5, decaying_signal_refs: [], surviving_signal_refs: [],
  decay_reason_codes: [L9DecayReasonCode.TIME_BURDEN],
  time_burden_ms: 0,
  contract_versions: {
    decay_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(decayOOR.violations.some(v =>
  v.code === L9RuntimeViolationCode.DECAY_SCORE_OUT_OF_RANGE),
  'C.05 decay out-of-range code');

// Decay: missing reason when score > 0
const decayNoReason = emitDecayProfile({
  subject: pC.subject,
  decay_required: true,
  decay_score: 0.5, decaying_signal_refs: [], surviving_signal_refs: [],
  decay_reason_codes: [], time_burden_ms: 0,
  contract_versions: {
    decay_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(decayNoReason.violations.some(v =>
  v.code === L9RuntimeViolationCode.DECAY_MISSING_REASON),
  'C.06 decay missing reason code');

// Phase: green
const greenPhase = emitPhaseProgression({
  subject: pC.subject,
  ordered_signals: { ordered_signals: [], has_ambiguity: false,
    tie_break_reasons: [], late_count: 0, stale_count: 0 } as never,
  lead_lag: { relations: [] } as never,
  chain_complete: true, chain_damaged: false,
  has_change_point_jump: false, has_post_event_digestion: false,
  is_decaying: false,
  phase_class: L9PhaseClass.EARLY, phase_progression_score: 0.3,
  phase_support_refs: ['s'], phase_challenge_refs: [],
  phase_started_at: '2026-04-17T10:00:00Z',
  phase_last_confirmed_at: '2026-04-17T11:00:00Z',
  contract_versions: {
    phase_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(greenPhase.ok, 'C.07 green phase ok');

// Phase: assigned without chain
const phaseNoChain = emitPhaseProgression({
  subject: pC.subject,
  ordered_signals: { ordered_signals: [], has_ambiguity: false,
    tie_break_reasons: [], late_count: 0, stale_count: 0 } as never,
  lead_lag: { relations: [] } as never,
  chain_complete: false, chain_damaged: true,
  has_change_point_jump: false, has_post_event_digestion: false,
  is_decaying: false,
  phase_class: L9PhaseClass.EARLY, phase_progression_score: 0.3,
  phase_support_refs: ['s'], phase_challenge_refs: [],
  phase_started_at: '2026-04-17T10:00:00Z',
  phase_last_confirmed_at: '2026-04-17T11:00:00Z',
  contract_versions: {
    phase_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(phaseNoChain.violations.some(v =>
  v.code === L9RuntimeViolationCode.PHASE_ASSIGNED_WITHOUT_CHAIN),
  'C.08 phase-without-chain code');

// Phase: expansion while decaying
const phaseExpDecay = emitPhaseProgression({
  subject: pC.subject,
  ordered_signals: { ordered_signals: [], has_ambiguity: false,
    tie_break_reasons: [], late_count: 0, stale_count: 0 } as never,
  lead_lag: { relations: [] } as never,
  chain_complete: true, chain_damaged: false,
  has_change_point_jump: false, has_post_event_digestion: false,
  is_decaying: true,
  phase_class: L9PhaseClass.EXPANSION, phase_progression_score: 0.3,
  phase_support_refs: ['s'], phase_challenge_refs: [],
  phase_started_at: '2026-04-17T10:00:00Z',
  phase_last_confirmed_at: '2026-04-17T11:00:00Z',
  contract_versions: {
    phase_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(phaseExpDecay.violations.some(v =>
  v.code === L9RuntimeViolationCode.PHASE_EXPANSION_WHILE_DECAYING),
  'C.09 expansion-while-decaying code');

// Change point: shock without anchor
const cpShockNoAnchor = detectChangePoints({
  subject: pC.subject,
  candidates: [{
    change_point_class: L9ChangePointClass.CONTRADICTION_SHOCK,
    change_point_at: '2026-04-17T11:00:00Z',
    prior_phase_ref: 'p1', next_phase_ref: 'p2',
    triggering_refs: ['t'], severity_score: 0.8,
    has_anchor: false, has_contradiction_refs: true,
  }],
});
assert(cpShockNoAnchor.violations.some(v =>
  v.code === L9RuntimeViolationCode.CHANGE_POINT_SHOCK_WITHOUT_ANCHOR),
  'C.10 shock-without-anchor code');

// Change point: phase-shift missing prior/next
const cpMissingPosture = detectChangePoints({
  subject: pC.subject,
  candidates: [{
    change_point_class: L9ChangePointClass.PHASE_SHIFT,
    change_point_at: '2026-04-17T11:00:00Z',
    prior_phase_ref: null, next_phase_ref: null,
    triggering_refs: ['t'], severity_score: 0.2,
    has_anchor: true, has_contradiction_refs: false,
  }],
});
assert(cpMissingPosture.violations.some(v =>
  v.code === L9RuntimeViolationCode.CHANGE_POINT_PRIOR_POSTURE_MISSING),
  'C.11 phase-shift missing prior posture code');

// Change point: missing triggers
const cpNoTrig = detectChangePoints({
  subject: pC.subject,
  candidates: [{
    change_point_class: L9ChangePointClass.PHASE_SHIFT,
    change_point_at: '2026-04-17T11:00:00Z',
    prior_phase_ref: 'p1', next_phase_ref: 'p2',
    triggering_refs: [], severity_score: 0.2,
    has_anchor: true, has_contradiction_refs: false,
  }],
});
assert(cpNoTrig.violations.some(v =>
  v.code === L9RuntimeViolationCode.CHANGE_POINT_MISSING_TRIGGERS),
  'C.12 change-point missing triggers code');

// Post-event: missing anchor
const pewNoAnchor = emitPostEventWindows({
  subject: pC.subject,
  candidates: [{
    anchor_event_ref: '',
    window_class: L9PostEventWindowClass.UNLOCK_DIGESTION,
    window_start: '2026-04-17T11:00:00Z',
    window_end: '2026-04-17T13:00:00Z',
    window_state: L9PostEventWindowState.ACTIVE,
    stabilization_refs: [], failure_refs: [],
  }],
  contract_versions: {
    post_event_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(pewNoAnchor.violations.some(v =>
  v.code === L9RuntimeViolationCode.POST_EVENT_WITHOUT_ANCHOR),
  'C.13 post-event without anchor code');

// Post-event: missing bounds
const pewNoBounds = emitPostEventWindows({
  subject: pC.subject,
  candidates: [{
    anchor_event_ref: 'anchor',
    window_class: L9PostEventWindowClass.UNLOCK_DIGESTION,
    window_start: '', window_end: '',
    window_state: L9PostEventWindowState.ACTIVE,
    stabilization_refs: [], failure_refs: [],
  }],
  contract_versions: {
    post_event_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(pewNoBounds.violations.some(v =>
  v.code === L9RuntimeViolationCode.POST_EVENT_MISSING_BOUNDS),
  'C.14 post-event missing bounds code');

// ═══════════════════════════════════════════════════════════════
// BAND D — Classification / Confidence / Restriction
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Classification / Confidence / Restriction ═══');

const pD = pipeline();

// Shared stubs (classification engine reads a handful of fields)
const readyStub = {
  readiness_class: 'READY', usable_refs: ['e'],
  stale_refs: [], degraded_refs: [], blocked_refs: [],
  missing_refs: [], evidence_only_refs: [], historical_refs: [],
} as never;
const emptyOrdered = { ordered_signals: [], has_ambiguity: false,
  tie_break_reasons: [], late_count: 0, stale_count: 0 } as never;
const emptyLL = { relations: [] } as never;
const noChange = { change_points: [] } as never;
const noPost = { windows: [] } as never;
const stableDecay = { decay_class: L9DecayClass.FRESH,
  decay_score: 0.05 } as never;
const earlyPhase = ({
  phase_state: { phase_class: L9PhaseClass.EARLY },
} as never);
const cleanChain = {
  sequence_completeness_score: 0.85, ambiguity_score: 0.05,
  chain_integrity_flags: [],
} as never;
const damagedChain = {
  sequence_completeness_score: 0.3, ambiguity_score: 0.6,
  chain_integrity_flags: ['INCOMPLETE'],
} as never;

// Green classification
const greenClass = classifySequence({
  subject: pD.subject, resolved_inputs: readyStub,
  ordered_signals: emptyOrdered, lead_lag: emptyLL,
  phase_output: earlyPhase, change_points: noChange,
  decay: stableDecay, post_event: noPost, chain: cleanChain,
  primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary_sequence_state: null,
  declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  proposed_ambiguity_score: 0.05,
  proposed_staleness_score: 0.05,
  proposed_degradation_score: 0.05,
  rationale_codes: ['OK'],
});
assert(greenClass.ok, 'D.01 green classification ok');

// Primary not in family
const primNotInFamily = classifySequence({
  subject: pD.subject, resolved_inputs: readyStub,
  ordered_signals: emptyOrdered, lead_lag: emptyLL,
  phase_output: earlyPhase, change_points: noChange,
  decay: stableDecay, post_event: noPost, chain: cleanChain,
  primary_sequence_state:
    L9SequenceState.DISTRIBUTION_UNDER_HYPE,
  secondary_sequence_state: null,
  declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  proposed_ambiguity_score: 0.05,
  proposed_staleness_score: 0.05,
  proposed_degradation_score: 0.05,
  rationale_codes: [],
});
assert(primNotInFamily.violations.some(v =>
  v.code === L9RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY),
  'D.02 primary-not-in-family code');

// Secondary == primary
const secEqPrim = classifySequence({
  subject: pD.subject, resolved_inputs: readyStub,
  ordered_signals: emptyOrdered, lead_lag: emptyLL,
  phase_output: earlyPhase, change_points: noChange,
  decay: stableDecay, post_event: noPost, chain: cleanChain,
  primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  proposed_ambiguity_score: 0.05,
  proposed_staleness_score: 0.05,
  proposed_degradation_score: 0.05,
  rationale_codes: [],
});
assert(secEqPrim.violations.some(v =>
  v.code === L9RuntimeViolationCode.CLASSIFY_SECONDARY_SAME_AS_PRIMARY),
  'D.03 secondary-same-as-primary code');

// CLEAN_SINGLE with ambiguity
const cleanWhileAmbig = classifySequence({
  subject: pD.subject, resolved_inputs: readyStub,
  ordered_signals: emptyOrdered, lead_lag: emptyLL,
  phase_output: earlyPhase, change_points: noChange,
  decay: stableDecay, post_event: noPost, chain: cleanChain,
  primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary_sequence_state: null,
  declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  proposed_ambiguity_score: 0.9,
  proposed_staleness_score: 0.05,
  proposed_degradation_score: 0.05,
  rationale_codes: [],
});
assert(cleanWhileAmbig.violations.some(v =>
  v.code === L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE ||
  v.code === L9RuntimeViolationCode.CLASSIFY_AMBIGUITY_LAUNDERED),
  'D.04 clean-single-under-ambiguity code');

// CLEAN_SINGLE with damaged chain
const cleanDamagedChain = classifySequence({
  subject: pD.subject, resolved_inputs: readyStub,
  ordered_signals: emptyOrdered, lead_lag: emptyLL,
  phase_output: earlyPhase, change_points: noChange,
  decay: stableDecay, post_event: noPost, chain: damagedChain,
  primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  secondary_sequence_state: null,
  declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
  proposed_ambiguity_score: 0.1,
  proposed_staleness_score: 0.1,
  proposed_degradation_score: 0.1,
  rationale_codes: [],
});
assert(cleanDamagedChain.violations.some(v =>
  v.code === L9RuntimeViolationCode.CLASSIFY_CHAIN_DAMAGED_CLEAN ||
  v.code === L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE),
  'D.05 chain-damaged-clean code');

// Confidence handoff — green
const goodConf = buildConfidenceHandoff({
  subject: pD.subject,
  classification: greenClass.value!,
  lead_lag: emptyLL,
  regime_refs: ['l8:regime/accum-eth'],
  evidence_refs: ['e'],
  chain_completeness: 0.85,
});
assert(goodConf.ok, 'D.06 green confidence handoff ok');

// Restriction — green
const sequenceResultId = `lsr:${pD.subject.sequence_subject_id}:X`;
const goodRestr = buildRestrictionProfile({
  subject: pD.subject,
  classification: greenClass.value!,
  sequence_result_id: sequenceResultId,
  contradiction_refs: [],
  regime_refs: ['l8:regime/accum-eth'],
  evidence_refs: ['e'],
  restriction_required_refs: ['l7:restriction/accum'],
  contract_versions: {
    restriction_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(goodRestr.ok, 'D.07 green restriction profile ok');

// ═══════════════════════════════════════════════════════════════
// BAND E — Evidence / Materialization / Replay / Repair / Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Evidence / Materialization / Replay / Repair ═══');

const pE = pipeline();

// Green output
assert(pE.output.primary_sequence_state ===
  L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
  'E.01 green primary state PRE_NARRATIVE_ACCUMULATION');
assert(pE.output.sequence_family ===
  L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
  'E.02 green family');
assert(pE.output.coexistence_class ===
  L9SequenceCoexistenceClass.CLEAN_SINGLE,
  'E.03 green coexistence CLEAN_SINGLE');
assert(typeof pE.output.replay_hash === 'string' &&
  pE.output.replay_hash.length > 0, 'E.04 replay hash emitted');
assert(pE.output.causal_restraint_flags.chain_is_temporal_only === true,
  'E.05 chain_is_temporal_only');
assert(pE.output.causal_restraint_flags.hypothesis_excluded === true,
  'E.06 hypothesis_excluded');
assert(pE.output.evidence_pack_ref === pE.evidencePack.evidence_pack_id,
  'E.07 evidence_pack_ref binds');

// Evidence pack missing classification
const badPack = buildSequenceEvidencePack({
  instance: { subject_instance_id: 'lsi:x',
    sequence_subject_id: pE.subject.sequence_subject_id,
    as_of: pE.subject.as_of,
    lineage_refs: { trace_id: 't', manifest_id: 'm',
      upstream_refs: [] } } as never,
  ordered_signals: { ordered_signals: [],
    has_ambiguity: false, tie_break_reasons: [],
    late_count: 0, stale_count: 0 } as never,
  lead_lag: { relations: [] } as never,
  phase_output: { phase_state: { phase_state_id: 'p' } } as never,
  change_points: { change_points: [] } as never,
  decay: { decay_profile_id: 'd' } as never,
  post_event: { windows: [] } as never,
  chain: { sequence_chain_id: 'c' } as never,
  classification: null as never,
  confidence_ref: 'c',
  restriction_profile: { sequence_restriction_profile_id: 'r' } as never,
  consumed_validation_refs: ['v'],
  consumed_regime_refs: [], consumed_contradiction_refs: [],
  input_snapshot_ref: 's',
  compute_run_lineage: ['run'],
});
assert(!badPack.ok, 'E.08 evidence pack missing classification blocked');
assert(badPack.violations.some(v =>
  v.code === L9RuntimeViolationCode.EVIDENCE_PACK_MISSING_CLASSIFICATION),
  'E.09 missing-classification code');

// Materialization: repair flag without REPAIR mode blocked
const badMat = materializeSequenceOutput({
  subject: pE.subject, instance: {} as never,
  ordered_signals: {} as never, lead_lag: {} as never,
  phase_output: { phase_state: { phase_state_id: 'p' } } as never,
  change_points: { change_points: [] } as never,
  decay: { decay_profile_id: 'd' } as never,
  post_event: { windows: [] } as never,
  chain: { sequence_chain_id: 'c' } as never,
  classification: pE.output as never,
  restriction_profile: pE.output as never,
  evidence_pack: pE.evidencePack,
  sequence_confidence_score: 0.5,
  sequence_confidence_band: pE.output.sequence_confidence_band,
  materialization_mode: 'LIVE',
  replay_mode_flag: 'LIVE',
  repair_mode_flag: true,
  late_data_class: 'NONE',
  materialization_policy: pE.subject.materialization_policy,
  output_contract_versions: {
    output_contract_version: '9.3.0',
    schema_version: '9.3.0', policy_version: 'p',
  },
  compute_run_id: 'run',
});
assert(!badMat.ok, 'E.10 repair-flag under LIVE blocked');
assert(badMat.violations.some(v =>
  v.code === L9RuntimeViolationCode.MATERIALIZATION_READINESS_INCONSISTENT),
  'E.11 readiness-inconsistent code');

// Replay: identity ok under same pipeline
const pE2 = pipeline();
const replayOk = verifyL9ReplayIdentity(pE.output, pE2.output);
assert(replayOk.ok, 'E.12 replay identity ok (same snapshot)');

// Replay: hash diverged
const hashDiverged = verifyL9ReplayIdentity(pE.output,
  { ...pE2.output, replay_hash: 'different-hash' });
assert(!hashDiverged.ok, 'E.13 replay hash divergence blocked');
assert(hashDiverged.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPLAY_HASH_DIVERGED),
  'E.14 REPLAY_HASH_DIVERGED code');

// Replay: state drift
const stateDrift = verifyL9ReplayIdentity(pE.output, {
  ...pE2.output,
  primary_sequence_state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
});
assert(stateDrift.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPLAY_STATE_DRIFT),
  'E.15 REPLAY_STATE_DRIFT code');

// Replay: family drift
const familyDrift = verifyL9ReplayIdentity(pE.output, {
  ...pE2.output,
  sequence_family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
});
assert(familyDrift.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPLAY_FAMILY_DRIFT),
  'E.16 REPLAY_FAMILY_DRIFT code');

// Replay: erased ambiguity
const erasedAmbig = verifyL9ReplayIdentity(
  { ...pE.output,
    coexistence_class: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE },
  { ...pE2.output,
    coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE },
);
assert(erasedAmbig.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY),
  'E.17 REPLAY_ERASED_AMBIGUITY code');

// Repair: good repair
const repairRun = buildGreenL94Run(L9SequenceRunMode.REPAIR);
const repairOutput = { ...pE.output,
  replay_mode_flag: 'REPAIR' as const,
  repair_mode_flag: true };
const repairOk = verifyL9Repair({
  repair_run: repairRun,
  prior_output: pE.output, repaired_output: repairOutput,
  repair_reason: 'late critical event arrived after freeze',
});
assert(repairOk.ok, 'E.18 repair ok (marked + parent + reason)');

// Repair: unmarked (LIVE run)
const repairUnmarked = verifyL9Repair({
  repair_run: buildGreenL94Run(L9SequenceRunMode.LIVE),
  prior_output: pE.output, repaired_output: repairOutput,
  repair_reason: 'late event',
});
assert(repairUnmarked.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPAIR_UNMARKED),
  'E.19 REPAIR_UNMARKED code');

// Repair: missing parent
const repairNoParent = verifyL9Repair({
  repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR,
    { parent_run_id: null }),
  prior_output: pE.output, repaired_output: repairOutput,
  repair_reason: 'late event',
});
assert(repairNoParent.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPAIR_LINEAGE_BROKEN),
  'E.20 REPAIR_LINEAGE_BROKEN code');

// Repair: missing reason
const repairNoReason = verifyL9Repair({
  repair_run: repairRun,
  prior_output: pE.output, repaired_output: repairOutput,
  repair_reason: '',
});
assert(repairNoReason.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPAIR_REASON_MISSING),
  'E.21 REPAIR_REASON_MISSING code');

// Repair: LIVE masquerade
const repairLiveMasq = verifyL9Repair({
  repair_run: repairRun,
  prior_output: pE.output,
  repaired_output: { ...pE.output,
    replay_mode_flag: 'LIVE' as const, repair_mode_flag: false },
  repair_reason: 'late event',
});
assert(repairLiveMasq.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPAIR_LIVE_MASQUERADE),
  'E.22 REPAIR_LIVE_MASQUERADE code');

// Repair: unjustified semantic drift
const repairDrift = verifyL9Repair({
  repair_run: repairRun,
  prior_output: pE.output,
  repaired_output: { ...repairOutput,
    primary_sequence_state: L9SequenceState.EARLY_NARRATIVE_IGNITION },
  repair_reason: 'x',
});
assert(repairDrift.violations.some(v =>
  v.code === L9RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED),
  'E.23 REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED code');

// Audit report
const audit = buildL9RuntimeAudit([
  ...repairUnmarked.violations,
  ...hashDiverged.violations,
]);
assert(audit.total === repairUnmarked.violations.length +
  hashDiverged.violations.length, 'E.24 audit tallies all violations');
assert(audit.highest_severity === L9RuntimeViolationSeverity.CRITICAL,
  'E.25 audit highest severity CRITICAL');
assert(hasL9BlockingViolations(audit) === true,
  'E.26 hasL9BlockingViolations=true on critical');
assert(
  classifyL9ViolationSeverity(L9RuntimeViolationCode.DAG_CYCLE_DETECTED)
    === L9RuntimeViolationSeverity.CRITICAL,
  'E.27 cycle = CRITICAL');
assert(
  classifyL9ViolationSeverity(
    L9RuntimeViolationCode.INPUT_STALE_MASQUERADING_CURRENT)
    === L9RuntimeViolationSeverity.WARNING,
  'E.28 stale-masquerade = WARNING');
const audit2 = buildL9RuntimeAudit([]);
assert(audit2.total === 0, 'E.29 empty audit');
assert(audit2.highest_severity === L9RuntimeViolationSeverity.INFO,
  'E.30 empty audit severity INFO');
assert(hasL9BlockingViolations(audit2) === false,
  'E.31 empty audit not blocking');

// Invariants
const inv = runAllL9_4Invariants();
assert(inv.length === 8, 'E.32 8 L9.4 invariants');
for (const r of inv) {
  assert(r.holds, `E.inv.${r.id} ${r.evidence}`);
}
const a1 = checkINV_94_A(); assert(a1.holds, `E.A ${a1.evidence}`);
const b1 = checkINV_94_B(); assert(b1.holds, `E.B ${b1.evidence}`);
const c1 = checkINV_94_C(); assert(c1.holds, `E.C ${c1.evidence}`);
const d1 = checkINV_94_D(); assert(d1.holds, `E.D ${d1.evidence}`);
const e1 = checkINV_94_E(); assert(e1.holds, `E.E ${e1.evidence}`);
const f1 = checkINV_94_F(); assert(f1.holds, `E.F ${f1.evidence}`);
const g1 = checkINV_94_G(); assert(g1.holds, `E.G ${g1.evidence}`);
const h1 = checkINV_94_H(); assert(h1.holds, `E.H ${h1.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L9.4 RUNTIME — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 9 deterministic sequence runtime green.');
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type InputSurfaceStatus =
  Parameters<typeof resolveTemporalInputs>[0]['surface_statuses'][number];

function mkStatus(ref: string,
  overrides: Partial<InputSurfaceStatus> = {}): InputSurfaceStatus {
  return {
    ref, available: true, stale: false, degraded: false,
    restricted: false, blocked: false, evidence_only: false,
    historical: false, ...overrides,
  } as InputSurfaceStatus;
}

type OrderedCandidate =
  Parameters<typeof resolveOrderedSignals>[0]['candidates'][number];

function mkCandidate(signal_ref: string, observed_at: string,
  overrides: Partial<OrderedCandidate> = {}): OrderedCandidate {
  return {
    signal_ref, observed_at,
    ordering_evidence_refs: ['ev'],
    pre_event: true, post_event: false,
    late: false, stale: false, ambiguous: false, evidence_only: false,
    contradicts_prior: false, decayed_predecessor: false,
    role_confidence: 0.8, ...overrides,
  } as OrderedCandidate;
}
