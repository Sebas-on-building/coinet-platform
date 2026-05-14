/**
 * L12.4 — Deterministic Runtime DAG & Engine Components
 * Certification Test Suite (§12.4.33)
 *
 * 6 Bands:
 *   A — DAG and runtime legality
 *   B — Assembly and input resolution
 *   C — Candidate, condition, trigger, invalidation
 *   D — Path construction, confidence, ranking, shift
 *   E — Restrictions, evidence, materialization
 *   F — Replay, repair, audit, invariants
 */

import {
  ALL_L12_DAG_EDGE_CLASSES,
  ALL_L12_DAG_NODE_CLASSES,
  ALL_L12_DAG_STAGES,
  ALL_L12_SCENARIO_RUN_MODES,
  ALL_L12_SCENARIO_RUN_STATUSES,
  buildCanonicalL12ScenarioDag,
  buildL12ComputeRun,
  buildL12DagNodeId,
  buildL12ExecutionContext,
  buildL12ScenarioDagEdge,
  buildL12ScenarioDagNode,
  detectL12DagCycles,
  isL12LegalEdgeForward,
  L12_CANONICAL_DAG_EDGE_COUNT,
  L12_CANONICAL_DAG_NODE_COUNT,
  L12_LEGAL_EDGE_TRANSITIONS,
  L12_NODE_CLASS_STAGE,
  L12DagEdgeClass,
  L12DagNodeClass,
  L12DagStage,
  L12ScenarioRunMode,
  L12ScenarioRunStatus,
  l12ToposortDeterministic,
  sealL12ExecutionContextStage,
} from '../l12/runtime';

import {
  ALL_L12_RESOLVED_INPUT_READINESS_CLASSES,
  L12ResolvedInputReadinessClass,
  resolveL12ScenarioInputs,
  assembleL12ScenarioSubject,
  generateL12ScenarioCandidates,
  resolveL12Conditions,
  buildL12Triggers,
  buildL12Invalidations,
  constructL12ScenarioPaths,
  computeL12PathConfidence,
  rankL12Scenarios,
  deriveL12ShiftConditions,
  deriveL12Restrictions,
  buildL12EvidencePack,
  ALL_L12_PATH_CONFIDENCE_FACTORS,
  L12PathConfidenceFactor,
} from '../l12/engine';

import {
  ALL_L12_SCENARIO_MATERIALIZATION_MODES,
  L12ScenarioMaterializationMode,
  buildL12MaterializationIntent,
} from '../l12/materialization/scenario-materializer';

import {
  buildL12ReplayHashWindow,
  checkL12ReplayMatch,
} from '../l12/replay/l12-replay-adapter';
import { checkL12RepairLaw } from '../l12/repair/l12-repair-adapter';

import {
  ALL_L12_RUNTIME_VIOLATION_CODES,
  L12RuntimeViolationCode,
  validateL12ScenarioDag,
  validateL12ScenarioComputeRun,
  validateL12ExecutionContext,
  validateL12ScenarioInputResolution,
  validateL12ScenarioCandidateSet,
  validateL12ScenarioConditionSet,
  validateL12ScenarioTriggerSet,
  validateL12ScenarioInvalidationSet,
  validateL12ScenarioPathConstruction,
  validateL12ScenarioRanking,
  validateL12MaterializationIntent,
  validateL12RuntimeReadiness,
} from '../l12/validation';

import {
  ALL_L12_RUNTIME_AUDIT_SUBJECT_CLASSES,
  L12RuntimeAuditSubjectClass,
  emitL12RuntimeAuditRecords,
  getL12RuntimeAuditLog,
  getL12RuntimeCriticalViolations,
  getL12RuntimeViolationsByCode,
  getL12RuntimeViolationsBySubjectClass,
  resetL12RuntimeAuditLog,
  severityForL12RuntimeViolationCode,
} from '../l12/constitution';

import {
  buildCanonicalL12RuntimeSurfaces,
  buildCanonicalRuntimeBundle,
  checkAllL12_4Invariants,
} from '../l12/invariants/l12_4-invariants';

import {
  L12ScenarioFamily,
  L12ScenarioOutputReadinessClass,
  L12ScenarioSubjectClass,
  L12ScenarioTimeHorizon,
  L12ScenarioType,
} from '../l12/contracts';

const POLICY = 'l12.4.test.v1';
const SUBJECT_ID = 'l12.subject.runtime.canon';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean): void {
  if (cond) passed += 1;
  else {
    failed += 1;
    failures.push(name);
  }
}

resetL12RuntimeAuditLog();

/* ─────────────────────── BAND A: DAG legality ─────────────────────── */
console.log('═══ BAND A: DAG and Runtime Legality ═══');

(function bandA() {
  ok('A.01 14 node classes registered', ALL_L12_DAG_NODE_CLASSES.length === 14);
  ok('A.02 14 stages registered', ALL_L12_DAG_STAGES.length === 14);
  ok('A.03 21 edge classes registered', ALL_L12_DAG_EDGE_CLASSES.length === 21);

  // Stage binding correctness
  ok(
    'A.04 INPUT_SURFACES → STAGE_00',
    L12_NODE_CLASS_STAGE[L12DagNodeClass.INPUT_SURFACES] === L12DagStage.STAGE_00_INPUT_SURFACES,
  );
  ok(
    'A.05 MATERIALIZATION → STAGE_13',
    L12_NODE_CLASS_STAGE[L12DagNodeClass.MATERIALIZATION] ===
      L12DagStage.STAGE_13_MATERIALIZATION,
  );

  // Forward-only edges
  let allForward = true;
  for (const cls of ALL_L12_DAG_EDGE_CLASSES) {
    const reg = L12_LEGAL_EDGE_TRANSITIONS[cls];
    if (!isL12LegalEdgeForward(reg.from, reg.to)) allForward = false;
  }
  ok('A.06 every registered edge is forward in stage order', allForward);

  // Canonical DAG build
  const r = buildCanonicalL12ScenarioDag({
    scenario_subject_id: SUBJECT_ID,
    policy_version: POLICY,
  });
  ok('A.07 canonical DAG builds', r.ok && !!r.dag);
  ok('A.08 canonical DAG has 14 nodes', r.dag!.nodes.length === L12_CANONICAL_DAG_NODE_COUNT);
  ok('A.09 canonical DAG has 21 edges', r.dag!.edges.length === L12_CANONICAL_DAG_EDGE_COUNT);

  // DAG validator
  const v = validateL12ScenarioDag(r.dag!);
  ok('A.10 canonical DAG passes validator', v.ok);

  // Cycle detection
  const cyc = detectL12DagCycles(r.dag!.nodes, r.dag!.edges);
  ok('A.11 canonical DAG has no cycles', cyc.ok);

  // Toposort
  const topo = l12ToposortDeterministic(r.dag!.nodes, r.dag!.edges);
  ok('A.12 toposort returns 14 ordered nodes', topo.ok && topo.order.length === 14);

  // Determinism: rebuild = identical replay hash
  const r2 = buildCanonicalL12ScenarioDag({
    scenario_subject_id: SUBJECT_ID,
    policy_version: POLICY,
  });
  ok('A.13 DAG is deterministic (same replay hash)', r.dag!.replay_hash === r2.dag!.replay_hash);

  // Different policy_version → different node ids
  const sameSubj1 = buildL12DagNodeId({
    scenario_subject_id: SUBJECT_ID,
    node_class: L12DagNodeClass.SCENARIO_SUBJECT,
    stage: L12DagStage.STAGE_01_SCENARIO_SUBJECT,
    policy_version: POLICY,
  });
  const sameSubj2 = buildL12DagNodeId({
    scenario_subject_id: SUBJECT_ID,
    node_class: L12DagNodeClass.SCENARIO_SUBJECT,
    stage: L12DagStage.STAGE_01_SCENARIO_SUBJECT,
    policy_version: POLICY + '.diff',
  });
  ok('A.14 node id changes with policy version', sameSubj1 !== sameSubj2);

  // Illegal edge: backward edge from EVIDENCE_PACK back to SCENARIO_SUBJECT
  const evidenceNode = buildL12ScenarioDagNode({
    scenario_subject_id: SUBJECT_ID,
    node_class: L12DagNodeClass.EVIDENCE_PACK,
    policy_version: POLICY,
  });
  const subjectNode = buildL12ScenarioDagNode({
    scenario_subject_id: SUBJECT_ID,
    node_class: L12DagNodeClass.SCENARIO_SUBJECT,
    policy_version: POLICY,
  });
  // Edge classes don't allow EVIDENCE_PACK → SCENARIO_SUBJECT, so use a forward edge class
  // and mismatch endpoints to provoke L12R_DAG_EDGE_ILLEGAL.
  const illegalEdge = buildL12ScenarioDagEdge({
    edge_class: L12DagEdgeClass.INPUTS_TO_SUBJECT, // expects INPUT_SURFACES → SCENARIO_SUBJECT
    from_node_id: evidenceNode.node_id,
    to_node_id: subjectNode.node_id,
    policy_version: POLICY,
  });
  const tampered = {
    ...r.dag!,
    edges: [
      ...r.dag!.edges.filter(e => e.edge_class !== L12DagEdgeClass.INPUTS_TO_SUBJECT),
      illegalEdge,
    ],
  };
  const tamperedRes = validateL12ScenarioDag(tampered);
  ok(
    'A.15 illegal endpoints flagged',
    tamperedRes.issues.some(i =>
      i.code === L12RuntimeViolationCode.L12R_DAG_EDGE_ILLEGAL ||
      i.code === L12RuntimeViolationCode.L12R_DAG_EDGE_BACKWARD,
    ),
  );

  // Run mode validation
  ok('A.16 5 run modes registered', ALL_L12_SCENARIO_RUN_MODES.length === 5);
  ok('A.17 6 run statuses registered', ALL_L12_SCENARIO_RUN_STATUSES.length === 6);
  const liveRun = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.LIVE,
    scenario_engine_version: '1.0.0',
    scenario_contract_version: '1.0.0',
    started_at: '2026-05-08T00:00:00Z',
    policy_version: POLICY,
  });
  ok('A.18 LIVE run validates clean', validateL12ScenarioComputeRun(liveRun).ok);

  const replayWithoutSource = { ...liveRun, run_mode: L12ScenarioRunMode.REPLAY };
  ok(
    'A.19 REPLAY without source rejects',
    !validateL12ScenarioComputeRun(replayWithoutSource).ok,
  );
  const repairWithoutParent = { ...liveRun, run_mode: L12ScenarioRunMode.REPAIR };
  ok(
    'A.20 REPAIR without parent rejects',
    !validateL12ScenarioComputeRun(repairWithoutParent).ok,
  );

  // Execution context: stage sealing
  const ctx = buildL12ExecutionContext({
    compute_run: liveRun,
    dag: r.dag!,
    policy_version: POLICY,
  });
  ok('A.21 fresh execution context has 0 sealed stages', ctx.sealed_stages.length === 0);
  const sealResult = sealL12ExecutionContextStage(
    ctx,
    L12DagStage.STAGE_00_INPUT_SURFACES,
    { input_surfaces: buildCanonicalL12RuntimeSurfaces() },
  );
  ok('A.22 stage 0 seal succeeds', sealResult.ok && sealResult.context.sealed_stages.length === 1);
  const reSeal = sealL12ExecutionContextStage(
    sealResult.context,
    L12DagStage.STAGE_00_INPUT_SURFACES,
    { input_surfaces: buildCanonicalL12RuntimeSurfaces() },
  );
  ok('A.23 reseal of same stage rejects', !reSeal.ok);
})();

/* ─────── BAND B: assembly and input resolution ─────── */
console.log('\n═══ BAND B: Assembly and Input Resolution ═══');

(function bandB() {
  const surfaces = buildCanonicalL12RuntimeSurfaces();
  const subj = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces,
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });
  ok('B.01 green assembly succeeds', subj.ok && !!subj.subject);

  const noL11 = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces: { ...surfaces, l11_score_context_bundle_refs: [] },
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });
  ok('B.02 missing L11 bundle rejects', !noL11.ok);

  const tradeIntent = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces,
    subject_contract_version: '1.0.0',
    trade_intent_text: 'should_buy_btc_now',
    policy_version: POLICY,
  });
  ok('B.03 trade intent text rejects', !tradeIntent.ok);

  const rawScore = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces: { ...surfaces, l11_score_context_bundle_refs: ['l1:raw_score'] },
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });
  ok('B.04 raw lower-layer score ref rejects', !rawScore.ok);

  // Input resolver
  const r1 = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces,
    policy_version: POLICY,
  });
  ok('B.05 clean input resolution succeeds', r1.ok);
  ok(
    'B.06 input resolution validator passes on clean',
    validateL12ScenarioInputResolution(r1.resolution).ok,
  );
  ok(
    'B.07 readiness READY on clean surfaces',
    r1.resolution.readiness_class === L12ResolvedInputReadinessClass.READY,
  );

  const drift = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces: { ...surfaces, driftMaterialOrCritical: true },
    policy_version: POLICY,
  });
  ok(
    'B.08 drift narrows readiness to DEGRADED',
    drift.resolution.readiness_class === L12ResolvedInputReadinessClass.DEGRADED,
  );

  const missingViz = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces: { ...surfaces, missingVisibilityMaterial: true },
    policy_version: POLICY,
  });
  ok(
    'B.09 missing visibility narrows readiness to PARTIAL',
    missingViz.resolution.readiness_class === L12ResolvedInputReadinessClass.PARTIAL,
  );

  ok(
    'B.10 6 readiness classes registered',
    ALL_L12_RESOLVED_INPUT_READINESS_CLASSES.length === 6,
  );
})();

/* ─────── BAND C: candidate, condition, trigger, invalidation ─────── */
console.log('\n═══ BAND C: Candidate, Condition, Trigger, Invalidation ═══');

(function bandC() {
  const bundle = buildCanonicalRuntimeBundle();
  ok('C.01 canonical candidate set is clean', validateL12ScenarioCandidateSet(bundle.candidate_set).ok);
  ok('C.02 candidates carry no primary/secondary fields',
    bundle.candidate_set.candidates.every(c => !('primary_scenario_ref' in c)),
  );

  // Bullish-only failure
  const bullishOnly = generateL12ScenarioCandidates({
    scenario_subject_id: SUBJECT_ID,
    resolution: bundle.resolution.resolution,
    candidates: [
      {
        scenario_type: L12ScenarioType.BULLISH_CONTINUATION,
        scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
        candidate_reason_codes: ['L7_VAL'],
        supporting_input_refs: ['l7.val.canon'],
        required_condition_seed_refs: [],
        required_trigger_seed_refs: [],
        required_invalidation_seed_refs: [],
        candidate_strength_score: 0.6,
      },
    ],
    policy_version: POLICY,
  });
  ok('C.03 bullish-only without alternative rejects', !bullishOnly.ok);

  // Forbidden phrase in reason codes
  const forbidden = generateL12ScenarioCandidates({
    scenario_subject_id: SUBJECT_ID,
    resolution: bundle.resolution.resolution,
    candidates: [
      {
        scenario_type: L12ScenarioType.BASE_CASE,
        scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
        candidate_reason_codes: ['guaranteed_breakout'],
        supporting_input_refs: ['l7.val.canon'],
        required_condition_seed_refs: [],
        required_trigger_seed_refs: [],
        required_invalidation_seed_refs: [],
        candidate_strength_score: 0.6,
        eligible_for_base_case: true,
      },
    ],
    policy_version: POLICY,
  });
  ok('C.04 forbidden language in candidate rejects', !forbidden.ok);

  // Conditions
  ok(
    'C.05 canonical condition set passes validator',
    validateL12ScenarioConditionSet(bundle.condition_set).ok,
  );
  // Trigger validator
  ok(
    'C.06 canonical trigger set passes validator',
    validateL12ScenarioTriggerSet(bundle.trigger_set).ok,
  );
  // Invalidation validator
  ok(
    'C.07 canonical invalidation set passes validator',
    validateL12ScenarioInvalidationSet({
      invalidation_set: bundle.invalidation_set,
      path_confidence: bundle.path_confidence,
    }).ok,
  );

  // Active invalidation hidden from confidence
  const bundleActive = buildCanonicalRuntimeBundle({ hasActiveInvalidation: true });
  const tamperedConfidence = {
    ...bundleActive.path_confidence,
    cap_reason_refs: bundleActive.path_confidence.cap_reason_refs.filter(
      r => r !== 'CAP_ACTIVE_INVALIDATION',
    ),
  };
  const hidden = validateL12ScenarioInvalidationSet({
    invalidation_set: bundleActive.invalidation_set,
    path_confidence: tamperedConfidence,
  });
  ok(
    'C.08 active invalidation hidden from confidence rejects',
    hidden.issues.some(
      i => i.code === L12RuntimeViolationCode.L12R_INVALIDATION_HIDDEN_FROM_CONFIDENCE,
    ),
  );
})();

/* ─────── BAND D: path construction, confidence, ranking, shift ─────── */
console.log('\n═══ BAND D: Path Construction, Confidence, Ranking, Shift ═══');

(function bandD() {
  const bundle = buildCanonicalRuntimeBundle();
  ok(
    'D.01 canonical path construction is clean',
    validateL12ScenarioPathConstruction({ constructed: bundle.constructed }).ok,
  );
  ok(
    'D.02 each path has triggers',
    bundle.constructed.scenario_paths.every(p => p.trigger_refs.length > 0),
  );
  ok(
    'D.03 each path has invalidations',
    bundle.constructed.scenario_paths.every(p => p.invalidation_refs.length > 0),
  );
  ok(
    'D.04 base case present in constructed paths',
    bundle.constructed.scenario_paths.some(p => p.scenario_type === L12ScenarioType.BASE_CASE),
  );

  // Confidence cap applied
  const bundleActive = buildCanonicalRuntimeBundle({ hasActiveInvalidation: true });
  ok(
    'D.05 confidence capped under active invalidation',
    bundleActive.path_confidence.confidence_cap_refs.includes('CAP_ACTIVE_INVALIDATION') &&
      bundleActive.path_confidence.primary_path_confidence_score <= 0.5 + 1e-9,
  );
  ok(
    'D.06 cap reasons sorted deterministically',
    JSON.stringify(bundleActive.path_confidence.cap_reason_refs) ===
      JSON.stringify([...bundleActive.path_confidence.cap_reason_refs].sort()),
  );

  // Ranking
  ok(
    'D.07 canonical ranking passes validator',
    validateL12ScenarioRanking({
      ranking: bundle.ranking,
      path_confidence: bundle.path_confidence,
    }).ok,
  );
  ok('D.08 ranking has primary', !!bundle.ranking.primary_scenario_ref);
  ok('D.09 ranking has base case', !!bundle.ranking.base_case_ref);
  ok('D.10 ranking has secondary when alt exists', !!bundle.ranking.secondary_scenario_ref);

  // Shift conditions are required under close competition
  ok(
    'D.11 shift conditions present in canonical bundle',
    !!bundle.shift_conditions.shift_condition_set_id,
  );

  ok(
    'D.12 confidence factors registered (≥ 13)',
    ALL_L12_PATH_CONFIDENCE_FACTORS.length >= 13,
  );
  ok(
    'D.13 VALIDATION_SUPPORT factor present',
    ALL_L12_PATH_CONFIDENCE_FACTORS.includes(L12PathConfidenceFactor.VALIDATION_SUPPORT),
  );
})();

/* ─────── BAND E: restrictions, evidence, materialization ─────── */
console.log('\n═══ BAND E: Restrictions, Evidence Pack, Materialization ═══');

(function bandE() {
  const bundle = buildCanonicalRuntimeBundle();

  // Restrictions block recommendation/prediction/judgment/trade
  const blocked = bundle.restrictions.blocked_uses;
  ok(
    'E.01 RECOMMENDATION_OUTPUT blocked',
    blocked.includes('RECOMMENDATION_OUTPUT' as never),
  );
  ok(
    'E.02 PREDICTION_OUTPUT blocked',
    blocked.includes('PREDICTION_OUTPUT' as never),
  );
  ok(
    'E.03 TRADE_ACTION_OUTPUT blocked',
    blocked.includes('TRADE_ACTION_OUTPUT' as never),
  );
  ok(
    'E.04 FINAL_JUDGMENT_WITHOUT_L13 blocked',
    blocked.includes('FINAL_JUDGMENT_WITHOUT_L13' as never),
  );
  ok(
    'E.05 CERTAINTY_CLAIM blocked',
    blocked.includes('CERTAINTY_CLAIM' as never),
  );

  // Evidence pack completeness
  ok('E.06 evidence pack has scenario refs', bundle.evidence_pack.scenario_refs.length > 0);
  ok('E.07 evidence pack has trigger refs', bundle.evidence_pack.trigger_refs.length > 0);
  ok('E.08 evidence pack has invalidation refs', bundle.evidence_pack.invalidation_refs.length > 0);
  ok('E.09 evidence pack has score evidence', bundle.evidence_pack.score_evidence_refs.length > 0);
  ok('E.10 evidence pack has input snapshot', !!bundle.evidence_pack.input_snapshot_ref);
  ok('E.11 evidence pack has replay-safe ref', !!bundle.evidence_pack.replay_safe_ref);

  // Materialization with L5 route
  ok('E.12 materialization mode set', !!bundle.materialization.materialization_mode);
  ok(
    'E.13 5 materialization modes registered',
    ALL_L12_SCENARIO_MATERIALIZATION_MODES.length === 5,
  );
  ok('E.14 direct_store_write_attempted is false', bundle.materialization.direct_store_write_attempted === false);
  ok('E.15 L5 route present', !!bundle.materialization.l5_route_ref);

  // Direct store write rejected
  const direct = buildL12MaterializationIntent({
    scenario_subject_id: SUBJECT_ID,
    ranking: bundle.ranking,
    evidence_pack: bundle.evidence_pack,
    readiness_class_ref: 'l12.readiness.CLEAN_EMISSION',
    restriction_contract_ref: bundle.restrictions.restriction_contract_id,
    l5_route_ref: 'l5.route.canon',
    materialization_mode: L12ScenarioMaterializationMode.LIVE,
    direct_store_write_attempted: true,
    policy_version: POLICY,
  });
  ok('E.16 direct store write rejected', !direct.ok);

  // No L5 route rejected
  const noRoute = buildL12MaterializationIntent({
    scenario_subject_id: SUBJECT_ID,
    ranking: bundle.ranking,
    evidence_pack: bundle.evidence_pack,
    readiness_class_ref: 'l12.readiness.CLEAN_EMISSION',
    restriction_contract_ref: bundle.restrictions.restriction_contract_id,
    l5_route_ref: '',
    materialization_mode: L12ScenarioMaterializationMode.LIVE,
    policy_version: POLICY,
  });
  ok('E.17 missing L5 route rejected', !noRoute.ok);

  // Validator: blocked readiness
  const v_blocked = validateL12MaterializationIntent({
    intent: bundle.materialization,
    readiness_class: L12ScenarioOutputReadinessClass.BLOCKED_INSUFFICIENT_CONTRACT,
    evidence_pack_present: true,
  });
  ok('E.18 materialization with blocked readiness rejects', !v_blocked.ok);
})();

/* ─────── BAND F: replay, repair, audit, invariants ─────── */
console.log('\n═══ BAND F: Replay, Repair, Audit, Invariants ═══');

(function bandF() {
  const bundle = buildCanonicalRuntimeBundle();

  // Build a synthetic execution context from the bundle for replay window
  const liveRun = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.LIVE,
    scenario_engine_version: '1.0.0',
    scenario_contract_version: '1.0.0',
    started_at: '2026-05-08T00:00:00Z',
    policy_version: POLICY,
  });
  const dag = buildCanonicalL12ScenarioDag({
    scenario_subject_id: SUBJECT_ID,
    policy_version: POLICY,
  }).dag!;
  let ctx = buildL12ExecutionContext({ compute_run: liveRun, dag, policy_version: POLICY });
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_00_INPUT_SURFACES, {
    input_surfaces: bundle.surfaces,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_01_SCENARIO_SUBJECT, {
    scenario_subject: bundle.subject,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_02_INPUT_RESOLUTION, {
    input_resolution: bundle.resolution.resolution,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_03_CANDIDATE_GENERATION, {
    candidate_set: bundle.candidate_set,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_04_CONDITION_RESOLUTION, {
    condition_set: bundle.condition_set,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_05_TRIGGER_RESOLUTION, {
    trigger_set: bundle.trigger_set,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_06_INVALIDATION_RESOLUTION, {
    invalidation_set: bundle.invalidation_set,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_07_PATH_CONSTRUCTION, {
    constructed_paths: bundle.constructed,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_08_PATH_CONFIDENCE, {
    path_confidence: bundle.path_confidence,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_09_SCENARIO_RANKING, {
    ranking: bundle.ranking,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_10_SHIFT_CONDITIONS, {
    shift_conditions: bundle.shift_conditions,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_11_RESTRICTIONS, {
    restrictions: bundle.restrictions,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_12_EVIDENCE_PACK, {
    evidence_pack: bundle.evidence_pack,
  }).context;
  ctx = sealL12ExecutionContextStage(ctx, L12DagStage.STAGE_13_MATERIALIZATION, {
    materialization_intent: bundle.materialization,
  }).context;
  ok('F.01 14 stages sealed', ctx.sealed_stages.length === 14);
  ok(
    'F.02 execution context complete validates clean',
    validateL12ExecutionContext(ctx, { require_complete: true }).ok,
  );
  ok(
    'F.03 runtime readiness CLEAN_EMISSION validates',
    validateL12RuntimeReadiness({
      ctx,
      declared_readiness: L12ScenarioOutputReadinessClass.CLEAN_EMISSION,
    }).ok,
  );

  // Replay match
  const window = buildL12ReplayHashWindow(ctx);
  const replayRun = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.REPLAY,
    scenario_engine_version: '1.0.0',
    scenario_contract_version: '1.0.0',
    replay_source_run_id: liveRun.compute_run_id,
    started_at: '2026-05-08T01:00:00Z',
    policy_version: POLICY,
  });
  const replayCheckOk = checkL12ReplayMatch({
    source_run: liveRun,
    source_window: window,
    source_dag: dag,
    replay_run: replayRun,
    replay_window: window,
    replay_dag: dag,
  });
  ok('F.04 matching replay accepted', replayCheckOk.ok);

  // Replay mismatch
  const tamperedWindow = { ...window, ranking_hash: 'mismatched' };
  const replayCheckBad = checkL12ReplayMatch({
    source_run: liveRun,
    source_window: window,
    source_dag: dag,
    replay_run: replayRun,
    replay_window: tamperedWindow,
    replay_dag: dag,
  });
  ok('F.05 mismatched ranking hash rejects', !replayCheckBad.ok);

  // Replay invented evidence
  const invented = checkL12ReplayMatch({
    source_run: liveRun,
    source_window: window,
    source_dag: dag,
    replay_run: replayRun,
    replay_window: window,
    replay_dag: dag,
    attempts_to_invent_evidence: true,
  });
  ok('F.06 invented evidence rejects', !invented.ok);

  // Repair without parent
  const repairBad = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.REPAIR,
    scenario_engine_version: '1.0.0',
    scenario_contract_version: '1.0.0',
    started_at: '2026-05-08T02:00:00Z',
    policy_version: POLICY,
  });
  ok('F.07 repair without parent rejects', !validateL12ScenarioComputeRun(repairBad).ok);

  // Repair removed trigger
  const repairOk = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.REPAIR,
    scenario_engine_version: '1.0.1',
    scenario_contract_version: '1.0.0',
    parent_run_id: liveRun.compute_run_id,
    repair_reason: 'L11_RECALIBRATION',
    started_at: '2026-05-08T03:00:00Z',
    policy_version: POLICY,
  });
  const removedTrig = checkL12RepairLaw({
    parent_run: liveRun,
    repair_run: repairOk,
    changed_input_refs: ['l7.val.canon'],
    removed_trigger_refs: ['l12.trigger.x'],
    parent_primary_confidence: 0.6,
    repair_primary_confidence: 0.6,
  });
  ok('F.08 repair removing trigger rejects', !removedTrig.ok);

  // Repair upgrades confidence without new evidence
  const upgradedNoEv = checkL12RepairLaw({
    parent_run: liveRun,
    repair_run: repairOk,
    changed_input_refs: ['l7.val.canon'],
    parent_primary_confidence: 0.5,
    repair_primary_confidence: 0.7,
  });
  ok('F.09 repair upgrade without new evidence rejects', !upgradedNoEv.ok);

  // Audit
  resetL12RuntimeAuditLog();
  emitL12RuntimeAuditRecords(L12RuntimeAuditSubjectClass.DAG, 'test', [
    {
      code: L12RuntimeViolationCode.L12R_DAG_CYCLE_DETECTED,
      message: 'cycle test',
      subject_ref: 'dag.x',
    },
    {
      code: L12RuntimeViolationCode.L12R_RANKING_BEFORE_CONFIDENCE,
      message: 'ranking error',
      subject_ref: 'rk.x',
    },
    {
      code: L12RuntimeViolationCode.L12R_DAG_NODE_CLASS_STAGE_MISMATCH,
      message: 'stage warn',
      subject_ref: 'node.x',
    },
  ]);
  ok('F.10 audit log has 3 records', getL12RuntimeAuditLog().length === 3);
  ok(
    'F.11 cycle is CRITICAL',
    severityForL12RuntimeViolationCode(L12RuntimeViolationCode.L12R_DAG_CYCLE_DETECTED) ===
      'CRITICAL',
  );
  ok(
    'F.12 ranking-before-confidence is ERROR',
    severityForL12RuntimeViolationCode(L12RuntimeViolationCode.L12R_RANKING_BEFORE_CONFIDENCE) ===
      'ERROR',
  );
  ok(
    'F.13 stage-mismatch is WARNING',
    severityForL12RuntimeViolationCode(L12RuntimeViolationCode.L12R_DAG_NODE_CLASS_STAGE_MISMATCH) ===
      'WARNING',
  );
  ok('F.14 critical filter returns 1', getL12RuntimeCriticalViolations().length === 1);
  ok(
    'F.15 by-code filter returns 1',
    getL12RuntimeViolationsByCode(L12RuntimeViolationCode.L12R_DAG_CYCLE_DETECTED).length === 1,
  );
  ok(
    'F.16 by-subject-class filter returns 3',
    getL12RuntimeViolationsBySubjectClass(L12RuntimeAuditSubjectClass.DAG).length === 3,
  );
  ok(
    'F.17 ≥ 21 audit subject classes',
    ALL_L12_RUNTIME_AUDIT_SUBJECT_CLASSES.length >= 21,
  );
  ok(
    'F.18 ≥ 60 runtime violation codes',
    ALL_L12_RUNTIME_VIOLATION_CODES.length >= 60,
  );

  // Invariants
  const inv = checkAllL12_4Invariants();
  ok('F.19 INV-12.4-A holds', inv[0]!.holds);
  ok('F.20 INV-12.4-B holds', inv[1]!.holds);
  ok('F.21 INV-12.4-C holds', inv[2]!.holds);
  ok('F.22 INV-12.4-D holds', inv[3]!.holds);
  ok('F.23 INV-12.4-E holds', inv[4]!.holds);
  ok('F.24 INV-12.4-F holds', inv[5]!.holds);
  ok('F.25 INV-12.4-G holds', inv[6]!.holds);
  ok('F.26 INV-12.4-H holds', inv[7]!.holds);
})();

console.log('\n═══════════════════════════════════════════════════════════');
console.log('L12.4 — Deterministic Runtime DAG & Engine Components suite');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════');
if (failed > 0) {
  console.error('\nFailures:');
  for (const fl of failures) console.error(`  - ${fl}`);
  process.exit(1);
}
