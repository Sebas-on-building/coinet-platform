/**
 * L7.4 — Deterministic Execution Runtime Certification Test Suite
 *
 * Bands per §7.4.10:
 *   A — DAG primitives (node / edge / cycle / toposort / builder)
 *   B — Assembly + Support + Challenge engines
 *   C — Contradiction detection + clustering
 *   D — Evaluation engines (incompleteness / staleness / ambiguity / degradation)
 *   E — Classification + Confidence + Restriction
 *   F — Evidence pack + Materializer + Replay/Repair adapters
 *   G — Invariants (INV-7.4-A..H)
 */

import {
  L7ValidationSubjectClass,
  L7MaterialityClass,
  L7ValidationIntent,
  L7StalenessPolicyClass,
  L7ContradictionFamily,
  L7ContradictionSeverity,
  L7ConfidenceBand,
  L7RestrictionRight,
  L7ValidationClass,
  L7RuntimeStatusClass,
  L7ReplayIdentityMode,
  L7ValidationSubjectContract,
  L7ContradictionBundleContract,
} from '../l7/contracts';

import {
  L7DagNodeClass,
  L7DagStage,
  L7DagEdgeClass,
  LEGAL_EDGE_TRANSITIONS,
  buildDagNodeId,
  detectCycles,
  toposort,
  buildValidationDag,
  L7ValidationRun,
  L7ValidationRunMode,
  validateValidationRun,
  createExecutionContext,
  sealStage,
  isStageSealed,
} from '../l7/runtime';

import {
  assembleClaim,
  resolveSupport,
  resolveChallenge,
  detectContradictionCandidates,
  clusterContradictions,
  evaluateIncompleteness,
  evaluateStaleness,
  evaluateAmbiguity,
  evaluateDegradation,
  classifyValidation,
  deriveConfidence,
  deriveRestrictionProfile,
  buildEvidencePack,
  materializeValidationOutput,
  materializeContradictionBundle,
  compareReplay,
  validateRepairHandoff,
  L7PrimitiveSurface,
} from '../l7/engine';

import {
  L7RuntimeViolationCode,
} from '../l7/validation';

import {
  runAllL7_4Invariants,
  checkInvariantA_dagLegality,
  checkInvariantB_runLineageComplete,
  checkInvariantC_classificationRespectsContradiction,
  checkInvariantD_cleanlinessRuntime,
  checkInvariantE_confidenceRespectsContradiction,
  checkInvariantF_restrictionsMatchState,
  checkInvariantG_evidencePackIntegrity,
  checkInvariantH_contradictionLinkage,
} from '../l7/invariants';

let passed = 0;
let failed = 0;
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

// ── Fixtures ────────────────────────────────────────────────────────────

function makeSubjectContract(o: Partial<L7ValidationSubjectContract> = {}): L7ValidationSubjectContract {
  const base: L7ValidationSubjectContract = {
    validation_subject_id: 'vsub_btc_price_strength',
    claim_family: 'price_strength',
    claim_name: 'price_strength_state',
    claim_version: '1.0.0',
    subject_template_id: 'tpl_price_strength_state_1_0_0',
    subject_contract_version: '7.4.0',
    schema_version: '7.4.0',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    subject_class: L7ValidationSubjectClass.STATE_CLAIM,
    hybrid_subject_classes: [],
    materiality_class: L7MaterialityClass.STANDARD,
    validation_intent: L7ValidationIntent.SUPPORT_CONFIRMATION,
    required_support_inputs: [
      { ref: 'feature://price/momentum', family: 'PRICE_FAMILY', required: true, staleness_critical: true, evidence_only: false },
      { ref: 'feature://flow/netflow', family: 'FLOW_FAMILY', required: true, staleness_critical: false, evidence_only: false },
    ],
    required_challenge_inputs: [
      { ref: 'feature://price/funding_overheated', family: 'FUNDING_FAMILY', required: true, staleness_critical: false, evidence_only: false },
    ],
    optional_context_inputs: [],
    evidence_only_inputs: [],
    support_minimums: { support: 2, challenge: 0 },
    challenge_minimums: { support: 0, challenge: 1 },
    as_of: '2026-04-17T00:00:00Z',
    validation_window: {
      kind: 'ROLLING_WINDOW',
      anchor_ts: '2026-04-17T00:00:00Z',
      lookback_seconds: 3600,
      lookforward_seconds: 0,
      calendar_tag: null,
      event_anchor_ref: null,
      timezone: 'UTC',
    },
    freshness_budget_seconds: 600,
    staleness_policy: L7StalenessPolicyClass.DOWNGRADE,
    confirmation_rules: [{ rule_id: 'cf.basic', rule_version: '1.0.0' }],
    contradiction_rules: [{ rule_id: 'ct.basic', rule_version: '1.0.0' }],
    incompleteness_rules: [{ rule_id: 'ic.basic', rule_version: '1.0.0' }],
    ambiguity_rules: [{ rule_id: 'am.basic', rule_version: '1.0.0' }],
    degradation_rules: [{ rule_id: 'dg.basic', rule_version: '1.0.0' }],
    confidence_derivation_spec: {
      policy_id: 'pol_default',
      policy_version: '1.0.0',
      required_factors: [
        'source_trust',
        'freshness',
        'feature_completeness',
        'cross_source_agreement',
        'regime_compatibility',
        'historical_reliability',
        'contradiction_penalty',
      ],
      factor_weights: {
        source_trust: 0.15,
        freshness: 0.15,
        feature_completeness: 0.15,
        cross_source_agreement: 0.15,
        regime_compatibility: 0.1,
        historical_reliability: 0.1,
        contradiction_penalty: 0.35,
      },
      caps: ['CONTRADICTION_SEVERITY_CAP', 'STALENESS_CAP'],
      materiality_modifier: 1.0,
    },
    restriction_derivation_spec: {
      policy_id: 'restr_default',
      policy_version: '1.0.0',
      deny_final_judgment_if_below_confidence: 0.4,
      require_contradiction_disclosure_if_severity_at_least: L7ContradictionSeverity.MATERIAL,
      downgrade_to_evidence_only_if_staleness_material: true,
      require_additional_confirmation_if_support_incomplete: true,
    },
    materialization_policy: 'EAGER',
    evidence_pack_policy: 'OPTIONAL',
    evidence_requirements: {
      min_support_surfaces: 2,
      min_challenge_surfaces: 1,
      required_support_patterns: ['PRICE_FAMILY', 'FLOW_FAMILY'],
      required_challenge_patterns: ['FUNDING_FAMILY'],
      evidence_pack_policy: 'OPTIONAL',
    },
    regime_assumption_profile: { declared: false, regime_tags: [], compatibility_mode: 'NONE' },
    expected_risk_overhang_types: [],
    ambiguity_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    incompleteness_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    degradation_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    staleness_tolerance_profile: { max_stale_seconds: 600, max_missing_required_surfaces: 0, max_ambiguity_score: 0.5, max_degradation_score: 0.5 },
    subject_replay_mode_eligibility: ['LIVE', 'REPLAY', 'REPAIR'],
    subject_materialization_mode_eligibility: ['EAGER', 'ON_DEMAND'],
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1', upstream_refs: [] },
    created_by: 'test',
    created_at: '2026-04-17T00:00:00Z',
    description: 'BTC price strength state',
  };
  return { ...base, ...o };
}

function makeRun(o: Partial<L7ValidationRun> = {}): L7ValidationRun {
  const base: L7ValidationRun = {
    validation_run_id: 'run_1',
    dag_version: '7.4.0',
    engine_version_set: {
      'claim-assembly-engine': '1.0.0',
      'support-surface-resolver': '1.0.0',
      'challenge-surface-resolver': '1.0.0',
      'contradiction-detection-engine': '1.0.0',
      'contradiction-cluster-engine': '1.0.0',
      'incompleteness-engine': '1.0.0',
      'staleness-engine': '1.0.0',
      'ambiguity-engine': '1.0.0',
      'degradation-engine': '1.0.0',
      'validation-classification-engine': '1.0.0',
      'validation-confidence-engine': '1.0.0',
      'restriction-profile-engine': '1.0.0',
      'validation-evidence-pack-builder': '1.0.0',
      'validation-materializer': '1.0.0',
    },
    subject_contract_version_set: { 'vsub_btc_price_strength': '7.4.0' },
    mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1',
    parent_run_id: null,
    scope_set: [{ scope_type: 'ASSET', scope_id: 'BTC' }],
    input_snapshot_ref: 'snap_1',
    started_at: '2026-04-17T00:00:00Z',
    completed_at: null,
  };
  return { ...base, ...o };
}

function makePrim(o: Partial<L7PrimitiveSurface> & { ref: string; family: string }): L7PrimitiveSurface {
  const base: L7PrimitiveSurface = {
    ref: o.ref,
    family: o.family,
    scope_type: 'ASSET',
    scope_id: 'BTC',
    as_of: '2026-04-17T00:00:00Z',
    freshness_age_seconds: 60,
    confidence: 0.85,
    completeness: 0.95,
    evidence_only: false,
    direction_signal: 'SUPPORT',
  };
  return { ...base, ...o };
}

// ── Band A — DAG primitives ─────────────────────────────────────────────

console.log('\n━━━ Band A: DAG primitives ━━━');
{
  const idA = buildDagNodeId({
    node_class: L7DagNodeClass.VALIDATION_SUBJECT_NODE,
    validation_run_id: 'r1',
    validation_subject_id: 's1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    evaluation_domain: null,
  });
  const idB = buildDagNodeId({
    node_class: L7DagNodeClass.VALIDATION_SUBJECT_NODE,
    validation_run_id: 'r1',
    validation_subject_id: 's1',
    scope_type: 'ASSET',
    scope_id: 'BTC',
    evaluation_domain: null,
  });
  assert(idA === idB, 'A.1 — buildDagNodeId is deterministic for identical inputs');

  const legalInputToSubject = LEGAL_EDGE_TRANSITIONS[L7DagEdgeClass.INPUT_TO_SUBJECT];
  assert(
    legalInputToSubject.length === 1 &&
      legalInputToSubject[0].from === L7DagNodeClass.INPUT_SURFACE_NODE &&
      legalInputToSubject[0].to === L7DagNodeClass.VALIDATION_SUBJECT_NODE,
    'A.2 — LEGAL_EDGE_TRANSITIONS maps INPUT_TO_SUBJECT correctly',
  );

  const cycleResult = detectCycles(['a', 'b', 'c'], [
    { edge_id: 'e1', edge_class: L7DagEdgeClass.INPUT_TO_SUBJECT, from_node_id: 'a', to_node_id: 'b' },
    { edge_id: 'e2', edge_class: L7DagEdgeClass.SUBJECT_TO_SUPPORT, from_node_id: 'b', to_node_id: 'c' },
    { edge_id: 'e3', edge_class: L7DagEdgeClass.CLUSTER_TO_EVALUATION, from_node_id: 'c', to_node_id: 'a' },
  ]);
  assert(!cycleResult.acyclic && cycleResult.cycles.length > 0, 'A.3 — detectCycles identifies cycles');

  const acyclic = detectCycles(['a', 'b', 'c'], [
    { edge_id: 'e1', edge_class: L7DagEdgeClass.INPUT_TO_SUBJECT, from_node_id: 'a', to_node_id: 'b' },
    { edge_id: 'e2', edge_class: L7DagEdgeClass.SUBJECT_TO_SUPPORT, from_node_id: 'b', to_node_id: 'c' },
  ]);
  assert(acyclic.acyclic, 'A.4 — detectCycles returns acyclic for a linear chain');

  const r = makeRun();
  const subj = makeSubjectContract();
  const build = buildValidationDag(r, [subj], r.engine_version_set);
  assert(build.dag !== null && build.violations.length === 0, 'A.5 — buildValidationDag emits a legal DAG');
  assert(
    (build.dag?.topological_order.length ?? 0) === (build.dag?.nodes.length ?? 0),
    'A.6 — topological order covers all nodes',
  );
  // Input → Subject must appear first; Materialization must appear last.
  const order = build.dag?.topological_order ?? [];
  const firstStage = build.dag?.nodes.find(n => n.node_id === order[0])?.stage;
  const lastStage = build.dag?.nodes.find(n => n.node_id === order[order.length - 1])?.stage;
  assert(firstStage === L7DagStage.S01_SUBJECT_INTAKE, 'A.7 — first stage is SUBJECT_INTAKE');
  assert(lastStage === L7DagStage.S14_MATERIALIZATION_PREP, 'A.8 — last stage is MATERIALIZATION_PREP');

  // toposort directly
  const ts = toposort(build.dag!.nodes, build.dag!.edges);
  assert(ts.ok && ts.order.length === build.dag!.nodes.length, 'A.9 — toposort succeeds and is complete');

  // run validation
  const rv = validateValidationRun(r);
  assert(rv.valid, 'A.10 — validateValidationRun accepts a well-formed run');
  const bad = validateValidationRun({ ...r, trace_id: '' });
  assert(!bad.valid, 'A.11 — validateValidationRun rejects missing trace_id');

  // execution context seal
  const ctx = createExecutionContext(r);
  assert(!isStageSealed(ctx, 'S01_INPUT_INTAKE'), 'A.12 — stage starts unsealed');
  sealStage(ctx, 'S01_INPUT_INTAKE');
  assert(isStageSealed(ctx, 'S01_INPUT_INTAKE'), 'A.13 — sealStage marks the stage sealed');
}

// ── Band B — Assembly + Support + Challenge engines ─────────────────────

console.log('\n━━━ Band B: Assembly + Support + Challenge engines ━━━');
{
  const s = makeSubjectContract();
  const prims = [
    makePrim({ ref: 'feature://price/momentum', family: 'PRICE_FAMILY' }),
    makePrim({ ref: 'feature://flow/netflow', family: 'FLOW_FAMILY' }),
    makePrim({ ref: 'feature://price/funding_overheated', family: 'FUNDING_FAMILY', direction_signal: 'CHALLENGE', confidence: 0.6 }),
  ];

  const assembly = assembleClaim({
    subject: s,
    primitive_availability: prims.map(p => ({ ref: p.ref, available: true, scope_type: p.scope_type, scope_id: p.scope_id, family: p.family })),
    trace_id: 'tr_1',
    manifest_id: 'mf_1',
  });
  assert(assembly.ok && assembly.value !== null, 'B.1 — assembleClaim succeeds on happy path');

  const assemblyBad = assembleClaim({
    subject: makeSubjectContract({ scope_type: 'ASSET', scope_id: '' }),
    primitive_availability: [],
    trace_id: 'tr_1',
    manifest_id: 'mf_1',
  });
  assert(!assemblyBad.ok, 'B.2 — assembleClaim fails on missing scope_id');

  const instance = assembly.value!;
  const support = resolveSupport({ subject: s, instance, primitives: prims });
  assert(support.ok && (support.value?.length ?? 0) === 2, 'B.3 — resolveSupport binds 2 support records');

  const challenge = resolveChallenge({ subject: s, instance, primitives: prims });
  assert(challenge.ok && (challenge.value?.length ?? 0) === 1, 'B.4 — resolveChallenge binds 1 challenge record');
  assert(
    challenge.value![0].challenge_class === 'SOFT_TENSION' || challenge.value![0].challenge_class === 'HARD_CONTRADICTION',
    'B.5 — challenge class is a legal contradiction/tension class',
  );

  // Evidence-only leak
  const leakSubject = makeSubjectContract({
    evidence_only_inputs: [{ ref: 'feature://price/momentum', family: 'PRICE_FAMILY', required: false, staleness_critical: false, evidence_only: true }],
  });
  const leakResolve = resolveSupport({
    subject: leakSubject,
    instance: { ...instance, bound_support_refs: ['feature://price/momentum'] },
    primitives: prims,
  });
  assert(
    !leakResolve.ok && leakResolve.violations.some(v => v.code === L7RuntimeViolationCode.SUPPORT_EVIDENCE_ONLY_LEAK),
    'B.6 — resolveSupport flags evidence-only leaking into scored support',
  );
}

// ── Band C — Contradiction detection + clustering ────────────────────────

console.log('\n━━━ Band C: Contradiction detection + clustering ━━━');
{
  const s = makeSubjectContract();
  const prims = [
    makePrim({ ref: 'feature://price/momentum', family: 'PRICE_FAMILY' }),
    makePrim({ ref: 'feature://flow/netflow', family: 'FLOW_FAMILY' }),
    makePrim({ ref: 'feature://price/funding_overheated', family: 'FUNDING_FAMILY', direction_signal: 'CHALLENGE', confidence: 0.9 }),
  ];
  const assembly = assembleClaim({
    subject: s,
    primitive_availability: prims.map(p => ({ ref: p.ref, available: true, scope_type: p.scope_type, scope_id: p.scope_id, family: p.family })),
    trace_id: 'tr_1', manifest_id: 'mf_1',
  });
  const instance = assembly.value!;
  const support = resolveSupport({ subject: s, instance, primitives: prims }).value!;
  const challenge = resolveChallenge({ subject: s, instance, primitives: prims }).value!;

  const detection = detectContradictionCandidates({ subject: s, support, challenge });
  assert(detection.ok && (detection.value?.length ?? 0) >= 1, 'C.1 — detection emits candidates for challenge surfaces');
  assert(
    detection.value!.every(c => c.contradiction_family && c.candidate_id.startsWith('cc:')),
    'C.2 — every candidate carries a typed family and deterministic id',
  );

  const cluster = clusterContradictions({
    subject: s,
    candidates: detection.value!,
    stale_support_refs: [],
    missing_support_refs: [],
    run_id: 'run_1',
    run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1',
    manifest_id: 'mf_1',
    input_snapshot_ref: 'snap_1',
    contradiction_contract_version: '7.3.0',
    schema_version: '7.4.0',
    materialization_mode: 'EAGER',
  });
  assert(cluster.ok && cluster.value !== null, 'C.3 — clusterContradictions produces a bundle contract');
  assert(
    cluster.value!.contradiction_records.length === detection.value!.length,
    'C.4 — every candidate is preserved as a record',
  );
  assert(
    cluster.value!.replay_hash.startsWith('rh_'),
    'C.5 — cluster produces deterministic replay_hash',
  );

  // Determinism: rerunning with same candidates produces same bundle hash.
  const cluster2 = clusterContradictions({
    subject: s,
    candidates: detection.value!,
    stale_support_refs: [],
    missing_support_refs: [],
    run_id: 'run_1',
    run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1',
    manifest_id: 'mf_1',
    input_snapshot_ref: 'snap_1',
    contradiction_contract_version: '7.3.0',
    schema_version: '7.4.0',
    materialization_mode: 'EAGER',
  });
  assert(cluster2.value!.replay_hash === cluster.value!.replay_hash, 'C.6 — clustering is deterministic');
}

// ── Band D — Evaluation engines ─────────────────────────────────────────

console.log('\n━━━ Band D: Evaluation engines ━━━');
{
  const s = makeSubjectContract();
  const support = [
    { support_ref: 'feature://price/momentum', family: 'PRICE_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'STALE' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.7, lineage_refs: ['feature://price/momentum'], hard_required: true },
    { support_ref: 'feature://flow/netflow', family: 'FLOW_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'PARTIAL' as const, confidence_posture: 'MEDIUM' as const, contribution_score: 0.4, lineage_refs: ['feature://flow/netflow'], hard_required: true },
  ];
  const challenge = [
    { challenge_ref: 'feature://price/funding_overheated', family: 'FUNDING_FAMILY', challenge_class: 'SOFT_TENSION' as const, severity_candidate: 'MINOR' as const, temporal_posture: 'CURRENT' as const, confidence_posture: 'MEDIUM' as const, blocks_confirmation: false, caps_confidence_only: true, lineage_refs: ['feature://price/funding_overheated'] },
  ];

  const inc = evaluateIncompleteness({ subject: s, support, challenge });
  assert(inc.ok, 'D.1 — incompleteness engine succeeds');
  const sta = evaluateStaleness({ subject: s, support, challenge });
  assert(sta.ok && sta.value!.domain === 'STALENESS', 'D.2 — staleness engine returns STALENESS domain');
  assert(sta.value!.score > 0, 'D.3 — staleness score is positive when a surface is STALE');
  const amb = evaluateAmbiguity({ subject: s, support, challenge });
  assert(amb.ok && amb.value!.domain === 'AMBIGUITY', 'D.4 — ambiguity engine returns AMBIGUITY domain');
  const deg = evaluateDegradation({ subject: s, support, challenge });
  assert(deg.ok && deg.value!.domain === 'DEGRADATION', 'D.5 — degradation engine returns DEGRADATION domain');
  // Incompleteness should NOT be treated as contradiction: domain must remain distinct.
  assert(
    inc.value!.domain === 'INCOMPLETENESS' && sta.value!.domain !== 'INCOMPLETENESS',
    'D.6 — evaluation domains remain distinct',
  );

  // Missing required support elevates incompleteness.
  const s2 = makeSubjectContract();
  const incMissing = evaluateIncompleteness({ subject: s2, support: [], challenge: [] });
  assert(incMissing.value!.score > 0 && incMissing.value!.blocks_classification, 'D.7 — incompleteness blocks when required support is fully missing');
}

// ── Band E — Classification + Confidence + Restriction ──────────────────

console.log('\n━━━ Band E: Verdict engines ━━━');
{
  const s = makeSubjectContract();
  const support = [
    { support_ref: 'feature://price/momentum', family: 'PRICE_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: ['feature://price/momentum'], hard_required: true },
    { support_ref: 'feature://flow/netflow', family: 'FLOW_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: ['feature://flow/netflow'], hard_required: true },
  ];
  const challenge: never[] = [];

  const inc = evaluateIncompleteness({ subject: s, support, challenge: [] }).value!;
  const sta = evaluateStaleness({ subject: s, support, challenge: [] }).value!;
  const amb = evaluateAmbiguity({ subject: s, support, challenge: [] }).value!;
  const deg = evaluateDegradation({ subject: s, support, challenge: [] }).value!;

  const emptyBundle: L7ContradictionBundleContract = {
    contradiction_bundle_id: 'cb:vsub_btc_price_strength:run_1',
    validation_subject_id: s.validation_subject_id,
    contradiction_contract_version: '7.3.0',
    schema_version: '7.4.0',
    scope_type: s.scope_type,
    scope_id: s.scope_id,
    as_of: s.as_of,
    contradiction_records: [],
    contradiction_cluster_count: 0,
    cluster_summary: [],
    highest_severity: L7ContradictionSeverity.INFO,
    dominant_contradiction_family: L7ContradictionFamily.PRIMITIVE_INCONSISTENCY,
    blocked_confirmation_surfaces: [],
    stale_support_refs: [],
    missing_support_refs: [],
    challenge_surface_refs: [],
    bundle_materiality_class: s.materiality_class,
    aggregate_penalty_score: 0,
    critical_contradiction_flag: false,
    degraded_evidence_flag: false,
    materialization_mode: 'EAGER',
    lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1',
    replay_hash: 'rh_empty',
  };

  const classification = classifyValidation({
    subject: s, support, challenge,
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
  });
  assert(classification.ok && classification.value !== null, 'E.1 — classifyValidation produces a classification');
  assert(
    classification.value!.validation_class === L7ValidationClass.CONFIRMED ||
      classification.value!.validation_class === L7ValidationClass.WEAKLY_CONFIRMED,
    'E.2 — strong support + zero challenge yields CONFIRMED/WEAKLY_CONFIRMED',
  );

  const confidence = deriveConfidence({
    subject: s, support, challenge,
    classification: classification.value!,
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    confidence_contract_version: '7.3.0', schema_version: '7.4.0', confidence_policy_version: '1.0.0',
  });
  assert(confidence.ok && confidence.value !== null, 'E.3 — deriveConfidence succeeds');
  assert(
    confidence.value!.confidence_score >= 0 && confidence.value!.confidence_score <= 1,
    'E.4 — confidence_score within [0,1]',
  );
  assert(confidence.value!.replay_hash.startsWith('rh_'), 'E.5 — confidence emits a replay hash');

  const restriction = deriveRestrictionProfile({
    subject: s,
    classification: classification.value!,
    confidence: confidence.value!,
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    restriction_contract_version: '7.3.0', schema_version: '7.4.0',
  });
  assert(restriction.ok && restriction.value !== null, 'E.6 — deriveRestrictionProfile succeeds');
  assert(restriction.value!.downstream_use_rights.length > 0, 'E.7 — restriction carries at least one downstream right');

  // Classification must not declare CONFIRMED while SEVERE contradiction exists.
  const severeBundle: L7ContradictionBundleContract = {
    ...emptyBundle,
    highest_severity: L7ContradictionSeverity.SEVERE,
    aggregate_penalty_score: 0.9,
    contradiction_records: [{
      contradiction_record_id: 'cr_1',
      family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
      severity: L7ContradictionSeverity.SEVERE,
      support_ref: 'feature://price/momentum',
      challenge_ref: 'feature://price/funding_overheated',
      temporal_status: 'CURRENT',
      hard_contradiction: true,
      blocked_confirmation: true,
      capped_confidence_only: false,
      evidence_refs: [],
      lineage_refs: { trace_id: 'tr_1', upstream_refs: [] },
      rationale: 'x',
      detected_at: s.as_of,
    }],
  };
  const classifySevere = classifyValidation({
    subject: s, support, challenge,
    contradiction_bundle: severeBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
  });
  assert(
    classifySevere.ok &&
      classifySevere.value!.validation_class !== L7ValidationClass.CONFIRMED &&
      classifySevere.value!.validation_class !== L7ValidationClass.WEAKLY_CONFIRMED,
    'E.8 — SEVERE contradiction prevents CONFIRMED/WEAKLY_CONFIRMED class',
  );
}

// ── Band F — Evidence pack + Materializer + Replay/Repair ───────────────

console.log('\n━━━ Band F: Evidence pack + Materialization + Replay/Repair ━━━');
{
  const s = makeSubjectContract();
  const support = [
    { support_ref: 'feature://price/momentum', family: 'PRICE_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: [], hard_required: true },
    { support_ref: 'feature://flow/netflow', family: 'FLOW_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: [], hard_required: true },
  ];
  const inc = evaluateIncompleteness({ subject: s, support, challenge: [] }).value!;
  const sta = evaluateStaleness({ subject: s, support, challenge: [] }).value!;
  const amb = evaluateAmbiguity({ subject: s, support, challenge: [] }).value!;
  const deg = evaluateDegradation({ subject: s, support, challenge: [] }).value!;
  const emptyBundle: L7ContradictionBundleContract = {
    contradiction_bundle_id: 'cb:empty', validation_subject_id: s.validation_subject_id,
    contradiction_contract_version: '7.3.0', schema_version: '7.4.0',
    scope_type: s.scope_type, scope_id: s.scope_id, as_of: s.as_of,
    contradiction_records: [], contradiction_cluster_count: 0, cluster_summary: [],
    highest_severity: L7ContradictionSeverity.INFO,
    dominant_contradiction_family: L7ContradictionFamily.PRIMITIVE_INCONSISTENCY,
    blocked_confirmation_surfaces: [], stale_support_refs: [], missing_support_refs: [], challenge_surface_refs: [],
    bundle_materiality_class: s.materiality_class, aggregate_penalty_score: 0,
    critical_contradiction_flag: false, degraded_evidence_flag: false,
    materialization_mode: 'EAGER', lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1', replay_hash: 'rh_empty',
  };
  const classification = classifyValidation({
    subject: s, support, challenge: [], contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
  }).value!;
  const confidence = deriveConfidence({
    subject: s, support, challenge: [], classification,
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    confidence_contract_version: '7.3.0', schema_version: '7.4.0', confidence_policy_version: '1.0.0',
  }).value!;
  const restriction = deriveRestrictionProfile({
    subject: s, classification, confidence, contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    restriction_contract_version: '7.3.0', schema_version: '7.4.0',
  }).value!;

  const pack = buildEvidencePack({
    subject: s, support, challenge: [],
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    classification, confidence, restriction,
    input_snapshot_ref: 'snap_1',
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', parent_run_ids: [],
  });
  assert(pack.ok && pack.value !== null, 'F.1 — buildEvidencePack succeeds');
  assert(pack.value!.replay_hash.startsWith('rh_'), 'F.2 — evidence pack has replay hash');
  assert(pack.value!.support_refs.length === 2, 'F.3 — evidence pack captures support refs');

  const contradictionMat = materializeContradictionBundle({ subject: s, bundle: emptyBundle });
  assert(contradictionMat.ok, 'F.4 — materializeContradictionBundle passes through well-formed bundle');

  const outputRes = materializeValidationOutput({
    subject: s, support,
    contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    classification, confidence, restriction,
    evidence_pack: pack.value!,
    input_snapshot_ref: 'snap_1',
    validation_contract_version: '7.3.0', schema_version: '7.4.0',
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    late_data_class: 'NONE', repair_mode: false,
  });
  assert(outputRes.ok && outputRes.value !== null, 'F.5 — materializeValidationOutput succeeds');
  const output = outputRes.value!;
  assert(output.replay_hash.startsWith('rh_'), 'F.6 — output carries replay hash');
  assert(output.validation_status === L7RuntimeStatusClass.CLEAN || output.validation_status === L7RuntimeStatusClass.DOWNGRADED, 'F.7 — validation_status derived');

  // Replay compare — identical inputs must match.
  const cmp = compareReplay({
    persisted: { ...output, replay_mode_flag: L7ReplayIdentityMode.REPLAY, compute_run_id: 'run_1' },
    recomputed: { ...output, replay_mode_flag: L7ReplayIdentityMode.REPLAY, compute_run_id: 'run_1' },
    persisted_bundle: null, recomputed_bundle: null,
  });
  assert(cmp.ok && cmp.value!.hash_matches && cmp.value!.validation_class_matches, 'F.8 — compareReplay matches identical outputs');

  // Replay hash mismatch must be rejected.
  const cmpBad = compareReplay({
    persisted: { ...output, replay_mode_flag: L7ReplayIdentityMode.REPLAY, replay_hash: 'rh_different' },
    recomputed: { ...output, replay_mode_flag: L7ReplayIdentityMode.REPLAY },
    persisted_bundle: null, recomputed_bundle: null,
  });
  assert(!cmpBad.ok && cmpBad.violations.some(v => v.code === L7RuntimeViolationCode.REPLAY_HASH_DIVERGED), 'F.9 — compareReplay detects hash divergence');

  // Repair adapter — original vs repaired must have distinct run ids, marked as REPAIR.
  const repaired = {
    ...output,
    compute_run_id: 'run_2',
    replay_mode_flag: L7ReplayIdentityMode.REPAIR,
    repair_mode_flag: true,
  };
  const repair = validateRepairHandoff({
    original: output,
    repaired,
    repair_reason_codes: ['STALENESS_CORRECTION'],
    parent_run_id: output.compute_run_id,
  });
  assert(repair.ok, 'F.10 — validateRepairHandoff accepts well-formed repair');

  const repairBad = validateRepairHandoff({
    original: output,
    repaired: { ...output, repair_mode_flag: false, compute_run_id: 'run_2', replay_mode_flag: L7ReplayIdentityMode.REPAIR },
    repair_reason_codes: ['STALENESS_CORRECTION'],
    parent_run_id: output.compute_run_id,
  });
  assert(
    !repairBad.ok && repairBad.violations.some(v => v.code === L7RuntimeViolationCode.REPAIR_UNMARKED),
    'F.11 — validateRepairHandoff rejects unmarked repair',
  );
}

// ── Band G — Invariants ─────────────────────────────────────────────────

console.log('\n━━━ Band G: Invariants ━━━');
{
  const r = makeRun();
  const subj = makeSubjectContract();
  const build = buildValidationDag(r, [subj], r.engine_version_set);

  // Build a complete happy path to feed every invariant.
  const support = [
    { support_ref: 'feature://price/momentum', family: 'PRICE_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: [], hard_required: true },
    { support_ref: 'feature://flow/netflow', family: 'FLOW_FAMILY', relevance_class: 'PRIMARY' as const, freshness_class: 'CURRENT' as const, completeness_class: 'FULL' as const, confidence_posture: 'HIGH' as const, contribution_score: 0.9, lineage_refs: [], hard_required: true },
  ];
  const inc = evaluateIncompleteness({ subject: subj, support, challenge: [] }).value!;
  const sta = evaluateStaleness({ subject: subj, support, challenge: [] }).value!;
  const amb = evaluateAmbiguity({ subject: subj, support, challenge: [] }).value!;
  const deg = evaluateDegradation({ subject: subj, support, challenge: [] }).value!;
  const emptyBundle: L7ContradictionBundleContract = {
    contradiction_bundle_id: 'cb:empty:run_1', validation_subject_id: subj.validation_subject_id,
    contradiction_contract_version: '7.3.0', schema_version: '7.4.0',
    scope_type: subj.scope_type, scope_id: subj.scope_id, as_of: subj.as_of,
    contradiction_records: [], contradiction_cluster_count: 0, cluster_summary: [],
    highest_severity: L7ContradictionSeverity.INFO,
    dominant_contradiction_family: L7ContradictionFamily.PRIMITIVE_INCONSISTENCY,
    blocked_confirmation_surfaces: [], stale_support_refs: [], missing_support_refs: [], challenge_surface_refs: [],
    bundle_materiality_class: subj.materiality_class, aggregate_penalty_score: 0,
    critical_contradiction_flag: false, degraded_evidence_flag: false,
    materialization_mode: 'EAGER', lineage_refs: { trace_id: 'tr_1', manifest_id: 'mf_1' },
    compute_run_id: 'run_1', replay_hash: 'rh_empty',
  };
  const classification = classifyValidation({
    subject: subj, support, challenge: [], contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
  }).value!;
  const confidence = deriveConfidence({
    subject: subj, support, challenge: [], classification, contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE, trace_id: 'tr_1', manifest_id: 'mf_1',
    confidence_contract_version: '7.3.0', schema_version: '7.4.0', confidence_policy_version: '1.0.0',
  }).value!;
  const restriction = deriveRestrictionProfile({
    subject: subj, classification, confidence, contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE, trace_id: 'tr_1', manifest_id: 'mf_1',
    restriction_contract_version: '7.3.0', schema_version: '7.4.0',
  }).value!;
  const pack = buildEvidencePack({
    subject: subj, support, challenge: [], contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    classification, confidence, restriction,
    input_snapshot_ref: 'snap_1', run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', parent_run_ids: [],
  }).value!;
  const output = materializeValidationOutput({
    subject: subj, support, contradiction_bundle: emptyBundle,
    incompleteness: inc, staleness: sta, ambiguity: amb, degradation: deg,
    classification, confidence, restriction, evidence_pack: pack,
    input_snapshot_ref: 'snap_1',
    validation_contract_version: '7.3.0', schema_version: '7.4.0',
    run_id: 'run_1', run_mode: L7ValidationRunMode.LIVE,
    trace_id: 'tr_1', manifest_id: 'mf_1',
    late_data_class: 'NONE', repair_mode: false,
  }).value!;

  const a = checkInvariantA_dagLegality([build]);
  assert(a.satisfied, 'G.1 — INV-7.4-A satisfied for a legal DAG build');

  const b = checkInvariantB_runLineageComplete([r]);
  assert(b.satisfied, 'G.2 — INV-7.4-B satisfied for complete run header');

  const c = checkInvariantC_classificationRespectsContradiction([output], new Map());
  assert(c.satisfied, 'G.3 — INV-7.4-C satisfied when no severe contradiction');

  const d = checkInvariantD_cleanlinessRuntime([output]);
  assert(d.satisfied, 'G.4 — INV-7.4-D satisfied for clean happy path output');

  const e = checkInvariantE_confidenceRespectsContradiction(
    [confidence],
    new Map(),
  );
  assert(e.satisfied, 'G.5 — INV-7.4-E satisfied when confidence honours cap chain');

  const f = checkInvariantF_restrictionsMatchState([output], new Map([[restriction.restriction_profile_id, restriction]]));
  assert(f.satisfied, 'G.6 — INV-7.4-F satisfied for legal restriction posture');

  const g = checkInvariantG_evidencePackIntegrity([pack]);
  assert(g.satisfied, 'G.7 — INV-7.4-G satisfied for complete evidence pack');

  const h = checkInvariantH_contradictionLinkage([output], new Map());
  assert(h.satisfied, 'G.8 — INV-7.4-H satisfied when output does not claim contradiction');

  const all = runAllL7_4Invariants({
    runs: [r],
    dagBuilds: [build],
    outputs: [output],
    bundles: [],
    confidences: [confidence],
    restrictions: [restriction],
    evidencePacks: [pack],
  });
  assert(all.length === 8 && all.every(x => x.satisfied), 'G.9 — runAllL7_4Invariants returns 8 green invariants');
}

// ── Summary ─────────────────────────────────────────────────────────────
console.log('\n' + '━'.repeat(72));
console.log(`L7.4 Certification: ${passed} passed, ${failed} failed`);
console.log('━'.repeat(72));
if (failed > 0) process.exit(1);
