/**
 * L10.4 — Runtime Architecture Certification Test Suite
 *
 * 5 Bands (§10.4.20):
 *   A — DAG topology: node/edge legality, stage monotonicity,
 *       acyclicity, deterministic toposort
 *   B — Engine ownership + input consumption + competition integrity
 *   C — Support/contradiction/confirmation/invalidation resolution
 *   D — Confidence/ranking/spread/shift + evidence pack + materialization
 *   E — Replay / repair adapters + runtime audit + INV-10.4-A..G
 */

import {
  L10DagEdgeClass,
  L10_LEGAL_EDGE_TRANSITIONS,
  isLegalL10Edge,
  buildL10DagEdgeId,
} from '../l10/runtime/hypothesis-dag-edge';
import {
  L10DagNodeClass,
  L10DagStage,
  L10_STAGE_ORDER,
  L10_STAGE_INDEX,
  L10_NODE_CLASS_STAGE,
  L10_CANDIDATE_SCOPED_CLASSES,
  buildL10DagNodeId,
  compareL10NodesDeterministic,
} from '../l10/runtime/hypothesis-dag-node';
import {
  buildL10HypothesisDag,
} from '../l10/runtime/hypothesis-dag-builder';
import { detectL10Cycles } from '../l10/runtime/hypothesis-cycle-detector';
import { l10Toposort } from '../l10/runtime/hypothesis-toposort';
import {
  L10HypothesisRunMode,
  validateL10HypothesisRun,
} from '../l10/runtime/hypothesis-compute-run';
import {
  createL10ExecutionContext,
  sealL10Stage,
  isL10StageSealed,
} from '../l10/runtime/hypothesis-execution-context';

import {
  L10RuntimeViolationCode,
  ALL_L10_RUNTIME_VIOLATION_CODES,
} from '../l10/validation/l10-runtime-violation-codes';
import {
  L10RuntimeViolationSeverity,
  buildL10RuntimeAudit,
  classifyL10ViolationSeverity,
  hasL10BlockingViolations,
} from '../l10/validation/l10-runtime-audit';

import { assembleHypothesisSubject } from '../l10/engine/hypothesis-assembly-engine';
import { generateHypothesisCandidates } from '../l10/engine/hypothesis-candidate-engine';
import { resolveSupportEvidence } from '../l10/engine/support-evidence-resolver';
import { resolveContradictionEvidence } from '../l10/engine/contradiction-evidence-resolver';
import { resolveConfirmationRequirements } from '../l10/engine/confirmation-requirement-engine';
import { resolveInvalidationPosture } from '../l10/engine/invalidation-engine';
import { computeHypothesisConfidence } from '../l10/engine/hypothesis-confidence-engine';
import { rankHypotheses } from '../l10/engine/hypothesis-ranking-engine';
import { analyseSpread } from '../l10/engine/spread-analysis-engine';
import { deriveShiftConditions } from '../l10/engine/shift-condition-engine';
import { buildHypothesisEvidencePack } from '../l10/engine/hypothesis-evidence-pack-builder';
import { materializeHypothesisOutputs } from '../l10/engine/hypothesis-materializer';

import { verifyL10ReplayIdentity } from '../l10/replay/l10-replay-adapter';
import { verifyL10Repair } from '../l10/replay/l10-repair-adapter';

import {
  buildGreenL10_4Run,
  buildGreenL10_4Subject,
  buildGreenL10_4Candidates,
  buildGreenL10_4Restrictions,
  buildGreenL10_4Surfaces,
} from '../l10/invariants/l10_4-green-pipeline';
import {
  runGreenL10_4Pipeline,
  checkAllL10_4Invariants,
} from '../l10/invariants/l10_4-invariants';

const V = L10RuntimeViolationCode;

let passed = 0;
let failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

// ═══════════════════════════════════════════════════════════════
// BAND A — DAG topology
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: DAG topology, stage order, acyclicity ═══');

assert(L10_STAGE_ORDER.length === 13, 'A.01 13 canonical stages');
assert(L10_STAGE_ORDER[0] === L10DagStage.S01_INPUT, 'A.02 first stage INPUT');
assert(L10_STAGE_ORDER[12] === L10DagStage.S13_MATERIALIZATION,
  'A.03 last stage MATERIALIZATION');
assert(L10_STAGE_INDEX[L10DagStage.S09_RANKING] === 8,
  'A.04 RANKING at index 8');

assert(L10_NODE_CLASS_STAGE[L10DagNodeClass.CANDIDATE_NODE] ===
  L10DagStage.S03_CANDIDATE, 'A.05 CANDIDATE_NODE maps to S03');
assert(L10_CANDIDATE_SCOPED_CLASSES.has(L10DagNodeClass.SUPPORT_NODE),
  'A.06 SUPPORT_NODE candidate-scoped');
assert(!L10_CANDIDATE_SCOPED_CLASSES.has(L10DagNodeClass.RANKING_NODE),
  'A.07 RANKING_NODE subject-scoped');

assert(isLegalL10Edge(
  L10DagEdgeClass.INPUT_TO_SUBJECT,
  L10DagNodeClass.INPUT_NODE, L10DagNodeClass.SUBJECT_NODE,
), 'A.08 legal edge INPUT→SUBJECT');
assert(!isLegalL10Edge(
  L10DagEdgeClass.INPUT_TO_SUBJECT,
  L10DagNodeClass.SUBJECT_NODE, L10DagNodeClass.INPUT_NODE,
), 'A.09 reverse INPUT→SUBJECT rejected');
assert(!isLegalL10Edge(
  L10DagEdgeClass.CONFIDENCE_TO_RANKING,
  L10DagNodeClass.CANDIDATE_NODE, L10DagNodeClass.RANKING_NODE,
), 'A.10 wrong source class rejected');

assert(L10_LEGAL_EDGE_TRANSITIONS[L10DagEdgeClass.RANKING_TO_SPREAD].length > 0,
  'A.11 RANKING_TO_SPREAD has legal transitions');

// Deterministic ids + stable compare
const nid1 = buildL10DagNodeId({
  node_class: L10DagNodeClass.CANDIDATE_NODE,
  hypothesis_run_id: 'L10R-RUN-0001',
  hypothesis_subject_id: 's1',
  scope_type: 'TOKEN',
  scope_id: 'eth',
  hypothesis_candidate_id: 'c1',
});
const nid1b = buildL10DagNodeId({
  node_class: L10DagNodeClass.CANDIDATE_NODE,
  hypothesis_run_id: 'L10R-RUN-0001',
  hypothesis_subject_id: 's1',
  scope_type: 'TOKEN',
  scope_id: 'eth',
  hypothesis_candidate_id: 'c1',
});
assert(nid1 === nid1b, 'A.12 node id is deterministic');

const eid = buildL10DagEdgeId(
  L10DagEdgeClass.INPUT_TO_SUBJECT, 'n-a', 'n-b',
);
assert(eid.includes('INPUT_TO_SUBJECT'), 'A.13 edge id embeds edge class');

const compareStable = compareL10NodesDeterministic(
  { stage: L10DagStage.S01_INPUT, node_id: 'n-2' } as any,
  { stage: L10DagStage.S01_INPUT, node_id: 'n-1' } as any,
);
assert(compareStable > 0, 'A.14 tie-break stable on node_id');

// End-to-end DAG build using green topology (mirrors INV-10.4-A)
const inv = checkAllL10_4Invariants();
const invA = inv.find(r => r.id === 'INV-10.4-A')!;
assert(invA.holds, `A.15 DAG build + toposort + cycle — ${invA.evidence}`);

// Cycle detection explicit
const cycles = detectL10Cycles(
  ['X', 'Y', 'Z'],
  [
    { edge_id: 'e1', edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT,
      from_node_id: 'X', to_node_id: 'Y' },
    { edge_id: 'e2', edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT,
      from_node_id: 'Y', to_node_id: 'Z' },
    { edge_id: 'e3', edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT,
      from_node_id: 'Z', to_node_id: 'X' },
  ],
);
assert(!cycles.acyclic && cycles.cycles.length > 0,
  'A.16 back-edge cycle detected');

// Toposort deterministic with ties
const nodes = [
  { node_id: 'b', stage: L10DagStage.S01_INPUT },
  { node_id: 'a', stage: L10DagStage.S01_INPUT },
];
const sorted1 = l10Toposort(nodes as any, []);
const sorted2 = l10Toposort(nodes as any, []);
assert(JSON.stringify(sorted1) === JSON.stringify(sorted2),
  'A.17 toposort deterministic across runs');

// Stage jumps rejected: candidate → materialization without intermediate stages
const jump = buildL10HypothesisDag('L10R-RUN-0001', {
  nodeSpecs: [
    { node_class: L10DagNodeClass.INPUT_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'input', engine_version: '1' },
    { node_class: L10DagNodeClass.MATERIALIZATION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'materializer', engine_version: '1' },
  ],
  edgeSpecs: [
    { edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT, from_index: 0, to_index: 1 },
  ],
});
assert(!jump.ok && jump.violations.some(
  v => v.code === V.DAG_ILLEGAL_EDGE_TRANSITION ||
       v.code === V.DAG_ILLEGAL_EDGE_CLASS,
), 'A.18 stage jump rejected as illegal transition');

// ═══════════════════════════════════════════════════════════════
// BAND B — Engine ownership, compute-run, input consumption
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Run lineage, ownership, input consumption ═══');

const greenRun = buildGreenL10_4Run();
const runOk = validateL10HypothesisRun(greenRun);
assert(runOk.valid, 'B.01 green run is valid');

const noIdRun = validateL10HypothesisRun({
  ...greenRun, hypothesis_run_id: '',
});
assert(!noIdRun.valid && noIdRun.issues.some(i => i.code === V.RUN_LINEAGE_MISSING),
  'B.02 missing run id rejected');

const replayNoParent = validateL10HypothesisRun({
  ...greenRun, mode: L10HypothesisRunMode.REPLAY, parent_run_id: null,
});
assert(!replayNoParent.valid && replayNoParent.issues.some(
  i => i.code === V.RUN_PARENT_REQUIRED),
  'B.03 REPLAY without parent rejected');

const repairNoParent = validateL10HypothesisRun({
  ...greenRun, mode: L10HypothesisRunMode.REPAIR,
  parent_run_id: null, repair_reason: 'x',
});
assert(!repairNoParent.valid && repairNoParent.issues.some(
  i => i.code === V.RUN_PARENT_REQUIRED),
  'B.04 REPAIR without parent rejected');

const missingTemplates = validateL10HypothesisRun({
  ...greenRun, template_version_set: {},
});
assert(!missingTemplates.valid && missingTemplates.issues.some(
  i => i.code === V.RUN_TEMPLATE_SET_INCOMPLETE),
  'B.05 empty template set rejected');

// Execution context stage seal
const ctx = createL10ExecutionContext(greenRun);
assert(!isL10StageSealed(ctx, L10DagStage.S09_RANKING),
  'B.06 stage unsealed initially');
sealL10Stage(ctx, L10DagStage.S09_RANKING);
assert(isL10StageSealed(ctx, L10DagStage.S09_RANKING),
  'B.07 stage seal persists');

// Assembly — green pipeline path
const subject = buildGreenL10_4Subject();
const surfaces = buildGreenL10_4Surfaces();
const asm = assembleHypothesisSubject({
  subject, surface_availability: surfaces.availability,
  trace_id: 'T-0001', manifest_id: 'M-0001',
  admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
});
assert(asm.ok && asm.value !== null, 'B.08 green subject assembles');

// Missing required inputs rejected
const missingInputs = assembleHypothesisSubject({
  subject,
  surface_availability: [
    { ref: 'r1', available: true, family: 'L8_REGIME' },
    { ref: 's1', available: true, family: 'L9_SEQUENCE' },
    { ref: 'f1', available: true, family: 'L6_FEATURE' },
    { ref: 'e1', available: true, family: 'L6_EVENT' },
    // v1 L7_VALIDATION missing entirely
  ],
  trace_id: 'T-0001', manifest_id: 'M-0001',
  admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
});
assert(!missingInputs.ok && missingInputs.violations.some(
  v => v.code === V.ASSEMBLY_MISSING_REQUIRED_INPUTS),
  'B.09 missing required inputs rejected at assembly');

// Judgment leak in subject description
const leaky = assembleHypothesisSubject({
  subject: {
    ...subject,
    description: 'This token is a buy recommendation.',
  },
  surface_availability: surfaces.availability,
  trace_id: 'T-0001', manifest_id: 'M-0001',
  admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
});
assert(!leaky.ok && leaky.violations.some(
  v => v.code === V.ASSEMBLY_JUDGMENT_LEAK),
  'B.10 subject description leak rejected');

// Candidate generation — green
const candidates = buildGreenL10_4Candidates();
const gen = generateHypothesisCandidates({
  subject,
  subject_instance: asm.value!,
  candidate_contracts: candidates,
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(gen.ok && gen.value!.candidates.length === 2,
  'B.11 green candidate generation yields 2 instances');

// Single-story collapse rejected
const solo = generateHypothesisCandidates({
  subject,
  subject_instance: asm.value!,
  candidate_contracts: [candidates[0]],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(!solo.ok && solo.violations.some(
  v => v.code === V.CANDIDATE_SINGLE_STORY_COLLAPSE ||
       v.code === V.CANDIDATE_MIN_COUNT_UNMET),
  'B.12 single-story collapse rejected');

// Pre-selected primary rejected
const preSel = generateHypothesisCandidates({
  subject,
  subject_instance: asm.value!,
  candidate_contracts: [
    { ...candidates[0], candidate_class: 'PRIMARY_CANDIDATE' }, candidates[1],
  ],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(!preSel.ok && preSel.violations.some(
  v => v.code === V.CANDIDATE_PRE_SELECTED_PRIMARY),
  'B.13 pre-selected primary rejected');

// Duplicate candidate id rejected
const dup = generateHypothesisCandidates({
  subject,
  subject_instance: asm.value!,
  candidate_contracts: [candidates[0], candidates[0]],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(!dup.ok && dup.violations.some(
  v => v.code === V.CANDIDATE_DUPLICATE_ID),
  'B.14 duplicate candidate id rejected');

// ═══════════════════════════════════════════════════════════════
// BAND C — Support / contradiction / confirmation / invalidation
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Evidence resolvers ═══');

const cand0 = candidates[0];
const sup = resolveSupportEvidence({
  candidate: cand0,
  observations: [
    { ref: 's-1', domain: 'structural', is_stale: false, is_degraded: false },
    { ref: 's-2', domain: 'structural', is_stale: true, is_degraded: false },
    { ref: 's-3', domain: 'structural', is_stale: false, is_degraded: true },
  ],
  required_refs: [],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(sup.ok && sup.value!.stale_support_refs.length === 1 &&
  sup.value!.degraded_support_refs.length === 1 &&
  sup.value!.supporting_refs.length === 1,
  'C.01 stale/degraded routed to separate lists');
assert(sup.ok && sup.value!.support_strength_score < 1,
  'C.02 support_strength_score < 1 when stale/degraded present');

const supMiss = resolveSupportEvidence({
  candidate: cand0,
  observations: [
    { ref: 's-x', domain: 'structural', is_stale: true, is_degraded: false },
  ],
  required_refs: [],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(!supMiss.ok && supMiss.violations.some(
  v => v.code === V.SUPPORT_MISSING_REQUIRED),
  'C.03 stale-only observations rejected as missing');

const con = resolveContradictionEvidence({
  candidate: cand0,
  observations: [
    { ref: 'con-1', domain: 'structural', severity: 'BLOCKING',
      temporal_class: 'ACTIVE', direct: true },
    { ref: 'con-2', domain: 'structural', severity: 'NARROWING',
      temporal_class: 'ACTIVE', direct: true },
    { ref: 'con-3', domain: 'structural', severity: 'WEAK',
      temporal_class: 'DECAYED', direct: false },
  ],
  l7_posture_refs: ['p1'],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(con.ok &&
  con.value!.blocking_contradiction_refs.includes('con-1') &&
  con.value!.narrowing_contradiction_refs.includes('con-2') &&
  con.value!.decayed_contradiction_refs.includes('con-3'),
  'C.04 contradictions classified by severity + temporal');

assert(con.ok && con.value!.contradiction_pressure_score > 0,
  'C.05 contradiction pressure > 0 when blocking/narrowing present');

const conPostureButEmpty = resolveContradictionEvidence({
  candidate: cand0,
  observations: [],
  l7_posture_refs: ['p1'],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(!conPostureButEmpty.ok && conPostureButEmpty.violations.some(
  v => v.code === V.CONTRADICTION_OMITTED_BUT_PRESENT),
  'C.06 L7 posture present but no resolved contradictions rejected');

const conf = resolveConfirmationRequirements({
  candidate: cand0,
  observations: [
    { required_pattern_id: 'cn-acc-1', present_ref: null },
  ],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(conf.ok && conf.value!.missing_confirmation_refs.length === 1 &&
  conf.value!.confirmation_gap_score > 0,
  'C.07 missing confirmation raises gap score');

const invRes = resolveInvalidationPosture({
  candidate: cand0,
  observations: [
    { ref: 'inv-1', class: 'ACTIVE' },
    { ref: 'inv-2', class: 'POTENTIAL' },
  ],
  trace_id: 'T-0001', manifest_id: 'M-0001',
});
assert(invRes.ok && invRes.value!.active_invalidation_refs.length === 1 &&
  invRes.value!.potential_invalidation_refs.length === 1,
  'C.08 active vs potential split');
assert(invRes.ok && invRes.value!.invalidation_risk_class !== 'UNRESOLVED',
  'C.09 invalidation_risk_class derived from signals');

// ═══════════════════════════════════════════════════════════════
// BAND D — Confidence, ranking, spread, shift, evidence pack, materializer
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Confidence / ranking / spread / shift / materialize ═══');

const green = runGreenL10_4Pipeline();
assert(green.candidates.length === 2, 'D.01 green pipeline has 2 candidates');
assert(green.ranking.ordered_hypothesis_refs.length === 2,
  'D.02 ranking emits full ordered set');
assert(green.ranking.primary_hypothesis_ref !== green.ranking.secondary_hypothesis_ref,
  'D.03 primary ≠ secondary');
assert(green.outputs.length === 2, 'D.04 materializer emits one output per candidate');

// Confidence — contradiction-ignoring case
const contraIgnoreConf = computeHypothesisConfidence({
  candidate: {
    hypothesis_candidate_instance_id: 'x', hypothesis_subject_id: 's',
    hypothesis_candidate_id: 'c1', hypothesis_family: 'F', hypothesis_template_id: 'T',
    template_version: '1', hypothesis_name: 'n', candidate_class: 'ALT',
    as_of: '2026-01-01T00:00:00.000Z',
  } as any,
  support: {
    support_set_id: 'ss', hypothesis_subject_id: 's', hypothesis_candidate_id: 'c1',
    supporting_refs: ['a'], support_domains: ['x'],
    support_strength_score: 0.99, support_coverage_score: 1,
    stale_support_refs: [], degraded_support_refs: [],
    missing_expected_refs: [],
    lineage_refs: { trace_id: 't', manifest_id: 'm', upstream_refs: [] },
  },
  contradiction: {
    contradiction_set_id: 'cs', hypothesis_subject_id: 's', hypothesis_candidate_id: 'c1',
    contradiction_refs: ['n1'], contradiction_domains: ['x'],
    blocking_contradiction_refs: [], narrowing_contradiction_refs: ['n1'],
    decayed_contradiction_refs: [],
    contradiction_pressure_score: 0.4,
    lineage_refs: { trace_id: 't', manifest_id: 'm', upstream_refs: [] },
  },
  confirmation: {
    confirmation_set_id: 'cn', hypothesis_subject_id: 's', hypothesis_candidate_id: 'c1',
    required_confirmation_refs: [], present_confirmation_refs: [],
    missing_confirmation_refs: [], confirmation_gap_score: 0,
    lineage_refs: { trace_id: 't', manifest_id: 'm', upstream_refs: [] },
  },
  invalidation: {
    invalidation_set_id: 'iv', hypothesis_subject_id: 's', hypothesis_candidate_id: 'c1',
    invalidation_signal_refs: [],
    active_invalidation_refs: [], potential_invalidation_refs: [],
    invalidation_risk_score: 0, invalidation_risk_class: 'LOW',
    lineage_refs: { trace_id: 't', manifest_id: 'm', upstream_refs: [] },
  },
  lower_layer: { l7_confidence_score: 1, l7_restriction_band: 'FULL',
    l8_regime_stable: true, l9_sequence_intact: true },
  trace_id: 't', manifest_id: 'm',
});
assert(!contraIgnoreConf.ok && contraIgnoreConf.violations.some(
  v => v.code === V.CONFIDENCE_IGNORES_CONTRADICTION),
  'D.05 near-perfect support + nonzero pressure rejected');

// Ranking — ranking owns primary/secondary (already tested in INV-10.4-B)
const invB = inv.find(r => r.id === 'INV-10.4-B')!;
assert(invB.holds, `D.06 exclusive ownership (ranking/spread/materializer) — ${invB.evidence}`);

// Spread — deterministic
const spreadA = analyseSpread({
  ranking: green.ranking,
  confidences: green.confidences,
  close_spread_threshold: subject.competition_policy.close_spread_threshold,
});
const spreadB = analyseSpread({
  ranking: green.ranking,
  confidences: green.confidences,
  close_spread_threshold: subject.competition_policy.close_spread_threshold,
});
assert(spreadA.ok && spreadB.ok &&
  spreadA.value!.confidence_spread === spreadB.value!.confidence_spread,
  'D.07 spread output is deterministic');

// Shift — force narrow ranking by building tight confidences and
// routing them through the ranking engine first (so the ranking
// and spread outputs agree).
const tightConfidenceCandidates = [...green.confidences.entries()];
if (tightConfidenceCandidates.length >= 2) {
  const [[id1, c1], [id2, c2]] = tightConfidenceCandidates;
  const tight = new Map([
    [id1, { ...c1, hypothesis_confidence_score: 0.7 }],
    [id2, { ...c2, hypothesis_confidence_score: 0.66 }],
  ]);
  const tightRank = rankHypotheses({
    hypothesis_subject_id: subject.hypothesis_subject_id,
    candidates: green.candidates,
    confidences: tight,
    contradictions: green.contradictions,
    restriction_narrowed_refs: [],
    close_spread_threshold: 0.15,
  });
  const tightSpread = tightRank.ok && tightRank.value ? analyseSpread({
    ranking: tightRank.value,
    confidences: tight,
    close_spread_threshold: 0.15,
  }) : null;
  assert(tightSpread !== null && tightSpread.ok &&
    tightSpread.value!.narrow_spread_flag,
    'D.08 narrow spread flagged when delta < threshold');
}

// Evidence pack lineage
assert(green.pack.replay_hash.length > 0 &&
  green.pack.compute_run_lineage.length > 0,
  'D.09 evidence pack has replay_hash + run lineage');

// Materialization — output contracts carry ranking + spread refs
for (const o of green.outputs) {
  assert(o.ranking_ref === green.ranking.ranking_id,
    'D.10 output ranking_ref matches runtime ranking');
  assert(o.spread_profile_ref === green.spread.spread_profile_id,
    'D.11 output spread_profile_ref matches runtime spread');
}

// ═══════════════════════════════════════════════════════════════
// BAND E — Replay, repair, runtime audit, INV-10.4-A..G
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Replay / repair / audit / invariants ═══');

// Replay identity
const replayOk = verifyL10ReplayIdentity(green.outputs, green.outputs);
assert(replayOk.ok, 'E.01 identical replay passes');

const drifted = verifyL10ReplayIdentity(
  green.outputs,
  green.outputs.map(o => ({ ...o, replay_hash: 'rh:DRIFT' })),
);
assert(!drifted.ok && drifted.violations.some(
  v => v.code === V.REPLAY_HASH_DIVERGED),
  'E.02 replay hash divergence caught');

const invented = verifyL10ReplayIdentity(
  green.outputs,
  [...green.outputs,
   { ...green.outputs[0], hypothesis_candidate_id: 'INVENTED' }],
);
assert(!invented.ok && invented.violations.some(
  v => v.code === V.REPLAY_INVENTED_CANDIDATE),
  'E.03 invented candidate caught');

const erased = verifyL10ReplayIdentity(green.outputs, [green.outputs[0]]);
assert(!erased.ok && erased.violations.some(
  v => v.code === V.REPLAY_ERASED_ALTERNATIVE),
  'E.04 erased alternative caught');

// Repair
const priorRun = buildGreenL10_4Run();
const repairRun = {
  ...priorRun,
  hypothesis_run_id: 'L10R-RUN-0002',
  mode: L10HypothesisRunMode.REPAIR,
  parent_run_id: priorRun.hypothesis_run_id,
  repair_reason: 'bugfix-123',
};
const markRepair = (o: typeof green.outputs[number]) =>
  ({ ...o, repair_mode_flag: true, replay_mode_flag: 'REPAIR' } as any);

const repairOk = verifyL10Repair(priorRun, repairRun, green.outputs,
  green.outputs.map(markRepair));
assert(repairOk.ok,
  `E.05 marked repair with identical outputs passes` +
  (repairOk.ok ? '' : ' — ' +
    repairOk.violations.map(x => x.code).join(',')));

const unmarked = verifyL10Repair(priorRun, repairRun, green.outputs, green.outputs);
assert(!unmarked.ok && unmarked.violations.some(
  v => v.code === V.REPAIR_UNMARKED ||
       v.code === V.REPAIR_LIVE_MASQUERADE),
  'E.06 unmarked repair outputs rejected');

const noReason = verifyL10Repair(
  priorRun, { ...repairRun, repair_reason: null },
  green.outputs,
  green.outputs.map(markRepair),
);
assert(!noReason.ok && noReason.violations.some(
  v => v.code === V.REPAIR_REASON_MISSING),
  'E.07 missing repair reason rejected');

const noParent = verifyL10Repair(
  priorRun, { ...repairRun, parent_run_id: null },
  green.outputs,
  green.outputs.map(markRepair),
);
assert(!noParent.ok && noParent.violations.some(
  v => v.code === V.REPAIR_LINEAGE_BROKEN),
  'E.08 repair without parent rejected');

// Runtime audit severity classification
assert(classifyL10ViolationSeverity(V.DAG_CYCLE_DETECTED) ===
  L10RuntimeViolationSeverity.CRITICAL,
  'E.09 DAG_CYCLE_DETECTED is CRITICAL');
assert(classifyL10ViolationSeverity(V.SUPPORT_STALE_AS_CLEAN) ===
  L10RuntimeViolationSeverity.WARNING,
  'E.10 SUPPORT_STALE_AS_CLEAN is WARNING');
assert(classifyL10ViolationSeverity(V.CONFIRMATION_NO_GAP_SCORE) ===
  L10RuntimeViolationSeverity.ERROR,
  'E.11 CONFIRMATION_NO_GAP_SCORE is ERROR');

const mixReport = buildL10RuntimeAudit([
  { code: V.DAG_CYCLE_DETECTED, source: 'DagBuilder', nodeId: null,
    hypothesis_run_id: 'r', hypothesis_subject_id: 's',
    hypothesis_candidate_id: null, detail: 'x', context: {} },
  { code: V.SUPPORT_STALE_AS_CLEAN, source: 'SupportResolver', nodeId: null,
    hypothesis_run_id: 'r', hypothesis_subject_id: 's',
    hypothesis_candidate_id: 'c', detail: 'x', context: {} },
]);
assert(mixReport.total === 2 &&
  mixReport.highest_severity === L10RuntimeViolationSeverity.CRITICAL,
  'E.12 runtime audit aggregates severity');
assert(hasL10BlockingViolations(mixReport), 'E.13 audit flags blocking');

assert(ALL_L10_RUNTIME_VIOLATION_CODES.length > 60,
  'E.14 runtime violation code enumeration complete');

// All seven invariants (INV-10.4-A..G)
for (const r of inv) {
  assert(r.holds, `E.${15 + inv.indexOf(r)} ${r.id} — ${r.evidence}`);
}

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`L10.4 certification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
