/**
 * L6.4 — Execution Architecture, Deterministic DAG, and Compute Runtime Law
 * Certification Test Suite
 *
 * 6 Bands:
 *   A — DAG legality (nodes, edges, acyclicity, toposort)
 *   B — Windows and baselines (determinism, legality, reproducibility)
 *   C — Feature/composite compute + qualification ordering
 *   D — Event runtime (change → candidate → confirmation → lifecycle)
 *   E — Replay and repair (determinism, tagging, no silent drift)
 *   F — Materialization, evidence packs, and invariants
 */

import {
  L6DagNodeClass,
  L6NodeExecutionState,
  L6ScopeRef,
  canonicalNodeId,
  L6EdgeClass,
  isLegalEdge,
  buildL6Dag,
  detectCycle,
  assertAcyclic,
  topoSort,
  L6ComputeRunMode,
  L6TriggerSource,
  mintComputeRunId,
  computeRunModeFlags,
  resetComputeRunSequence,
  isHistoricalMode,
  ALL_DAG_NODE_CLASSES,
  ALL_EDGE_CLASSES,
  createExecutionContext,
  appendJournal,
  isReplayOrRepair,
} from '../l6/runtime';

import {
  DependencyPlanner,
  L6DependencyClass,
  L6RecomputeClass,
  L6LateDataRecomputeClass,
  ALL_DEPENDENCY_CLASSES,
  WindowBuilder,
  L6WindowType,
  BaselineEngine,
  L6BaselineMethod,
  QualityGateEngine,
  ConfidenceAttachmentEngine,
  FeatureComputeEngine,
  CompositeFeatureEngine,
  ChangeDetectionEngine,
  L6ChangeSignalKind,
  EventDetectionEngine,
  EventStateResolver,
  LEGAL_TRANSITIONS,
  isLegalTransition,
  EvidencePackBuilder,
  L6EvidencePackKind,
} from '../l6/engine';

import {
  FeatureMaterializer,
  EventMaterializer,
} from '../l6/materialization';

import { L6ReplayAdapter } from '../l6/replay';
import { L6RepairAdapter, L6RepairOrigin } from '../l6/repair';

import {
  L6FeatureValueKind,
  L6EventLifecycleState,
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
  L6ScopeType,
} from '../l6/contracts';

import {
  buildLegalFeatureDefinition,
  buildLegalEventDefinition,
  buildLegalFeatureOutput,
  buildLegalEventOutput,
  checkAllL6_4Invariants,
  checkINV_64_A, checkINV_64_B, checkINV_64_C, checkINV_64_D,
  checkINV_64_E, checkINV_64_F, checkINV_64_G, checkINV_64_H,
  checkINV_64_I, checkINV_64_J, checkINV_64_K,
} from '../l6/invariants';

let passed = 0;
let failed = 0;
const t0 = Date.now();

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

const SCOPE: L6ScopeRef = { scope_type: L6ScopeType.ASSET, scope_id: 'BTC' };

function buildRun(mode = L6ComputeRunMode.LIVE) {
  return {
    compute_run_id: mintComputeRunId('test'),
    dag_version: 'l6.4-test-v1',
    definition_version_set: [{ primitive_id: 'funding.funding_z_score.v1', version: 'v1.0.0' }],
    trigger_source: L6TriggerSource.NEW_FACT,
    scope_set: [SCOPE],
    as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-t-001',
    mode,
    ...computeRunModeFlags(mode),
    trace_id: 'tr-t-001',
    parent_compute_run_id: null,
    started_at: '2026-04-03T00:00:00.000Z',
  };
}

function node(cls: L6DagNodeClass, id: string) {
  return {
    node_id: id,
    node_class: cls,
    primitive_id: null,
    primitive_version: null,
    scope: SCOPE,
    upstream: [] as string[],
    downstream: [] as string[],
    execution_state: L6NodeExecutionState.PENDING,
    meta: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════
// BAND A — DAG legality
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: DAG Legality ═══');

{
  assert(ALL_DAG_NODE_CLASSES.length === 8, 'A.1 — 8 DAG node classes registered');
  assert(ALL_EDGE_CLASSES.length === 6, 'A.2 — 6 DAG edge classes registered');
  assert(canonicalNodeId(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1', SCOPE) ===
    'PRIMITIVE_FEATURE|f1|ASSET:BTC',
    'A.3 — Canonical node_id stable');
  assert(canonicalNodeId(L6DagNodeClass.INPUT, 'i1', SCOPE, 'v1') ===
    'INPUT|i1|ASSET:BTC:v1',
    'A.4 — Canonical node_id supports suffix');
}

{
  assert(isLegalEdge(L6EdgeClass.DATA, L6DagNodeClass.INPUT, L6DagNodeClass.PRIMITIVE_FEATURE),
    'A.5 — INPUT → PRIMITIVE_FEATURE DATA edge legal');
  assert(!isLegalEdge(L6EdgeClass.DATA, L6DagNodeClass.PRIMITIVE_FEATURE, L6DagNodeClass.INPUT),
    'A.6 — PRIMITIVE_FEATURE → INPUT DATA edge illegal');
  assert(isLegalEdge(L6EdgeClass.EVENT_SUPPORT, L6DagNodeClass.CHANGE_DETECTION, L6DagNodeClass.EVENT_CANDIDATE),
    'A.7 — CHANGE → EVENT_CANDIDATE EVENT_SUPPORT legal');
  assert(!isLegalEdge(L6EdgeClass.DATA, L6DagNodeClass.EVIDENCE_PACK, L6DagNodeClass.MATERIALIZATION),
    'A.8 — EVIDENCE → MATERIALIZATION must be MATERIALIZATION edge class, not DATA');
}

{
  const good = buildL6Dag(
    [node(L6DagNodeClass.INPUT, 'i1'), node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1')],
    [{ from_node_id: 'i1', to_node_id: 'f1', edge_class: L6EdgeClass.DATA, required: true, meta: {} }],
  );
  assert(good.dag !== null, 'A.9 — Legal DAG builds');
  assert(good.violations.length === 0, 'A.10 — Legal DAG has no violations');
}

{
  const dup = buildL6Dag(
    [node(L6DagNodeClass.INPUT, 'i1'), node(L6DagNodeClass.INPUT, 'i1')],
    [],
  );
  assert(dup.violations.some(v => v.code === 'L6DAG_DUPLICATE_NODE'), 'A.11 — Duplicate node rejected');
}

{
  const selfLoop = buildL6Dag(
    [node(L6DagNodeClass.INPUT, 'i1')],
    [{ from_node_id: 'i1', to_node_id: 'i1', edge_class: L6EdgeClass.DATA, required: true, meta: {} }],
  );
  assert(selfLoop.violations.some(v => v.code === 'L6DAG_SELF_LOOP'), 'A.12 — Self-loop rejected');
}

{
  const unknown = buildL6Dag(
    [node(L6DagNodeClass.INPUT, 'i1')],
    [{ from_node_id: 'i1', to_node_id: 'missing', edge_class: L6EdgeClass.DATA, required: true, meta: {} }],
  );
  assert(unknown.violations.some(v => v.code === 'L6DAG_UNKNOWN_TO'), 'A.13 — Unknown to_node rejected');
}

{
  const illegal = buildL6Dag(
    [node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1'), node(L6DagNodeClass.INPUT, 'i1')],
    [{ from_node_id: 'f1', to_node_id: 'i1', edge_class: L6EdgeClass.DATA, required: true, meta: {} }],
  );
  assert(illegal.violations.some(v => v.code === 'L6DAG_ILLEGAL_EDGE_PAIR'),
    'A.14 — Illegal edge pair rejected');
}

{
  const orphan = buildL6Dag([node(L6DagNodeClass.INPUT, 'i1')], []);
  assert(orphan.violations.some(v => v.code === 'L6DAG_ORPHAN_NODE'), 'A.15 — Orphan node rejected');
}

{
  const cycle = buildL6Dag(
    [
      node(L6DagNodeClass.INPUT, 'i1'),
      node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1'),
      node(L6DagNodeClass.COMPOSITE_FEATURE, 'c1'),
    ],
    [
      { from_node_id: 'i1', to_node_id: 'f1', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
      { from_node_id: 'f1', to_node_id: 'c1', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
      // edge from c1 to f1 would reintroduce via COMPOSITE_FEATURE → COMPOSITE_FEATURE
      // to trigger cycle we make c1 -> c1 illegal, so do a more direct cycle test below
    ],
  );
  assert(cycle.dag !== null, 'A.16 — Acyclic graph builds');
  if (cycle.dag) {
    assert(!detectCycle(cycle.dag).hasCycle, 'A.17 — No cycle detected in acyclic graph');
    let threw = false;
    try { assertAcyclic(cycle.dag); } catch { threw = true; }
    assert(!threw, 'A.18 — assertAcyclic passes on acyclic graph');
  }
}

{
  const c = buildL6Dag(
    [
      node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1'),
      node(L6DagNodeClass.COMPOSITE_FEATURE, 'c1'),
      node(L6DagNodeClass.COMPOSITE_FEATURE, 'c2'),
    ],
    [
      { from_node_id: 'f1', to_node_id: 'c1', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
      { from_node_id: 'c1', to_node_id: 'c2', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
      { from_node_id: 'c2', to_node_id: 'c1', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
    ],
  );
  if (c.dag) {
    const r = detectCycle(c.dag);
    assert(r.hasCycle, 'A.19 — Cycle detected in cyclic graph');
    assert(r.cyclePath.length > 0, 'A.20 — Cycle path reported');
    let threw = false;
    try { assertAcyclic(c.dag); } catch { threw = true; }
    assert(threw, 'A.21 — assertAcyclic throws on cyclic graph');
  }
}

{
  const d = buildL6Dag(
    [
      node(L6DagNodeClass.INPUT, 'b'),
      node(L6DagNodeClass.INPUT, 'a'),
      node(L6DagNodeClass.PRIMITIVE_FEATURE, 'c'),
    ],
    [
      { from_node_id: 'a', to_node_id: 'c', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
      { from_node_id: 'b', to_node_id: 'c', edge_class: L6EdgeClass.DATA, required: true, meta: {} },
    ],
  );
  if (d.dag) {
    const o = topoSort(d.dag);
    assert(o.order.length === 3, 'A.22 — Topo order covers all nodes');
    assert(o.order[0] === 'a' && o.order[1] === 'b' && o.order[2] === 'c',
      'A.23 — Topo order deterministic and lexicographically-broken');
    const o2 = topoSort(d.dag);
    assert(JSON.stringify(o.order) === JSON.stringify(o2.order),
      'A.24 — Topo order stable across repeated runs');
  }
}

// ═══════════════════════════════════════════════════════════════════════
// BAND B — Windows and Baselines
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Windows and Baselines ═══');

{
  const wb = new WindowBuilder();
  const spec = {
    window_type: L6WindowType.SHORT_HORIZON,
    duration_seconds: 3600,
    anchor: 'AS_OF' as const,
    late_data_inclusion_flag: false,
    build_policy_version: 'wp-v1',
  };
  const w1 = wb.build(spec, SCOPE, '2026-04-03T00:00:00.000Z', 1);
  const w2 = wb.build(spec, SCOPE, '2026-04-03T00:00:00.000Z', 1);
  assert(w1.window_id === w2.window_id, 'B.1 — Identical spec → identical window_id');
  assert(w1.window_id.startsWith('win_'), 'B.2 — window_id carries "win_" prefix');
  assert(WindowBuilder.sameIdentity(w1, w2), 'B.3 — sameIdentity helper works');

  const w3 = wb.build({ ...spec, duration_seconds: 7200 }, SCOPE, '2026-04-03T00:00:00.000Z', 1);
  assert(w3.window_id !== w1.window_id, 'B.4 — Different duration → different window_id');

  const w4 = wb.build({ ...spec, late_data_inclusion_flag: true }, SCOPE, '2026-04-03T00:00:00.000Z', 1);
  assert(w4.window_id !== w1.window_id, 'B.5 — Late-data flag change → different window_id');

  const w5 = wb.build({ ...spec, build_policy_version: 'wp-v2' }, SCOPE, '2026-04-03T00:00:00.000Z', 1);
  assert(w5.window_id !== w1.window_id, 'B.6 — Build policy version change → different window_id');

  let threw = false;
  try { wb.build(spec, SCOPE, 'not-a-time', 1); } catch { threw = true; }
  assert(threw, 'B.7 — Invalid as_of rejected');

  threw = false;
  try { wb.build(spec, SCOPE, '2026-04-03T00:00:00.000Z', 2); } catch { threw = true; }
  assert(threw, 'B.8 — Out-of-range coverage rejected');
}

{
  const wb = new WindowBuilder();
  const window = wb.build(
    { window_type: L6WindowType.BASELINE, duration_seconds: 86400, anchor: 'AS_OF', late_data_inclusion_flag: false, build_policy_version: 'wp-v1' },
    SCOPE, '2026-04-03T00:00:00.000Z', 1,
  );
  const be = new BaselineEngine();
  const legal = be.build({
    method: L6BaselineMethod.Z_SCORE, window,
    observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(legal.legal, 'B.9 — Legal baseline computes');
  assert(legal.baseline_id.startsWith('base_'), 'B.10 — baseline_id carries "base_" prefix');
  assert(legal.value !== null, 'B.11 — Legal baseline has numeric value');
  assert(legal.dispersion !== null, 'B.12 — Z-score baseline has dispersion');
  assert(legal.warmup_satisfied, 'B.13 — Warmup satisfied when observations exceed minimum');

  const legal2 = be.build({
    method: L6BaselineMethod.Z_SCORE, window,
    observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(BaselineEngine.sameIdentity(legal, legal2), 'B.14 — Same spec → same baseline_id');

  const shortObs = be.build({
    method: L6BaselineMethod.Z_SCORE, window, observations: [1],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(!shortObs.legal, 'B.15 — Insufficient observations → baseline illegal');
  assert(shortObs.illegality_reasons.includes('INSUFFICIENT_OBSERVATIONS'),
    'B.16 — INSUFFICIENT_OBSERVATIONS reason emitted');
  assert(!shortObs.warmup_satisfied, 'B.17 — Warmup not satisfied for short observations');

  const peer = be.build({
    method: L6BaselineMethod.PEER_RELATIVE, window,
    observations: [1, 2, 3], min_observations: 1, min_coverage: 0, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(!peer.legal, 'B.18 — Peer-relative blocked when not allowed');
  assert(peer.illegality_reasons.includes('PEER_RELATIVE_NOT_ALLOWED'),
    'B.19 — PEER_RELATIVE_NOT_ALLOWED reason emitted');

  const regime = be.build({
    method: L6BaselineMethod.REGIME_RELATIVE, window, observations: [1, 2, 3],
    min_observations: 1, min_coverage: 0, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(regime.illegality_reasons.includes('REGIME_RELATIVE_NOT_ALLOWED'),
    'B.20 — REGIME_RELATIVE_NOT_ALLOWED reason emitted');

  const lowCov = be.build({
    method: L6BaselineMethod.ROLLING_MEAN,
    window: { ...window, data_coverage: 0.2 },
    observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  assert(!lowCov.legal, 'B.21 — Insufficient coverage → baseline illegal');
  assert(lowCov.illegality_reasons.includes('INSUFFICIENT_COVERAGE'), 'B.22 — INSUFFICIENT_COVERAGE emitted');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND C — Feature/composite compute + qualification ordering
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Feature Compute and Qualification ═══');

function buildGoodRequest(mode = L6ComputeRunMode.LIVE) {
  const run = buildRun(mode);
  const def = buildLegalFeatureDefinition();
  const wb = new WindowBuilder();
  const be = new BaselineEngine();
  const window = wb.build(
    { window_type: L6WindowType.SHORT_HORIZON, duration_seconds: 3600, anchor: 'AS_OF', late_data_inclusion_flag: false, build_policy_version: 'wp-v1' },
    SCOPE, run.as_of, 1,
  );
  const baseline = be.build({
    method: L6BaselineMethod.Z_SCORE, window,
    observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  return {
    compute_run: run, definition: def, scope: SCOPE, as_of: run.as_of,
    window, baseline,
    gate_input: {
      input_quality_score: 1, freshness_score: 1, confidence_score: 1,
      warmup_satisfied: true, required_inputs_present: true, optional_inputs_missing: 0,
      is_stale: false, is_expired: false, is_degraded_explicitly: false,
    },
    confidence_input: {
      input_confidences: [0.9, 0.95], coverage: 1, warmup_satisfied: true,
      freshness_score: 1, partial_inputs: false,
    },
    material_inputs: { funding_rate_snapshot: 'snap-t-001' },
    manifest_id: 'mf-t-001', trace_id: run.trace_id, envelope_id: 'env-t-001',
    input_snapshot_ref: 'snap-t-001', late_arrival_flag: false,
  };
}

{
  const engine = new FeatureComputeEngine();
  const req = buildGoodRequest();
  const r = engine.compute(req, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r.validation.valid, 'C.1 — Legal feature compute produces valid output');
  assert(!r.blocked, 'C.2 — Legal feature compute not blocked');
  assert(r.output.validity_state === L6FeatureValidityState.VALID, 'C.3 — Validity VALID under pristine inputs');
  assert(r.output.quality_state === L6QualityState.PASS, 'C.4 — Quality PASS under pristine inputs');
  assert(r.output.confidence_band === L6ConfidenceBand.HIGH, 'C.5 — Confidence HIGH under pristine inputs');
  assert(r.output.freshness_state === L6FreshnessState.FRESH, 'C.6 — Freshness FRESH under pristine inputs');
  assert(r.output.null_state === L6NullState.PRESENT, 'C.7 — Null state PRESENT');
  assert(r.output.lineage.replay_hash.length === 64, 'C.8 — replay_hash is SHA-256 hex');
}

{
  const engine = new FeatureComputeEngine();
  const r1 = engine.compute(buildGoodRequest(), () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  const r2 = engine.compute(buildGoodRequest(), () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r1.output.lineage.replay_hash === r2.output.lineage.replay_hash,
    'C.9 — Determinism: identical inputs → identical replay_hash');
}

{
  const engine = new FeatureComputeEngine();
  const req = buildGoodRequest();
  const bad = { ...req, gate_input: { ...req.gate_input, required_inputs_present: false } };
  const r = engine.compute(bad, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r.output.validity_state !== L6FeatureValidityState.VALID,
    'C.10 — Missing required inputs → not VALID');
  assert(r.blocked || r.output.validity_state === L6FeatureValidityState.BLOCKED
    || r.output.validity_state === L6FeatureValidityState.ABSENT,
    'C.11 — Missing required inputs blocks emission');
}

{
  const engine = new FeatureComputeEngine();
  const req = buildGoodRequest();
  const stale = { ...req, gate_input: { ...req.gate_input, is_stale: true } };
  const r = engine.compute(stale, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r.output.freshness_state === L6FreshnessState.STALE, 'C.12 — Stale inputs → freshness STALE');
  assert(r.output.validity_state === L6FeatureValidityState.PROVISIONAL,
    'C.13 — Stale inputs demote to PROVISIONAL');
}

{
  const engine = new FeatureComputeEngine();
  const req = buildGoodRequest();
  const expired = { ...req, gate_input: { ...req.gate_input, is_expired: true } };
  const r = engine.compute(expired, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r.output.freshness_state === L6FreshnessState.EXPIRED, 'C.14 — Expired → freshness EXPIRED');
  assert(r.output.validity_state === L6FeatureValidityState.BLOCKED,
    'C.15 — Expired freshness blocks emission');
}

{
  const engine = new FeatureComputeEngine();
  const req = buildGoodRequest();
  const nowarmup = { ...req, gate_input: { ...req.gate_input, warmup_satisfied: false } };
  const r = engine.compute(nowarmup, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(r.output.freshness_state === L6FreshnessState.WARMING_UP,
    'C.16 — No warmup → freshness WARMING_UP');
  assert(r.output.validity_state === L6FeatureValidityState.BLOCKED,
    'C.17 — Warmup unsatisfied blocks emission');
}

{
  const qe = new QualityGateEngine();
  const def = buildLegalFeatureDefinition();
  const r = qe.evaluate(def, {
    input_quality_score: 1, freshness_score: 1, confidence_score: 1,
    warmup_satisfied: true, required_inputs_present: true, optional_inputs_missing: 0,
    is_stale: false, is_expired: false, is_degraded_explicitly: false,
  });
  assert(r.quality_state === L6QualityState.PASS, 'C.18 — Quality gate PASS on clean inputs');
  assert(r.validity_state === L6FeatureValidityState.VALID, 'C.19 — Quality gate yields VALID');
  assert(r.emission_is_legal, 'C.20 — Emission legal under PASS');

  const fail = qe.evaluate(def, {
    input_quality_score: 0, freshness_score: 1, confidence_score: 0,
    warmup_satisfied: true, required_inputs_present: true, optional_inputs_missing: 0,
    is_stale: false, is_expired: false, is_degraded_explicitly: false,
  });
  assert(fail.quality_state === L6QualityState.FAIL, 'C.21 — Low quality → quality FAIL');
  assert(fail.validity_state === L6FeatureValidityState.BLOCKED, 'C.22 — Quality FAIL → BLOCKED');
  assert(fail.blocks_emission, 'C.23 — Quality FAIL blocks emission');
}

{
  const ce = new ConfidenceAttachmentEngine();
  const def = buildLegalFeatureDefinition();
  const high = ce.attach(def.confidence_derivation_spec, {
    input_confidences: [0.95, 0.95], coverage: 1, warmup_satisfied: true,
    freshness_score: 1, partial_inputs: false,
  });
  assert(high === L6ConfidenceBand.HIGH, 'C.24 — Confidence HIGH under strong inputs');

  const nowarmup = ce.attach(def.confidence_derivation_spec, {
    input_confidences: [0.9], coverage: 1, warmup_satisfied: false,
    freshness_score: 1, partial_inputs: false,
  });
  assert(nowarmup === L6ConfidenceBand.UNRATED, 'C.25 — No warmup → UNRATED');

  const partial = ce.attach(def.confidence_derivation_spec, {
    input_confidences: [0.6, 0.6], coverage: 0.5, warmup_satisfied: true,
    freshness_score: 0.5, partial_inputs: true,
  });
  assert(partial === L6ConfidenceBand.LOW || partial === L6ConfidenceBand.UNRATED,
    'C.26 — Weak inputs demote confidence');
}

{
  const composite = new CompositeFeatureEngine();
  const def = buildLegalFeatureDefinition();
  const feature = buildLegalFeatureOutput();
  const degraded: typeof feature = {
    ...feature,
    validity_state: L6FeatureValidityState.DEGRADED,
    quality_state: L6QualityState.MARGINAL,
    confidence_band: L6ConfidenceBand.LOW,
    freshness_state: L6FreshnessState.STALE,
    null_state: L6NullState.EXPLICITLY_DEGRADED,
  };
  const inh = composite.inherit(def, [
    { primitive_id: 'a', weight: 0.5, output: feature },
    { primitive_id: 'b', weight: 0.5, output: degraded },
  ], ['a', 'b']);
  assert(inh.quality_state === L6QualityState.MARGINAL, 'C.27 — Composite inherits worst quality');
  assert(inh.confidence_band === L6ConfidenceBand.LOW, 'C.28 — Composite inherits worst confidence');
  assert(inh.freshness_state === L6FreshnessState.STALE, 'C.29 — Composite inherits worst freshness');
  assert(inh.validity_state !== L6FeatureValidityState.VALID,
    'C.30 — Composite cannot be VALID when a constituent is DEGRADED');

  const missing = composite.inherit(def, [{ primitive_id: 'a', weight: 1, output: feature }], ['a', 'b']);
  assert(missing.missing_constituents.includes('b'), 'C.31 — Composite records missing constituent');
  assert(missing.blocked_reasons.some(r => r.includes('MISSING_CONSTITUENT')),
    'C.32 — Composite records MISSING_CONSTITUENT reason');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND D — Event runtime: change → candidate → confirmation → lifecycle
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Event Runtime ═══');

{
  const cd = new ChangeDetectionEngine();
  const prev = { ...buildLegalFeatureOutput(), value_payload: {
    value_kind: L6FeatureValueKind.NUMBER, value: 1.0, baseline_value: 0, normalized_value: 1.0,
  } as const };
  const cur = { ...buildLegalFeatureOutput(), value_payload: {
    value_kind: L6FeatureValueKind.NUMBER, value: 2.5, baseline_value: 0, normalized_value: 2.5,
  } as const };
  const sig = cd.thresholdCross(prev, cur, { threshold: 2.0, direction: 'UP', min_magnitude: 0.1 });
  assert(sig.kind === L6ChangeSignalKind.THRESHOLD_CROSS, 'D.1 — Threshold cross produces THRESHOLD_CROSS signal');
  assert(sig.direction === 'UP', 'D.2 — Upward cross → UP direction');
  assert(sig.magnitude > 0, 'D.3 — Magnitude positive on real cross');

  const noChg = cd.thresholdCross(cur, cur, { threshold: 2.0, direction: 'UP', min_magnitude: 0.1 });
  assert(noChg.kind === L6ChangeSignalKind.NO_CHANGE, 'D.4 — No cross → NO_CHANGE signal');

  const blocked = { ...cur, validity_state: L6FeatureValidityState.BLOCKED };
  const noBlocked = cd.thresholdCross(prev, blocked, { threshold: 2.0, direction: 'UP', min_magnitude: 0.1 });
  assert(noBlocked.kind === L6ChangeSignalKind.NO_CHANGE, 'D.5 — BLOCKED feature → NO_CHANGE (no trigger on invalid state)');

  const div = cd.baselineDivergence(cur, 1.0);
  assert(div.kind === L6ChangeSignalKind.BASELINE_DIVERGENCE, 'D.6 — Baseline divergence signal produced');
}

{
  const cd = new ChangeDetectionEngine();
  const ed = new EventDetectionEngine();
  const prev = { ...buildLegalFeatureOutput(), value_payload: {
    value_kind: L6FeatureValueKind.NUMBER, value: 1.0, baseline_value: 0, normalized_value: 1.0,
  } as const };
  const cur = { ...buildLegalFeatureOutput(), value_payload: {
    value_kind: L6FeatureValueKind.NUMBER, value: 3.0, baseline_value: 0, normalized_value: 3.0,
  } as const };
  const sig = cd.thresholdCross(prev, cur, { threshold: 2.0, direction: 'UP', min_magnitude: 0.1 });
  const def = buildLegalEventDefinition();
  const cand = ed.toCandidate({
    definition: def, scope: SCOPE, signal: sig,
    trigger_values: { z: 3.0 },
    confidence_band: L6ConfidenceBand.HIGH,
    manifest_id: 'mf-001', trace_id: 'tr-001', envelope_id: 'env-001',
    evidence_pack_ref: 'ep-001', input_snapshot_ref: 'snap-001',
    late_arrival_flag: false, suppression_group: 'funding-spike-group',
  });
  assert(cand !== null, 'D.7 — Threshold cross → event candidate produced');
  if (cand) {
    assert(cand.state === L6EventLifecycleState.CANDIDATE, 'D.8 — Initial state CANDIDATE (not CONFIRMED)');
    assert(cand.dedupe_key.startsWith('dk_'), 'D.9 — dedupe_key minted with "dk_" prefix');
    assert(cand.event_instance_id.startsWith('evi_'), 'D.10 — event_instance_id minted with "evi_" prefix');
    assert(cand.lineage.replay_hash.length === 64, 'D.11 — Event replay_hash is SHA-256 hex');
    assert(cand.lineage.evidence_pack_ref === 'ep-001', 'D.12 — Event lineage carries evidence_pack_ref');
  }

  const noSig = ed.toCandidate({
    definition: def, scope: SCOPE,
    signal: { signal_id: 'no', kind: L6ChangeSignalKind.NO_CHANGE, direction: 'NONE', magnitude: 0,
      feature_id: 'x', scope_type: 'ASSET', scope_id: 'BTC', observed_at: cur.as_of, snapshot_from: null, snapshot_to: cur.as_of },
    trigger_values: {}, confidence_band: L6ConfidenceBand.HIGH,
    manifest_id: '', trace_id: '', envelope_id: '', evidence_pack_ref: '',
    input_snapshot_ref: '', late_arrival_flag: false, suppression_group: null,
  });
  assert(noSig === null, 'D.13 — No-change signal → no candidate');
}

{
  assert(LEGAL_TRANSITIONS.length > 10, 'D.14 — Legal transition matrix non-trivial');
  assert(isLegalTransition(L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.CONFIRMED),
    'D.15 — CANDIDATE→CONFIRMED legal');
  assert(isLegalTransition(L6EventLifecycleState.CONFIRMED, L6EventLifecycleState.ACTIVE),
    'D.16 — CONFIRMED→ACTIVE legal');
  assert(isLegalTransition(L6EventLifecycleState.ACTIVE, L6EventLifecycleState.RESOLVED),
    'D.17 — ACTIVE→RESOLVED legal');
  assert(!isLegalTransition(L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.ACTIVE),
    'D.18 — CANDIDATE→ACTIVE illegal (must pass CONFIRMED)');
  assert(!isLegalTransition(L6EventLifecycleState.RESOLVED, L6EventLifecycleState.ACTIVE),
    'D.19 — RESOLVED→ACTIVE illegal');
  assert(!isLegalTransition(L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.CANDIDATE),
    'D.20 — Self-transition illegal');
}

{
  const resolver = new EventStateResolver();
  const confirmed = resolver.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  assert(confirmed.decision === 'CONFIRM', 'D.21 — All conditions met → CONFIRM');

  const waiting = resolver.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: false, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  assert(waiting.decision === 'WAIT', 'D.22 — Confirmation pending → WAIT');

  const sup = resolver.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: true, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  assert(sup.decision === 'SUPPRESS', 'D.23 — Suppression blocking → SUPPRESS');

  const dupe = resolver.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: true, quarantine_reason: null,
  });
  assert(dupe.decision === 'SUPPRESS', 'D.24 — Duplicate dedupe → SUPPRESS');

  const q = resolver.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: 'schema_drift',
  });
  assert(q.decision === 'QUARANTINE', 'D.25 — Quarantine reason → QUARANTINE');
}

{
  const resolver = new EventStateResolver();
  const def = buildLegalEventDefinition();
  const confirmed = buildLegalEventOutput();
  assert(confirmed.state === L6EventLifecycleState.CONFIRMED, 'D.26 — Fixture starts in CONFIRMED state');

  const t1 = resolver.transition(def, confirmed, L6EventLifecycleState.ACTIVE, '2026-04-03T00:16:00.000Z');
  assert(t1.transition_legal, 'D.27 — CONFIRMED→ACTIVE transition legal');
  assert(t1.output.state === L6EventLifecycleState.ACTIVE, 'D.28 — State updated to ACTIVE');
  assert(t1.timestamp_legal, 'D.29 — Timestamps remain monotonic');
  assert(t1.output.lineage.replay_hash !== confirmed.lineage.replay_hash,
    'D.30 — replay_hash updated when state/timestamps change');

  const illegal = resolver.transition(def, confirmed, L6EventLifecycleState.COOLING, '2026-04-03T00:20:00.000Z');
  assert(!illegal.transition_legal, 'D.31 — CONFIRMED→COOLING illegal transition rejected (must pass ACTIVE)');
  assert(illegal.reasons.some(r => r.startsWith('ILLEGAL_TRANSITION')),
    'D.32 — Illegal transition reason emitted');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND E — Replay and Repair (tagging, determinism, drift)
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Replay and Repair ═══');

{
  const live = buildRun(L6ComputeRunMode.LIVE);
  const replay = buildRun(L6ComputeRunMode.REPLAY);
  const repair = buildRun(L6ComputeRunMode.REPAIR);
  const lateRecovery = buildRun(L6ComputeRunMode.LATE_DATA_RECOVERY);

  assert(!live.replay_mode_flag && !live.repair_mode_flag, 'E.1 — Live run has no replay/repair flags');
  assert(replay.replay_mode_flag && !replay.repair_mode_flag, 'E.2 — Replay carries only replay flag');
  assert(!repair.replay_mode_flag && repair.repair_mode_flag, 'E.3 — Repair carries only repair flag');
  assert(isHistoricalMode(L6ComputeRunMode.REPLAY), 'E.4 — REPLAY is historical mode');
  assert(isHistoricalMode(L6ComputeRunMode.REPAIR), 'E.5 — REPAIR is historical mode');
  assert(isHistoricalMode(L6ComputeRunMode.LATE_DATA_RECOVERY), 'E.6 — LATE_DATA_RECOVERY is historical mode');
  assert(!isHistoricalMode(L6ComputeRunMode.LIVE), 'E.7 — LIVE is not historical');
  void lateRecovery;
}

{
  const engine = new FeatureComputeEngine();
  const liveReq = buildGoodRequest(L6ComputeRunMode.LIVE);
  const replayReq = buildGoodRequest(L6ComputeRunMode.REPLAY);

  const live = engine.compute(liveReq, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  const replay = engine.compute(replayReq, () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(live.output.lineage.replay_hash !== replay.output.lineage.replay_hash,
    'E.8 — Live vs replay hashes differ (historical_mode is part of material)');

  const replay2 = engine.compute(buildGoodRequest(L6ComputeRunMode.REPLAY), () => ({
    value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  assert(replay.output.lineage.replay_hash === replay2.output.lineage.replay_hash,
    'E.9 — Replay is reproducible across repeated runs');
}

{
  const adapter = new L6ReplayAdapter();
  const def = buildLegalFeatureDefinition();
  const result = adapter.replayFeature({
    original_compute_run_id: 'orig-001',
    definition: def, dag_version: 'l6.4-test-v1',
    trace_id: 'tr-001', as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-t-001',
    buildRequest: (run) => ({ ...buildGoodRequest(L6ComputeRunMode.REPLAY), compute_run: run }),
    computor: () => ({
      value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
    }),
  }, null);
  assert(result.compute_run.replay_mode_flag, 'E.10 — ReplayAdapter sets replay_mode_flag');
  assert(result.compute_run.parent_compute_run_id === 'orig-001',
    'E.11 — ReplayAdapter records parent compute run');
  assert(result.replay_hash_stable, 'E.12 — Replay stable when no original hash provided');
  assert(!result.blocked, 'E.13 — Legal replay not blocked');
}

{
  const repairAdapter = new L6RepairAdapter();
  const def = buildLegalFeatureDefinition();
  const result = repairAdapter.repairFeature({
    origin: L6RepairOrigin.MISSING_OUTPUT_REBUILD,
    definition: def, dag_version: 'l6.4-test-v1',
    trace_id: 'tr-001', as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-t-001',
    buildRequest: (run) => ({ ...buildGoodRequest(L6ComputeRunMode.REPAIR), compute_run: run }),
    computor: () => ({
      value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
    }),
  }, null);
  assert(result.compute_run.repair_mode_flag, 'E.14 — RepairAdapter sets repair_mode_flag');
  assert(result.origin === L6RepairOrigin.MISSING_OUTPUT_REBUILD,
    'E.15 — Repair origin tagged');
  assert(!result.semantic_drift, 'E.16 — No semantic drift reported without original hash');

  // Rebuild under governed rematerialization: different hash is permitted.
  const late = repairAdapter.repairFeature({
    origin: L6RepairOrigin.LATE_DATA_GOVERNED_REMATERIALIZATION,
    definition: def, dag_version: 'l6.4-test-v1',
    trace_id: 'tr-001', as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-t-001',
    buildRequest: (run) => ({ ...buildGoodRequest(L6ComputeRunMode.REPAIR), compute_run: run }),
    computor: () => ({
      value_kind: L6FeatureValueKind.NUMBER, value: 1.99, baseline_value: 0, normalized_value: 1.99,
    }),
  }, 'original-hash-does-not-match');
  assert(!late.semantic_drift,
    'E.17 — Governed rematerialization allowed to differ from original hash');

  const mismatch = repairAdapter.repairFeature({
    origin: L6RepairOrigin.MISSING_OUTPUT_REBUILD,
    definition: def, dag_version: 'l6.4-test-v1',
    trace_id: 'tr-001', as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-t-001',
    buildRequest: (run) => ({ ...buildGoodRequest(L6ComputeRunMode.REPAIR), compute_run: run }),
    computor: () => ({
      value_kind: L6FeatureValueKind.NUMBER, value: 1.72, baseline_value: 0, normalized_value: 1.72,
    }),
  }, 'different-original-hash');
  assert(mismatch.semantic_drift,
    'E.18 — Non-rematerialization repair flags drift vs original hash');
}

{
  const planner = new DependencyPlanner();
  const def = buildLegalFeatureDefinition();
  planner.registerFeature(def);
  const run = buildRun();
  const plan = planner.planFeatureRun(run, {
    trigger_source: L6TriggerSource.NEW_FACT,
    scope: SCOPE,
    input_surface_id: 'l3:canonical_metric.funding_rate',
    fact_as_of: run.as_of, is_late: false,
  }, def.primitive_id);
  assert(plan.violations.length === 0, 'E.19 — DependencyPlanner produces legal plan');
  assert(plan.topological_order.length > 0, 'E.20 — Plan includes a topological order');
  assert(plan.recompute_class === L6RecomputeClass.MANDATORY, 'E.21 — Missing watermark → MANDATORY');
  assert(plan.dependency_links.some(l => l.dependency_class === L6DependencyClass.HARD_TRUTH),
    'E.22 — Plan classifies HARD_TRUTH dependency');
  assert(plan.dependency_links.some(l => l.dependency_class === L6DependencyClass.BASELINE),
    'E.23 — Plan classifies BASELINE dependency');
  assert(ALL_DEPENDENCY_CLASSES.length === 7, 'E.24 — 7 dependency classes registered');

  // Watermark-driven NO_OP
  planner.setWatermark({
    scope: SCOPE, primitive_id: def.primitive_id,
    last_processed_as_of: '2026-04-03T00:00:00.000Z', dirty: false,
  });
  const noop = planner.planFeatureRun(run, {
    trigger_source: L6TriggerSource.NEW_FACT, scope: SCOPE,
    input_surface_id: 'l3:canonical_metric.funding_rate',
    fact_as_of: '2026-04-02T00:00:00.000Z', is_late: false,
  }, def.primitive_id);
  assert(noop.recompute_class === L6RecomputeClass.NO_OP, 'E.25 — Older fact vs watermark → NO_OP');

  const late = planner.planFeatureRun(run, {
    trigger_source: L6TriggerSource.LATE_FACT, scope: SCOPE,
    input_surface_id: 'l3:canonical_metric.funding_rate',
    fact_as_of: '2026-04-03T00:00:00.000Z', is_late: true,
  }, def.primitive_id);
  assert(late.late_data_class === L6LateDataRecomputeClass.HISTORICAL_ONLY,
    'E.26 — HISTORICAL_RECOMPUTE_ONLY policy → HISTORICAL_ONLY classification');
}

// ═══════════════════════════════════════════════════════════════════════
// BAND F — Materialization, evidence packs, invariants, audit
// ═══════════════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Materialization, Evidence, Invariants ═══');

{
  const builder = new EvidencePackBuilder();
  const m = {
    primitive_id: 'funding.funding_z_score.v1', primitive_version: 'v1.0.0',
    scope_type: 'ASSET', scope_id: 'BTC', as_of: '2026-04-03T00:00:00.000Z',
    window_refs: ['win_a'], baseline_refs: ['base_a'],
    input_snapshot_ref: 'snap-001', inputs: { funding_rate: 0.012 },
    compute_metadata: { run: 'f-1' }, contract_refs: { feature: 'funding.funding_z_score.v1@v1.0.0' },
  };
  const p1 = builder.build(L6EvidencePackKind.FEATURE_EVIDENCE, m, '2026-04-03T00:00:00.000Z');
  const p2 = builder.build(L6EvidencePackKind.FEATURE_EVIDENCE, m, '2026-04-03T00:00:00.000Z');
  assert(p1.evidence_pack_id === p2.evidence_pack_id, 'F.1 — Evidence pack id deterministic');
  assert(p1.material_digest === p2.material_digest, 'F.2 — Evidence pack digest deterministic');
  assert(p1.material_digest.length === 64, 'F.3 — Evidence digest is SHA-256 hex');
  assert(p1.evidence_pack_id.startsWith('ep_feature_evidence_'),
    'F.4 — Evidence pack id carries kind prefix');

  const p3 = builder.build(L6EvidencePackKind.EVENT_EVIDENCE, m, '2026-04-03T00:00:00.000Z');
  assert(p3.kind === L6EvidencePackKind.EVENT_EVIDENCE, 'F.5 — EVENT_EVIDENCE pack kind respected');
  assert(p3.evidence_pack_id !== p1.evidence_pack_id, 'F.6 — Different kind → different id');
}

{
  const mat = new FeatureMaterializer();
  const def = buildLegalFeatureDefinition();
  const run = buildRun();
  const good = buildLegalFeatureOutput();

  const evidence = new EvidencePackBuilder().build(
    L6EvidencePackKind.FEATURE_EVIDENCE,
    {
      primitive_id: def.primitive_id, primitive_version: def.version,
      scope_type: 'ASSET', scope_id: 'BTC', as_of: good.as_of,
      window_refs: [], baseline_refs: [],
      input_snapshot_ref: good.lineage.input_snapshot_ref,
      inputs: {}, compute_metadata: {}, contract_refs: {},
    },
    good.as_of,
  );

  const r = mat.prepare(run, def, good, evidence);
  assert(!r.blocked, 'F.7 — Legal feature materialization not blocked');
  assert(r.payload !== null, 'F.8 — Legal feature materialization produces payload');
  if (r.payload) {
    assert(r.payload.kind === 'FEATURE', 'F.9 — Payload kind FEATURE');
    assert(r.payload.evidence_pack_id === evidence.evidence_pack_id,
      'F.10 — Payload carries evidence pack id');
    assert(r.payload.output.lineage.evidence_pack_ref === evidence.evidence_pack_id,
      'F.11 — Output lineage links to evidence pack');
  }

  const bad = { ...good, freshness_state: L6FreshnessState.EXPIRED } as const;
  const br = mat.prepare(run, def, bad, null);
  assert(br.blocked, 'F.12 — Invalid output blocks materialization');
  assert(br.payload === null, 'F.13 — No payload on blocked materialization');
  assert(br.block_reasons.length > 0, 'F.14 — Block reasons reported');
}

{
  const mat = new EventMaterializer();
  const def = buildLegalEventDefinition();
  const run = buildRun();
  const good = buildLegalEventOutput();
  const evidence = new EvidencePackBuilder().build(
    L6EvidencePackKind.EVENT_EVIDENCE,
    {
      primitive_id: def.primitive_id, primitive_version: def.version,
      scope_type: 'ASSET', scope_id: 'BTC', as_of: good.candidate_at,
      window_refs: [], baseline_refs: [],
      input_snapshot_ref: good.lineage.input_snapshot_ref,
      inputs: {}, compute_metadata: {}, contract_refs: {},
    },
    good.candidate_at,
  );
  const r = mat.prepare(run, def, good, evidence);
  assert(!r.blocked, 'F.15 — Legal event materialization not blocked');
  if (r.payload) {
    assert(r.payload.kind === 'EVENT', 'F.16 — Payload kind EVENT');
    assert(r.payload.evidence_pack_id === evidence.evidence_pack_id,
      'F.17 — Event payload carries evidence pack id');
  }
}

{
  const run = buildRun();
  const ctx = createExecutionContext(run);
  assert(ctx.compute_run === run, 'F.18 — Execution context captures compute run');
  assert(ctx.journal.length === 0, 'F.19 — Empty journal at init');
  const next = appendJournal(ctx, {
    ts: '2026-04-03T00:01:00.000Z', node_id: 'f1', phase: 'READY', detail: 'test',
  });
  assert(next.journal.length === 1, 'F.20 — Journal append produces new context');
  assert(!isReplayOrRepair(ctx), 'F.21 — Live context not replay/repair');
  assert(isReplayOrRepair(createExecutionContext(buildRun(L6ComputeRunMode.REPLAY))),
    'F.22 — Replay context flagged');
  assert(isReplayOrRepair(createExecutionContext(buildRun(L6ComputeRunMode.REPAIR))),
    'F.23 — Repair context flagged');
}

{
  resetComputeRunSequence();
  const a = mintComputeRunId('t');
  const b = mintComputeRunId('t');
  assert(a !== b, 'F.24 — Compute run ids are unique');
  assert(a.startsWith('t-') && b.startsWith('t-'), 'F.25 — Compute run ids carry prefix');
}

{
  const results = checkAllL6_4Invariants();
  assert(results.length === 11, 'F.26 — 11 L6.4 invariants registered');
  for (const r of results) {
    assert(r.holds, `F.inv — ${r.id}: ${r.evidence}`);
  }
  // individual checks as sanity duplicates
  assert(checkINV_64_A().holds, 'F.INV-A — DAG acyclicity');
  assert(checkINV_64_B().holds, 'F.INV-B — node readiness');
  assert(checkINV_64_C().holds, 'F.INV-C — toposort determinism');
  assert(checkINV_64_D().holds, 'F.INV-D — window determinism');
  assert(checkINV_64_E().holds, 'F.INV-E — baseline legality');
  assert(checkINV_64_F().holds, 'F.INV-F — feature compute determinism');
  assert(checkINV_64_G().holds, 'F.INV-G — legal transition matrix');
  assert(checkINV_64_H().holds, 'F.INV-H — confirmation law');
  assert(checkINV_64_I().holds, 'F.INV-I — evidence pack determinism');
  assert(checkINV_64_J().holds, 'F.INV-J — materializer blocks invalid');
  assert(checkINV_64_K().holds, 'F.INV-K — replay/repair tagging');
}

// ═══════════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════════
const elapsed = Date.now() - t0;
console.log('\n═══════════════════════════════════════════════════════════════════════');
console.log(`L6.4 Runtime Certification — ${passed} passed, ${failed} failed, ${elapsed}ms`);
if (failed === 0) {
  console.log('L6.4 — Execution Architecture, Deterministic DAG, and Compute Runtime Law: CERTIFIED');
  process.exit(0);
} else {
  console.log('L6.4 — CERTIFICATION FAILED');
  process.exit(1);
}
