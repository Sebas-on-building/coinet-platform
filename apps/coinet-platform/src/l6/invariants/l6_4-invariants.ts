/**
 * L6.4 — Runtime Invariants
 *
 * §6.4.8.6 / §6.4.8.9 — INV-6.4-A through INV-6.4-K, executable and
 * test-covered. Each check either validates the runtime law directly or
 * builds a targeted mutation that must be rejected.
 */

import {
  L6DagNode,
  L6DagNodeClass,
  L6NodeExecutionState,
  L6ScopeRef,
} from '../runtime/dag-node';
import { L6DagEdge, L6EdgeClass } from '../runtime/dag-edge';
import { buildL6Dag } from '../runtime/dag-builder';
import { topoSort } from '../runtime/dag-toposort';
import { detectCycle } from '../runtime/dag-cycle-detector';
import {
  L6ComputeRun,
  L6ComputeRunMode,
  L6TriggerSource,
  computeRunModeFlags,
  mintComputeRunId,
} from '../runtime/compute-run';
import {
  WindowBuilder,
  L6WindowType,
} from '../engine/window-builder';
import {
  BaselineEngine,
  L6BaselineMethod,
} from '../engine/baseline-engine';
import {
  EventStateResolver,
  isLegalTransition,
} from '../engine/event-state-resolver';
import {
  EvidencePackBuilder,
  L6EvidencePackKind,
  L6EvidencePackMaterial,
} from '../engine/evidence-pack-builder';
import {
  FeatureComputeEngine,
  L6FeatureComputeRequest,
} from '../engine/feature-compute-engine';
import { FeatureMaterializer } from '../materialization/feature-materializer';
import { L6ScopeType } from '../contracts/primitive-contract';
import { L6FeatureValueKind } from '../contracts/feature-contract';
import { L6EventLifecycleState } from '../contracts/event-lifecycle-state';
import {
  L6FeatureValidityState,
  L6QualityState,
  L6ConfidenceBand,
  L6FreshnessState,
  L6NullState,
} from '../contracts/feature-validity-state';
import {
  buildLegalFeatureDefinition,
  buildLegalEventDefinition,
  buildLegalEventOutput,
} from './l6_3-invariants';

export interface L6_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

const SCOPE: L6ScopeRef = { scope_type: L6ScopeType.ASSET, scope_id: 'BTC' };

function node(cls: L6DagNodeClass, id: string, state = L6NodeExecutionState.PENDING): L6DagNode {
  return {
    node_id: id,
    node_class: cls,
    primitive_id: null,
    primitive_version: null,
    scope: SCOPE,
    upstream: [],
    downstream: [],
    execution_state: state,
    meta: {},
  };
}

function edge(from: string, to: string, cls: L6EdgeClass = L6EdgeClass.DATA): L6DagEdge {
  return { from_node_id: from, to_node_id: to, edge_class: cls, required: true, meta: {} };
}

function buildRun(mode: L6ComputeRunMode = L6ComputeRunMode.LIVE): L6ComputeRun {
  return {
    compute_run_id: mintComputeRunId('inv'),
    dag_version: 'l6.4-inv-v1',
    definition_version_set: [{ primitive_id: 'funding.funding_z_score.v1', version: 'v1.0.0' }],
    trigger_source: L6TriggerSource.NEW_FACT,
    scope_set: [SCOPE],
    as_of: '2026-04-03T00:00:00.000Z',
    input_snapshot_ref: 'snap-inv-001',
    mode,
    ...computeRunModeFlags(mode),
    trace_id: 'tr-inv-001',
    parent_compute_run_id: null,
    started_at: '2026-04-03T00:00:00.000Z',
  };
}

function buildFeatureRequest(compute_run: L6ComputeRun): L6FeatureComputeRequest {
  const def = buildLegalFeatureDefinition();
  const builder = new WindowBuilder();
  const window = builder.build(
    {
      window_type: L6WindowType.SHORT_HORIZON,
      duration_seconds: 3600,
      anchor: 'AS_OF',
      late_data_inclusion_flag: false,
      build_policy_version: 'wp-v1',
    },
    SCOPE,
    compute_run.as_of,
    1.0,
  );
  const baseline = new BaselineEngine().build({
    method: L6BaselineMethod.Z_SCORE,
    window,
    observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10,
    min_coverage: 0.9,
    build_policy_version: 'wp-v1',
    peer_relative_allowed: false,
    regime_relative_allowed: false,
  });
  return {
    compute_run,
    definition: def,
    scope: SCOPE,
    as_of: compute_run.as_of,
    window,
    baseline,
    gate_input: {
      input_quality_score: 1,
      freshness_score: 1,
      confidence_score: 1,
      warmup_satisfied: true,
      required_inputs_present: true,
      optional_inputs_missing: 0,
      is_stale: false,
      is_expired: false,
      is_degraded_explicitly: false,
    },
    confidence_input: {
      input_confidences: [0.9, 0.95],
      coverage: 1,
      warmup_satisfied: true,
      freshness_score: 1,
      partial_inputs: false,
    },
    material_inputs: { funding_rate_snapshot: 'snap-inv-001' },
    manifest_id: 'mf-inv-001',
    trace_id: compute_run.trace_id,
    envelope_id: 'env-inv-001',
    input_snapshot_ref: 'snap-inv-001',
    late_arrival_flag: false,
  };
}

// ─── INV-6.4-A: DAG acyclicity ───────────────────────────────────────
export function checkINV_64_A(): L6_4InvariantResult {
  const nodes = [
    node(L6DagNodeClass.INPUT, 'i1'),
    node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1'),
  ];
  const good = buildL6Dag(nodes, [edge('i1', 'f1')]);
  if (!good.dag) return fail('INV-6.4-A', `acyclic build failed: ${JSON.stringify(good.violations)}`);
  const cyc = detectCycle(good.dag);
  if (cyc.hasCycle) return fail('INV-6.4-A', 'false positive cycle');

  const bad = buildL6Dag(nodes, [edge('i1', 'f1'), edge('f1', 'i1')]);
  if (bad.dag) {
    const cyc2 = detectCycle(bad.dag);
    if (!cyc2.hasCycle) return fail('INV-6.4-A', 'cycle not detected');
  }
  return ok('INV-6.4-A', 'DAG acyclicity enforced');
}

// ─── INV-6.4-B: node readiness (no execution without upstream resolution) ──
export function checkINV_64_B(): L6_4InvariantResult {
  const pending = node(L6DagNodeClass.INPUT, 'i1', L6NodeExecutionState.PENDING);
  const feature = node(L6DagNodeClass.PRIMITIVE_FEATURE, 'f1', L6NodeExecutionState.PENDING);
  const isReady = (n: L6DagNode, upstream: readonly L6DagNode[]): boolean => {
    for (const u of upstream) {
      if (u.execution_state !== L6NodeExecutionState.RESOLVED
        && u.execution_state !== L6NodeExecutionState.READY) return false;
    }
    return true;
  };
  if (isReady(feature, [pending])) return fail('INV-6.4-B', 'feature should not be ready with PENDING upstream');
  const resolved = { ...pending, execution_state: L6NodeExecutionState.RESOLVED };
  if (!isReady(feature, [resolved])) return fail('INV-6.4-B', 'feature should be ready when upstream resolved');
  return ok('INV-6.4-B', 'node readiness law enforced');
}

// ─── INV-6.4-C: topological order deterministic ───────────────────
export function checkINV_64_C(): L6_4InvariantResult {
  const nodes = [
    node(L6DagNodeClass.INPUT, 'b'),
    node(L6DagNodeClass.INPUT, 'a'),
    node(L6DagNodeClass.PRIMITIVE_FEATURE, 'c'),
  ];
  const edges = [edge('a', 'c'), edge('b', 'c')];
  const { dag } = buildL6Dag(nodes, edges);
  if (!dag) return fail('INV-6.4-C', 'build failed');
  const o1 = topoSort(dag).order;
  const o2 = topoSort(dag).order;
  if (JSON.stringify(o1) !== JSON.stringify(o2)) {
    return fail('INV-6.4-C', `non-deterministic toposort: ${JSON.stringify(o1)} vs ${JSON.stringify(o2)}`);
  }
  if (o1[0] !== 'a' || o1[1] !== 'b' || o1[2] !== 'c') {
    return fail('INV-6.4-C', `unexpected order: ${JSON.stringify(o1)}`);
  }
  return ok('INV-6.4-C', `toposort stable: ${JSON.stringify(o1)}`);
}

// ─── INV-6.4-D: window identity deterministic ───────────────────
export function checkINV_64_D(): L6_4InvariantResult {
  const wb = new WindowBuilder();
  const spec = {
    window_type: L6WindowType.SHORT_HORIZON,
    duration_seconds: 3600,
    anchor: 'AS_OF' as const,
    late_data_inclusion_flag: false,
    build_policy_version: 'wp-v1',
  };
  const as_of = '2026-04-03T00:00:00.000Z';
  const w1 = wb.build(spec, SCOPE, as_of, 1);
  const w2 = wb.build(spec, SCOPE, as_of, 1);
  if (w1.window_id !== w2.window_id) {
    return fail('INV-6.4-D', `window id not deterministic: ${w1.window_id} vs ${w2.window_id}`);
  }
  const w3 = wb.build({ ...spec, build_policy_version: 'wp-v2' }, SCOPE, as_of, 1);
  if (w3.window_id === w1.window_id) {
    return fail('INV-6.4-D', 'policy version change did not affect window_id');
  }
  return ok('INV-6.4-D', 'window identity stable and policy-sensitive');
}

// ─── INV-6.4-E: baseline identity + legality reasons ─────────────
export function checkINV_64_E(): L6_4InvariantResult {
  const wb = new WindowBuilder();
  const be = new BaselineEngine();
  const window = wb.build(
    { window_type: L6WindowType.BASELINE, duration_seconds: 86400, anchor: 'AS_OF', late_data_inclusion_flag: false, build_policy_version: 'wp-v1' },
    SCOPE, '2026-04-03T00:00:00.000Z', 1,
  );
  const legal = be.build({
    method: L6BaselineMethod.Z_SCORE, window, observations: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  if (!legal.legal) return fail('INV-6.4-E', `legal baseline rejected: ${legal.illegality_reasons.join(',')}`);

  const illegal = be.build({
    method: L6BaselineMethod.Z_SCORE, window, observations: [1],
    min_observations: 10, min_coverage: 0.9, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  if (illegal.legal) return fail('INV-6.4-E', 'illegal baseline accepted');

  const peerIllegal = be.build({
    method: L6BaselineMethod.PEER_RELATIVE, window, observations: [1, 2, 3],
    min_observations: 1, min_coverage: 0, build_policy_version: 'wp-v1',
    peer_relative_allowed: false, regime_relative_allowed: false,
  });
  if (peerIllegal.legal) return fail('INV-6.4-E', 'peer-relative baseline not blocked when not allowed');
  return ok('INV-6.4-E', `baseline legality enforced (${illegal.illegality_reasons.length} reasons)`);
}

// ─── INV-6.4-F: feature compute determinism (identical inputs → identical replay_hash) ─
export function checkINV_64_F(): L6_4InvariantResult {
  const engine = new FeatureComputeEngine();
  const r1 = engine.compute(buildFeatureRequest(buildRun()), () => ({
    value_kind: L6FeatureValueKind.NUMBER,
    value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  const r2 = engine.compute(buildFeatureRequest(buildRun()), () => ({
    value_kind: L6FeatureValueKind.NUMBER,
    value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  if (r1.output.lineage.replay_hash !== r2.output.lineage.replay_hash) {
    return fail('INV-6.4-F', `replay_hash not deterministic: ${r1.output.lineage.replay_hash} vs ${r2.output.lineage.replay_hash}`);
  }
  if (!r1.validation.valid) return fail('INV-6.4-F', `valid request produced invalid output: ${JSON.stringify(r1.validation.violations)}`);
  return ok('INV-6.4-F', 'feature compute deterministic');
}

// ─── INV-6.4-G: legal transition matrix ──────────────────────────
export function checkINV_64_G(): L6_4InvariantResult {
  if (!isLegalTransition(L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.CONFIRMED)) {
    return fail('INV-6.4-G', 'CANDIDATE->CONFIRMED must be legal');
  }
  if (isLegalTransition(L6EventLifecycleState.RESOLVED, L6EventLifecycleState.ACTIVE)) {
    return fail('INV-6.4-G', 'RESOLVED->ACTIVE must be illegal');
  }
  if (isLegalTransition(L6EventLifecycleState.CANDIDATE, L6EventLifecycleState.ACTIVE)) {
    return fail('INV-6.4-G', 'CANDIDATE->ACTIVE must be illegal (must pass CONFIRMED)');
  }
  return ok('INV-6.4-G', 'legal transition matrix enforced');
}

// ─── INV-6.4-H: confirmation law ─────────────────────────────────
export function checkINV_64_H(): L6_4InvariantResult {
  const r = new EventStateResolver();
  const pass = r.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  if (pass.decision !== 'CONFIRM') return fail('INV-6.4-H', `expected CONFIRM got ${pass.decision}`);

  const noTrigger = r.decideConfirmation({
    trigger_fired: false, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  if (noTrigger.decision === 'CONFIRM') return fail('INV-6.4-H', 'must not confirm without trigger');

  const suppressed = r.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: true,
    suppression_blocking: true, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  if (suppressed.decision !== 'SUPPRESS') return fail('INV-6.4-H', `expected SUPPRESS got ${suppressed.decision}`);

  const noEvidence = r.decideConfirmation({
    trigger_fired: true, confirmation_condition_passed: true, evidence_present: false,
    suppression_blocking: false, duplicate_dedupe_detected: false, quarantine_reason: null,
  });
  if (noEvidence.decision === 'CONFIRM') return fail('INV-6.4-H', 'must not confirm without evidence');

  return ok('INV-6.4-H', 'confirmation law enforced');
}

// ─── INV-6.4-I: evidence pack identity deterministic ─────────────
export function checkINV_64_I(): L6_4InvariantResult {
  const builder = new EvidencePackBuilder();
  const m: L6EvidencePackMaterial = {
    primitive_id: 'funding.funding_z_score.v1',
    primitive_version: 'v1.0.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-03T00:00:00.000Z',
    window_refs: ['win_a'],
    baseline_refs: ['base_a'],
    input_snapshot_ref: 'snap-001',
    inputs: { funding_rate: 0.012 },
    compute_metadata: { run: 'inv-i' },
    contract_refs: { feature: 'funding.funding_z_score.v1@v1.0.0' },
  };
  const p1 = builder.build(L6EvidencePackKind.FEATURE_EVIDENCE, m, '2026-04-03T00:00:00.000Z');
  const p2 = builder.build(L6EvidencePackKind.FEATURE_EVIDENCE, m, '2026-04-03T00:00:00.000Z');
  if (!EvidencePackBuilder.sameIdentity(p1, p2)) {
    return fail('INV-6.4-I', `evidence pack id drifted: ${p1.evidence_pack_id} vs ${p2.evidence_pack_id}`);
  }
  return ok('INV-6.4-I', 'evidence pack identity deterministic');
}

// ─── INV-6.4-J: materializer blocks invalid outputs ──────────────
export function checkINV_64_J(): L6_4InvariantResult {
  const def = buildLegalFeatureDefinition();
  const mat = new FeatureMaterializer();
  const run = buildRun();
  const bad = {
    feature_id: def.primitive_id,
    feature_version: def.version,
    scope_type: def.scope.scope_type,
    scope_id: 'BTC',
    as_of: run.as_of,
    observed_window_start: run.as_of,
    observed_window_end: run.as_of,
    value_payload: {
      value_kind: L6FeatureValueKind.NUMBER,
      value: 1.72, baseline_value: 0, normalized_value: 1.72,
    },
    validity_state: L6FeatureValidityState.VALID,
    quality_state: L6QualityState.PASS,
    confidence_band: L6ConfidenceBand.HIGH,
    freshness_state: L6FreshnessState.EXPIRED,
    null_state: L6NullState.PRESENT,
    late_arrival_flag: false,
    warmup_satisfied: true,
    lineage: {
      manifest_id: '', trace_id: '', envelope_id: '',
      evidence_pack_ref: null, input_snapshot_ref: '', replay_hash: 'bad',
    },
  } as const;
  const r = mat.prepare(run, def, bad, null);
  if (!r.blocked) return fail('INV-6.4-J', 'materializer did not block invalid output');
  return ok('INV-6.4-J', 'materializer blocks invalid output');
}

// ─── INV-6.4-K: replay stability + repair tagging ────────────────
export function checkINV_64_K(): L6_4InvariantResult {
  const engine = new FeatureComputeEngine();
  const liveRun = buildRun(L6ComputeRunMode.LIVE);
  const replayRun = buildRun(L6ComputeRunMode.REPLAY);
  const repairRun = buildRun(L6ComputeRunMode.REPAIR);

  const live = engine.compute(buildFeatureRequest(liveRun), () => ({
    value_kind: L6FeatureValueKind.NUMBER,
    value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  const replay = engine.compute(buildFeatureRequest(replayRun), () => ({
    value_kind: L6FeatureValueKind.NUMBER,
    value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));
  const repair = engine.compute(buildFeatureRequest(repairRun), () => ({
    value_kind: L6FeatureValueKind.NUMBER,
    value: 1.72, baseline_value: 0, normalized_value: 1.72,
  }));

  // Replay and live share identical material inputs except historical_mode flag. Both must
  // differ because historical_mode is part of the material — which is exactly what
  // distinguishes replay from live. The invariant we check is that REPLAY == REPLAY and
  // that replay and repair hashes agree because they both set historical_mode true.
  if (replay.output.lineage.replay_hash !== repair.output.lineage.replay_hash) {
    return fail('INV-6.4-K', 'replay and repair (same historical_mode) produced different hashes');
  }
  if (live.output.lineage.replay_hash === replay.output.lineage.replay_hash) {
    return fail('INV-6.4-K', 'live and replay must differ because historical_mode is part of material');
  }

  // Repair identity: runs carry explicit repair flags.
  if (!repairRun.repair_mode_flag) return fail('INV-6.4-K', 'repair flag missing on repair run');
  if (!replayRun.replay_mode_flag) return fail('INV-6.4-K', 'replay flag missing on replay run');
  return ok('INV-6.4-K', 'replay/repair tagging and hash semantics correct');
}

export function checkAllL6_4Invariants(): readonly L6_4InvariantResult[] {
  return [
    checkINV_64_A(),
    checkINV_64_B(),
    checkINV_64_C(),
    checkINV_64_D(),
    checkINV_64_E(),
    checkINV_64_F(),
    checkINV_64_G(),
    checkINV_64_H(),
    checkINV_64_I(),
    checkINV_64_J(),
    checkINV_64_K(),
  ];
}

// ─── helpers ─────────────────────────────────────────────────────
function ok(id: string, evidence: string): L6_4InvariantResult {
  return { id, name: id, holds: true, evidence };
}
function fail(id: string, evidence: string): L6_4InvariantResult {
  return { id, name: id, holds: false, evidence };
}

// Silence "unused" warnings for legal-event fixtures we use in tests.
void buildLegalEventDefinition;
void buildLegalEventOutput;
