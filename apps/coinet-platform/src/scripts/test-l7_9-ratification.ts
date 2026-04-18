/**
 * L7.9 — Ratification, Freeze, and Completion Standard
 *
 * Certification Test Suite — 7 Bands:
 *   A — Final definition and consistency
 *   B — Completion standard
 *   C — Freeze and extension law
 *   D — Downstream dependency and handoff
 *   E — Ratification artifact and audit
 *   F — Full-layer closure (block/green paths, freeze activator)
 *   G — Invariants INV-7.9-A through INV-7.9-G
 */

import {
  // final definition
  L7_LAYER_ID,
  L7_CANONICAL_DEFINITION,
  L7_MINIMAL_DEFINITION,
  L7_EXPANDED_DEFINITION,
  L7_DEPENDENCY_FINALITY,
  L7_OUTPUT_FINALITY,
  L7_NEGATIVE_DEFINITION,
  L7_EXECUTION_SEQUENCE,
  L7_STRUCTURAL_FORM,
  L7_DEFINITION_SURFACE,
  L7_REQUIRED_SUBLAYERS,

  // completion standard
  L7CompletionDimension,
  ALL_L7_COMPLETION_DIMENSIONS,
  L7CompletionState,
  ALL_L7_COMPLETION_STATES,
  L7RatificationViolationCode,
  ALL_L7_RATIFICATION_VIOLATION_CODES,
  L7_COMPLETION_REQUIREMENTS,

  // freeze policy
  L7FreezeStatus,
  ALL_L7_FREEZE_STATUSES,
  L7_FROZEN_SURFACES,
  L7_EVOLVABLE_SURFACES,
  L7_HARD_PROTECTED_SURFACES,
  L7_FREEZE_POLICY_V1,

  // extension policy
  L7ExtensionClass,
  ALL_L7_EXTENSION_CLASSES,
  L7_EXTENSION_POLICY_V1,

  // downstream dependency
  L7DependencyAllowance,
  ALL_L7_DEPENDENCY_ALLOWANCES,
  L7DownstreamAccessKind,
  ALL_L7_DOWNSTREAM_ACCESS_KINDS,
  L7_STABLE_HANDOFF_SURFACES,
  L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L7_GOVERNED_ONLY_ACCESS_KINDS,
  L7DownstreamConsumerMode,
} from '../l7/contracts';

import {
  Layer7CompletionValidator,
  Layer7RatificationBuilder,
  Layer7FreezePolicyValidator,
  Layer7ExtensionClassifier,
  Layer7DownstreamDependencyValidator,
  registerL7RatificationArtifact,
  getLatestL7RatificationArtifact,
  listL7RatificationArtifacts,
  clearL7RatificationArtifacts,
  canonicalizeL7Ratification,
  l7RatificationFingerprint,
} from '../l7/completion';

import {
  emitL7RatificationDecision,
  emitL7CompletionFailure,
  emitL7FreezeActivation,
  emitL7ExtensionClassification,
  emitL7DownstreamDependencyViolation,
  listL7FinalAuditRecords,
  queryL7FinalAuditByKind,
  queryL7FinalAuditBySubject,
  clearL7FinalAuditLog,
  L7FinalAuditKind,
  L7FinalAuditSeverity,
} from '../l7/constitution';

import {
  checkINV_79_A,
  checkINV_79_B,
  checkINV_79_C,
  checkINV_79_D,
  checkINV_79_E,
  checkINV_79_F,
  checkINV_79_G,
  checkAllL7_9Invariants,
  buildL7GreenEvidence,
} from '../l7/invariants/l7_9-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
}

function baseProposal() {
  return {
    proposal_id: 'base',
    title: 'base',
    touches_frozen_surface: false,
    touches_hard_protected_surface: false,
    alters_validation_class_meaning: false,
    alters_validation_modifier_meaning: false,
    alters_contradiction_family_meaning: false,
    alters_contradiction_template_identity: false,
    alters_confidence_factor_law: false,
    alters_cap_chain_law: false,
    alters_restriction_right_law: false,
    alters_read_surface: false,
    alters_stable_handoff_surface: false,
    removes_contradiction_preservation: false,
    enables_live_raw_l6_revalidation: false,
    bypasses_contradiction_cap: false,
    introduces_final_judgment_semantics: false,
    is_additive_only: false,
    preserves_replay_hashes: true,
    preserves_historical_meaning: true,
    widens_downstream_rights: false,
    notes: '',
  };
}

async function main(): Promise<void> {
  console.log('================================================================');
  console.log('L7.9 — Ratification, Freeze, and Completion Standard');
  console.log('================================================================');

  clearL7RatificationArtifacts();
  clearL7FinalAuditLog();

  // ---------------- Band A — final definition ----------------
  console.log('\n[Band A] Final definition and consistency');
  assert(L7_LAYER_ID === 'L7', 'A.01 layer id is L7');
  assert(L7_CANONICAL_DEFINITION.includes('Validation & Contradiction Engine'),
    'A.02 canonical definition mentions Validation & Contradiction Engine');
  assert(L7_MINIMAL_DEFINITION.length > 0, 'A.03 minimal definition present');
  assert(L7_EXPANDED_DEFINITION.length >= 3,
    'A.04 expanded definition ≥ 3 sentences');
  assert(L7_NEGATIVE_DEFINITION.length >= 5,
    'A.05 negative definition ≥ 5 items');
  assert(L7_NEGATIVE_DEFINITION.some(n => n.includes('judgment')),
    'A.06 negative definition excludes final judgment');
  assert(L7_NEGATIVE_DEFINITION.some(n => n.includes('scoring') ||
                                          n.includes('score')),
    'A.07 negative definition excludes deterministic scoring');
  assert(L7_DEPENDENCY_FINALITY.L3.length > 0 &&
         L7_DEPENDENCY_FINALITY.L4.length > 0 &&
         L7_DEPENDENCY_FINALITY.L5.length > 0 &&
         L7_DEPENDENCY_FINALITY.L6.length > 0,
    'A.08 dependency finality covers L3/L4/L5/L6');
  assert(L7_OUTPUT_FINALITY.length >= 5, 'A.09 output finality ≥ 5 surfaces');
  assert(L7_OUTPUT_FINALITY.some(o => o.includes('contradiction')),
    'A.10 output finality includes contradiction bundles');
  assert(L7_OUTPUT_FINALITY.some(o => o.includes('evidence')),
    'A.11 output finality includes evidence-backed read surfaces');
  assert(L7_EXECUTION_SEQUENCE.length === 9, 'A.12 execution sequence has 9 steps');
  assert(L7_EXECUTION_SEQUENCE[0] === 'L7.1' &&
         L7_EXECUTION_SEQUENCE[L7_EXECUTION_SEQUENCE.length - 1] === 'L7.9',
    'A.13 execution sequence runs L7.1 → L7.9');
  assert(L7_STRUCTURAL_FORM.length === 9, 'A.14 nine structural sections');
  assert(L7_REQUIRED_SUBLAYERS.length === 8,
    'A.15 eight required sublayers for ratification');
  assert(L7_DEFINITION_SURFACE.includes(L7_CANONICAL_DEFINITION),
    'A.16 definition surface includes canonical');

  // ---------------- Band B — completion standard ----------------
  console.log('\n[Band B] Completion standard');
  assert(ALL_L7_COMPLETION_DIMENSIONS.length === 4,
    'B.01 four completion dimensions');
  assert(ALL_L7_COMPLETION_STATES.length === 3, 'B.02 three completion states');
  assert(ALL_L7_RATIFICATION_VIOLATION_CODES.length >= 15,
    `B.03 ≥15 ratification violation codes (got ${ALL_L7_RATIFICATION_VIOLATION_CODES.length})`);
  for (const d of ALL_L7_COMPLETION_DIMENSIONS) {
    const req = L7_COMPLETION_REQUIREMENTS[d];
    assert(req !== undefined && req.bullets.length > 0, `B.req.${d}`);
  }

  const validator = new Layer7CompletionValidator();
  const green = validator.validate(buildL7GreenEvidence());
  assert(green.overall_state === L7CompletionState.L7_PRODUCTION_READY,
    'B.04 green evidence → PRODUCTION_READY');
  assert(green.dimensions.every(dd => dd.satisfied),
    'B.05 all dimensions satisfied');
  assert(green.violations.length === 0, 'B.06 no violations');

  const noRuntime = validator.validate({
    ...buildL7GreenEvidence(),
    contradiction_clustering_deterministic: false,
  });
  assert(noRuntime.overall_state !== L7CompletionState.L7_PRODUCTION_READY,
    'B.07 runtime gap → not production-ready');
  assert(noRuntime.dimensions.find(
    d => d.dimension === L7CompletionDimension.RUNTIME)!.satisfied === false,
    'B.08 runtime dimension not satisfied');
  assert(noRuntime.violations.includes(
    L7RatificationViolationCode.RUNTIME_INCOMPLETE),
    'B.09 RUNTIME_INCOMPLETE emitted');

  const noAssurance = validator.validate({
    ...buildL7GreenEvidence(),
    l78_certification_production_green: false,
  });
  assert(noAssurance.violations.includes(
    L7RatificationViolationCode.CERTIFICATION_NOT_GREEN),
    'B.10 CERTIFICATION_NOT_GREEN emitted');

  const noPersistence = validator.validate({
    ...buildL7GreenEvidence(),
    l5_only_persistence_authority: false,
  });
  assert(noPersistence.violations.includes(
    L7RatificationViolationCode.PERSISTENCE_CONSTITUTION_INCOMPLETE),
    'B.11 PERSISTENCE_CONSTITUTION_INCOMPLETE emitted');

  const noInv = validator.validate({
    ...buildL7GreenEvidence(),
    invariants_all_green: false,
  });
  assert(noInv.violations.includes(L7RatificationViolationCode.INVARIANT_FAILED),
    'B.12 INVARIANT_FAILED emitted');
  assert(noInv.overall_state === L7CompletionState.L7_NOT_READY,
    'B.13 constitutional failure → NOT_READY');

  // ---------------- Band C — freeze + extension law ----------------
  console.log('\n[Band C] Freeze and extension law');
  assert(ALL_L7_FREEZE_STATUSES.length === 3, 'C.01 three freeze statuses');
  assert(L7_FROZEN_SURFACES.length >= 10,
    `C.02 ≥10 frozen surfaces (got ${L7_FROZEN_SURFACES.length})`);
  assert(L7_EVOLVABLE_SURFACES.length >= 5, 'C.03 ≥5 evolvable surfaces');
  assert(L7_HARD_PROTECTED_SURFACES.length >= 5,
    'C.04 ≥5 hard-protected surfaces');
  assert(L7_FREEZE_POLICY_V1.version === '1.0.0', 'C.05 freeze policy v1.0.0');

  const fv = new Layer7FreezePolicyValidator();
  const freezeNoRat = fv.activate({
    request_id: 'c-1',
    target_status: L7FreezeStatus.FROZEN,
    ratification: null,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  assert(!freezeNoRat.allowed, 'C.06 freeze blocked without ratification');
  assert(freezeNoRat.violations.includes(
    L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION),
    'C.07 FREEZE_WITHOUT_RATIFICATION emitted');

  const classifier = new Layer7ExtensionClassifier();
  assert(ALL_L7_EXTENSION_CLASSES.length === 5, 'C.08 five extension classes');

  const addSafe = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-add',
    title: 'add new fixture',
    is_additive_only: true,
  });
  assert(addSafe.classification === L7ExtensionClass.ADDITIVE_SAFE,
    'C.09 pure additive → ADDITIVE_SAFE');
  assert(!addSafe.requires_recertification,
    'C.10 additive does not require re-cert');

  const breakClass = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-break',
    title: 'change validation class meaning',
    touches_frozen_surface: true,
    alters_validation_class_meaning: true,
  });
  assert(breakClass.classification === L7ExtensionClass.BREAKING_SEMANTIC,
    'C.11 altered class meaning → BREAKING_SEMANTIC');
  assert(breakClass.requires_recertification, 'C.12 breaking requires re-cert');

  const prohibitedOntology = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-ontology',
    title: 'alter contradiction family meaning on hard-protected surface',
    touches_frozen_surface: true,
    touches_hard_protected_surface: true,
    alters_contradiction_family_meaning: true,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
  });
  assert(prohibitedOntology.classification === L7ExtensionClass.PROHIBITED,
    'C.13 hard-protected + breaker + no preservation → PROHIBITED');

  const prohibitedJudgment = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-judgment',
    title: 'introduce final judgment semantics',
    introduces_final_judgment_semantics: true,
  });
  assert(prohibitedJudgment.classification === L7ExtensionClass.PROHIBITED,
    'C.14 final-judgment semantics → PROHIBITED');

  const prohibitedBypass = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-bypass',
    title: 'bypass contradiction cap',
    bypasses_contradiction_cap: true,
  });
  assert(prohibitedBypass.classification === L7ExtensionClass.PROHIBITED,
    'C.15 cap bypass → PROHIBITED');

  const prohibitedRawL6 = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-rawl6',
    title: 'enable live raw L6 revalidation',
    enables_live_raw_l6_revalidation: true,
  });
  assert(prohibitedRawL6.classification === L7ExtensionClass.PROHIBITED,
    'C.16 raw-L6 revalidation → PROHIBITED');

  const migration = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-mig',
    title: 'migrate frozen surface without preserving replay',
    touches_frozen_surface: true,
    preserves_replay_hashes: false,
    preserves_historical_meaning: false,
  });
  assert(migration.classification === L7ExtensionClass.MIGRATION_REQUIRED,
    'C.17 frozen + no preservation → MIGRATION_REQUIRED');

  const readSurfaceMig = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-read',
    title: 'change read surface',
    alters_read_surface: true,
  });
  assert(readSurfaceMig.classification === L7ExtensionClass.MIGRATION_REQUIRED,
    'C.18 read surface change → MIGRATION_REQUIRED');

  const structural = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-struct',
    title: 'add optional internal metadata field',
    touches_frozen_surface: true,
  });
  assert(structural.classification === L7ExtensionClass.BACKWARD_COMPATIBLE,
    'C.19 frozen + preserved meaning → BACKWARD_COMPATIBLE');

  const widenRights = classifier.classify({
    ...baseProposal(),
    proposal_id: 'ext-widen',
    title: 'widen downstream rights without flagging breaker',
    widens_downstream_rights: true,
  });
  assert(widenRights.classification === L7ExtensionClass.BREAKING_SEMANTIC,
    'C.20 widens downstream rights → BREAKING_SEMANTIC');

  assert(classifier.requiresRecertification(L7ExtensionClass.BREAKING_SEMANTIC),
    'C.21 BREAKING_SEMANTIC requires re-cert');
  assert(!classifier.requiresRecertification(L7ExtensionClass.ADDITIVE_SAFE),
    'C.22 ADDITIVE_SAFE does not require re-cert');

  // ---------------- Band D — downstream dependency ----------------
  console.log('\n[Band D] Downstream dependency and handoff');
  assert(ALL_L7_DEPENDENCY_ALLOWANCES.length === 3,
    'D.01 three dependency allowances');
  assert(ALL_L7_DOWNSTREAM_ACCESS_KINDS.length >= 18,
    `D.02 downstream access kinds ≥18 (got ${ALL_L7_DOWNSTREAM_ACCESS_KINDS.length})`);
  assert(L7_STABLE_HANDOFF_SURFACES.length === 9,
    'D.03 nine stable handoff surfaces');
  assert(L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length >= 9,
    'D.04 ≥9 forbidden access kinds');
  assert(L7_GOVERNED_ONLY_ACCESS_KINDS.includes(
    L7DownstreamAccessKind.AD_HOC_REVALIDATION),
    'D.05 ad-hoc revalidation is governed-only');

  const dv = new Layer7DownstreamDependencyValidator();
  const ctxReady = {
    freeze_status: L7FreezeStatus.FROZEN,
    downstream_dependency_allowed: true,
  };
  const ctxNotReady = {
    freeze_status: L7FreezeStatus.OPEN,
    downstream_dependency_allowed: false,
  };

  for (const kind of L7_STABLE_HANDOFF_SURFACES) {
    const d = dv.validate({
      request_id: `d-stable-${kind}`,
      consumer_layer: 'L8',
      access_kind: kind,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    }, ctxReady);
    assert(d.allowance === L7DependencyAllowance.ALLOWED, `D.stable.${kind}`);
  }
  for (const kind of L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
    const d = dv.validate({
      request_id: `d-forb-${kind}`,
      consumer_layer: 'L8',
      access_kind: kind,
      consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
      notes: '',
    }, ctxReady);
    assert(d.allowance === L7DependencyAllowance.DENIED,
      `D.forbidden.${kind}`);
  }

  const adHocNormal = dv.validate({
    request_id: 'd-adhoc-normal',
    consumer_layer: 'L8',
    access_kind: L7DownstreamAccessKind.AD_HOC_REVALIDATION,
    consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  }, ctxReady);
  assert(adHocNormal.allowance === L7DependencyAllowance.DENIED,
    'D.06 ad-hoc revalidation denied in normal mode');

  const adHocReplay = dv.validate({
    request_id: 'd-adhoc-replay',
    consumer_layer: 'L8',
    access_kind: L7DownstreamAccessKind.AD_HOC_REVALIDATION,
    consumer_mode: L7DownstreamConsumerMode.GOVERNED_REPLAY,
    notes: '',
  }, ctxReady);
  assert(adHocReplay.allowance === L7DependencyAllowance.CONDITIONALLY_ALLOWED,
    'D.07 ad-hoc revalidation conditionally allowed under governed replay');

  const adHocRepair = dv.validate({
    request_id: 'd-adhoc-repair',
    consumer_layer: 'L8',
    access_kind: L7DownstreamAccessKind.AD_HOC_REVALIDATION,
    consumer_mode: L7DownstreamConsumerMode.GOVERNED_REPAIR,
    notes: '',
  }, ctxReady);
  assert(adHocRepair.allowance === L7DependencyAllowance.CONDITIONALLY_ALLOWED,
    'D.08 ad-hoc revalidation conditionally allowed under governed repair');

  const stableNotReady = dv.validate({
    request_id: 'd-stable-notready',
    consumer_layer: 'L8',
    access_kind: L7DownstreamAccessKind.CURRENT_VALIDATION_ASSESSMENT,
    consumer_mode: L7DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  }, ctxNotReady);
  assert(stableNotReady.allowance === L7DependencyAllowance.DENIED,
    'D.09 stable surface denied when layer not ready');

  // ---------------- Band E — artifact + audit ----------------
  console.log('\n[Band E] Ratification artifact and audit');
  const builder = new Layer7RatificationBuilder();
  const completion = validator.validate(buildL7GreenEvidence());
  const certRefs = L7_REQUIRED_SUBLAYERS.map(sl => ({
    sublayer: sl,
    version: '1.0.0',
    certification_run_id: `cert-${sl}`,
    level: 'PRODUCTION_GREEN',
    rollout_recommended: true,
    blocking_violations: [] as readonly string[],
  }));
  const { artifact, allowed, blocking_violations } = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-l7-1',
    sub_layer_versions: Object.fromEntries(
      certRefs.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: certRefs,
    completion,
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: L7_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L7_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });
  assert(allowed, `E.01 green inputs → ratification allowed (blockers=${blocking_violations.join(',')})`);
  assert(blocking_violations.length === 0, 'E.02 no blocking violations on green');
  assert(artifact.layer_id === 'L7', 'E.03 artifact layer_id is L7');
  assert(artifact.completion_result === L7CompletionState.L7_PRODUCTION_READY,
    'E.04 completion result PRODUCTION_READY');
  assert(artifact.freeze_status === L7FreezeStatus.FROZEN,
    'E.05 freeze status respected on green');
  assert(artifact.downstream_dependency_allowed,
    'E.06 downstream dependency allowed on green');
  assert(artifact.stable_handoff_surfaces.length === L7_STABLE_HANDOFF_SURFACES.length,
    'E.07 all handoff surfaces included');
  assert(/^[0-9a-f]{8}$/.test(artifact.artifact_hash), 'E.08 fnv32 hex hash');
  assert(/^[0-9a-f]{8}$/.test(artifact.final_definition_surface_hash),
    'E.09 def surface hash present');
  assert(/^[0-9a-f]{8}$/.test(artifact.execution_sequence_hash),
    'E.10 exec sequence hash present');
  assert(/^[0-9a-f]{8}$/.test(artifact.stable_handoff_surface_hash),
    'E.11 stable handoff surface hash present');

  const canon1 = canonicalizeL7Ratification(artifact);
  const canon2 = canonicalizeL7Ratification(artifact);
  assert(canon1 === canon2, 'E.12 canonicalization deterministic');
  assert(l7RatificationFingerprint(canon1) ===
         l7RatificationFingerprint(canon2),
    'E.13 fingerprint deterministic');
  const expectedHash = l7RatificationFingerprint(
    canonicalizeL7Ratification({ ...artifact, artifact_hash: '' }),
  );
  assert(expectedHash === artifact.artifact_hash,
    'E.14 artifact_hash reproducible from canonical form');

  registerL7RatificationArtifact(artifact);
  assert(getLatestL7RatificationArtifact()?.ratification_run_id === 'rat-l7-1',
    'E.15 latest artifact retrievable');
  assert(listL7RatificationArtifacts().length === 1, 'E.16 ratification log length');

  const auditRat = emitL7RatificationDecision('rat-l7-1', true, []);
  assert(auditRat.severity === L7FinalAuditSeverity.INFO,
    'E.17 allowed ratification → INFO');
  const auditFrz = emitL7FreezeActivation('f-1', L7FreezeStatus.FROZEN, true, [], 'ok');
  assert(auditFrz.kind === L7FinalAuditKind.FREEZE_ACTIVATION,
    'E.18 freeze audit kind');
  const auditExt = emitL7ExtensionClassification(addSafe);
  assert(auditExt.kind === L7FinalAuditKind.EXTENSION_CLASSIFICATION,
    'E.19 extension audit kind');
  const auditDep = emitL7DownstreamDependencyViolation(
    adHocNormal,
    L7RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY,
  );
  assert(auditDep.severity === L7FinalAuditSeverity.BLOCK,
    'E.20 dep violation → BLOCK');
  const auditCompletionFailure = emitL7CompletionFailure('rat-l7-fail', noInv);
  assert(auditCompletionFailure.severity === L7FinalAuditSeverity.BLOCK,
    'E.21 completion failure → BLOCK');

  const all = listL7FinalAuditRecords();
  assert(all.length === 5, 'E.22 five audit records recorded');
  assert(queryL7FinalAuditByKind(L7FinalAuditKind.RATIFICATION_DECISION).length === 1,
    'E.23 query by kind');
  assert(queryL7FinalAuditBySubject('rat-l7-1').length >= 1,
    'E.24 query by subject');

  // ---------------- Band F — full-layer closure ----------------
  console.log('\n[Band F] Full-layer closure');
  const missingRefs = certRefs.filter(r => r.sublayer !== 'L7.5');
  const missingEv = buildL7GreenEvidence();
  type SublayerCertEntry = typeof missingEv.sublayer_certifications[string];
  const missingSublayerCerts: Record<string, SublayerCertEntry> = {};
  for (const [k, v] of Object.entries(missingEv.sublayer_certifications)) {
    if (k !== 'L7.5') missingSublayerCerts[k] = v;
  }
  const missingBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-missing',
    sub_layer_versions: Object.fromEntries(
      missingRefs.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: missingRefs,
    completion: validator.validate({
      ...missingEv,
      sublayer_certifications: missingSublayerCerts,
    }),
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: L7_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L7_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });
  assert(!missingBuild.allowed, 'F.01 missing sublayer blocks ratification');
  assert(missingBuild.blocking_violations.includes(
    L7RatificationViolationCode.MISSING_SUBLAYER),
    'F.02 MISSING_SUBLAYER surfaced');
  assert(missingBuild.artifact.freeze_status === L7FreezeStatus.OPEN,
    'F.03 freeze forced OPEN on block');
  assert(!missingBuild.artifact.downstream_dependency_allowed,
    'F.04 downstream dependency forced false on block');

  const partialCerts = certRefs.map(r =>
    r.sublayer === 'L7.8'
      ? { ...r, level: 'RUNTIME_GREEN' }
      : r,
  );
  const partialBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-notgreen',
    sub_layer_versions: Object.fromEntries(
      partialCerts.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: partialCerts,
    completion,
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: L7_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L7_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });
  assert(!partialBuild.allowed,
    'F.05 non-production-green sub-cert blocks ratification');
  assert(partialBuild.blocking_violations.includes(
    L7RatificationViolationCode.CERTIFICATION_NOT_GREEN),
    'F.06 CERTIFICATION_NOT_GREEN surfaced');

  const noHandoffBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-nohandoff',
    sub_layer_versions: Object.fromEntries(
      certRefs.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: certRefs,
    completion,
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: L7_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: [],
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });
  assert(!noHandoffBuild.allowed, 'F.07 empty handoff blocks ratification');
  assert(noHandoffBuild.blocking_violations.includes(
    L7RatificationViolationCode.MISSING_HANDOFF_SURFACE),
    'F.08 MISSING_HANDOFF_SURFACE surfaced');

  const badObs = validator.validate({
    ...buildL7GreenEvidence(),
    no_critical_observability_breach: false,
  });
  const obsBuild = builder.build({
    layer_version: '1.0.0',
    ratification_run_id: 'rat-noobs',
    sub_layer_versions: Object.fromEntries(
      certRefs.map(c => [c.sublayer, c.version]),
    ),
    certification_artifact_refs: certRefs,
    completion: badObs,
    freeze_status: L7FreezeStatus.FROZEN,
    extension_policy_version: L7_EXTENSION_POLICY_V1.version,
    stable_handoff_surfaces: L7_STABLE_HANDOFF_SURFACES,
    downstream_dependency_allowed: true,
    ratified_by_rule_set: 'L7.9-v1',
    final_definition_surface: L7_DEFINITION_SURFACE,
    execution_sequence: L7_EXECUTION_SEQUENCE,
  });
  assert(!obsBuild.allowed, 'F.09 observability breach blocks ratification');
  assert(obsBuild.blocking_violations.includes(
    L7RatificationViolationCode.CRITICAL_OBSERVABILITY_BREACH),
    'F.10 CRITICAL_OBSERVABILITY_BREACH surfaced');

  const fvFinal = new Layer7FreezePolicyValidator();
  const freezeBadRat = fvFinal.activate({
    request_id: 'f-badrat',
    target_status: L7FreezeStatus.FROZEN,
    ratification: obsBuild.artifact,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  assert(!freezeBadRat.allowed,
    'F.11 freeze blocked when ratification has blockers');

  const freezeGood = fvFinal.activate({
    request_id: 'f-good',
    target_status: L7FreezeStatus.FROZEN,
    ratification: artifact,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  assert(freezeGood.allowed, 'F.12 freeze allowed when ratification green');
  assert(freezeGood.activated_status === L7FreezeStatus.FROZEN,
    'F.13 freeze FROZEN activated');

  const freezeHardProtected = fvFinal.activate({
    request_id: 'f-hard',
    target_status: L7FreezeStatus.HARD_PROTECTED,
    ratification: artifact,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  assert(freezeHardProtected.allowed,
    'F.14 HARD_PROTECTED allowed with green ratification');

  const freezeOpen = fvFinal.activate({
    request_id: 'f-open',
    target_status: L7FreezeStatus.OPEN,
    ratification: null,
    freeze_policy: L7_FREEZE_POLICY_V1,
  });
  assert(freezeOpen.allowed, 'F.15 OPEN target does not require ratification');

  // ---------------- Band G — invariants ----------------
  console.log('\n[Band G] Invariants INV-7.9-A..G');
  const invA = checkINV_79_A(); assert(invA.holds, `G.A ${invA.evidence}`);
  const invB = checkINV_79_B(); assert(invB.holds, `G.B ${invB.evidence}`);
  const invC = checkINV_79_C(); assert(invC.holds, `G.C ${invC.evidence}`);
  const invD = checkINV_79_D(); assert(invD.holds, `G.D ${invD.evidence}`);
  const invE = checkINV_79_E(); assert(invE.holds, `G.E ${invE.evidence}`);
  const invF = checkINV_79_F(); assert(invF.holds, `G.F ${invF.evidence}`);
  const invG = checkINV_79_G(); assert(invG.holds, `G.G ${invG.evidence}`);
  const allInv = checkAllL7_9Invariants();
  assert(allInv.length === 7, 'G.count seven L7.9 invariants');
  assert(allInv.every(r => r.holds), 'G.all.green');

  // ---------------- Summary ----------------
  console.log('\n================================================================');
  console.log(`L7.9 RATIFICATION — passed=${passed} failed=${failed}`);
  console.log('================================================================');
  if (failed > 0) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  } else {
    console.log('\n✓ Layer 7 closure, ratification, and completion law green.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
