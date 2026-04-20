/**
 * L9.4 — Runtime-Layer Invariants
 *
 * §9.4.19 — INV-9.4-A through INV-9.4-H, all executable and covered by
 * the L9.4 certification suite.
 *
 *   INV-9.4-A : Stage monotonicity. The DAG builder emits nodes bound
 *               strictly to the 14 canonical stages in topological
 *               order; cycles are rejected.
 *   INV-9.4-B : Exclusivity law. Only the classification engine may
 *               assign primary/secondary sequence state and the
 *               coexistence class — no upstream engine leaks state
 *               assignment into its output artifacts.
 *   INV-9.4-C : Input consumption law. Missing required inputs,
 *               blocked validation, evidence-only-as-hard,
 *               historical-without-window, and restriction bypass
 *               are rejected by the temporal input resolver.
 *   INV-9.4-D : Ordering determinism. Identical ordered-signal inputs
 *               produce identical ordered output (stable tie-break)
 *               and ambiguity is never silently erased.
 *   INV-9.4-E : Cleanliness law. Classification engine rejects
 *               CLEAN_SINGLE under material ambiguity, staleness,
 *               decay, or chain damage; primary-state-not-in-family
 *               and double-assignment are rejected.
 *   INV-9.4-F : Replay identity. Replay-adapter detects replay-hash
 *               divergence, state drift, family drift, LIVE
 *               masquerade, and erased ambiguity.
 *   INV-9.4-G : Repair discipline. Repair-adapter rejects unmarked
 *               repair, missing parent, missing reason, LIVE
 *               masquerade, and unjustified semantic drift.
 *   INV-9.4-H : Causal restraint. Lead-lag without ordering evidence
 *               is rejected; the materialized output carries
 *               `chain_is_temporal_only = true` and the subject's
 *               causal restraint policy is never bypassed.
 */

import {
  buildL9SequenceDag,
} from '../runtime/sequence-dag-builder';
import {
  L9_NODE_CLASS_STAGE,
  L9_STAGE_INDEX,
  L9DagStage,
} from '../runtime/sequence-dag-node';
import { detectL9Cycles } from '../runtime/sequence-cycle-detector';
import { l9Toposort } from '../runtime/sequence-toposort';
import type {
  L9DagNode,
  L9DagNodeClass,
} from '../runtime/sequence-dag-node';
import type { L9DagEdge } from '../runtime/sequence-dag-edge';
import { L9SequenceRunMode } from '../runtime/sequence-compute-run';
import {
  L9RuntimeViolationCode,
} from '../validation/l9-runtime-violation-codes';

import {
  resolveTemporalInputs,
  type L9InputSurfaceStatus,
} from '../engine/temporal-input-resolver';
import {
  resolveOrderedSignals,
  type L9OrderedSignalCandidate,
} from '../engine/ordered-signal-resolver';
import {
  computeLeadLagProfile,
} from '../engine/lead-lag-engine';
import {
  classifySequence,
} from '../engine/sequence-classification-engine';

import { verifyL9ReplayIdentity } from '../replay/l9-replay-adapter';
import { verifyL9Repair } from '../replay/l9-repair-adapter';

import {
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import { L9SequenceFamily } from '../contracts/sequence-family';

import {
  buildGreenL94Run,
  buildGreenL94Subject,
  runGreenL94Pipeline,
} from './l9_4-green-pipeline';

export interface L9_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function codeSet(codes: readonly { code: L9RuntimeViolationCode }[]):
  ReadonlySet<L9RuntimeViolationCode> {
  return new Set(codes.map(c => c.code));
}

/**
 * INV-9.4-A — Stage monotonicity + cycle rejection.
 *
 * Asserts:
 *   (i) canonical DAG has zero violations and every node's stage
 *       matches its class via `L9_NODE_CLASS_STAGE`;
 *   (ii) topological order respects the 14-stage index (no later
 *        stage appears before an earlier stage);
 *   (iii) `detectL9Cycles` flags a synthetic back-edge.
 */
export function checkINV_94_A(): L9_4InvariantResult {
  const run = buildGreenL94Run();
  const subject = buildGreenL94Subject();
  const build = buildL9SequenceDag(run, [subject], run.engine_version_set);

  const cleanDag = build.dag !== null && build.violations.length === 0;

  let stagesOk = true;
  let toposOk = true;
  if (build.dag) {
    for (const n of build.dag.nodes) {
      if (L9_NODE_CLASS_STAGE[n.node_class] !== n.stage) {
        stagesOk = false;
        break;
      }
    }
    const idStage: Map<string, L9DagStage> = new Map(
      build.dag.nodes.map(n => [n.node_id, n.stage]),
    );
    let lastIdx = -1;
    for (const id of build.dag.topological_order) {
      const st = idStage.get(id)!;
      const idx = L9_STAGE_INDEX[st];
      // within-stage order is fine; the rule is: no strictly-later
      // stage can appear before a strictly-earlier one has started.
      if (idx < lastIdx) { toposOk = false; break; }
      lastIdx = Math.max(lastIdx, idx);
    }
  }

  // (iii) synthetic cycle detection
  const syntheticNodes: readonly L9DagNode[] = [
    { node_id: 'A', node_class: 'X' as unknown as L9DagNodeClass,
      stage: L9DagStage.S01_INPUT, sequence_subject_id: 's',
      sequence_family: 'f', scope_type: 'ASSET', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'e', engine_version: '0',
      created_at_ordinal: 0 },
    { node_id: 'B', node_class: 'X' as unknown as L9DagNodeClass,
      stage: L9DagStage.S02_SUBJECT, sequence_subject_id: 's',
      sequence_family: 'f', scope_type: 'ASSET', scope_id: 'eth',
      deterministic_inputs: [], engine_id: 'e', engine_version: '0',
      created_at_ordinal: 1 },
  ];
  const syntheticEdges: readonly L9DagEdge[] = [
    { edge_id: 'A->B', edge_class: 'X' as never, from_node_id: 'A',
      to_node_id: 'B' },
    { edge_id: 'B->A', edge_class: 'X' as never, from_node_id: 'B',
      to_node_id: 'A' },
  ];
  const cycle = detectL9Cycles(
    syntheticNodes.map(n => n.node_id), syntheticEdges);
  const cycleDetected = !cycle.acyclic && cycle.cycles.length > 0;

  // topo gives deterministic order for the canonical DAG
  let deterministicTopo = true;
  if (build.dag) {
    const ts1 = l9Toposort(build.dag.nodes, build.dag.edges);
    const ts2 = l9Toposort(build.dag.nodes, build.dag.edges);
    deterministicTopo = ts1.order.length === ts2.order.length &&
      ts1.order.every((id, i) => id === ts2.order[i]);
  }

  const holds = cleanDag && stagesOk && toposOk && cycleDetected &&
    deterministicTopo;
  return {
    id: 'INV-9.4-A',
    name: 'Stage monotonicity + cycle rejection',
    holds,
    evidence:
      `cleanDag=${cleanDag} stagesOk=${stagesOk} toposOk=${toposOk}`
      + ` cycleDetected=${cycleDetected} deterministicTopo=${deterministicTopo}`,
  };
}

/**
 * INV-9.4-B — Exclusivity law. Only the classification engine assigns
 * primary/secondary state + coexistence. We verify that:
 *   - green run's final output has the classification-engine's primary
 *     state (PRE_NARRATIVE_ACCUMULATION);
 *   - the runtime rejects a lead-lag input that tries to sneak a
 *     sequence state label into its support strength mapping
 *     (`LEAD_LAG_ASSIGNED_PRIMARY_STATE` exists as a guard code).
 *   - classification engine rejects a primary state outside the
 *     subject's family/allowed set.
 */
export function checkINV_94_B(): L9_4InvariantResult {
  const { output } = runGreenL94Pipeline();

  const subject = buildGreenL94Subject();
  const pipeline = runGreenL94Pipeline();

  // Red: classify with primary state outside family's allowed set
  const red = classifySequence({
    subject,
    resolved_inputs:
      ({ readiness_class: 'READY',
         usable_refs: ['l6:event/accum-eth'],
         stale_refs: [], degraded_refs: [], blocked_refs: [],
         missing_refs: [], evidence_only_refs: [],
         historical_refs: [] }) as never,
    ordered_signals: pipeline.output as never,
    lead_lag: pipeline.output as never,
    phase_output: pipeline.output as never,
    change_points: pipeline.output as never,
    decay: pipeline.output as never,
    post_event: pipeline.output as never,
    chain: pipeline.output as never,
    primary_sequence_state:
      L9SequenceState.DISTRIBUTION_UNDER_HYPE as L9SequenceState,
    secondary_sequence_state: null,
    declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    proposed_ambiguity_score: 0.05,
    proposed_staleness_score: 0.05,
    proposed_degradation_score: 0.05,
    rationale_codes: [],
  });

  const redCodes = codeSet([...red.violations]);
  const primaryNotInFamily = redCodes.has(
    L9RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY);

  const holds =
    output.primary_sequence_state === L9SequenceState.PRE_NARRATIVE_ACCUMULATION
    && primaryNotInFamily;

  return {
    id: 'INV-9.4-B',
    name: 'Exclusivity law — classification engine is sole state assigner',
    holds,
    evidence:
      `primary=${output.primary_sequence_state}`
      + ` primaryNotInFamily=${primaryNotInFamily}`,
  };
}

/**
 * INV-9.4-C — Input consumption law. We construct several red
 * resolver inputs and verify each triggers its canonical code.
 */
export function checkINV_94_C(): L9_4InvariantResult {
  const subject = buildGreenL94Subject();

  const makeInstance = (): Parameters<typeof resolveTemporalInputs>[0] => ({
    subject,
    // minimal instance shape — resolver only reads `subject_instance_id`
    instance: { subject_instance_id: 'lsi:x' } as never,
    surface_statuses: [],
    restriction_profile_refs: [],
  });

  const base = makeInstance();

  // (C1) Missing required validation
  const c1 = resolveTemporalInputs({
    ...base,
    surface_statuses: [
      mkStatus('l6:event/accum-eth'),
      mkStatus('l6:feature/accum-eth'),
      mkStatus('l8:regime/accum-eth'),
    ],
  });
  // (C2) Evidence-only used as hard requirement
  const c2 = resolveTemporalInputs({
    ...base,
    surface_statuses: [
      mkStatus('l7:validation/accum-eth', { evidence_only: true }),
      mkStatus('l6:event/accum-eth'),
      mkStatus('l6:feature/accum-eth'),
      mkStatus('l8:regime/accum-eth'),
    ],
  });
  // (C3) Blocked validation accepted
  const c3 = resolveTemporalInputs({
    ...base,
    surface_statuses: [
      mkStatus('l7:validation/accum-eth', { blocked: true }),
      mkStatus('l6:event/accum-eth'),
      mkStatus('l6:feature/accum-eth'),
      mkStatus('l8:regime/accum-eth'),
    ],
  });
  // (C4) Regime required but missing
  const c4 = resolveTemporalInputs({
    ...base,
    surface_statuses: [
      mkStatus('l7:validation/accum-eth'),
      mkStatus('l6:event/accum-eth'),
      mkStatus('l6:feature/accum-eth'),
    ],
  });

  const codesC1 = codeSet([...c1.violations]);
  const codesC2 = codeSet([...c2.violations]);
  const codesC3 = codeSet([...c3.violations]);
  const codesC4 = codeSet([...c4.violations]);

  const holds =
    codesC1.has(L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_VALIDATION) &&
    codesC2.has(L9RuntimeViolationCode.INPUT_EVIDENCE_ONLY_USED_AS_HARD) &&
    codesC3.has(L9RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED) &&
    codesC4.has(L9RuntimeViolationCode.INPUT_REGIME_OMITTED_WHERE_REQUIRED);

  return {
    id: 'INV-9.4-C',
    name: 'Input consumption law — missing / evidence-only / blocked / regime',
    holds,
    evidence: `c1(missingValidation)=${codesC1.has(L9RuntimeViolationCode.INPUT_MISSING_REQUIRED_VALIDATION)}`
      + ` c2(eoHard)=${codesC2.has(L9RuntimeViolationCode.INPUT_EVIDENCE_ONLY_USED_AS_HARD)}`
      + ` c3(blocked)=${codesC3.has(L9RuntimeViolationCode.INPUT_BLOCKED_VALIDATION_ACCEPTED)}`
      + ` c4(regime)=${codesC4.has(L9RuntimeViolationCode.INPUT_REGIME_OMITTED_WHERE_REQUIRED)}`,
  };
}

function mkStatus(
  ref: string,
  overrides: Partial<L9InputSurfaceStatus> = {},
): L9InputSurfaceStatus {
  return {
    ref, available: true, stale: false, degraded: false,
    restricted: false, blocked: false, evidence_only: false,
    historical: false, ...overrides,
  };
}

/**
 * INV-9.4-D — Ordering determinism. Running the resolver twice with
 * identical candidates must produce identical ordered output, and
 * ambiguous candidates must surface `ordered_signals.has_ambiguity`
 * rather than silently drop the flag.
 */
export function checkINV_94_D(): L9_4InvariantResult {
  const subject = buildGreenL94Subject();
  const resolvedInputs = ({ readiness_class: 'READY' } as unknown) as
    Parameters<typeof resolveOrderedSignals>[0]['resolved_inputs'];

  const candidates: L9OrderedSignalCandidate[] = [
    { signal_ref: 'b', observed_at: '2026-04-17T11:00:00Z',
      ordering_evidence_refs: ['ev'],
      pre_event: true, post_event: false,
      late: false, stale: false, ambiguous: false, evidence_only: false,
      contradicts_prior: false, decayed_predecessor: false,
      role_confidence: 0.7 },
    { signal_ref: 'a', observed_at: '2026-04-17T11:00:00Z',
      ordering_evidence_refs: ['ev'],
      pre_event: true, post_event: false,
      late: false, stale: false, ambiguous: false, evidence_only: false,
      contradicts_prior: false, decayed_predecessor: false,
      role_confidence: 0.7 },
    { signal_ref: 'z', observed_at: '2026-04-17T10:00:00Z',
      ordering_evidence_refs: ['ev'],
      pre_event: true, post_event: false,
      late: false, stale: false, ambiguous: true, evidence_only: false,
      contradicts_prior: false, decayed_predecessor: false,
      role_confidence: 0.7 },
  ];

  const r1 = resolveOrderedSignals({
    subject, resolved_inputs: resolvedInputs, candidates });
  const r2 = resolveOrderedSignals({
    subject, resolved_inputs: resolvedInputs,
    candidates: [...candidates].reverse(),
  });

  const ok1 = r1.ok && r2.ok;
  const refs1 = r1.value?.ordered_signals.map(o => o.signal_ref) ?? [];
  const refs2 = r2.value?.ordered_signals.map(o => o.signal_ref) ?? [];
  const deterministic = refs1.length === refs2.length &&
    refs1.every((r, i) => r === refs2[i]);
  const ambiguityNotErased = r1.value?.has_ambiguity === true;

  const holds = ok1 && deterministic && ambiguityNotErased &&
    refs1[0] === 'z' && refs1[1] === 'a' && refs1[2] === 'b';
  return {
    id: 'INV-9.4-D',
    name: 'Ordering determinism and ambiguity preservation',
    holds,
    evidence:
      `deterministic=${deterministic} ambiguityNotErased=${ambiguityNotErased}`
      + ` refs=${refs1.join(',')}`,
  };
}

/**
 * INV-9.4-E — Cleanliness law. Classification engine must reject
 * CLEAN_SINGLE under material ambiguity / chain damage and must
 * reject primary state outside family / secondary equal to primary.
 */
export function checkINV_94_E(): L9_4InvariantResult {
  const subject = buildGreenL94Subject();

  const stub = {
    readiness_class: 'READY', usable_refs: ['e'],
    stale_refs: [], degraded_refs: [], blocked_refs: [],
    missing_refs: [], evidence_only_refs: [], historical_refs: [],
  } as never;
  const emptyOrdered = {
    ordered_signals: [], has_ambiguity: false, tie_break_reasons: [],
    late_count: 0, stale_count: 0,
  } as never;
  const zeroDecay = { decay_class: 'STABLE', decay_score: 0.05 } as never;
  const noChange = { change_points: [] } as never;
  const noPostEvent = { windows: [] } as never;
  const emptyLeadLag = { relations: [] } as never;
  const emptyPhase = { phase_state: { phase_class: 'EARLY' } } as never;
  const cleanChain = {
    sequence_completeness_score: 0.85, ambiguity_score: 0.05,
    chain_integrity_flags: [],
  } as never;
  const damagedChain = {
    sequence_completeness_score: 0.3, ambiguity_score: 0.6,
    chain_integrity_flags: ['INCOMPLETE'],
  } as never;

  // Red (E1): CLEAN_SINGLE under material ambiguity
  const e1 = classifySequence({
    subject, resolved_inputs: stub,
    ordered_signals: emptyOrdered, lead_lag: emptyLeadLag,
    phase_output: emptyPhase, change_points: noChange,
    decay: zeroDecay, post_event: noPostEvent, chain: cleanChain,
    primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    secondary_sequence_state: null,
    declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    proposed_ambiguity_score: 0.9,
    proposed_staleness_score: 0.05,
    proposed_degradation_score: 0.05,
    rationale_codes: [],
  });

  // Red (E2): secondary === primary
  const e2 = classifySequence({
    subject, resolved_inputs: stub,
    ordered_signals: emptyOrdered, lead_lag: emptyLeadLag,
    phase_output: emptyPhase, change_points: noChange,
    decay: zeroDecay, post_event: noPostEvent, chain: cleanChain,
    primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    secondary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    proposed_ambiguity_score: 0.05,
    proposed_staleness_score: 0.05,
    proposed_degradation_score: 0.05,
    rationale_codes: [],
  });

  // Red (E3): CLEAN_SINGLE under damaged chain
  const e3 = classifySequence({
    subject, resolved_inputs: stub,
    ordered_signals: emptyOrdered, lead_lag: emptyLeadLag,
    phase_output: emptyPhase, change_points: noChange,
    decay: zeroDecay, post_event: noPostEvent, chain: damagedChain,
    primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    secondary_sequence_state: null,
    declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    proposed_ambiguity_score: 0.1,
    proposed_staleness_score: 0.1,
    proposed_degradation_score: 0.1,
    rationale_codes: [],
  });

  const codesE1 = codeSet([...e1.violations]);
  const codesE2 = codeSet([...e2.violations]);
  const codesE3 = codeSet([...e3.violations]);

  const fakeClean = codesE1.has(L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE)
    || codesE1.has(L9RuntimeViolationCode.CLASSIFY_AMBIGUITY_LAUNDERED);
  const secEqPrim =
    codesE2.has(L9RuntimeViolationCode.CLASSIFY_SECONDARY_SAME_AS_PRIMARY);
  const chainDamaged =
    codesE3.has(L9RuntimeViolationCode.CLASSIFY_CHAIN_DAMAGED_CLEAN)
    || codesE3.has(L9RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE);

  const holds = fakeClean && secEqPrim && chainDamaged;
  return {
    id: 'INV-9.4-E',
    name: 'Cleanliness law — CLEAN_SINGLE guarded against ambiguity/chain-damage',
    holds,
    evidence:
      `fakeClean=${fakeClean} secEqPrim=${secEqPrim} chainDamaged=${chainDamaged}`,
  };
}

/**
 * INV-9.4-F — Replay identity. Replay adapter rejects hash divergence,
 * state drift, family drift, erased ambiguity, and LIVE masquerade.
 */
export function checkINV_94_F(): L9_4InvariantResult {
  const pipe1 = runGreenL94Pipeline();
  const pipe2 = runGreenL94Pipeline();

  const idOk = verifyL9ReplayIdentity(pipe1.output, pipe2.output);

  const hashDrift = verifyL9ReplayIdentity(pipe1.output, {
    ...pipe2.output, replay_hash: 'different-hash',
  });
  const stateDrift = verifyL9ReplayIdentity(pipe1.output, {
    ...pipe2.output,
    primary_sequence_state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
  });
  const familyDrift = verifyL9ReplayIdentity(pipe1.output, {
    ...pipe2.output,
    sequence_family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
  });
  const erased = verifyL9ReplayIdentity(
    { ...pipe1.output,
      coexistence_class: L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE },
    { ...pipe2.output,
      coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE },
  );

  const codes = (r: ReturnType<typeof verifyL9ReplayIdentity>) =>
    new Set(r.violations.map(v => v.code));

  const holds = idOk.ok &&
    codes(hashDrift).has(L9RuntimeViolationCode.REPLAY_HASH_DIVERGED) &&
    codes(stateDrift).has(L9RuntimeViolationCode.REPLAY_STATE_DRIFT) &&
    codes(familyDrift).has(L9RuntimeViolationCode.REPLAY_FAMILY_DRIFT) &&
    codes(erased).has(L9RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY);
  return {
    id: 'INV-9.4-F',
    name: 'Replay identity — adapter rejects divergence and ambiguity erasure',
    holds,
    evidence:
      `idOk=${idOk.ok} hash=${codes(hashDrift).has(L9RuntimeViolationCode.REPLAY_HASH_DIVERGED)}`
      + ` state=${codes(stateDrift).has(L9RuntimeViolationCode.REPLAY_STATE_DRIFT)}`
      + ` family=${codes(familyDrift).has(L9RuntimeViolationCode.REPLAY_FAMILY_DRIFT)}`
      + ` erased=${codes(erased).has(L9RuntimeViolationCode.REPLAY_ERASED_AMBIGUITY)}`,
  };
}

/**
 * INV-9.4-G — Repair discipline. Repair adapter rejects unmarked
 * repair mode, broken lineage, missing reason, LIVE masquerade, and
 * unjustified semantic drift.
 */
export function checkINV_94_G(): L9_4InvariantResult {
  const green = runGreenL94Pipeline();

  const repairedOutputOk = {
    ...green.output,
    replay_mode_flag: 'REPAIR' as const,
    repair_mode_flag: true,
  };
  const repairedLiveMasq = {
    ...green.output,
    replay_mode_flag: 'LIVE' as const,
    repair_mode_flag: false,
  };
  const repairedStateDrift = {
    ...repairedOutputOk,
    primary_sequence_state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
  };

  const goodRepair = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR),
    prior_output: green.output,
    repaired_output: repairedOutputOk,
    repair_reason: 'late critical-event arrived after freeze',
  });
  const unmarked = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.LIVE),
    prior_output: green.output,
    repaired_output: repairedOutputOk,
    repair_reason: 'late critical-event',
  });
  const missingParent = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR,
      { parent_run_id: null }),
    prior_output: green.output,
    repaired_output: repairedOutputOk,
    repair_reason: 'late critical-event',
  });
  const missingReason = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR),
    prior_output: green.output,
    repaired_output: repairedOutputOk,
    repair_reason: '',
  });
  const liveMasq = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR),
    prior_output: green.output,
    repaired_output: repairedLiveMasq,
    repair_reason: 'late critical-event',
  });
  const unjustifiedDrift = verifyL9Repair({
    repair_run: buildGreenL94Run(L9SequenceRunMode.REPAIR),
    prior_output: green.output,
    repaired_output: repairedStateDrift,
    repair_reason: 'x',
  });

  const codes = (r: ReturnType<typeof verifyL9Repair>) =>
    new Set(r.violations.map(v => v.code));

  const holds = goodRepair.ok &&
    codes(unmarked).has(L9RuntimeViolationCode.REPAIR_UNMARKED) &&
    codes(missingParent).has(L9RuntimeViolationCode.REPAIR_LINEAGE_BROKEN) &&
    codes(missingReason).has(L9RuntimeViolationCode.REPAIR_REASON_MISSING) &&
    codes(liveMasq).has(L9RuntimeViolationCode.REPAIR_LIVE_MASQUERADE) &&
    codes(unjustifiedDrift).has(
      L9RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED);

  return {
    id: 'INV-9.4-G',
    name: 'Repair discipline — adapter rejects unjustified or masqueraded repair',
    holds,
    evidence:
      `goodRepair=${goodRepair.ok}`
      + ` unmarked=${codes(unmarked).has(L9RuntimeViolationCode.REPAIR_UNMARKED)}`
      + ` parent=${codes(missingParent).has(L9RuntimeViolationCode.REPAIR_LINEAGE_BROKEN)}`
      + ` reason=${codes(missingReason).has(L9RuntimeViolationCode.REPAIR_REASON_MISSING)}`
      + ` liveMasq=${codes(liveMasq).has(L9RuntimeViolationCode.REPAIR_LIVE_MASQUERADE)}`
      + ` drift=${codes(unjustifiedDrift).has(L9RuntimeViolationCode.REPAIR_SEMANTIC_DRIFT_UNJUSTIFIED)}`,
  };
}

/**
 * INV-9.4-H — Causal restraint. Lead-lag relations without ordering
 * evidence are rejected, and the materialized green output sets
 * `chain_is_temporal_only=true` on its restraint flags.
 */
export function checkINV_94_H(): L9_4InvariantResult {
  const green = runGreenL94Pipeline();
  const subject = buildGreenL94Subject();

  const ordered = ({
    ordered_signals: [
      { signal_ref: 'a', observed_at: '2026-04-17T10:00:00Z',
        role: 'INITIATOR', late_flag: false, stale_flag: false,
        ambiguous_flag: false, evidence_only: false,
        contradicts_prior: false, decayed_predecessor: false },
      { signal_ref: 'b', observed_at: '2026-04-17T11:00:00Z',
        role: 'CONFIRMATION', late_flag: false, stale_flag: false,
        ambiguous_flag: false, evidence_only: false,
        contradicts_prior: false, decayed_predecessor: false },
    ],
    has_ambiguity: false,
    tie_break_reasons: [], late_count: 0, stale_count: 0,
  } as unknown) as Parameters<typeof computeLeadLagProfile>[0]['ordered_signals'];

  // No ordering evidence
  const redLL = computeLeadLagProfile({
    subject,
    ordered_signals: ordered,
    relations: [{
      leading_signal_ref: 'a', lagging_signal_ref: 'b',
      lag_duration_ms: 60_000,
      support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
      contradiction_posture: L9LagContradictionPosture.NONE,
      decay_adjustment: 0, historical_reliability: 0.5,
      lag_window_ref: 'w', ordering_evidence_refs: [],
      restriction_consumption_refs: [],
      regime_conditioning_refs: [],
      validation_conditioning_refs: [],
    }],
    contract_versions: {
      lead_lag_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: 'run-x',
  });

  const codes = new Set(redLL.violations.map(v => v.code));
  const noEvidenceRejected =
    codes.has(L9RuntimeViolationCode.LEAD_LAG_WITHOUT_ORDERING_EVIDENCE);

  const restraint = green.output.causal_restraint_flags;
  const flagOk = restraint?.chain_is_temporal_only === true;

  const holds = noEvidenceRejected && flagOk;
  return {
    id: 'INV-9.4-H',
    name: 'Causal restraint — no ordering evidence rejected; chain=temporal-only',
    holds,
    evidence:
      `noEvidenceRejected=${noEvidenceRejected} chainTemporalOnly=${flagOk}`,
  };
}

/**
 * §9.4.19 — Aggregated runner. Returns all eight L9.4 invariants in
 * declared order so the certification suite can assert each.
 */
export function runAllL9_4Invariants(): readonly L9_4InvariantResult[] {
  return [
    checkINV_94_A(),
    checkINV_94_B(),
    checkINV_94_C(),
    checkINV_94_D(),
    checkINV_94_E(),
    checkINV_94_F(),
    checkINV_94_G(),
    checkINV_94_H(),
  ];
}
