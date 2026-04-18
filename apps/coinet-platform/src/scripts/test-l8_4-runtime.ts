/**
 * L8.4 — Runtime Architecture, Deterministic DAG, and Engine Components
 * Certification Test Suite
 *
 * 5 Bands (§8.4.9.2):
 *   A — DAG and runtime legality
 *   B — Subject assembly and input resolution
 *   C — Candidate, transition, and quality evaluation
 *   D — Classification, confidence, and multipliers
 *   E — Evidence, materialization, replay, repair, invariants
 */

// ── Runtime ──
import {
  L8DagNodeClass, ALL_L8_DAG_NODE_CLASSES,
  L8DagStage, L8_STAGE_ORDER, L8_STAGE_INDEX,
  L8_NODE_CLASS_STAGE, L8_QUALITY_DOMAIN_STAGE,
  buildL8DagNodeId, compareL8NodesDeterministic,
  L8DagEdgeClass, ALL_L8_DAG_EDGE_CLASSES,
  L8_LEGAL_EDGE_TRANSITIONS, isLegalL8Edge, buildL8DagEdgeId,
  detectL8Cycles, l8Toposort,
  buildL8RegimeDag,
  L8RegimeRunMode, ALL_L8_RUN_MODES,
  validateL8RegimeRun, finaliseL8RegimeRun,
  ALL_L8_INPUT_READINESS_CLASSES,
  ALL_L8_CANDIDATE_STRENGTH_BANDS,
  createL8ExecutionContext, sealL8Stage, isL8StageSealed,
} from '../l8/runtime';

// ── Engines ──
import {
  assembleRegimeSubject,
  resolveValidationConsumption,
  resolveRegimeInputs,
  detectCandidates, resolveCandidateStrengthBand,
  detectTransition,
  evaluateAmbiguity, evaluateStaleness, evaluateDegradation,
  classifyRegime,
  deriveRegimeConfidence,
  deriveRegimeMultiplier,
  buildRegimeEvidencePack,
} from '../l8/engine';

// ── Materialization / replay / repair ──
import { prepareRegimeMaterialization } from '../l8/materialization';
import { verifyRegimeReplay } from '../l8/replay';
import { verifyRegimeRepair } from '../l8/repair';

// ── Validation / runtime violation codes ──
import {
  L8RuntimeViolationCode,
  ALL_L8_RUNTIME_VIOLATION_CODES,
  L8RuntimeError,
} from '../l8/validation';

// ── Contracts + registries ──
import {
  L8RegimeFamily,
  L8MacroRegimeClass,
  L8TokenRegimeClass,
  L8RegimeCoexistenceClass,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
} from '../l8/contracts';

// ── Invariants ──
import {
  checkAllL84Invariants,
  checkINV_84_A, checkINV_84_B, checkINV_84_C, checkINV_84_D,
  checkINV_84_E, checkINV_84_F, checkINV_84_G,
  runGreenL84Pipeline,
} from '../l8/invariants/l8_4-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

// Shared pipeline for most bands — rebuilt per band to keep isolation.
function pipeline() { return runGreenL84Pipeline(); }

// ═══════════════════════════════════════════════════════════════
// BAND A — DAG and Runtime Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: DAG and Runtime Legality ═══');

assert(ALL_L8_DAG_NODE_CLASSES.length === 11,
  `A.01 11 node classes (got ${ALL_L8_DAG_NODE_CLASSES.length})`);
assert(ALL_L8_DAG_EDGE_CLASSES.length >= 15,
  `A.02 ≥15 edge classes (got ${ALL_L8_DAG_EDGE_CLASSES.length})`);
assert(L8_STAGE_ORDER.length === 13, 'A.03 13 stages');
assert(L8_STAGE_ORDER[0] === L8DagStage.S01_INPUT, 'A.04 first stage INPUT');
assert(L8_STAGE_ORDER[L8_STAGE_ORDER.length - 1] ===
  L8DagStage.S13_MATERIALIZATION, 'A.05 last stage MATERIALIZATION');
assert(L8_STAGE_INDEX[L8DagStage.S09_CLASSIFICATION] === 8,
  'A.06 classification = index 8');

// Every node class has a registered stage
for (const cls of ALL_L8_DAG_NODE_CLASSES) {
  assert(L8_NODE_CLASS_STAGE[cls] !== undefined, `A.stage.${cls}`);
}

// Quality domain stages
assert(L8_QUALITY_DOMAIN_STAGE.AMBIGUITY === L8DagStage.S06_AMBIGUITY,
  'A.07 ambiguity at S06');
assert(L8_QUALITY_DOMAIN_STAGE.STALENESS === L8DagStage.S07_STALENESS,
  'A.08 staleness at S07');
assert(L8_QUALITY_DOMAIN_STAGE.DEGRADATION === L8DagStage.S08_DEGRADATION,
  'A.09 degradation at S08');

// Legal edges
for (const edge of ALL_L8_DAG_EDGE_CLASSES) {
  const legal = L8_LEGAL_EDGE_TRANSITIONS[edge];
  assert(legal !== undefined && legal.length >= 1, `A.legal.${edge}`);
}
assert(isLegalL8Edge(L8DagEdgeClass.INPUT_TO_SUBJECT,
  L8DagNodeClass.INPUT_NODE, L8DagNodeClass.SUBJECT_NODE),
  'A.10 INPUT_TO_SUBJECT legal');
assert(!isLegalL8Edge(L8DagEdgeClass.INPUT_TO_SUBJECT,
  L8DagNodeClass.CANDIDATE_NODE, L8DagNodeClass.SUBJECT_NODE),
  'A.11 wrong-class INPUT_TO_SUBJECT blocked');

// Node id builder determinism
const nid1 = buildL8DagNodeId({
  node_class: L8DagNodeClass.SUBJECT_NODE,
  regime_run_id: 'r', regime_subject_id: 's',
  scope_type: 'MARKET', scope_id: 'g',
  quality_domain: null,
});
const nid2 = buildL8DagNodeId({
  node_class: L8DagNodeClass.SUBJECT_NODE,
  regime_run_id: 'r', regime_subject_id: 's',
  scope_type: 'MARKET', scope_id: 'g',
  quality_domain: null,
});
assert(nid1 === nid2, 'A.12 node id deterministic');
assert(nid1.startsWith('SUBJECT_NODE'), 'A.13 node id prefix');

const qid = buildL8DagNodeId({
  node_class: L8DagNodeClass.QUALITY_NODE,
  regime_run_id: 'r', regime_subject_id: 's',
  scope_type: 'MARKET', scope_id: 'g',
  quality_domain: 'AMBIGUITY',
});
assert(qid.includes(':AMBIGUITY:'), 'A.14 quality node id carries domain');

// Edge id builder
const eid = buildL8DagEdgeId(L8DagEdgeClass.INPUT_TO_SUBJECT, 'from', 'to');
assert(eid === 'INPUT_TO_SUBJECT:from->to', 'A.15 edge id deterministic');

// Compare deterministic
const a = {
  node_id: 'A', node_class: L8DagNodeClass.INPUT_NODE,
  stage: L8DagStage.S01_INPUT, regime_subject_id: 'x',
  regime_family: 'MACRO', scope_type: 'MARKET', scope_id: 'g',
  quality_domain: null, deterministic_inputs: [],
  engine_id: 'e', engine_version: 'v', created_at_ordinal: 0,
};
const b = { ...a, node_id: 'B' };
assert(compareL8NodesDeterministic(a, b) < 0, 'A.16 compare by id');
assert(compareL8NodesDeterministic(a, a) === 0, 'A.17 compare same');

// Cycle detection
const cycleResult = detectL8Cycles(['A', 'B', 'C'], [
  { edge_id: '1', edge_class: L8DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'A', to_node_id: 'B' },
  { edge_id: '2', edge_class: L8DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'B', to_node_id: 'C' },
  { edge_id: '3', edge_class: L8DagEdgeClass.INPUT_TO_SUBJECT,
    from_node_id: 'C', to_node_id: 'A' },
]);
assert(!cycleResult.acyclic, 'A.18 cycle detected');
assert(cycleResult.cycles.length >= 1, 'A.19 at least one cycle');
assert(detectL8Cycles(['A'], []).acyclic, 'A.20 no edges → acyclic');

// Toposort
const topo = l8Toposort([], []);
assert(topo.ok && topo.order.length === 0, 'A.21 empty toposort');

// Full green pipeline DAG build
const p1 = pipeline();
assert(p1.dagBuild.dag !== null, 'A.22 green pipeline DAG built');
assert(p1.dagBuild.violations.length === 0, 'A.23 no DAG violations');
assert(p1.dagBuild.dag!.nodes.length === 13, 'A.24 13 nodes per subject');
assert(p1.dagBuild.dag!.edges.length === 24, 'A.25 24 edges per subject');
assert(p1.dagBuild.dag!.topological_order.length === 13,
  'A.26 toposort covers all nodes');

// Determinism: rebuild and compare order
const p2 = pipeline();
assert(p1.dagBuild.dag!.topological_order.length ===
  p2.dagBuild.dag!.topological_order.length,
  'A.27 rebuilt DAG same length');
for (let i = 0; i < p1.dagBuild.dag!.topological_order.length; i++) {
  assert(
    p1.dagBuild.dag!.topological_order[i] ===
      p2.dagBuild.dag!.topological_order[i],
    `A.order.${i}`,
  );
}

// Run lineage
const goodRun = p1.run;
const rv = validateL8RegimeRun(goodRun);
assert(rv.valid, 'A.28 run lineage valid');
assert(ALL_L8_RUN_MODES.length === 4, 'A.29 4 run modes');
assert(validateL8RegimeRun({ ...goodRun, regime_run_id: '' }).valid === false,
  'A.30 missing run id rejected');
assert(validateL8RegimeRun({
  ...goodRun, mode: L8RegimeRunMode.REPLAY, parent_run_id: null,
}).valid === false, 'A.31 REPLAY without parent rejected');
assert(validateL8RegimeRun({
  ...goodRun, mode: L8RegimeRunMode.REPAIR,
  parent_run_id: 'p', repair_reason: null,
}).valid === false, 'A.32 REPAIR without reason rejected');
const fin = finaliseL8RegimeRun(goodRun, '2026-04-17T12:10:00Z');
assert(fin.completed_at === '2026-04-17T12:10:00Z', 'A.33 run finalised');

// Runtime violation code breadth
assert(ALL_L8_RUNTIME_VIOLATION_CODES.length >= 60,
  `A.34 ≥60 runtime codes (got ${ALL_L8_RUNTIME_VIOLATION_CODES.length})`);
const err = new L8RuntimeError(
  L8RuntimeViolationCode.DAG_CYCLE_DETECTED, 'test',
);
assert(err.code === L8RuntimeViolationCode.DAG_CYCLE_DETECTED,
  'A.35 L8RuntimeError carries code');

// Execution context
const ctx = createL8ExecutionContext(goodRun);
assert(ctx.subjects.size === 0, 'A.36 ctx subjects empty');
sealL8Stage(ctx, 'S01_INPUT');
assert(isL8StageSealed(ctx, 'S01_INPUT'), 'A.37 stage sealed');
assert(!isL8StageSealed(ctx, 'S02_SUBJECT'), 'A.38 other stages not sealed');

// Readiness / strength enum coverage
assert(ALL_L8_INPUT_READINESS_CLASSES.length === 6,
  'A.39 6 readiness classes');
assert(ALL_L8_CANDIDATE_STRENGTH_BANDS.length === 4,
  'A.40 4 candidate strength bands');

// ═══════════════════════════════════════════════════════════════
// BAND B — Subject Assembly and Input Resolution
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Subject Assembly and Input Resolution ═══');

const p = pipeline();
const { subject } = p;

// Green assembly
const greenAssembly = assembleRegimeSubject({
  subject,
  surface_availability: [
    { ref: 'l7:validation_assessment/macro', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L7_VALIDATION' },
    { ref: 'l7:restriction_profile/macro', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L7_RESTRICTION' },
    { ref: 'l6:current_feature_state/macro_risk', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L6_FEATURE' },
  ],
  trace_id: 't', manifest_id: 'm',
});
assert(greenAssembly.ok, 'B.01 green assembly ok');
assert(greenAssembly.value!.bound_validation_refs.length === 2,
  'B.02 2 validation refs bound');
assert(greenAssembly.value!.bound_feature_refs.length === 1,
  'B.03 1 feature ref bound');

// Missing identity
const noId = assembleRegimeSubject({
  subject: { ...subject, regime_subject_id: '' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!noId.ok, 'B.04 missing id blocked');

// Missing template
const noTemplate = assembleRegimeSubject({
  subject: { ...subject, regime_template_id: '' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!noTemplate.ok, 'B.05 missing template blocked');
assert(noTemplate.violations.some(v =>
  v.code === L8RuntimeViolationCode.ASSEMBLY_UNREGISTERED_TEMPLATE),
  'B.06 template violation surfaced');

// Unregistered family
const fakeFamily = assembleRegimeSubject({
  subject: { ...subject, regime_family: 'FAKE_FAMILY' as L8RegimeFamily },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!fakeFamily.ok, 'B.07 unregistered family blocked');

// Illegal scope for family
const illegalScope = assembleRegimeSubject({
  subject: { ...subject, scope_type: 'CHAIN' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!illegalScope.ok, 'B.08 MACRO + CHAIN scope blocked');
assert(illegalScope.violations.some(v =>
  v.code === L8RuntimeViolationCode.ASSEMBLY_FAMILY_SCOPE_ILLEGAL),
  'B.09 family/scope violation code');

// Judgment leak in description
const leak = assembleRegimeSubject({
  subject: { ...subject, description: 'buy signal when regime flips' },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!leak.ok, 'B.10 judgment leak blocked');
assert(leak.violations.some(v =>
  v.code === L8RuntimeViolationCode.ASSEMBLY_JUDGMENT_LEAK),
  'B.11 assembly judgment-leak violation');

// Incomplete lineage
const noLineage = assembleRegimeSubject({
  subject: {
    ...subject,
    lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
  },
  surface_availability: [], trace_id: 't', manifest_id: 'm',
});
assert(!noLineage.ok, 'B.12 no lineage blocked');

// Validation consumption — green
const consRes = resolveValidationConsumption({
  subject,
  surfaces: [
    {
      ref: 'l7:validation_assessment/macro',
      family: 'L7_VALIDATION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
    {
      ref: 'l7:restriction_profile/macro',
      family: 'L7_RESTRICTION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
  ],
});
assert(consRes.ok, 'B.13 green consumption');
assert(consRes.value!.usable_refs.length === 2, 'B.14 2 usable refs');
assert(consRes.value!.narrowed_refs.length === 0,
  'B.15 no narrowing on clean');

// Blocked emission → rejected
const blockedCons = resolveValidationConsumption({
  subject,
  surfaces: [
    {
      ref: 'l7:validation_assessment/macro',
      family: 'L7_VALIDATION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: true,
    },
    {
      ref: 'l7:restriction_profile/macro',
      family: 'L7_RESTRICTION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
  ],
});
assert(!blockedCons.ok, 'B.16 blocked emission denied');
assert(blockedCons.violations.some(v =>
  v.code === L8RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED),
  'B.17 blocked emission code');

// Restriction bypass
const bypassCons = resolveValidationConsumption({
  subject,
  surfaces: [
    {
      ref: 'l7:validation_assessment/macro',
      family: 'L7_VALIDATION',
      allows_regime_conditioning: true,
      allows_multiplier_input: false,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
    {
      ref: 'l7:restriction_profile/macro',
      family: 'L7_RESTRICTION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
  ],
});
assert(!bypassCons.ok, 'B.18 missing multiplier right blocked');
assert(bypassCons.violations.some(v =>
  v.code === L8RuntimeViolationCode.INPUT_RESTRICTION_BYPASS),
  'B.19 restriction bypass code');

// Narrowed (contradiction) consumption
const narrowed = resolveValidationConsumption({
  subject,
  surfaces: [
    {
      ref: 'l7:validation_assessment/macro',
      family: 'L7_VALIDATION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: true,
      emission_blocked: false,
    },
    {
      ref: 'l7:restriction_profile/macro',
      family: 'L7_RESTRICTION',
      allows_regime_conditioning: true,
      allows_multiplier_input: true,
      allows_confidence_input: true,
      has_open_contradiction: false,
      emission_blocked: false,
    },
  ],
});
assert(narrowed.ok, 'B.20 narrowed consumption ok');
assert(narrowed.value!.narrowed_refs.length === 1,
  'B.21 exactly one narrowed ref');

// Input resolution
const goodInputs = resolveRegimeInputs({
  subject,
  surface_statuses: [
    { ref: 'l7:validation_assessment/macro', family: 'L7_VALIDATION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'l7:restriction_profile/macro', family: 'L7_RESTRICTION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'l6:current_feature_state/macro_risk', family: 'L6_FEATURE',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
  ],
  usable_validation_refs: ['l7:validation_assessment/macro'],
  blocked_validation_refs: [],
});
assert(goodInputs.ok, 'B.22 green inputs resolve');
assert(goodInputs.value!.readiness_class === 'COMPLETE_CURRENT',
  'B.23 COMPLETE_CURRENT readiness');

// Unregistered surface
const unreg = resolveRegimeInputs({
  subject,
  surface_statuses: [
    { ref: 'l7:validation_assessment/macro', family: 'L7_VALIDATION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'unknown:rogue', family: 'L6_FEATURE',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
  ],
  usable_validation_refs: [], blocked_validation_refs: [],
});
assert(!unreg.ok, 'B.24 unregistered surface blocked');
assert(unreg.violations.some(v =>
  v.code === L8RuntimeViolationCode.INPUT_UNREGISTERED_SURFACE),
  'B.25 unregistered code surfaced');

// Scope mismatch
const badScope = resolveRegimeInputs({
  subject,
  surface_statuses: [
    { ref: 'l7:validation_assessment/macro', family: 'L7_VALIDATION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'ASSET', scope_id: 'wrong' },
    { ref: 'l7:restriction_profile/macro', family: 'L7_RESTRICTION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'l6:current_feature_state/macro_risk', family: 'L6_FEATURE',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
  ],
  usable_validation_refs: ['l7:validation_assessment/macro'],
  blocked_validation_refs: [],
});
assert(!badScope.ok, 'B.26 scope mismatch blocked');
assert(badScope.violations.some(v =>
  v.code === L8RuntimeViolationCode.INPUT_SCOPE_INCOMPATIBLE),
  'B.27 scope mismatch code');

// Stale-masquerading-current under STRICT policy
const staleMask = resolveRegimeInputs({
  subject,
  surface_statuses: [
    { ref: 'l7:validation_assessment/macro', family: 'L7_VALIDATION',
      is_current: true, is_stale: true, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'l7:restriction_profile/macro', family: 'L7_RESTRICTION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
    { ref: 'l6:current_feature_state/macro_risk', family: 'L6_FEATURE',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global' },
  ],
  usable_validation_refs: ['l7:validation_assessment/macro'],
  blocked_validation_refs: [],
});
assert(!staleMask.ok, 'B.28 stale-masq blocked');
assert(staleMask.violations.some(v =>
  v.code === L8RuntimeViolationCode.INPUT_STALE_MASQUERADING_CURRENT),
  'B.29 stale-masq code');

// ═══════════════════════════════════════════════════════════════
// BAND C — Candidate, Transition, Quality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Candidate, Transition, Quality ═══');

const p3 = pipeline();

// Candidate: green
const cands = detectCandidates({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  proposals: [
    { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.8,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['x'],
      template_ref: p3.subject.regime_template_id },
    { regime_class: L8MacroRegimeClass.TRANSITION, raw_strength_score: 0.3,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['y'],
      template_ref: p3.subject.regime_template_id },
  ],
});
assert(cands.ok && cands.value!.length === 2, 'C.01 2 candidates');
assert(cands.value![0].regime_class === L8MacroRegimeClass.RISK_ON,
  'C.02 top by strength');
assert(cands.value![0].candidate_strength_band === 'HIGH',
  'C.03 top band HIGH');

// Band resolver
assert(resolveCandidateStrengthBand(0.1) === 'LOW', 'C.04 band LOW');
assert(resolveCandidateStrengthBand(0.4) === 'MEDIUM', 'C.05 band MEDIUM');
assert(resolveCandidateStrengthBand(0.7) === 'HIGH', 'C.06 band HIGH');
assert(resolveCandidateStrengthBand(0.95) === 'DOMINANT', 'C.07 band DOMINANT');

// Cross-family candidate blocked
const crossFam = detectCandidates({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  proposals: [
    { regime_class: L8TokenRegimeClass.EARLY_ACCUMULATION,
      raw_strength_score: 0.6,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['x'],
      template_ref: p3.subject.regime_template_id },
  ],
});
assert(!crossFam.ok, 'C.08 cross-family candidate blocked');
assert(crossFam.violations.some(v =>
  v.code === L8RuntimeViolationCode.CANDIDATE_CLASS_NOT_IN_FAMILY),
  'C.09 CLASS_NOT_IN_FAMILY code');

// OOR strength blocked
const oor = detectCandidates({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  proposals: [
    { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 2,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['x'],
      template_ref: p3.subject.regime_template_id },
  ],
});
assert(!oor.ok, 'C.10 OOR strength blocked');

// Missing reason blocked
const noReason = detectCandidates({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  proposals: [
    { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.5,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: [],
      template_ref: p3.subject.regime_template_id },
  ],
});
assert(!noReason.ok, 'C.11 missing reason blocked');

// Duplicate class blocked (non-deterministic)
const dup = detectCandidates({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  proposals: [
    { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.5,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['x'],
      template_ref: p3.subject.regime_template_id },
    { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.7,
      supporting_surface_refs: [], contradicting_surface_refs: [],
      candidate_reason_codes: ['x'],
      template_ref: p3.subject.regime_template_id },
  ],
});
assert(!dup.ok, 'C.12 duplicate candidate blocked');
assert(dup.violations.some(v =>
  v.code === L8RuntimeViolationCode.CANDIDATE_NON_DETERMINISTIC),
  'C.13 non-deterministic code');

// Transition: stable
const transStable = detectTransition({
  subject: p3.subject,
  candidates: cands.value!,
  prior_primary_regime_class: null,
  fired_signature_refs: [],
});
assert(transStable.ok, 'C.14 stable transition ok');
assert(transStable.value!.transition_risk_score < 0.4,
  'C.15 stable risk low');

// Transition: prior flip raises risk
const transFlip = detectTransition({
  subject: p3.subject,
  candidates: cands.value!,
  prior_primary_regime_class: L8MacroRegimeClass.RISK_OFF,
  fired_signature_refs: ['macro.flip.v1'],
});
assert(transFlip.ok, 'C.16 flip transition ok');
assert(transFlip.value!.transition_risk_score >
  transStable.value!.transition_risk_score,
  'C.17 flip raises risk');
assert(transFlip.value!.instability_reasons.length > 0,
  'C.18 flip reasons populated');

// Transition: high-risk without reasons blocked (3 fired signatures but
// we construct a scenario where reasons don't accumulate — impossible in
// this engine because fired signatures auto-add a reason. So we test the
// converse: without prior flip / close candidates / signatures, risk is
// low and reasons are empty (legal).
assert(transStable.value!.instability_reasons.length === 0,
  'C.19 low risk → empty reasons');

// Quality engines
const amb = evaluateAmbiguity({
  subject: p3.subject,
  candidates: cands.value!,
  transition: transStable.value!,
});
assert(amb.ok, 'C.20 ambiguity ok');
assert(amb.value!.domain === 'AMBIGUITY', 'C.21 ambiguity domain');

const stale = evaluateStaleness({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  surface_age_seconds: {
    'l7:validation_assessment/macro': 60,
    'l6:current_feature_state/macro_risk': 60,
  },
});
assert(stale.ok, 'C.22 staleness ok');
assert(stale.value!.domain === 'STALENESS', 'C.23 staleness domain');

const staleHigh = evaluateStaleness({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  surface_age_seconds: {
    'l7:validation_assessment/macro': 10000,
    'l6:current_feature_state/macro_risk': 10000,
  },
});
assert(staleHigh.ok && staleHigh.value!.score >= 0.6,
  'C.24 high age → high staleness');

const deg = evaluateDegradation({
  subject: p3.subject,
  resolved_input_set: p3.resolvedInputs,
  total_required_refs: 3,
});
assert(deg.ok && deg.value!.domain === 'DEGRADATION',
  'C.25 degradation ok');

// Quality separation guard
const ambMisrouted = evaluateAmbiguity({
  subject: p3.subject,
  candidates: [
    { ...cands.value![0], supporting_surface_refs: ['staleness:obvious'] },
  ],
  transition: transStable.value!,
});
assert(!ambMisrouted.ok, 'C.26 staleness tagged surface in ambiguity blocked');

// ═══════════════════════════════════════════════════════════════
// BAND D — Classification, Confidence, Multiplier
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Classification, Confidence, Multiplier ═══');

const p4 = pipeline();

// Green classification
const classification = p4.classification;
assert(classification.primary_regime === L8MacroRegimeClass.RISK_ON,
  'D.01 green primary RISK_ON');
assert(classification.coexistence_class ===
  L8RegimeCoexistenceClass.CLEAN_SINGLE,
  'D.02 green CLEAN_SINGLE');

// Classification before qualities → rejected
const early = classifyRegime({
  subject: p4.subject,
  candidates: p4.candidates,
  transition: p4.transition,
  qualities: [],
  readiness_class: 'COMPLETE_CURRENT',
  had_narrowed_validation_consumption: false,
});
assert(!early.ok, 'D.03 classify without qualities rejected');
assert(early.violations.some(v =>
  v.code === L8RuntimeViolationCode.CLASSIFY_BEFORE_QUALITY),
  'D.04 BEFORE_QUALITY code');

// Illegal coexistence — primary ON + secondary OFF (macro illegal pair)
const pair = [
  { ...p4.candidates[0], regime_class: L8MacroRegimeClass.RISK_ON },
  { ...p4.candidates[0], candidate_id: 'cand:rsub_macro_inv:RISK_OFF',
    regime_class: L8MacroRegimeClass.RISK_OFF,
    candidate_strength_score: 0.75 },
];
const illegalCoex = classifyRegime({
  subject: p4.subject, candidates: pair,
  transition: { ...p4.transition, coexistence_hint: 'PRIMARY_PLUS_SECONDARY' },
  qualities: p4.qualities,
  readiness_class: 'COMPLETE_CURRENT',
  had_narrowed_validation_consumption: false,
});
assert(!illegalCoex.ok, 'D.05 illegal macro pairing rejected');
assert(illegalCoex.violations.some(v =>
  v.code === L8RuntimeViolationCode.CLASSIFY_ILLEGAL_COEXISTENCE),
  'D.06 illegal coexistence code');

// Cross-family primary blocked
const crossPrimary = classifyRegime({
  subject: p4.subject,
  candidates: [
    { ...p4.candidates[0],
      regime_family: L8RegimeFamily.TOKEN_SPECIFIC,
      regime_class: L8TokenRegimeClass.EARLY_ACCUMULATION },
  ],
  transition: p4.transition,
  qualities: p4.qualities,
  readiness_class: 'COMPLETE_CURRENT',
  had_narrowed_validation_consumption: false,
});
assert(!crossPrimary.ok, 'D.07 cross-family primary rejected');
assert(crossPrimary.violations.some(v =>
  v.code === L8RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY),
  'D.08 PRIMARY_NOT_IN_FAMILY code');

// Clean-single with narrowed validation → rejected
const narrowedClassify = classifyRegime({
  subject: p4.subject,
  candidates: p4.candidates,
  transition: p4.transition,
  qualities: p4.qualities,
  readiness_class: 'COMPLETE_CURRENT',
  had_narrowed_validation_consumption: true,
});
assert(!narrowedClassify.ok, 'D.09 narrowed consumption + CLEAN rejected');

// Confidence — green
const confOk = deriveRegimeConfidence({
  subject: p4.subject,
  regime_result_id: p4.output.regime_result_id,
  classification, transition: p4.transition, qualities: p4.qualities,
  consumed_restriction_refs: ['l7:restriction_profile/macro'],
  consumed_contradiction_refs: [],
  had_narrowed_consumption: false,
  historical_reliability_score: 0.8,
  cross_domain_agreement_score: 0.8,
  validation_quality_posture_score: 0.8,
  support_breadth_score: 0.8,
  freshness_score: 0.95,
  compute_run_id: p4.run.regime_run_id,
  trace_id: 't', manifest_id: 'm',
});
assert(confOk.ok, 'D.10 confidence ok');
assert(confOk.value!.confidence_band === L8RegimeConfidenceBand.HIGH ||
  confOk.value!.confidence_band === L8RegimeConfidenceBand.FULL,
  `D.11 green band HIGH or FULL (got ${confOk.value?.confidence_band})`);

// Confidence without required restriction → rejected
const confNoRestriction = deriveRegimeConfidence({
  subject: p4.subject,
  regime_result_id: p4.output.regime_result_id,
  classification, transition: p4.transition, qualities: p4.qualities,
  consumed_restriction_refs: [],
  consumed_contradiction_refs: [],
  had_narrowed_consumption: false,
  historical_reliability_score: 0.8,
  cross_domain_agreement_score: 0.8,
  validation_quality_posture_score: 0.8,
  support_breadth_score: 0.8,
  freshness_score: 0.95,
  compute_run_id: p4.run.regime_run_id,
  trace_id: 't', manifest_id: 'm',
});
assert(!confNoRestriction.ok, 'D.12 confidence without restriction blocked');
assert(confNoRestriction.violations.some(v =>
  v.code === L8RuntimeViolationCode.CONFIDENCE_MISSING_RESTRICTION_REFS),
  'D.13 MISSING_RESTRICTION_REFS code');

// Confidence caps when transition is high
const highTrans = deriveRegimeConfidence({
  subject: p4.subject,
  regime_result_id: p4.output.regime_result_id,
  classification, qualities: p4.qualities,
  transition: { ...p4.transition, transition_risk_score: 0.9,
    instability_reasons: ['MOMENTUM_BREAKING'] },
  consumed_restriction_refs: ['l7:restriction_profile/macro'],
  consumed_contradiction_refs: [],
  had_narrowed_consumption: false,
  historical_reliability_score: 1,
  cross_domain_agreement_score: 1,
  validation_quality_posture_score: 1,
  support_breadth_score: 1,
  freshness_score: 1,
  compute_run_id: p4.run.regime_run_id,
  trace_id: 't', manifest_id: 'm',
});
assert(highTrans.ok &&
  highTrans.value!.confidence_score_capped <= 0.5 + 1e-9,
  'D.14 high transition caps confidence ≤ 0.5');
assert(highTrans.value!.cap_chain.some(c =>
  c.cap_reason === 'TRANSITION_HIGH' && c.applied),
  'D.15 transition cap applied');

// Multiplier — green
const mulOk = deriveRegimeMultiplier({
  subject: p4.subject,
  regime_result_id: p4.output.regime_result_id,
  classification, confidence: confOk.value!,
  transition: p4.transition,
  consumed_restriction_refs: ['l7:restriction_profile/macro'],
  compute_run_id: p4.run.regime_run_id,
  trace_id: 't', manifest_id: 'm',
});
assert(mulOk.ok, 'D.16 multiplier ok');
assert(mulOk.value!.transition_risk_class === L8TransitionRiskClass.STABLE,
  'D.17 transition class on green');
assert(mulOk.value!.regime_confidence_band === L8RegimeConfidenceBand.HIGH ||
  mulOk.value!.regime_confidence_band === L8RegimeConfidenceBand.FULL,
  `D.18 band on green HIGH or FULL (got ${mulOk.value?.regime_confidence_band})`);

// Multiplier without restriction → rejected
const mulNoRestriction = deriveRegimeMultiplier({
  subject: p4.subject,
  regime_result_id: p4.output.regime_result_id,
  classification, confidence: confOk.value!,
  transition: p4.transition,
  consumed_restriction_refs: [],
  compute_run_id: p4.run.regime_run_id,
  trace_id: 't', manifest_id: 'm',
});
assert(!mulNoRestriction.ok, 'D.19 multiplier without restriction blocked');

// ═══════════════════════════════════════════════════════════════
// BAND E — Evidence, Materialization, Replay, Repair, Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Evidence, Materialization, Replay, Repair ═══');

const p5 = pipeline();

// Evidence pack green
const pack = buildRegimeEvidencePack({
  subject: p5.subject,
  regime_result_id: p5.output.regime_result_id,
  candidates: p5.candidates, transition: p5.transition,
  qualities: p5.qualities, classification: p5.classification,
  confidence: p5.confidence, multiplier: p5.multiplier,
  consumed_validation_refs: p5.usableValidationRefs,
  input_snapshot_ref: p5.run.input_snapshot_ref,
  compute_run_lineage: [p5.run.regime_run_id],
});
assert(pack.ok, 'E.01 evidence pack ok');
assert(pack.value!.candidate_refs.length === p5.candidates.length,
  'E.02 candidate refs present');
assert(pack.value!.classification_ref.length > 0,
  'E.03 classification ref present');

// Evidence pack missing quality
const packNoQuality = buildRegimeEvidencePack({
  subject: p5.subject,
  regime_result_id: p5.output.regime_result_id,
  candidates: p5.candidates, transition: p5.transition,
  qualities: [p5.qualities[0]], // only ambiguity
  classification: p5.classification,
  confidence: p5.confidence, multiplier: p5.multiplier,
  consumed_validation_refs: p5.usableValidationRefs,
  input_snapshot_ref: p5.run.input_snapshot_ref,
  compute_run_lineage: [p5.run.regime_run_id],
});
assert(!packNoQuality.ok, 'E.04 missing quality blocked');

// Materialization green
const mat = prepareRegimeMaterialization({
  subject: p5.subject, output: p5.output,
  confidence: p5.confidence, transition: p5.transitionContract,
  multiplier: p5.multiplier,
  l5_route: 'l5:POSTGRES_REGIME_REGISTRY',
  direct_store_target: null,
});
assert(mat.ok, 'E.05 materialization ok');
assert(mat.value!.emissible, 'E.06 plan emissible');

// Direct-store blocked
const matDirect = prepareRegimeMaterialization({
  subject: p5.subject, output: p5.output,
  confidence: p5.confidence, transition: p5.transitionContract,
  multiplier: p5.multiplier,
  l5_route: 'l5:POSTGRES_REGIME_REGISTRY',
  direct_store_target: 'postgres://direct',
});
assert(!matDirect.ok, 'E.07 direct-store blocked');
assert(matDirect.violations.some(v =>
  v.code === L8RuntimeViolationCode.MATERIALIZATION_DIRECT_STORE_WRITE),
  'E.08 DIRECT_STORE code');

// Non-L5 blocked
const matNonL5 = prepareRegimeMaterialization({
  subject: p5.subject, output: p5.output,
  confidence: p5.confidence, transition: p5.transitionContract,
  multiplier: p5.multiplier,
  l5_route: 'redis:shadow',
  direct_store_target: null,
});
assert(!matNonL5.ok, 'E.09 non-L5 route blocked');
assert(matNonL5.violations.some(v =>
  v.code === L8RuntimeViolationCode.MATERIALIZATION_BYPASSES_L5),
  'E.10 BYPASSES_L5 code');

// Replay hash match
const replayRun = { ...p5.run,
  regime_run_id: 'run-replay',
  mode: L8RegimeRunMode.REPLAY, parent_run_id: p5.run.regime_run_id };
const replayedOut = { ...p5.output,
  replay_mode_flag: 'REPLAY' as const,
  compute_run_id: replayRun.regime_run_id };
const replayOk = verifyRegimeReplay({
  replay_run: replayRun,
  original_output: p5.output, replayed_output: replayedOut,
  original_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
  replayed_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
});
assert(replayOk.ok, 'E.11 replay hash match ok');

// Replay hash diverged
const replayDiverged = verifyRegimeReplay({
  replay_run: replayRun,
  original_output: p5.output,
  replayed_output: { ...replayedOut, replay_hash: 'rhash:diverged' },
  original_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
  replayed_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
});
assert(!replayDiverged.ok, 'E.12 replay diverged blocked');
assert(replayDiverged.violations.some(v =>
  v.code === L8RuntimeViolationCode.REPLAY_HASH_DIVERGED),
  'E.13 REPLAY_HASH_DIVERGED code');

// Replay without parent blocked
const replayNoParent = verifyRegimeReplay({
  replay_run: { ...replayRun, parent_run_id: null },
  original_output: p5.output, replayed_output: replayedOut,
  original_evidence_pack_ref: 'pack',
  replayed_evidence_pack_ref: 'pack',
});
assert(!replayNoParent.ok, 'E.14 replay without parent blocked');

// Repair: distinct compute_run_id + REPAIR flag
const repairRun = { ...p5.run,
  regime_run_id: 'run-repair',
  mode: L8RegimeRunMode.REPAIR, parent_run_id: p5.run.regime_run_id,
  repair_reason: 'late-data' };
const repairOutput = { ...p5.output,
  replay_mode_flag: 'REPAIR' as const,
  compute_run_id: repairRun.regime_run_id,
  repair_mode_flag: true };
const repairOk = verifyRegimeRepair({
  repair_run: repairRun,
  original_output: p5.output, repaired_output: repairOutput,
});
assert(repairOk.ok, 'E.15 repair ok');

// Repair reusing run id blocked
const repairReuse = verifyRegimeRepair({
  repair_run: repairRun,
  original_output: p5.output,
  repaired_output: { ...repairOutput,
    compute_run_id: p5.output.compute_run_id },
});
assert(!repairReuse.ok, 'E.16 repair reusing run id blocked');

// Repair unmarked
const repairUnmarked = verifyRegimeRepair({
  repair_run: repairRun,
  original_output: p5.output,
  repaired_output: { ...repairOutput, replay_mode_flag: 'LIVE' },
});
assert(!repairUnmarked.ok, 'E.17 repair unmarked blocked');

// Repair with non-repair mode
const repairWrongMode = verifyRegimeRepair({
  repair_run: { ...repairRun, mode: L8RegimeRunMode.LIVE },
  original_output: p5.output, repaired_output: repairOutput,
});
assert(!repairWrongMode.ok, 'E.18 repair with LIVE run blocked');

// Invariants
const inv = checkAllL84Invariants();
assert(inv.length === 7, 'E.19 7 L8.4 invariants');
for (const r of inv) {
  assert(r.holds, `E.inv.${r.id} ${r.evidence}`);
}
const a1 = checkINV_84_A(); assert(a1.holds, `E.A ${a1.evidence}`);
const b1 = checkINV_84_B(); assert(b1.holds, `E.B ${b1.evidence}`);
const c1 = checkINV_84_C(); assert(c1.holds, `E.C ${c1.evidence}`);
const d1 = checkINV_84_D(); assert(d1.holds, `E.D ${d1.evidence}`);
const e1 = checkINV_84_E(); assert(e1.holds, `E.E ${e1.evidence}`);
const f1 = checkINV_84_F(); assert(f1.holds, `E.F ${f1.evidence}`);
const g1 = checkINV_84_G(); assert(g1.holds, `E.G ${g1.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.4 RUNTIME — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 deterministic runtime green.');
  process.exit(0);
}
