/**
 * L6.9 — Ratification, Freeze, and Completion Standard
 *
 * Certification Test Suite — 6 Bands + Invariants + Handoff + Audit:
 *   A — Final definition and consistency
 *   B — Completion standard
 *   C — Freeze and extension law
 *   D — Downstream dependency and handoff
 *   E — Ratification artifact and audit
 *   F — Full-layer closure
 *   G — Invariants INV-6.9-A through INV-6.9-G
 */

import {
  // final definition
  L6_LAYER_ID,
  L6_CANONICAL_DEFINITION,
  L6_MINIMAL_DEFINITION,
  L6_EXPANDED_DEFINITION,
  L6_DEPENDENCY_FINALITY,
  L6_OUTPUT_FINALITY,
  L6_NEGATIVE_DEFINITION,
  L6_EXECUTION_SEQUENCE,
  L6_STRUCTURAL_FORM,
  L6_DEFINITION_SURFACE,
  REQUIRED_SUBLAYERS,

  // completion standard
  L6CompletionDimension,
  ALL_COMPLETION_DIMENSIONS,
  L6CompletionState,
  ALL_COMPLETION_STATES,
  L6RatificationViolationCode,
  ALL_RATIFICATION_VIOLATION_CODES,
  L6_COMPLETION_REQUIREMENTS,

  // freeze policy
  L6FreezeStatus,
  ALL_FREEZE_STATUSES,
  L6_FROZEN_SURFACES,
  L6_EVOLVABLE_SURFACES,
  L6_HARD_PROTECTED_SURFACES,
  L6_FREEZE_POLICY_V1,

  // extension policy
  L6ExtensionClass,
  ALL_EXTENSION_CLASSES,
  L6_EXTENSION_POLICY_V1,

  // downstream dependency
  L6DependencyAllowance,
  ALL_DEPENDENCY_ALLOWANCES,
  L6DownstreamAccessKind,
  ALL_DOWNSTREAM_ACCESS_KINDS,
  L6_STABLE_HANDOFF_SURFACES,
  L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L6_GOVERNED_ONLY_ACCESS_KINDS,
  L6DownstreamConsumerMode,
} from '../l6/contracts';

import {
  Layer6CompletionValidator,
  Layer6RatificationBuilder,
  Layer6FreezePolicyValidator,
  Layer6ExtensionClassifier,
  Layer6DownstreamDependencyValidator,
  registerRatificationArtifact,
  getLatestRatificationArtifact,
  listRatificationArtifacts,
  clearRatificationArtifacts,
  canonicalizeRatification,
  ratificationFingerprint,
} from '../l6/completion';

import {
  emitRatificationDecision,
  emitCompletionFailure,
  emitFreezeActivation,
  emitExtensionClassification,
  emitDownstreamDependencyViolation,
  listFinalAuditRecords,
  queryFinalAuditByKind,
  queryFinalAuditBySubject,
  clearFinalAuditLog,
  L6FinalAuditKind,
  L6FinalAuditSeverity,
} from '../l6/constitution';

import {
  checkINV_69_A,
  checkINV_69_B,
  checkINV_69_C,
  checkINV_69_D,
  checkINV_69_E,
  checkINV_69_F,
  checkINV_69_G,
  checkAllL6_9Invariants,
  buildGreenEvidence,
} from '../l6/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; } else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('L6.9 — Ratification, Freeze, and Completion Standard');
  console.log('================================================================');

  clearRatificationArtifacts();
  clearFinalAuditLog();

  // ---------------- Band A ----------------
  console.log('\n[Band A] Final definition and consistency');
  assert(L6_LAYER_ID === 'L6', 'A.01 layer id is L6');
  assert(L6_CANONICAL_DEFINITION.includes('Feature & Event Engine'),
    'A.02 canonical definition mentions Feature & Event Engine');
  assert(L6_MINIMAL_DEFINITION.length > 0, 'A.03 minimal definition present');
  assert(L6_EXPANDED_DEFINITION.length >= 3, 'A.04 expanded definition ≥ 3 sentences');
  assert(L6_NEGATIVE_DEFINITION.length >= 5, 'A.05 negative definition ≥ 5 items');
  assert(L6_NEGATIVE_DEFINITION.some(n => n.includes('judgment')),
    'A.06 negative definition excludes judgment');
  assert(L6_NEGATIVE_DEFINITION.some(n => n.includes('score')),
    'A.07 negative definition excludes score-finalization');
  assert(L6_DEPENDENCY_FINALITY.L3.length > 0 &&
         L6_DEPENDENCY_FINALITY.L4.length > 0 &&
         L6_DEPENDENCY_FINALITY.L5.length > 0,
    'A.08 dependency finality covers L3/L4/L5');
  assert(L6_OUTPUT_FINALITY.length >= 5, 'A.09 output finality ≥ 5 surfaces');
  assert(L6_OUTPUT_FINALITY.some(o => o.includes('evidence packs')),
    'A.10 output finality includes evidence packs');
  assert(L6_EXECUTION_SEQUENCE.length === 9, 'A.11 execution sequence has 9 steps');
  assert(L6_EXECUTION_SEQUENCE[0] === 'L6.1' &&
         L6_EXECUTION_SEQUENCE[L6_EXECUTION_SEQUENCE.length - 1] === 'L6.9',
    'A.12 execution sequence runs L6.1 → L6.9');
  assert(L6_STRUCTURAL_FORM.length === 9, 'A.13 nine structural top-level sections');
  assert(REQUIRED_SUBLAYERS.length === 8, 'A.14 eight required sublayers for ratification');
  assert(L6_DEFINITION_SURFACE.includes(L6_CANONICAL_DEFINITION),
    'A.15 definition surface includes canonical');

  // ---------------- Band B ----------------
  console.log('\n[Band B] Completion standard');
  assert(ALL_COMPLETION_DIMENSIONS.length === 4, 'B.01 four completion dimensions');
  assert(ALL_COMPLETION_STATES.length === 3, 'B.02 three completion states');
  assert(ALL_RATIFICATION_VIOLATION_CODES.length >= 10,
    'B.03 ≥ 10 ratification violation codes');
  for (const d of ALL_COMPLETION_DIMENSIONS) {
    const req = L6_COMPLETION_REQUIREMENTS[d];
    assert(req !== undefined && req.bullets.length > 0, `B.req.${d}`);
  }

  const validator = new Layer6CompletionValidator();
  const green = validator.validate(buildGreenEvidence());
  assert(green.overall_state === L6CompletionState.L6_PRODUCTION_READY,
    'B.04 green evidence → PRODUCTION_READY');
  assert(green.dimensions.every(dd => dd.satisfied), 'B.05 all dimensions satisfied');
  assert(green.violations.length === 0, 'B.06 no violations');

  const noOps = validator.validate({ ...buildGreenEvidence(), runtime_deterministic: false });
  assert(noOps.overall_state === L6CompletionState.L6_CONSTITUTIONALLY_READY,
    'B.07 operational gap → CONSTITUTIONALLY_READY');
  assert(noOps.dimensions.find(d => d.dimension === L6CompletionDimension.OPERATIONAL)!.satisfied === false,
    'B.08 operational dimension not satisfied');
  assert(noOps.violations.includes(L6RatificationViolationCode.OPERATIONAL_INCOMPLETE),
    'B.09 operational incomplete violation emitted');

  const noConst = validator.validate({
    ...buildGreenEvidence(),
    invariants_all_green: false,
  });
  assert(noConst.overall_state === L6CompletionState.L6_NOT_READY,
    'B.10 constitutional failure → NOT_READY');
  assert(noConst.violations.includes(L6RatificationViolationCode.INVARIANT_FAILED),
    'B.11 INVARIANT_FAILED emitted');

  // ---------------- Band C ----------------
  console.log('\n[Band C] Freeze and extension law');
  assert(ALL_FREEZE_STATUSES.length === 3, 'C.01 three freeze statuses');
  assert(L6_FROZEN_SURFACES.length >= 10, 'C.02 ≥ 10 frozen surfaces');
  assert(L6_EVOLVABLE_SURFACES.length >= 5, 'C.03 ≥ 5 evolvable surfaces');
  assert(L6_HARD_PROTECTED_SURFACES.length >= 5, 'C.04 ≥ 5 hard-protected surfaces');
  assert(L6_FREEZE_POLICY_V1.version === '1.0.0', 'C.05 freeze policy v1.0.0');

  const fv = new Layer6FreezePolicyValidator();
  const freezeNoRat = fv.activate({
    request_id: 'c-1',
    target_status: L6FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L6_FREEZE_POLICY_V1,
  });
  assert(!freezeNoRat.allowed, 'C.06 freeze blocked without ratification');
  assert(freezeNoRat.violations.includes(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION),
    'C.07 FREEZE_WITHOUT_RATIFICATION emitted');

  const classifier = new Layer6ExtensionClassifier();
  assert(ALL_EXTENSION_CLASSES.length === 5, 'C.08 five extension classes');
  const addSafe = classifier.classify({
    proposal_id: 'ext-add',
    title: 'add new family',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_primitive_meaning: false,
    alters_event_lifecycle: false,
    alters_current_state_authority: false,
    alters_replay_identity: false,
    alters_contract_required_fields: false,
    alters_late_data_law: false,
    is_additive_only: true,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    notes: '',
  });
  assert(addSafe.classification === L6ExtensionClass.ADDITIVE_SAFE, 'C.09 additive → ADDITIVE_SAFE');
  assert(!addSafe.requires_recertification, 'C.10 additive does not require re-cert');

  const breakSem = classifier.classify({
    proposal_id: 'ext-break',
    title: 'change primitive meaning',
    touches_frozen_surface: true,
    touches_hard_protected_surface: true,
    alters_primitive_meaning: true,
    alters_event_lifecycle: true,
    alters_current_state_authority: false,
    alters_replay_identity: true,
    alters_contract_required_fields: false,
    alters_late_data_law: false,
    is_additive_only: false,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
    notes: '',
  });
  assert(breakSem.classification === L6ExtensionClass.PROHIBITED ||
         breakSem.classification === L6ExtensionClass.BREAKING_SEMANTIC,
    'C.11 breaking-surface proposal classified as PROHIBITED/BREAKING_SEMANTIC');
  assert(breakSem.requires_recertification, 'C.12 breaking requires re-cert');

  const migration = classifier.classify({
    proposal_id: 'ext-mig',
    title: 'migrate frozen surface without preserving replay',
    touches_frozen_surface: true,
    touches_hard_protected_surface: false,
    alters_primitive_meaning: false,
    alters_event_lifecycle: false,
    alters_current_state_authority: false,
    alters_replay_identity: false,
    alters_contract_required_fields: false,
    alters_late_data_law: false,
    is_additive_only: false,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
    notes: '',
  });
  assert(migration.classification === L6ExtensionClass.MIGRATION_REQUIRED,
    'C.13 frozen surface + no preservation → MIGRATION_REQUIRED');
  assert(classifier.requiresRecertification(L6ExtensionClass.BREAKING_SEMANTIC),
    'C.14 BREAKING_SEMANTIC requires re-cert');
  assert(!classifier.requiresRecertification(L6ExtensionClass.ADDITIVE_SAFE),
    'C.15 ADDITIVE_SAFE does not require re-cert');
  assert(L6_EXTENSION_POLICY_V1.recertification_required_for.length >= 2,
    'C.16 extension policy v1 has ≥ 2 recert classes');

  // ---------------- Band D ----------------
  console.log('\n[Band D] Downstream dependency and handoff');
  assert(ALL_DEPENDENCY_ALLOWANCES.length === 3, 'D.01 three dependency allowances');
  assert(ALL_DOWNSTREAM_ACCESS_KINDS.length >= 14, 'D.02 downstream access kinds ≥ 14');
  assert(L6_STABLE_HANDOFF_SURFACES.length === 8, 'D.03 eight stable handoff surfaces');
  assert(L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length >= 6, 'D.04 ≥ 6 forbidden access kinds');
  assert(L6_GOVERNED_ONLY_ACCESS_KINDS.includes(L6DownstreamAccessKind.AD_HOC_RECOMPUTE),
    'D.05 ad hoc recompute is governed-only');

  const dv = new Layer6DownstreamDependencyValidator();
  const ctxReady = { freeze_status: L6FreezeStatus.FROZEN, downstream_dependency_allowed: true };
  const ctxNotReady = { freeze_status: L6FreezeStatus.OPEN, downstream_dependency_allowed: false };

  for (const kind of L6_STABLE_HANDOFF_SURFACES) {
    const d = dv.validate({
      request_id: `d-stable-${kind}`,
      consumer_layer: 'L7',
      access_kind: kind,
      consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    }, ctxReady);
    assert(d.allowance === L6DependencyAllowance.ALLOWED, `D.stable.${kind}`);
  }
  for (const kind of L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
    const d = dv.validate({
      request_id: `d-forb-${kind}`,
      consumer_layer: 'L7',
      access_kind: kind,
      consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    }, ctxReady);
    assert(d.allowance === L6DependencyAllowance.FORBIDDEN, `D.forbidden.${kind}`);
  }

  const adHocNormal = dv.validate({
    request_id: 'd-adhoc-normal',
    consumer_layer: 'L7',
    access_kind: L6DownstreamAccessKind.AD_HOC_RECOMPUTE,
    consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  }, ctxReady);
  assert(adHocNormal.allowance === L6DependencyAllowance.FORBIDDEN,
    'D.06 ad hoc recompute forbidden in normal mode');

  const adHocReplay = dv.validate({
    request_id: 'd-adhoc-replay',
    consumer_layer: 'L7',
    access_kind: L6DownstreamAccessKind.AD_HOC_RECOMPUTE,
    consumer_mode: L6DownstreamConsumerMode.GOVERNED_REPLAY,
    notes: '',
  }, ctxReady);
  assert(adHocReplay.allowance === L6DependencyAllowance.REQUIRES_GOVERNED_MODE,
    'D.07 ad hoc recompute allowed under governed replay');

  const stableNotReady = dv.validate({
    request_id: 'd-stable-notready',
    consumer_layer: 'L7',
    access_kind: L6DownstreamAccessKind.CURRENT_FEATURE_SNAPSHOT,
    consumer_mode: L6DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  }, ctxNotReady);
  assert(stableNotReady.allowance === L6DependencyAllowance.FORBIDDEN,
    'D.08 stable surface forbidden when layer not ready');

  // ---------------- Band E ----------------
  console.log('\n[Band E] Ratification artifact and audit');
  const builder = new Layer6RatificationBuilder();
  const completion = validator.validate(buildGreenEvidence());
  const certRefs = REQUIRED_SUBLAYERS.map(sl => ({
    sublayer: sl,
    version: '1.0.0',
    certification_run_id: `cert-${sl}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [] as readonly string[],
  }));
  const { artifact, allowed, blocking_violations } = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-1',
    sub_layer_versions: Object.fromEntries(certRefs.map(c => [c.sublayer, c.version])),
    certification_artifact_refs: certRefs,
    completion,
    freeze_status: L6FreezeStatus.FROZEN,
    extension_policy_version: L6_EXTENSION_POLICY_V1.version,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L6.9-v1',
    final_definition_surface: L6_DEFINITION_SURFACE,
    execution_sequence: L6_EXECUTION_SEQUENCE,
  });
  assert(allowed, 'E.01 green inputs → ratification allowed');
  assert(blocking_violations.length === 0, 'E.02 no blocking violations on green');
  assert(artifact.layer_id === 'L6', 'E.03 artifact layer_id');
  assert(artifact.completion_result === L6CompletionState.L6_PRODUCTION_READY,
    'E.04 completion result PRODUCTION_READY');
  assert(artifact.freeze_status === L6FreezeStatus.FROZEN, 'E.05 freeze status respected on green');
  assert(artifact.downstream_dependency_allowed, 'E.06 downstream dependency allowed on green');
  assert(artifact.artifact_hash.length === 8, 'E.07 fnv32 hex hash');
  assert(artifact.final_definition_surface_hash.length === 8, 'E.08 def surface hash present');
  assert(artifact.execution_sequence_hash.length === 8, 'E.09 exec sequence hash present');
  const canon1 = canonicalizeRatification(artifact);
  const canon2 = canonicalizeRatification(artifact);
  assert(canon1 === canon2, 'E.10 canonicalization is deterministic');
  assert(ratificationFingerprint(canon1) === ratificationFingerprint(canon2),
    'E.11 fingerprint deterministic');

  registerRatificationArtifact(artifact);
  assert(getLatestRatificationArtifact()?.ratification_run_id === 'rat-1',
    'E.12 latest artifact retrievable');
  assert(listRatificationArtifacts().length === 1, 'E.13 ratification log length');

  const auditRat = emitRatificationDecision('rat-1', true, []);
  assert(auditRat.severity === L6FinalAuditSeverity.INFO, 'E.14 allowed ratification → INFO');
  const auditFrz = emitFreezeActivation('f-1', L6FreezeStatus.FROZEN, true, [], 'ok');
  assert(auditFrz.kind === L6FinalAuditKind.FREEZE_ACTIVATION, 'E.15 freeze audit kind');
  const auditExt = emitExtensionClassification(addSafe);
  assert(auditExt.kind === L6FinalAuditKind.EXTENSION_CLASSIFICATION, 'E.16 extension audit kind');
  const auditDep = emitDownstreamDependencyViolation(
    adHocNormal,
    L6RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY,
  );
  assert(auditDep.severity === L6FinalAuditSeverity.BLOCK, 'E.17 dep violation → BLOCK');
  const all = listFinalAuditRecords();
  assert(all.length === 4, 'E.18 four audit records recorded');
  assert(queryFinalAuditByKind(L6FinalAuditKind.RATIFICATION_DECISION).length === 1,
    'E.19 query by kind');
  assert(queryFinalAuditBySubject('rat-1').length >= 1, 'E.20 query by subject');

  // ---------------- Band F ----------------
  console.log('\n[Band F] Full-layer closure');
  const missing = certRefs.filter(r => r.sublayer !== 'L6.5');
  const missingEvidence = buildGreenEvidence();
  type SublayerCertEntry = typeof missingEvidence.sublayer_certifications[string];
  const missingSublayerCerts: Record<string, SublayerCertEntry> = {};
  for (const [k, v] of Object.entries(missingEvidence.sublayer_certifications)) {
    if (k !== 'L6.5') missingSublayerCerts[k] = v;
  }
  const missingBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-missing',
    sub_layer_versions: Object.fromEntries(missing.map(c => [c.sublayer, c.version])),
    certification_artifact_refs: missing,
    completion: validator.validate({
      ...missingEvidence,
      sublayer_certifications: missingSublayerCerts,
    }),
    freeze_status: L6FreezeStatus.FROZEN,
    extension_policy_version: L6_EXTENSION_POLICY_V1.version,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L6.9-v1',
    final_definition_surface: L6_DEFINITION_SURFACE,
    execution_sequence: L6_EXECUTION_SEQUENCE,
  });
  assert(!missingBuild.allowed, 'F.01 missing sublayer blocks ratification');
  assert(missingBuild.blocking_violations.includes(L6RatificationViolationCode.MISSING_SUBLAYER),
    'F.02 MISSING_SUBLAYER surfaced');
  assert(missingBuild.artifact.freeze_status === L6FreezeStatus.OPEN,
    'F.03 freeze forced OPEN on block');
  assert(!missingBuild.artifact.downstream_dependency_allowed,
    'F.04 downstream dependency forced false on block');

  const badOps = validator.validate({
    ...buildGreenEvidence(),
    observability_slo_complete: false,
  });
  const opsBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-noobs',
    sub_layer_versions: Object.fromEntries(certRefs.map(c => [c.sublayer, c.version])),
    certification_artifact_refs: certRefs,
    completion: badOps,
    freeze_status: L6FreezeStatus.FROZEN,
    extension_policy_version: L6_EXTENSION_POLICY_V1.version,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L6.9-v1',
    final_definition_surface: L6_DEFINITION_SURFACE,
    execution_sequence: L6_EXECUTION_SEQUENCE,
  });
  assert(!opsBuild.allowed, 'F.05 observability gap blocks ratification');
  assert(opsBuild.blocking_violations.includes(L6RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH),
    'F.06 observability breach code surfaced');

  const fvFinal = new Layer6FreezePolicyValidator();
  const freezeOpsBad = fvFinal.activate({
    request_id: 'f-obsbad',
    target_status: L6FreezeStatus.FROZEN,
    ratification: opsBuild.artifact,
    freeze_policy: L6_FREEZE_POLICY_V1,
  });
  assert(!freezeOpsBad.allowed, 'F.07 freeze blocked when ratification has blockers');

  const freezeGood = fvFinal.activate({
    request_id: 'f-good',
    target_status: L6FreezeStatus.FROZEN,
    ratification: artifact,
    freeze_policy: L6_FREEZE_POLICY_V1,
  });
  assert(freezeGood.allowed, 'F.08 freeze allowed when ratification green');
  assert(freezeGood.activated_status === L6FreezeStatus.FROZEN, 'F.09 freeze FROZEN activated');

  // ---------------- Band G ----------------
  console.log('\n[Band G] Invariants INV-6.9-A..G');
  const invA = checkINV_69_A(); assert(invA.holds, `G.A ${invA.evidence}`);
  const invB = checkINV_69_B(); assert(invB.holds, `G.B ${invB.evidence}`);
  const invC = checkINV_69_C(); assert(invC.holds, `G.C ${invC.evidence}`);
  const invD = checkINV_69_D(); assert(invD.holds, `G.D ${invD.evidence}`);
  const invE = checkINV_69_E(); assert(invE.holds, `G.E ${invE.evidence}`);
  const invF = checkINV_69_F(); assert(invF.holds, `G.F ${invF.evidence}`);
  const invG = checkINV_69_G(); assert(invG.holds, `G.G ${invG.evidence}`);
  const allInv = checkAllL6_9Invariants();
  assert(allInv.length === 7, 'G.count seven L6.9 invariants');
  assert(allInv.every(r => r.holds), 'G.all.green');

  // ---------------- Summary ----------------
  console.log('\n================================================================');
  console.log(`L6.9 RATIFICATION — passed=${passed} failed=${failed}`);
  console.log('================================================================');
  if (failed > 0) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('\n✓ Layer 6 closure, ratification, and completion law green.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
