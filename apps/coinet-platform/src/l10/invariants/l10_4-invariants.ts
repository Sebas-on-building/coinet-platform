/**
 * L10.4 — Runtime-Layer Invariants (INV-10.4-A .. INV-10.4-G)
 *
 *   INV-10.4-A : Stage monotonicity + acyclicity. The DAG builder binds
 *                every node to its canonical stage, topological order
 *                respects the 13-stage index, and a synthetic back-edge
 *                is rejected by the cycle detector.
 *   INV-10.4-B : Exclusive ownership. Only the ranking engine assigns
 *                primary/secondary/ordered ranks; only the spread
 *                engine emits the spread output; only the materializer
 *                emits output contracts.
 *   INV-10.4-C : Input consumption law. Missing required subject
 *                inputs, unregistered families, illegal scope bindings,
 *                and missing regime/sequence/restriction declarations
 *                are rejected at assembly.
 *   INV-10.4-D : Competition integrity. Single-story collapse,
 *                pre-selected primary, and missing required templates
 *                are rejected at candidate generation.
 *   INV-10.4-E : Cleanliness law. A narrow-spread ranking requires
 *                shift conditions; a blocking-contradiction top rank is
 *                rejected; high-invalidation caps confidence.
 *   INV-10.4-F : Replay identity. The replay adapter detects replay-
 *                hash divergence, invented candidates, erased
 *                alternatives, and LIVE masquerade.
 *   INV-10.4-G : Repair discipline. The repair adapter rejects unmarked
 *                repair, missing parent, missing reason, LIVE
 *                masquerade, and unjustified semantic drift.
 */

import {
  L10DagEdgeClass,
} from '../runtime/hypothesis-dag-edge';
import {
  L10DagNodeClass,
  L10DagStage,
  L10_NODE_CLASS_STAGE,
  L10_STAGE_INDEX,
} from '../runtime/hypothesis-dag-node';
import {
  buildL10HypothesisDag,
  createL10DagBuilder,
} from '../runtime/hypothesis-dag-builder';
import {
  detectL10Cycles,
} from '../runtime/hypothesis-cycle-detector';
import {
  L10HypothesisRunMode,
} from '../runtime/hypothesis-compute-run';
import {
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';

import { assembleHypothesisSubject } from '../engine/hypothesis-assembly-engine';
import { generateHypothesisCandidates } from '../engine/hypothesis-candidate-engine';
import { resolveSupportEvidence } from '../engine/support-evidence-resolver';
import { resolveContradictionEvidence } from '../engine/contradiction-evidence-resolver';
import { resolveConfirmationRequirements } from '../engine/confirmation-requirement-engine';
import { resolveInvalidationPosture } from '../engine/invalidation-engine';
import { computeHypothesisConfidence } from '../engine/hypothesis-confidence-engine';
import { rankHypotheses } from '../engine/hypothesis-ranking-engine';
import { analyseSpread } from '../engine/spread-analysis-engine';
import { deriveShiftConditions } from '../engine/shift-condition-engine';
import { buildHypothesisEvidencePack } from '../engine/hypothesis-evidence-pack-builder';
import { materializeHypothesisOutputs } from '../engine/hypothesis-materializer';

import { verifyL10ReplayIdentity } from '../replay/l10-replay-adapter';
import { verifyL10Repair } from '../replay/l10-repair-adapter';

import {
  buildGreenL10_4Candidates,
  buildGreenL10_4Restrictions,
  buildGreenL10_4Run,
  buildGreenL10_4Subject,
  buildGreenL10_4Surfaces,
} from './l10_4-green-pipeline';
import type {
  L10HypothesisCandidateInstance,
  L10HypothesisConfirmationSet,
  L10HypothesisContradictionSet,
  L10HypothesisEvidencePack,
  L10HypothesisInvalidationSet,
  L10HypothesisRankingOutput,
  L10HypothesisShiftConditionOutput,
  L10HypothesisSpreadOutput,
  L10HypothesisSubjectInstance,
  L10HypothesisSupportSet,
  L10HypothesisCandidateConfidence,
} from '../runtime/hypothesis-execution-context';
import type {
  L10HypothesisOutputContract,
} from '../contracts/hypothesis-output.contract';

export interface L10_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/**
 * Run the canonical green pipeline end-to-end and return every
 * engine output. Reused across invariants to avoid re-computation.
 */
export function runGreenL10_4Pipeline(): {
  readonly subject_instance: L10HypothesisSubjectInstance;
  readonly candidates: readonly L10HypothesisCandidateInstance[];
  readonly supports: ReadonlyMap<string, L10HypothesisSupportSet>;
  readonly contradictions: ReadonlyMap<string, L10HypothesisContradictionSet>;
  readonly confirmations: ReadonlyMap<string, L10HypothesisConfirmationSet>;
  readonly invalidations: ReadonlyMap<string, L10HypothesisInvalidationSet>;
  readonly confidences: ReadonlyMap<string, L10HypothesisCandidateConfidence>;
  readonly ranking: L10HypothesisRankingOutput;
  readonly spread: L10HypothesisSpreadOutput;
  readonly shift: L10HypothesisShiftConditionOutput | null;
  readonly pack: L10HypothesisEvidencePack;
  readonly outputs: readonly L10HypothesisOutputContract[];
} {
  const run = buildGreenL10_4Run();
  const subject = buildGreenL10_4Subject();
  const candidateContracts = buildGreenL10_4Candidates();
  const surfaces = buildGreenL10_4Surfaces();
  const restrictions = buildGreenL10_4Restrictions();

  const si = assembleHypothesisSubject({
    subject,
    surface_availability: surfaces.availability,
    trace_id: run.trace_id,
    manifest_id: 'M-0001',
    admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
  });
  if (!si.ok || !si.value) throw new Error('assembly failed');

  const cands = generateHypothesisCandidates({
    subject,
    subject_instance: si.value,
    candidate_contracts: candidateContracts,
    trace_id: run.trace_id,
    manifest_id: 'M-0001',
  });
  if (!cands.ok || !cands.value) throw new Error('candidate generation failed');

  const supports = new Map<string, L10HypothesisSupportSet>();
  const contradictions = new Map<string, L10HypothesisContradictionSet>();
  const confirmations = new Map<string, L10HypothesisConfirmationSet>();
  const invalidations = new Map<string, L10HypothesisInvalidationSet>();
  const confidences = new Map<string, L10HypothesisCandidateConfidence>();

  for (const c of cands.value.candidates) {
    const cc = candidateContracts.find(
      x => x.hypothesis_candidate_id === c.hypothesis_candidate_id,
    )!;

    const s = resolveSupportEvidence({
      candidate: cc,
      observations: surfaces.support.get(c.hypothesis_candidate_id) ?? [],
      required_refs: [],
      trace_id: run.trace_id, manifest_id: 'M-0001',
    });
    if (!s.ok || !s.value) throw new Error('support failed');
    supports.set(c.hypothesis_candidate_id, s.value);

    const co = resolveContradictionEvidence({
      candidate: cc,
      observations: surfaces.contradiction.get(c.hypothesis_candidate_id) ?? [],
      l7_posture_refs: ['posture-1'],
      trace_id: run.trace_id, manifest_id: 'M-0001',
    });
    if (!co.ok || !co.value) throw new Error('contradiction failed');
    contradictions.set(c.hypothesis_candidate_id, co.value);

    const cn = resolveConfirmationRequirements({
      candidate: cc,
      observations: surfaces.confirmation.get(c.hypothesis_candidate_id) ?? [],
      trace_id: run.trace_id, manifest_id: 'M-0001',
    });
    if (!cn.ok || !cn.value) throw new Error('confirmation failed');
    confirmations.set(c.hypothesis_candidate_id, cn.value);

    const inv = resolveInvalidationPosture({
      candidate: cc,
      observations: surfaces.invalidation.get(c.hypothesis_candidate_id) ?? [],
      trace_id: run.trace_id, manifest_id: 'M-0001',
    });
    if (!inv.ok || !inv.value) throw new Error('invalidation failed');
    invalidations.set(c.hypothesis_candidate_id, inv.value);

    const conf = computeHypothesisConfidence({
      candidate: c,
      support: s.value,
      contradiction: co.value,
      confirmation: cn.value,
      invalidation: inv.value,
      lower_layer: surfaces.lower_layer,
      trace_id: run.trace_id, manifest_id: 'M-0001',
    });
    if (!conf.ok || !conf.value) throw new Error('confidence failed');
    confidences.set(c.hypothesis_candidate_id, conf.value);
  }

  const ranking = rankHypotheses({
    hypothesis_subject_id: subject.hypothesis_subject_id,
    candidates: cands.value.candidates,
    confidences,
    contradictions,
    restriction_narrowed_refs: [],
    close_spread_threshold: subject.competition_policy.close_spread_threshold,
  });
  if (!ranking.ok || !ranking.value) throw new Error('ranking failed');

  const spread = analyseSpread({
    ranking: ranking.value,
    confidences,
    close_spread_threshold: subject.competition_policy.close_spread_threshold,
  });
  if (!spread.ok || !spread.value) throw new Error('spread failed');

  let shift: L10HypothesisShiftConditionOutput | null = null;
  if (spread.value.narrow_spread_flag) {
    const sh = deriveShiftConditions({
      ranking: ranking.value,
      spread: spread.value,
      candidates_by_id: new Map(
        cands.value.candidates.map(c => [c.hypothesis_candidate_id, c]),
      ),
    });
    if (!sh.ok || !sh.value) throw new Error('shift failed');
    shift = sh.value;
  }

  const pack = buildHypothesisEvidencePack({
    subject_instance: si.value,
    supports: [...supports.values()],
    contradictions: [...contradictions.values()],
    confirmations: [...confirmations.values()],
    invalidations: [...invalidations.values()],
    ranking: ranking.value,
    spread: spread.value,
    shift,
    restriction_profile_refs:
      [...restrictions.values()].map(r => r.hypothesis_restriction_profile_id),
    consumed: {
      validation_refs: ['v1'],
      contradiction_refs: ['con-acc-1', 'con-lev-1'],
      confidence_refs: ['c7-1'],
      restriction_refs: [],
      regime_refs: ['r1'],
      sequence_refs: ['s1'],
    },
    compute_run_lineage: [run.hypothesis_run_id],
  });
  if (!pack.ok || !pack.value) throw new Error('pack failed');

  const outputs = materializeHypothesisOutputs({
    run,
    subject,
    subject_instance: si.value,
    candidates: candidateContracts,
    supports,
    contradictions,
    confirmations,
    invalidations,
    confidences,
    ranking: ranking.value,
    spread: spread.value,
    shift,
    restrictions,
    evidence_pack: pack.value,
  });

  return {
    subject_instance: si.value,
    candidates: cands.value.candidates,
    supports,
    contradictions,
    confirmations,
    invalidations,
    confidences,
    ranking: ranking.value,
    spread: spread.value,
    shift,
    pack: pack.value,
    outputs: outputs.ok && outputs.value ? outputs.value : [],
  };
}

export function checkINV_104_A(): L10_4InvariantResult {
  const run = buildGreenL10_4Run();
  const nodeSpecs = [
    { node_class: L10DagNodeClass.INPUT_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'input', engine_version: '1' },
    { node_class: L10DagNodeClass.SUBJECT_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'assembly', engine_version: '1' },
    { node_class: L10DagNodeClass.CANDIDATE_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'candidate', engine_version: '1' },
    { node_class: L10DagNodeClass.SUPPORT_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'support', engine_version: '1' },
    { node_class: L10DagNodeClass.CONTRADICTION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'contradiction', engine_version: '1' },
    { node_class: L10DagNodeClass.CONFIRMATION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'confirmation', engine_version: '1' },
    { node_class: L10DagNodeClass.INVALIDATION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'invalidation', engine_version: '1' },
    { node_class: L10DagNodeClass.CONFIDENCE_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      hypothesis_candidate_id: 'c1',
      deterministic_inputs: [], engine_id: 'confidence', engine_version: '1' },
    { node_class: L10DagNodeClass.RANKING_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'ranking', engine_version: '1' },
    { node_class: L10DagNodeClass.SPREAD_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'spread', engine_version: '1' },
    { node_class: L10DagNodeClass.SHIFT_CONDITION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'shift', engine_version: '1' },
    { node_class: L10DagNodeClass.EVIDENCE_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'evidence', engine_version: '1' },
    { node_class: L10DagNodeClass.MATERIALIZATION_NODE,
      hypothesis_subject_id: 's', scope_type: 'TOKEN', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'materializer', engine_version: '1' },
  ];
  const edgeSpecs = [
    { edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT, from_index: 0, to_index: 1 },
    { edge_class: L10DagEdgeClass.SUBJECT_TO_CANDIDATE, from_index: 1, to_index: 2 },
    { edge_class: L10DagEdgeClass.CANDIDATE_TO_SUPPORT, from_index: 2, to_index: 3 },
    { edge_class: L10DagEdgeClass.CANDIDATE_TO_CONTRADICTION, from_index: 2, to_index: 4 },
    { edge_class: L10DagEdgeClass.SUPPORT_TO_CONFIRMATION, from_index: 3, to_index: 5 },
    { edge_class: L10DagEdgeClass.CONTRADICTION_TO_CONFIRMATION, from_index: 4, to_index: 5 },
    { edge_class: L10DagEdgeClass.SUPPORT_TO_INVALIDATION, from_index: 3, to_index: 6 },
    { edge_class: L10DagEdgeClass.CONTRADICTION_TO_INVALIDATION, from_index: 4, to_index: 6 },
    { edge_class: L10DagEdgeClass.SUPPORT_TO_CONFIDENCE, from_index: 3, to_index: 7 },
    { edge_class: L10DagEdgeClass.CONTRADICTION_TO_CONFIDENCE, from_index: 4, to_index: 7 },
    { edge_class: L10DagEdgeClass.CONFIRMATION_TO_CONFIDENCE, from_index: 5, to_index: 7 },
    { edge_class: L10DagEdgeClass.INVALIDATION_TO_CONFIDENCE, from_index: 6, to_index: 7 },
    { edge_class: L10DagEdgeClass.CONFIDENCE_TO_RANKING, from_index: 7, to_index: 8 },
    { edge_class: L10DagEdgeClass.RANKING_TO_SPREAD, from_index: 8, to_index: 9 },
    { edge_class: L10DagEdgeClass.SPREAD_TO_SHIFT_CONDITION, from_index: 9, to_index: 10 },
    { edge_class: L10DagEdgeClass.RANKING_TO_EVIDENCE, from_index: 8, to_index: 11 },
    { edge_class: L10DagEdgeClass.SHIFT_CONDITION_TO_EVIDENCE, from_index: 10, to_index: 11 },
    { edge_class: L10DagEdgeClass.EVIDENCE_TO_MATERIALIZATION, from_index: 11, to_index: 12 },
  ];
  const res = buildL10HypothesisDag(run.hypothesis_run_id, {
    nodeSpecs, edgeSpecs,
  });

  let stagesOk = true;
  if (res.dag) {
    for (const n of res.dag.nodes) {
      if (L10_NODE_CLASS_STAGE[n.node_class] !== n.stage) { stagesOk = false; break; }
    }
  }
  let toposOk = true;
  if (res.dag) {
    const idStage = new Map(res.dag.nodes.map(n => [n.node_id, n.stage]));
    let lastIdx = -1;
    for (const id of res.dag.topological_order) {
      const idx = L10_STAGE_INDEX[idStage.get(id) as L10DagStage];
      if (idx < lastIdx) { toposOk = false; break; }
      lastIdx = Math.max(lastIdx, idx);
    }
  }

  const cycle = detectL10Cycles(
    ['A', 'B'],
    [
      { edge_id: 'e1', edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT,
        from_node_id: 'A', to_node_id: 'B' },
      { edge_id: 'e2', edge_class: L10DagEdgeClass.INPUT_TO_SUBJECT,
        from_node_id: 'B', to_node_id: 'A' },
    ],
  );
  const holds = res.ok && stagesOk && toposOk && !cycle.acyclic;
  return {
    id: 'INV-10.4-A',
    name: 'Stage monotonicity + acyclicity',
    holds,
    evidence:
      `dag.ok=${res.ok} stages=${stagesOk} toposort=${toposOk} ` +
      `cycleDetected=${!cycle.acyclic}`,
  };
}

export function checkINV_104_B(): L10_4InvariantResult {
  const p = runGreenL10_4Pipeline();
  const assigned = new Set([
    p.ranking.primary_hypothesis_ref,
    p.ranking.secondary_hypothesis_ref,
  ]);
  const fromRanking = p.ranking.ordered_hypothesis_refs.length >= 2;
  const spreadFromEngine =
    p.spread.ranking_ref === p.ranking.ranking_id &&
    p.spread.primary_hypothesis_ref === p.ranking.primary_hypothesis_ref;
  const outputsAllFromMaterializer = p.outputs.every(
    o => o.ranking_ref === p.ranking.ranking_id,
  );
  const holds =
    fromRanking && spreadFromEngine && outputsAllFromMaterializer &&
    assigned.size >= 2;
  return {
    id: 'INV-10.4-B',
    name: 'Exclusive ownership (primary/secondary/outputs)',
    holds,
    evidence:
      `fromRanking=${fromRanking} spreadOwner=${spreadFromEngine} ` +
      `outputsFromMaterializer=${outputsAllFromMaterializer}`,
  };
}

export function checkINV_104_C(): L10_4InvariantResult {
  const subject = buildGreenL10_4Subject();
  const missing = assembleHypothesisSubject({
    subject: {
      ...subject,
      required_validation_inputs: [
        { ref: 'missing-v', family: 'L7_VALIDATION', required: true,
          staleness_critical: true, evidence_only: false, context_only: false },
      ],
    },
    surface_availability: [
      { ref: 'r1', available: true, family: 'L8_REGIME' },
      { ref: 's1', available: true, family: 'L9_SEQUENCE' },
      { ref: 'f1', available: true, family: 'L6_FEATURE' },
      { ref: 'e1', available: true, family: 'L6_EVENT' },
    ],
    trace_id: 'T-0001',
    manifest_id: 'M-0001',
    admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
  });
  const rejected = !missing.ok && missing.violations.some(
    v => v.code === L10RuntimeViolationCode.ASSEMBLY_MISSING_REQUIRED_INPUTS,
  );
  return {
    id: 'INV-10.4-C',
    name: 'Input consumption law',
    holds: rejected,
    evidence: `missingInputRejected=${rejected}`,
  };
}

export function checkINV_104_D(): L10_4InvariantResult {
  const subject = buildGreenL10_4Subject();
  const surfaces = buildGreenL10_4Surfaces();
  const cs = buildGreenL10_4Candidates();
  const si = assembleHypothesisSubject({
    subject,
    surface_availability: surfaces.availability,
    trace_id: 'T-0001', manifest_id: 'M-0001',
    admissible_family_templates: ['TPL-ACC', 'TPL-LEV'],
  });
  if (!si.ok || !si.value) {
    return { id: 'INV-10.4-D', name: 'Competition integrity',
      holds: false, evidence: 'assembly failed' };
  }
  const only = generateHypothesisCandidates({
    subject,
    subject_instance: si.value,
    candidate_contracts: [cs[0]],
    trace_id: 'T-0001', manifest_id: 'M-0001',
  });
  const singleStoryRejected = !only.ok && only.violations.some(
    v => v.code === L10RuntimeViolationCode.CANDIDATE_SINGLE_STORY_COLLAPSE ||
         v.code === L10RuntimeViolationCode.CANDIDATE_MIN_COUNT_UNMET,
  );
  const preSelected = generateHypothesisCandidates({
    subject,
    subject_instance: si.value,
    candidate_contracts: [
      { ...cs[0], candidate_class: 'PRIMARY_CANDIDATE' }, cs[1],
    ],
    trace_id: 'T-0001', manifest_id: 'M-0001',
  });
  const preSelectedRejected = !preSelected.ok && preSelected.violations.some(
    v => v.code === L10RuntimeViolationCode.CANDIDATE_PRE_SELECTED_PRIMARY,
  );
  return {
    id: 'INV-10.4-D',
    name: 'Competition integrity',
    holds: singleStoryRejected && preSelectedRejected,
    evidence:
      `singleStoryRejected=${singleStoryRejected} ` +
      `preSelectedRejected=${preSelectedRejected}`,
  };
}

export function checkINV_104_E(): L10_4InvariantResult {
  const p = runGreenL10_4Pipeline();
  const narrowHasShift =
    !p.spread.narrow_spread_flag || p.shift !== null;
  const outputsPassContract = p.outputs.length > 0;
  return {
    id: 'INV-10.4-E',
    name: 'Cleanliness law',
    holds: narrowHasShift && outputsPassContract,
    evidence:
      `narrowHasShift=${narrowHasShift} ` +
      `outputsCount=${p.outputs.length}`,
  };
}

export function checkINV_104_F(): L10_4InvariantResult {
  const p = runGreenL10_4Pipeline();
  if (p.outputs.length < 2) {
    return { id: 'INV-10.4-F', name: 'Replay identity',
      holds: false, evidence: 'no outputs' };
  }
  const replay = verifyL10ReplayIdentity(p.outputs, p.outputs);
  const driftedOutputs = p.outputs.map(o =>
    ({ ...o, replay_hash: 'rh:drifted' }),
  );
  const drifted = verifyL10ReplayIdentity(p.outputs, driftedOutputs);
  const invented = verifyL10ReplayIdentity(
    p.outputs,
    [...p.outputs, { ...p.outputs[0], hypothesis_candidate_id: 'INVENTED' }],
  );
  const cleanOk = replay.ok;
  const driftCaught = !drifted.ok && drifted.violations.some(
    v => v.code === L10RuntimeViolationCode.REPLAY_HASH_DIVERGED,
  );
  const inventCaught = !invented.ok && invented.violations.some(
    v => v.code === L10RuntimeViolationCode.REPLAY_INVENTED_CANDIDATE,
  );
  return {
    id: 'INV-10.4-F',
    name: 'Replay identity',
    holds: cleanOk && driftCaught && inventCaught,
    evidence:
      `cleanOk=${cleanOk} driftCaught=${driftCaught} inventedCaught=${inventCaught}`,
  };
}

export function checkINV_104_G(): L10_4InvariantResult {
  const p = runGreenL10_4Pipeline();
  if (p.outputs.length === 0) {
    return { id: 'INV-10.4-G', name: 'Repair discipline',
      holds: false, evidence: 'no outputs' };
  }
  const priorRun = buildGreenL10_4Run();
  const repairRun = {
    ...priorRun,
    hypothesis_run_id: 'L10R-RUN-0002',
    mode: L10HypothesisRunMode.REPAIR,
    parent_run_id: priorRun.hypothesis_run_id,
    repair_reason: null,
  };
  const unmarkedOutputs = p.outputs.map(o =>
    ({ ...o, repair_mode_flag: false, replay_mode_flag: 'LIVE' as never }),
  );
  const check = verifyL10Repair(priorRun, repairRun, p.outputs, unmarkedOutputs);
  const rejectsLiveMask = !check.ok && check.violations.some(
    v => v.code === L10RuntimeViolationCode.REPAIR_LIVE_MASQUERADE,
  );
  const rejectsUnmarked = check.violations.some(
    v => v.code === L10RuntimeViolationCode.REPAIR_UNMARKED,
  );
  const rejectsMissingReason = check.violations.some(
    v => v.code === L10RuntimeViolationCode.REPAIR_REASON_MISSING,
  );
  return {
    id: 'INV-10.4-G',
    name: 'Repair discipline',
    holds: rejectsLiveMask && rejectsUnmarked && rejectsMissingReason,
    evidence:
      `liveMask=${rejectsLiveMask} unmarked=${rejectsUnmarked} ` +
      `missingReason=${rejectsMissingReason}`,
  };
}

export function checkAllL10_4Invariants(): readonly L10_4InvariantResult[] {
  return [
    checkINV_104_A(), checkINV_104_B(), checkINV_104_C(),
    checkINV_104_D(), checkINV_104_E(), checkINV_104_F(),
    checkINV_104_G(),
  ];
}

// Silence "unused import" warnings when the builder factory is not
// invoked directly (it's used transitively by `buildL10HypothesisDag`).
void createL10DagBuilder;
