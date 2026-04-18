/**
 * L8.9 — Ratification, Freeze, Completion, Handoff Certification
 *         Test Suite
 *
 * Seven bands (§8.9.6):
 *   A — Final definition and completion law
 *   B — Freeze and protected-surface law
 *   C — Extension and migration law
 *   D — Downstream dependency law
 *   E — Certification artifact and lineage
 *   F — Ratification and done gate
 *   G — Full master regression
 */

import {
  L8_CANONICAL_DEFINITION,
  L8_MINIMAL_DEFINITION,
  L8_EXPANDED_DEFINITION,
  L8_NEGATIVE_DEFINITION,
  L8_DEPENDENCY_FINALITY,
  L8_OUTPUT_FINALITY,
  L8_STRUCTURAL_FORM,
  L8_EXECUTION_SEQUENCE,
  L8_REQUIRED_SUBLAYERS,
  L8_DEFINITION_SURFACE,
} from '../l8/contracts/l8-final-definition';
import {
  L8CompletionDimension,
  ALL_L8_COMPLETION_DIMENSIONS,
  L8CompletionState,
  ALL_L8_COMPLETION_STATES,
  L8RatificationViolationCode,
  ALL_L8_RATIFICATION_VIOLATION_CODES,
  L8_COMPLETION_REQUIREMENTS,
} from '../l8/contracts/l8-completion-standard';
import {
  L8FreezeStatus,
  L8_FREEZE_POLICY_V1,
  L8_FROZEN_SURFACES,
  L8_EVOLVABLE_SURFACES,
  L8_HARD_PROTECTED_SURFACES,
} from '../l8/contracts/l8-freeze-policy';
import {
  L8ExtensionClass,
  ALL_L8_EXTENSION_CLASSES,
  L8_EXTENSION_POLICY_V1,
} from '../l8/contracts/l8-extension-policy';
import {
  L8DependencyAllowance,
  L8DownstreamAccessKind,
  L8DownstreamConsumerMode,
  L8_STABLE_HANDOFF_SURFACES,
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L8_GOVERNED_ONLY_ACCESS_KINDS,
  ALL_L8_DOWNSTREAM_ACCESS_KINDS,
} from '../l8/contracts/l8-downstream-dependency';

import {
  Layer8CompletionValidator,
} from '../l8/completion/l8-completion-validator';
import {
  Layer8RatificationBuilder,
  canonicalizeL8Ratification,
  l8RatificationFingerprint,
  registerL8RatificationArtifact,
  getLatestL8RatificationArtifact,
  clearL8RatificationArtifacts,
  listL8RatificationArtifacts,
} from '../l8/completion/l8-ratification-builder';
import {
  Layer8FreezePolicyValidator,
} from '../l8/completion/l8-freeze-activator';
import {
  Layer8ExtensionClassifier,
} from '../l8/completion/l8-extension-classifier';
import {
  Layer8DownstreamDependencyValidator,
} from '../l8/completion/l8-downstream-dependency-validator';

import {
  L8CertificationBand,
  ALL_L8_CERTIFICATION_BANDS,
  describeL8Band,
} from '../l8/certification/l8-certification-band';
import {
  L8CertificationLevel,
  L8_CONSTITUTIONAL_BANDS,
  L8_RUNTIME_BANDS,
  L8_PRODUCTION_BANDS,
  deriveL8CertificationLevel,
  l8LevelIsAtLeast,
} from '../l8/certification/l8-certification-level';
import {
  buildL8CertificationArtifact,
  canonicalizeL8Artifact,
  fingerprintL8,
  registerL8CertificationArtifact,
  clearL8CertificationArtifacts,
  listL8CertificationArtifacts,
  getLatestL8CertificationArtifact,
} from '../l8/certification/l8-certification-report';
import {
  runL8MasterCertification,
} from '../l8/certification/l8-master-certification';

import {
  emitL8RatificationDecision,
  emitL8CompletionFailure,
  emitL8FreezeActivation,
  emitL8ExtensionClassification,
  emitL8DownstreamDependencyViolation,
  L8FinalAuditKind,
  L8FinalAuditSeverity,
  listL8FinalAuditRecords,
  queryL8FinalAuditByKind,
  queryL8FinalAuditBySubject,
  clearL8FinalAuditLog,
} from '../l8/constitution/l8-final-audit';

import {
  checkINV_89_A,
  checkINV_89_B,
  checkINV_89_C,
  checkINV_89_D,
  checkINV_89_E,
  checkINV_89_F,
  checkINV_89_G,
  checkAllL8_9Invariants,
  buildL8GreenEvidence,
} from '../l8/invariants/l8_9-invariants';

let passed = 0, failed = 0;
const failures: string[] = [];
function assert(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function greenCertRef(sublayer: string) {
  return {
    sublayer,
    version: '1.0.0',
    certification_run_id: `cert-${sublayer}`,
    level: 'PRODUCTION_GREEN' as const,
    rollout_recommended: true,
    blocking_violations: [] as readonly string[],
  };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Final definition and completion law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Final definition and completion law ═══');

assert(L8_CANONICAL_DEFINITION.length > 0, 'A.01 canonical def present');
assert(L8_MINIMAL_DEFINITION.length > 0, 'A.02 minimal def present');
assert(L8_EXPANDED_DEFINITION.length >= 3, 'A.03 ≥3 expanded sentences');
assert(L8_NEGATIVE_DEFINITION.length >= 5, 'A.04 ≥5 negative bullets');
assert(L8_DEPENDENCY_FINALITY.L5.includes('persistence authority'),
  'A.05 L5 frozen as persistence authority');
assert(L8_OUTPUT_FINALITY.length >= 5, 'A.06 ≥5 output surfaces');
assert(L8_STRUCTURAL_FORM.length === 9, 'A.07 9 structural sections');
assert(L8_EXECUTION_SEQUENCE.length === 9, 'A.08 9 execution steps');
assert(L8_REQUIRED_SUBLAYERS.length === 8, 'A.09 8 required sublayers');
assert(L8_DEFINITION_SURFACE.length ===
  2 + L8_EXPANDED_DEFINITION.length,
  'A.10 definition surface = canonical + minimal + expanded');

assert(ALL_L8_COMPLETION_DIMENSIONS.length === 4,
  'A.11 4 completion dimensions');
assert(ALL_L8_COMPLETION_STATES.length === 3, 'A.12 3 completion states');
assert(ALL_L8_RATIFICATION_VIOLATION_CODES.length >= 15,
  'A.13 violation codes enumerated');
for (const d of ALL_L8_COMPLETION_DIMENSIONS) {
  const req = L8_COMPLETION_REQUIREMENTS[d];
  assert(req.bullets.length >= 3,
    `A.14 ${d} has ≥3 completion bullets`);
}

const validator = new Layer8CompletionValidator();
const greenEv = buildL8GreenEvidence();
const greenRes = validator.validate(greenEv);
assert(greenRes.overall_state === L8CompletionState.L8_PRODUCTION_READY,
  'A.15 green evidence → PRODUCTION_READY');
assert(greenRes.dimensions.every(d => d.satisfied),
  'A.16 every dimension satisfied');
assert(greenRes.violations.length === 0,
  'A.17 no violations on green evidence');

const runtimeBroken = validator.validate({
  ...greenEv, confidence_cap_bound: false,
});
assert(
  runtimeBroken.overall_state !== L8CompletionState.L8_PRODUCTION_READY,
  'A.18 runtime dimension failure downgrades completion');
const constConst = validator.validate({
  ...greenEv, mission_boundary_frozen: false,
});
assert(
  constConst.overall_state === L8CompletionState.L8_NOT_READY,
  'A.19 constitutional failure → NOT_READY');
const servingBroken = validator.validate({
  ...greenEv, read_surfaces_governed: false,
});
assert(
  servingBroken.overall_state !== L8CompletionState.L8_PRODUCTION_READY,
  'A.20 serving failure downgrades');
const persistBroken = validator.validate({
  ...greenEv, l5_only_persistence_authority: false,
});
assert(
  persistBroken.overall_state !== L8CompletionState.L8_PRODUCTION_READY,
  'A.21 persistence failure downgrades');

console.log(`  Band A cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND B — Freeze and protected-surface law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Freeze and protected-surface law ═══');

assert(L8_FROZEN_SURFACES.length >= 5, 'B.01 ≥5 frozen surfaces');
assert(L8_EVOLVABLE_SURFACES.length >= 1, 'B.02 ≥1 evolvable surface');
assert(L8_HARD_PROTECTED_SURFACES.length >= 1,
  'B.03 ≥1 hard-protected surface');
assert(L8_FREEZE_POLICY_V1.version === '1.0.0',
  'B.04 freeze policy v1 version');

const freezeValidator = new Layer8FreezePolicyValidator();
const prem = freezeValidator.activate({
  request_id: 'B.premature',
  target_status: L8FreezeStatus.FROZEN,
  ratification: null,
  freeze_policy: L8_FREEZE_POLICY_V1,
});
assert(!prem.allowed, 'B.05 freeze without ratification denied');
assert(
  prem.violations.includes(
    L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
  ),
  'B.06 premature freeze emits violation code');

const premHard = freezeValidator.activate({
  request_id: 'B.premature.hard',
  target_status: L8FreezeStatus.HARD_PROTECTED,
  ratification: null,
  freeze_policy: L8_FREEZE_POLICY_V1,
});
assert(!premHard.allowed, 'B.07 hard freeze without ratification denied');

const openOk = freezeValidator.activate({
  request_id: 'B.open',
  target_status: L8FreezeStatus.OPEN,
  ratification: null,
  freeze_policy: L8_FREEZE_POLICY_V1,
});
assert(openOk.allowed,
  'B.08 OPEN status allowed without ratification');

const builder = new Layer8RatificationBuilder();
const completion = validator.validate(greenEv);
const ratGreen = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.B.ok',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(ratGreen.allowed, 'B.09 green ratification allowed');

const freezeOk = freezeValidator.activate({
  request_id: 'B.freeze.ok',
  target_status: L8FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: L8_FREEZE_POLICY_V1,
});
assert(freezeOk.allowed, 'B.10 freeze with valid ratification allowed');
assert(freezeOk.activated_status === L8FreezeStatus.FROZEN,
  'B.11 activated status is FROZEN');

const versionMismatch = freezeValidator.activate({
  request_id: 'B.freeze.verbad',
  target_status: L8FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: { ...L8_FREEZE_POLICY_V1, version: '9.9.9' },
});
assert(!versionMismatch.allowed,
  'B.12 mismatched freeze policy version denied');

console.log(`  Band B cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Extension and migration law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Extension and migration law ═══');

assert(ALL_L8_EXTENSION_CLASSES.length === 5,
  'C.01 5 extension classes');
assert(
  L8_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L8ExtensionClass.MIGRATION_REQUIRED,
  ),
  'C.02 migration requires recertification');
assert(
  L8_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L8ExtensionClass.BREAKING_SEMANTIC,
  ),
  'C.03 breaking requires recertification');

const classifier = new Layer8ExtensionClassifier();
const baseProp = {
  proposal_id: '',
  title: '',
  touches_frozen_surface: false,
  touches_hard_protected_surface: false,
  alters_regime_class_meaning: false,
  alters_regime_family_ontology: false,
  alters_coexistence_law: false,
  alters_subject_contract: false,
  alters_output_contract: false,
  alters_confidence_law: false,
  alters_transition_law: false,
  alters_multiplier_law: false,
  alters_cap_chain_law: false,
  alters_input_admissibility: false,
  alters_template_semantics: false,
  alters_read_surface: false,
  alters_stable_handoff_surface: false,
  introduces_judgment_semantics: false,
  introduces_recommendation_semantics: false,
  introduces_scoring_finality: false,
  turns_multiplier_into_final_score: false,
  enables_redis_as_authority: false,
  enables_live_raw_l6_l7_reclassification: false,
  bypasses_l5_persistence: false,
  is_additive_only: false,
  preserves_replay_hashes: true,
  preserves_historical_meaning: true,
  widens_downstream_rights: false,
  notes: '',
};

const add = classifier.classify({
  ...baseProp, proposal_id: 'C.add', is_additive_only: true,
});
assert(add.classification === L8ExtensionClass.ADDITIVE_SAFE,
  'C.04 additive classified correctly');
assert(!add.requires_recertification, 'C.05 additive no recert');

const mig = classifier.classify({
  ...baseProp, proposal_id: 'C.mig', alters_template_semantics: true,
});
assert(mig.classification === L8ExtensionClass.MIGRATION_REQUIRED,
  'C.06 template change classified MIGRATION_REQUIRED');
assert(mig.requires_recertification, 'C.07 migration recert required');

const brk = classifier.classify({
  ...baseProp, proposal_id: 'C.brk',
  alters_regime_class_meaning: true, touches_frozen_surface: true,
});
assert(brk.classification === L8ExtensionClass.BREAKING_SEMANTIC,
  'C.08 class meaning change classified BREAKING');

const forbidJudg = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.judgment',
  introduces_judgment_semantics: true,
});
assert(forbidJudg.classification === L8ExtensionClass.PROHIBITED,
  'C.09 judgment prohibited');

const forbidScore = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.score',
  introduces_scoring_finality: true,
});
assert(forbidScore.classification === L8ExtensionClass.PROHIBITED,
  'C.10 scoring finality prohibited');

const forbidMult = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.mult',
  turns_multiplier_into_final_score: true,
});
assert(forbidMult.classification === L8ExtensionClass.PROHIBITED,
  'C.11 multiplier-as-score prohibited');

const forbidRedis = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.redis',
  enables_redis_as_authority: true,
});
assert(forbidRedis.classification === L8ExtensionClass.PROHIBITED,
  'C.12 redis authority prohibited');

const forbidLive = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.live',
  enables_live_raw_l6_l7_reclassification: true,
});
assert(forbidLive.classification === L8ExtensionClass.PROHIBITED,
  'C.13 live raw L6/L7 reclassification prohibited');

const forbidBypass = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.bypass',
  bypasses_l5_persistence: true,
});
assert(forbidBypass.classification === L8ExtensionClass.PROHIBITED,
  'C.14 L5 bypass prohibited');

const hardWithoutMeaning = classifier.classify({
  ...baseProp, proposal_id: 'C.hard.nomeaning',
  touches_hard_protected_surface: true,
  alters_regime_family_ontology: true,
  preserves_historical_meaning: false,
});
assert(
  hardWithoutMeaning.classification === L8ExtensionClass.PROHIBITED,
  'C.15 hard-protected surface without meaning-preservation prohibited');

const frozenMigrate = classifier.classify({
  ...baseProp, proposal_id: 'C.frozen.mig',
  touches_frozen_surface: true,
  preserves_historical_meaning: false,
});
assert(
  frozenMigrate.classification === L8ExtensionClass.MIGRATION_REQUIRED,
  'C.16 frozen surface without replay safety → migration required');

console.log(`  Band C cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND D — Downstream dependency law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Downstream dependency law ═══');

assert(ALL_L8_DOWNSTREAM_ACCESS_KINDS.length ===
  L8_STABLE_HANDOFF_SURFACES.length +
  L8_GOVERNED_ONLY_ACCESS_KINDS.length +
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length,
  'D.01 enum partitioned into handoff + governed + forbidden');
assert(L8_STABLE_HANDOFF_SURFACES.length >= 5,
  'D.02 ≥5 stable handoff surfaces');
assert(L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length >= 5,
  'D.03 ≥5 forbidden access kinds');
assert(
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L8DownstreamAccessKind.JUDGMENT_FROM_L8,
  ),
  'D.04 JUDGMENT_FROM_L8 forbidden');
assert(
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L8DownstreamAccessKind.SCORE_FROM_L8,
  ),
  'D.05 SCORE_FROM_L8 forbidden');

const dv = new Layer8DownstreamDependencyValidator();
for (const kind of L8_STABLE_HANDOFF_SURFACES) {
  const d = dv.validate({
    request_id: `D.stable.${kind}`,
    consumer_layer: 'L9',
    access_kind: kind,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L8DependencyAllowance.ALLOWED,
    `D.06 stable ${kind} allowed`);
  assert(dv.isStableHandoff(kind), `D.07 isStableHandoff(${kind})`);
}

for (const kind of L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
  const d = dv.validate({
    request_id: `D.forbid.${kind}`,
    consumer_layer: 'L9',
    access_kind: kind,
    consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L8DependencyAllowance.DENIED,
    `D.08 forbidden ${kind} denied`);
  assert(dv.isForbidden(kind), `D.09 isForbidden(${kind})`);
}

const adHocNormal = dv.validate({
  request_id: 'D.adhoc.normal',
  consumer_layer: 'L9',
  access_kind:
    L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
  consumer_mode: L8DownstreamConsumerMode.NORMAL_CONSUMPTION,
  notes: '',
});
assert(adHocNormal.allowance === L8DependencyAllowance.DENIED,
  'D.10 ad-hoc reclassification under NORMAL denied');

for (const mode of [
  L8DownstreamConsumerMode.GOVERNED_REPLAY,
  L8DownstreamConsumerMode.GOVERNED_REPAIR,
  L8DownstreamConsumerMode.GOVERNED_AUDIT,
]) {
  const d = dv.validate({
    request_id: `D.adhoc.${mode}`,
    consumer_layer: 'L9',
    access_kind:
      L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
    consumer_mode: mode,
    notes: '',
  });
  assert(
    d.allowance === L8DependencyAllowance.CONDITIONALLY_ALLOWED,
    `D.11 ad-hoc under ${mode} conditional`);
}

console.log(`  Band D cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND E — Certification artifact and lineage
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Certification artifact and lineage ═══');

assert(ALL_L8_CERTIFICATION_BANDS.length === 7, 'E.01 7 L8 bands');
for (const b of ALL_L8_CERTIFICATION_BANDS) {
  assert(describeL8Band(b).length > 0, `E.02 description for ${b}`);
}
assert(L8_CONSTITUTIONAL_BANDS.length === 3, 'E.03 3 constitutional');
assert(L8_RUNTIME_BANDS.length === 5, 'E.04 5 runtime bands');
assert(L8_PRODUCTION_BANDS.length === 7, 'E.05 7 production bands');

const allPassing = new Set(ALL_L8_CERTIFICATION_BANDS);
assert(deriveL8CertificationLevel(allPassing) ===
  L8CertificationLevel.PRODUCTION_GREEN,
  'E.06 all bands → PRODUCTION_GREEN');
const rtPassing = new Set(L8_RUNTIME_BANDS);
assert(deriveL8CertificationLevel(rtPassing) ===
  L8CertificationLevel.RUNTIME_GREEN,
  'E.07 runtime bands → RUNTIME_GREEN');
const ctPassing = new Set(L8_CONSTITUTIONAL_BANDS);
assert(deriveL8CertificationLevel(ctPassing) ===
  L8CertificationLevel.CONSTITUTIONAL_GREEN,
  'E.08 constitutional bands → CONSTITUTIONAL_GREEN');
assert(deriveL8CertificationLevel(new Set()) ===
  L8CertificationLevel.FAILED,
  'E.09 empty → FAILED');
assert(l8LevelIsAtLeast(
  L8CertificationLevel.PRODUCTION_GREEN,
  L8CertificationLevel.RUNTIME_GREEN,
), 'E.10 level ordering');
assert(!l8LevelIsAtLeast(
  L8CertificationLevel.CONSTITUTIONAL_GREEN,
  L8CertificationLevel.PRODUCTION_GREEN,
), 'E.11 level ordering reverse');

clearL8RatificationArtifacts();
const ratA = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.E.1',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(ratA.allowed, 'E.12 ratification allowed');
assert(ratA.artifact.layer_id === 'L8', 'E.13 layer id L8');
assert(ratA.artifact.artifact_hash.length === 8,
  'E.14 8-char fingerprint');
assert(ratA.artifact.downstream_dependency_allowed,
  'E.15 downstream allowed on green artifact');
assert(ratA.artifact.freeze_status === L8FreezeStatus.FROZEN,
  'E.16 freeze status FROZEN');

const canonical = canonicalizeL8Ratification(ratA.artifact);
const canonical2 = canonicalizeL8Ratification(ratA.artifact);
assert(canonical === canonical2,
  'E.17 canonicalization deterministic');
assert(l8RatificationFingerprint('foo') ===
  l8RatificationFingerprint('foo'),
  'E.18 fingerprint deterministic');
assert(l8RatificationFingerprint('foo') !==
  l8RatificationFingerprint('bar'),
  'E.19 fingerprint sensitive');

registerL8RatificationArtifact(ratA.artifact);
assert(getLatestL8RatificationArtifact()?.artifact_hash ===
  ratA.artifact.artifact_hash,
  'E.20 latest ratification retrievable');
assert(listL8RatificationArtifacts().length === 1,
  'E.21 ratification log length');
clearL8RatificationArtifacts();
assert(listL8RatificationArtifacts().length === 0,
  'E.22 ratification log cleared');

clearL8CertificationArtifacts();
const certArt = buildL8CertificationArtifact({
  certification_run_id: 'cert.E.1',
  layer_version_set: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.concat(['L8.9']).map(sl => [sl, '1.0.0']),
  ),
  bands: ALL_L8_CERTIFICATION_BANDS.map(b => ({
    band: b, passed: 1, failed: 0, duration_ms: 1, ok: true,
    blocking_violations: [],
  })),
  invariants: [{ id: 'INV-8.9-A', holds: true, evidence: 'ok' }],
  ratification_artifact_hash: ratA.artifact.artifact_hash,
  completion_state: 'L8_PRODUCTION_READY',
});
assert(certArt.level === L8CertificationLevel.PRODUCTION_GREEN,
  'E.23 green cert → PRODUCTION_GREEN');
assert(certArt.rollout_recommended, 'E.24 green cert → rollout');
assert(certArt.artifact_fingerprint.length === 8,
  'E.25 cert artifact fingerprint');
registerL8CertificationArtifact(certArt);
assert(getLatestL8CertificationArtifact()?.certification_run_id ===
  'cert.E.1', 'E.26 latest cert retrievable');
assert(listL8CertificationArtifacts().length === 1, 'E.27 cert log');
clearL8CertificationArtifacts();

assert(fingerprintL8('x') !== fingerprintL8('y'),
  'E.28 fingerprint sensitive');
assert(canonicalizeL8Artifact(certArt).length > 0,
  'E.29 artifact canonicalization non-empty');

console.log(`  Band E cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND F — Ratification and done gate
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND F: Ratification and done gate ═══');

const missingSl = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.missing',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS
      .filter(sl => sl !== 'L8.6')
      .map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS
    .filter(sl => sl !== 'L8.6')
    .map(greenCertRef),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(!missingSl.allowed, 'F.01 missing sublayer blocks');
assert(missingSl.blocking_violations.includes(
  L8RatificationViolationCode.MISSING_SUBLAYER,
), 'F.02 MISSING_SUBLAYER emitted');

const failedSl = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.failed',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(sl =>
    sl === 'L8.3'
      ? { ...greenCertRef(sl), level: 'FAILED' as const,
          rollout_recommended: false,
          blocking_violations: ['runtime determinism fail'] }
      : greenCertRef(sl),
  ),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(!failedSl.allowed, 'F.03 failed sublayer blocks');

const noHandoff = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.nohandoff',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: [],
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(!noHandoff.allowed, 'F.04 empty handoff blocks');
assert(noHandoff.blocking_violations.includes(
  L8RatificationViolationCode.MISSING_HANDOFF_SURFACE,
), 'F.05 MISSING_HANDOFF_SURFACE emitted');

const notReady = validator.validate({
  ...greenEv, transition_independent_of_confidence: false,
});
const notReadyRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.notready',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion: notReady,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(!notReadyRat.allowed, 'F.06 non-PRODUCTION_READY blocks');
assert(
  !notReadyRat.artifact.downstream_dependency_allowed,
  'F.07 downstream disabled on blocked ratification');

const okRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.ok',
  sub_layer_versions: Object.fromEntries(
    L8_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L8_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L8FreezeStatus.FROZEN,
  extension_policy_version: L8_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L8_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L8.9/v1',
  final_definition_surface: L8_DEFINITION_SURFACE,
  execution_sequence: L8_EXECUTION_SEQUENCE,
});
assert(okRat.allowed, 'F.08 green ratification allowed');
assert(okRat.blocking_violations.length === 0, 'F.09 no blockers');
assert(okRat.artifact.completion_result ===
  L8CompletionState.L8_PRODUCTION_READY,
  'F.10 completion result PRODUCTION_READY');

console.log(`  Band F cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND G — Full master regression (audit + invariants + master)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND G: Full master regression ═══');

clearL8FinalAuditLog();
const auditRat = emitL8RatificationDecision('rat.G.1', true, []);
assert(auditRat.severity === L8FinalAuditSeverity.INFO,
  'G.01 allowed rat → INFO');
const auditRatBad = emitL8RatificationDecision('rat.G.2', false,
  [L8RatificationViolationCode.MISSING_SUBLAYER]);
assert(auditRatBad.severity === L8FinalAuditSeverity.BLOCK,
  'G.02 blocked rat → BLOCK');
const auditCmp = emitL8CompletionFailure('rat.G.3',
  validator.validate({ ...greenEv, confidence_cap_bound: false }));
assert(auditCmp.kind === L8FinalAuditKind.COMPLETION_FAILURE,
  'G.03 completion failure kind');
const auditFrz = emitL8FreezeActivation('frz.G.1',
  L8FreezeStatus.FROZEN, true, [], 'ok');
assert(auditFrz.kind === L8FinalAuditKind.FREEZE_ACTIVATION,
  'G.04 freeze activation kind');
const auditExt = emitL8ExtensionClassification({
  proposal_id: 'p.G.1',
  classification: L8ExtensionClass.MIGRATION_REQUIRED,
  requires_recertification: true,
  rationale: ['t'],
});
assert(auditExt.severity === L8FinalAuditSeverity.WARN,
  'G.05 migration classification → WARN');
const auditDep = emitL8DownstreamDependencyViolation({
  request_id: 'dep.G.1',
  allowance: L8DependencyAllowance.DENIED,
  rationale: 'forbidden',
}, L8RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY);
assert(auditDep.kind ===
  L8FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
  'G.06 downstream audit kind');

assert(listL8FinalAuditRecords().length === 6, 'G.07 6 audit records');
assert(queryL8FinalAuditByKind(
  L8FinalAuditKind.RATIFICATION_DECISION).length === 2,
  'G.08 query by kind');
assert(queryL8FinalAuditBySubject('rat.G.1').length === 1,
  'G.09 query by subject');
clearL8FinalAuditLog();
assert(listL8FinalAuditRecords().length === 0, 'G.10 audit cleared');

const invs = checkAllL8_9Invariants();
assert(invs.length === 7, 'G.11 7 L8.9 invariants');
assert(invs.every(i => i.holds),
  `G.12 all L8.9 invariants hold: ${invs.filter(i => !i.holds)
    .map(i => i.id).join(',')}`);

const a = checkINV_89_A(); assert(a.holds, `G.13 ${a.id}`);
const b = checkINV_89_B(); assert(b.holds, `G.14 ${b.id}`);
const c = checkINV_89_C(); assert(c.holds, `G.15 ${c.id}`);
const d = checkINV_89_D(); assert(d.holds, `G.16 ${d.id}`);
const e = checkINV_89_E(); assert(e.holds, `G.17 ${e.id}`);
const f = checkINV_89_F(); assert(f.holds, `G.18 ${f.id}`);
const g = checkINV_89_G(); assert(g.holds, `G.19 ${g.id}`);

// Master certification: runs all bands + aggregates invariants.
clearL8RatificationArtifacts();
clearL8CertificationArtifacts();
(async () => {
  const master = await runL8MasterCertification({
    certification_run_id: 'master.G.1',
  });
  assert(master.certification_run_id === 'master.G.1',
    'G.20 master run id respected');
  assert(master.level === L8CertificationLevel.PRODUCTION_GREEN,
    `G.21 master PRODUCTION_GREEN (got ${master.level}, blockers=` +
      `${master.blocking_violations.slice(0, 5).join('|')})`);
  assert(master.rollout_recommended,
    'G.22 rollout recommended on green master');
  assert(master.bands.length === 7, 'G.23 master produced 7 band outcomes');
  assert(master.bands.every(bnd => bnd.ok),
    `G.24 all master bands green (failing: ${
      master.bands.filter(bnd => !bnd.ok).map(bnd => bnd.band).join(',')
    })`);
  assert(master.invariants.length >= 40,
    `G.25 master aggregated ≥40 invariants (got ${
      master.invariants.length})`);
  assert(master.invariants.every(inv => inv.holds),
    `G.26 all aggregated invariants hold (failing: ${
      master.invariants.filter(inv => !inv.holds).map(inv => inv.id)
        .join(',')})`);
  assert(master.completion_state === 'L8_PRODUCTION_READY',
    'G.27 completion state recorded');
  assert(master.ratification_artifact_hash.length === 8,
    'G.28 ratification hash present');
  assert(master.artifact_fingerprint.length === 8,
    'G.29 cert artifact fingerprint');

  // Full regression: execution sequence untouched.
  assert(L8_EXECUTION_SEQUENCE.length === 9,
    'G.30 execution sequence still canonical after master run');

  console.log(`  Band G cumulative: passed=${passed} failed=${failed}`);

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══ Summary ═══');
  console.log(`passed=${passed} failed=${failed}`);
  if (failed > 0) {
    console.log('Failures:');
    for (const f2 of failures) console.log(`  - ${f2}`);
    process.exit(1);
  }
})();
