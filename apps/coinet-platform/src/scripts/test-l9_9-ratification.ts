/**
 * L9.9 — Ratification, Freeze, Completion, Handoff, Rollout, Rollback
 *         Certification Test Suite
 *
 * Seven bands (§9.9.6):
 *   A — Final definition and completion law
 *   B — Freeze and protected-surface law
 *   C — Extension and migration law
 *   D — Downstream dependency law
 *   E — Certification artifact and lineage
 *   F — Ratification and done gate (rollout + rollback + playbooks)
 *   G — Full master regression (audit + invariants + master)
 */

import {
  L9_CANONICAL_DEFINITION,
  L9_MINIMAL_DEFINITION,
  L9_EXPANDED_DEFINITION,
  L9_NEGATIVE_DEFINITION,
  L9_DEPENDENCY_FINALITY,
  L9_OUTPUT_FINALITY,
  L9_STRUCTURAL_FORM,
  L9_EXECUTION_SEQUENCE,
  L9_REQUIRED_SUBLAYERS,
  L9_DEFINITION_SURFACE,
} from '../l9/contracts/l9-final-definition';
import {
  ALL_L9_COMPLETION_DIMENSIONS,
  L9CompletionState,
  ALL_L9_COMPLETION_STATES,
  L9RatificationViolationCode,
  ALL_L9_RATIFICATION_VIOLATION_CODES,
  L9_COMPLETION_REQUIREMENTS,
} from '../l9/contracts/l9-completion-standard';
import {
  L9FreezeStatus,
  L9_FREEZE_POLICY_V1,
  L9_FROZEN_SURFACES,
  L9_EVOLVABLE_SURFACES,
  L9_HARD_PROTECTED_SURFACES,
} from '../l9/contracts/l9-freeze-policy';
import {
  L9ExtensionClass,
  ALL_L9_EXTENSION_CLASSES,
  L9_EXTENSION_POLICY_V1,
} from '../l9/contracts/l9-extension-policy';
import {
  L9DependencyAllowance,
  L9DownstreamAccessKind,
  L9DownstreamConsumerMode,
  L9_STABLE_HANDOFF_SURFACES,
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L9_GOVERNED_ONLY_ACCESS_KINDS,
  ALL_L9_DOWNSTREAM_ACCESS_KINDS,
} from '../l9/contracts/l9-downstream-dependency';

import {
  Layer9CompletionValidator,
} from '../l9/completion/l9-completion-validator';
import {
  Layer9RatificationBuilder,
  canonicalizeL9Ratification,
  l9RatificationFingerprint,
  registerL9RatificationArtifact,
  getLatestL9RatificationArtifact,
  clearL9RatificationArtifacts,
  listL9RatificationArtifacts,
} from '../l9/completion/l9-ratification-builder';
import {
  Layer9FreezePolicyValidator,
} from '../l9/completion/l9-freeze-activator';
import {
  Layer9ExtensionClassifier,
} from '../l9/completion/l9-extension-classifier';
import {
  Layer9HandoffValidator,
} from '../l9/completion/l9-handoff-validator';

import {
  L9CertificationBand,
  ALL_L9_CERTIFICATION_BANDS,
  describeL9Band,
} from '../l9/certification/l9-certification-band';
import {
  L9CertificationLevel,
  L9_CONSTITUTIONAL_BANDS,
  L9_RUNTIME_BANDS,
  L9_PRODUCTION_BANDS,
  deriveL9CertificationLevel,
  l9LevelIsAtLeast,
} from '../l9/certification/l9-certification-level';
import {
  buildL9CertificationArtifact,
  canonicalizeL9Artifact,
  fingerprintL9,
  registerL9CertificationArtifact,
  clearL9CertificationArtifacts,
  listL9CertificationArtifacts,
  getLatestL9CertificationArtifact,
} from '../l9/certification/l9-certification-report';
import {
  runL9MasterCertification,
} from '../l9/certification/l9-master-certification';

import {
  L9RolloutPhase,
  L9_ROLLOUT_FORWARD_ORDER,
  L9_DOWNSTREAM_VISIBLE_PHASES,
  L9_ROLLOUT_PHASE_DESCRIPTION,
  isL9ForwardPhaseTransitionLegal,
} from '../l9/rollout/l9-rollout-phase';
import {
  Layer9RolloutGate,
} from '../l9/rollout/l9-rollout-gate';
import {
  Layer9EnableDisablePolicy,
} from '../l9/rollout/l9-enable-disable-policy';
import {
  Layer9RollbackPolicy,
  L9RollbackClass,
  L9_LEGAL_ROLLBACK_CLASSES,
  L9_PROHIBITED_ROLLBACK_CLASSES,
} from '../l9/rollout/l9-rollback-policy';
import {
  L9_FAILURE_PLAYBOOKS,
  ALL_L9_FAILURE_CLASSES,
  getL9FailurePlaybook,
  verifyL9FailurePlaybookCoverage,
} from '../l9/rollout/l9-failure-playbooks';

import {
  emitL9RatificationDecision,
  emitL9CompletionFailure,
  emitL9FreezeActivation,
  emitL9ExtensionClassification,
  emitL9DownstreamDependencyViolation,
  emitL9RolloutDecision,
  emitL9RollbackDecision,
  L9FinalAuditKind,
  L9FinalAuditSeverity,
  listL9FinalAuditRecords,
  queryL9FinalAuditByKind,
  queryL9FinalAuditBySubject,
  clearL9FinalAuditLog,
} from '../l9/constitution/l9-final-audit';

import {
  checkINV_99_A,
  checkINV_99_B,
  checkINV_99_C,
  checkINV_99_D,
  checkINV_99_E,
  checkINV_99_F,
  checkINV_99_G,
  checkAllL9_9Invariants,
  buildL9GreenEvidence,
} from '../l9/invariants/l9_9-invariants';

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

assert(L9_CANONICAL_DEFINITION.length > 0, 'A.01 canonical def present');
assert(L9_MINIMAL_DEFINITION.length > 0, 'A.02 minimal def present');
assert(L9_EXPANDED_DEFINITION.length >= 3, 'A.03 ≥3 expanded sentences');
assert(L9_NEGATIVE_DEFINITION.length >= 5, 'A.04 ≥5 negative bullets');
assert(L9_DEPENDENCY_FINALITY.L5.includes('persistence authority'),
  'A.05 L5 frozen as persistence authority');
assert(L9_DEPENDENCY_FINALITY.L8.length > 0,
  'A.06 L8 posture declared as dependency');
assert(L9_OUTPUT_FINALITY.length >= 5, 'A.07 ≥5 output surfaces');
assert(L9_STRUCTURAL_FORM.length === 9, 'A.08 9 structural sections');
assert(L9_EXECUTION_SEQUENCE.length === 9, 'A.09 9 execution steps');
assert(L9_REQUIRED_SUBLAYERS.length === 8, 'A.10 8 required sublayers');
assert(L9_DEFINITION_SURFACE.length ===
  2 + L9_EXPANDED_DEFINITION.length,
  'A.11 definition surface = canonical + minimal + expanded');

assert(ALL_L9_COMPLETION_DIMENSIONS.length === 4,
  'A.12 4 completion dimensions');
assert(ALL_L9_COMPLETION_STATES.length === 3, 'A.13 3 completion states');
assert(ALL_L9_RATIFICATION_VIOLATION_CODES.length >= 20,
  'A.14 violation codes enumerated');
for (const d of ALL_L9_COMPLETION_DIMENSIONS) {
  const req = L9_COMPLETION_REQUIREMENTS[d];
  assert(req.bullets.length >= 3,
    `A.15 ${d} has ≥3 completion bullets`);
}

const validator = new Layer9CompletionValidator();
const greenEv = buildL9GreenEvidence();
const greenRes = validator.validate(greenEv);
assert(greenRes.overall_state === L9CompletionState.L9_PRODUCTION_READY,
  'A.16 green evidence → PRODUCTION_READY');
assert(greenRes.dimensions.every(d => d.satisfied),
  'A.17 every dimension satisfied');
assert(greenRes.violations.length === 0,
  'A.18 no violations on green evidence');

const runtimeBroken = validator.validate({
  ...greenEv, confidence_cap_bound: false,
});
assert(
  runtimeBroken.overall_state !== L9CompletionState.L9_PRODUCTION_READY,
  'A.19 runtime dimension failure downgrades completion');
const constConst = validator.validate({
  ...greenEv, mission_boundary_frozen: false,
});
assert(
  constConst.overall_state === L9CompletionState.L9_NOT_READY,
  'A.20 constitutional failure → NOT_READY');
const servingBroken = validator.validate({
  ...greenEv, read_surfaces_governed: false,
});
assert(
  servingBroken.overall_state !== L9CompletionState.L9_PRODUCTION_READY,
  'A.21 serving failure downgrades');
const persistBroken = validator.validate({
  ...greenEv, l5_only_persistence_authority: false,
});
assert(
  persistBroken.overall_state !== L9CompletionState.L9_PRODUCTION_READY,
  'A.22 persistence failure downgrades');
const causalLaunder = validator.validate({
  ...greenEv, no_causal_laundering: false,
});
assert(
  causalLaunder.overall_state !== L9CompletionState.L9_PRODUCTION_READY,
  'A.23 causal laundering downgrades');

console.log(`  Band A cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND B — Freeze and protected-surface law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Freeze and protected-surface law ═══');

assert(L9_FROZEN_SURFACES.length >= 5, 'B.01 ≥5 frozen surfaces');
assert(L9_EVOLVABLE_SURFACES.length >= 1, 'B.02 ≥1 evolvable surface');
assert(L9_HARD_PROTECTED_SURFACES.length >= 1,
  'B.03 ≥1 hard-protected surface');
assert(L9_FREEZE_POLICY_V1.version === '1.0.0',
  'B.04 freeze policy v1 version');

const freezeValidator = new Layer9FreezePolicyValidator();
const prem = freezeValidator.activate({
  request_id: 'B.premature',
  target_status: L9FreezeStatus.FROZEN,
  ratification: null,
  freeze_policy: L9_FREEZE_POLICY_V1,
});
assert(!prem.allowed, 'B.05 freeze without ratification denied');
assert(
  prem.violations.includes(
    L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
  ),
  'B.06 premature freeze emits violation code');

const premHard = freezeValidator.activate({
  request_id: 'B.premature.hard',
  target_status: L9FreezeStatus.HARD_PROTECTED,
  ratification: null,
  freeze_policy: L9_FREEZE_POLICY_V1,
});
assert(!premHard.allowed, 'B.07 hard freeze without ratification denied');

const openOk = freezeValidator.activate({
  request_id: 'B.open',
  target_status: L9FreezeStatus.OPEN,
  ratification: null,
  freeze_policy: L9_FREEZE_POLICY_V1,
});
assert(openOk.allowed,
  'B.08 OPEN status allowed without ratification');

const builder = new Layer9RatificationBuilder();
const completion = validator.validate(greenEv);
const ratGreen = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.B.ok',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(ratGreen.allowed, 'B.09 green ratification allowed');

const freezeOk = freezeValidator.activate({
  request_id: 'B.freeze.ok',
  target_status: L9FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: L9_FREEZE_POLICY_V1,
});
assert(freezeOk.allowed, 'B.10 freeze with valid ratification allowed');
assert(freezeOk.activated_status === L9FreezeStatus.FROZEN,
  'B.11 activated status is FROZEN');

const hardOk = freezeValidator.activate({
  request_id: 'B.hard.ok',
  target_status: L9FreezeStatus.HARD_PROTECTED,
  ratification: ratGreen.artifact,
  freeze_policy: L9_FREEZE_POLICY_V1,
});
assert(hardOk.allowed, 'B.12 hard-protected with ratification allowed');

const versionMismatch = freezeValidator.activate({
  request_id: 'B.freeze.verbad',
  target_status: L9FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: { ...L9_FREEZE_POLICY_V1, version: '9.9.9' },
});
assert(!versionMismatch.allowed,
  'B.13 mismatched freeze policy version denied');

console.log(`  Band B cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Extension and migration law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Extension and migration law ═══');

assert(ALL_L9_EXTENSION_CLASSES.length === 5,
  'C.01 5 extension classes');
assert(
  L9_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L9ExtensionClass.MIGRATION_REQUIRED,
  ),
  'C.02 migration requires recertification');
assert(
  L9_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L9ExtensionClass.BREAKING_SEMANTIC,
  ),
  'C.03 breaking requires recertification');

const classifier = new Layer9ExtensionClassifier();
const baseProp = {
  proposal_id: '',
  title: '',
  touches_frozen_surface: false,
  touches_hard_protected_surface: false,
  alters_sequence_state_meaning: false,
  alters_sequence_family_ontology: false,
  alters_coexistence_law: false,
  alters_subject_contract: false,
  alters_output_contract: false,
  alters_lead_lag_semantics: false,
  alters_phase_progression_law: false,
  alters_change_point_law: false,
  alters_decay_law: false,
  alters_post_event_window_law: false,
  alters_confidence_law: false,
  alters_restriction_law: false,
  alters_causal_restraint_law: false,
  alters_cap_chain_law: false,
  alters_template_semantics: false,
  alters_read_surface: false,
  alters_stable_handoff_surface: false,
  introduces_judgment_semantics: false,
  introduces_recommendation_semantics: false,
  introduces_scoring_finality: false,
  introduces_causal_certainty_from_adjacency: false,
  turns_confidence_into_final_score: false,
  enables_redis_as_authority: false,
  enables_live_raw_lower_layer_reconstruction: false,
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
assert(add.classification === L9ExtensionClass.ADDITIVE_SAFE,
  'C.04 additive classified correctly');
assert(!add.requires_recertification, 'C.05 additive no recert');

const mig = classifier.classify({
  ...baseProp, proposal_id: 'C.mig', alters_template_semantics: true,
});
assert(mig.classification === L9ExtensionClass.MIGRATION_REQUIRED,
  'C.06 template change classified MIGRATION_REQUIRED');
assert(mig.requires_recertification, 'C.07 migration recert required');

const brk = classifier.classify({
  ...baseProp, proposal_id: 'C.brk',
  alters_sequence_state_meaning: true, touches_frozen_surface: true,
});
assert(brk.classification === L9ExtensionClass.BREAKING_SEMANTIC,
  'C.08 sequence state meaning change classified BREAKING');

const leadLag = classifier.classify({
  ...baseProp, proposal_id: 'C.leadlag',
  alters_lead_lag_semantics: true, touches_frozen_surface: true,
});
assert(leadLag.classification === L9ExtensionClass.BREAKING_SEMANTIC,
  'C.09 lead-lag semantics change classified BREAKING');

const forbidJudg = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.judgment',
  introduces_judgment_semantics: true,
});
assert(forbidJudg.classification === L9ExtensionClass.PROHIBITED,
  'C.10 judgment prohibited');

const forbidScore = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.score',
  introduces_scoring_finality: true,
});
assert(forbidScore.classification === L9ExtensionClass.PROHIBITED,
  'C.11 scoring finality prohibited');

const forbidConf = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.conf',
  turns_confidence_into_final_score: true,
});
assert(forbidConf.classification === L9ExtensionClass.PROHIBITED,
  'C.12 confidence-as-score prohibited');

const forbidCausal = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.causal',
  introduces_causal_certainty_from_adjacency: true,
});
assert(forbidCausal.classification === L9ExtensionClass.PROHIBITED,
  'C.13 causal certainty from adjacency prohibited');

const forbidRedis = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.redis',
  enables_redis_as_authority: true,
});
assert(forbidRedis.classification === L9ExtensionClass.PROHIBITED,
  'C.14 redis authority prohibited');

const forbidLive = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.live',
  enables_live_raw_lower_layer_reconstruction: true,
});
assert(forbidLive.classification === L9ExtensionClass.PROHIBITED,
  'C.15 live raw lower-layer reconstruction prohibited');

const forbidBypass = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.bypass',
  bypasses_l5_persistence: true,
});
assert(forbidBypass.classification === L9ExtensionClass.PROHIBITED,
  'C.16 L5 bypass prohibited');

console.log(`  Band C cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND D — Downstream dependency law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Downstream dependency law ═══');

assert(ALL_L9_DOWNSTREAM_ACCESS_KINDS.length ===
  L9_STABLE_HANDOFF_SURFACES.length +
  L9_GOVERNED_ONLY_ACCESS_KINDS.length +
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length,
  'D.01 enum partitioned into handoff + governed + forbidden');
assert(L9_STABLE_HANDOFF_SURFACES.length >= 5,
  'D.02 ≥5 stable handoff surfaces');
assert(L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length >= 5,
  'D.03 ≥5 forbidden access kinds');
assert(
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L9DownstreamAccessKind.JUDGMENT_FROM_L9,
  ),
  'D.04 JUDGMENT_FROM_L9 forbidden');
assert(
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L9DownstreamAccessKind.SCORE_FROM_L9,
  ),
  'D.05 SCORE_FROM_L9 forbidden');
assert(
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L9DownstreamAccessKind.CAUSAL_CERTAINTY_FROM_L9,
  ),
  'D.06 CAUSAL_CERTAINTY_FROM_L9 forbidden');

const dv = new Layer9HandoffValidator();
for (const kind of L9_STABLE_HANDOFF_SURFACES) {
  const d = dv.validate({
    request_id: `D.stable.${kind}`,
    consumer_layer: 'L10',
    access_kind: kind,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L9DependencyAllowance.ALLOWED,
    `D.07 stable ${kind} allowed`);
  assert(dv.isStableHandoff(kind), `D.08 isStableHandoff(${kind})`);
}

for (const kind of L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
  const d = dv.validate({
    request_id: `D.forbid.${kind}`,
    consumer_layer: 'L10',
    access_kind: kind,
    consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L9DependencyAllowance.DENIED,
    `D.09 forbidden ${kind} denied`);
  assert(dv.isForbidden(kind), `D.10 isForbidden(${kind})`);
}

const adHocNormal = dv.validate({
  request_id: 'D.adhoc.normal',
  consumer_layer: 'L10',
  access_kind:
    L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
  consumer_mode: L9DownstreamConsumerMode.NORMAL_CONSUMPTION,
  notes: '',
});
assert(adHocNormal.allowance === L9DependencyAllowance.DENIED,
  'D.11 ad-hoc reclassification under NORMAL denied');

for (const mode of [
  L9DownstreamConsumerMode.GOVERNED_REPLAY,
  L9DownstreamConsumerMode.GOVERNED_REPAIR,
  L9DownstreamConsumerMode.GOVERNED_AUDIT,
]) {
  const d = dv.validate({
    request_id: `D.adhoc.${mode}`,
    consumer_layer: 'L10',
    access_kind:
      L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
    consumer_mode: mode,
    notes: '',
  });
  assert(
    d.allowance === L9DependencyAllowance.CONDITIONALLY_ALLOWED,
    `D.12 ad-hoc under ${mode} conditional`);
}

console.log(`  Band D cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND E — Certification artifact and lineage
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Certification artifact and lineage ═══');

assert(ALL_L9_CERTIFICATION_BANDS.length === 7, 'E.01 7 L9 bands');
for (const b of ALL_L9_CERTIFICATION_BANDS) {
  assert(describeL9Band(b).length > 0, `E.02 description for ${b}`);
}
assert(L9_CONSTITUTIONAL_BANDS.length === 3, 'E.03 3 constitutional');
assert(L9_RUNTIME_BANDS.length === 5, 'E.04 5 runtime bands');
assert(L9_PRODUCTION_BANDS.length === 7, 'E.05 7 production bands');

const allPassing = new Set(ALL_L9_CERTIFICATION_BANDS);
assert(deriveL9CertificationLevel(allPassing) ===
  L9CertificationLevel.PRODUCTION_GREEN,
  'E.06 all bands → PRODUCTION_GREEN');
const rtPassing = new Set(L9_RUNTIME_BANDS);
assert(deriveL9CertificationLevel(rtPassing) ===
  L9CertificationLevel.RUNTIME_GREEN,
  'E.07 runtime bands → RUNTIME_GREEN');
const ctPassing = new Set(L9_CONSTITUTIONAL_BANDS);
assert(deriveL9CertificationLevel(ctPassing) ===
  L9CertificationLevel.CONSTITUTIONAL_GREEN,
  'E.08 constitutional bands → CONSTITUTIONAL_GREEN');
assert(deriveL9CertificationLevel(new Set()) ===
  L9CertificationLevel.FAILED,
  'E.09 empty → FAILED');
assert(l9LevelIsAtLeast(
  L9CertificationLevel.PRODUCTION_GREEN,
  L9CertificationLevel.RUNTIME_GREEN,
), 'E.10 level ordering');
assert(!l9LevelIsAtLeast(
  L9CertificationLevel.CONSTITUTIONAL_GREEN,
  L9CertificationLevel.PRODUCTION_GREEN,
), 'E.11 level ordering reverse');

clearL9RatificationArtifacts();
const ratA = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.E.1',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(ratA.allowed, 'E.12 ratification allowed');
assert(ratA.artifact.layer_id === 'L9', 'E.13 layer id L9');
assert(ratA.artifact.artifact_hash.length === 8,
  'E.14 8-char fingerprint');
assert(ratA.artifact.downstream_dependency_allowed,
  'E.15 downstream allowed on green artifact');
assert(ratA.artifact.freeze_status === L9FreezeStatus.FROZEN,
  'E.16 freeze status FROZEN');
assert(ratA.artifact.final_definition_surface_hash.length === 8,
  'E.17 definition surface hash present');
assert(ratA.artifact.execution_sequence_hash.length === 8,
  'E.18 execution sequence hash present');
assert(ratA.artifact.stable_handoff_surface_hash.length === 8,
  'E.19 handoff surface hash present');

const canonical = canonicalizeL9Ratification(ratA.artifact);
const canonical2 = canonicalizeL9Ratification(ratA.artifact);
assert(canonical === canonical2,
  'E.20 canonicalization deterministic');
assert(l9RatificationFingerprint('foo') ===
  l9RatificationFingerprint('foo'),
  'E.21 fingerprint deterministic');
assert(l9RatificationFingerprint('foo') !==
  l9RatificationFingerprint('bar'),
  'E.22 fingerprint sensitive');

registerL9RatificationArtifact(ratA.artifact);
assert(getLatestL9RatificationArtifact()?.artifact_hash ===
  ratA.artifact.artifact_hash,
  'E.23 latest ratification retrievable');
assert(listL9RatificationArtifacts().length === 1,
  'E.24 ratification log length');
clearL9RatificationArtifacts();
assert(listL9RatificationArtifacts().length === 0,
  'E.25 ratification log cleared');

clearL9CertificationArtifacts();
const certArt = buildL9CertificationArtifact({
  certification_run_id: 'cert.E.1',
  layer_version_set: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.concat(['L9.9']).map(sl => [sl, '1.0.0']),
  ),
  bands: ALL_L9_CERTIFICATION_BANDS.map(b => ({
    band: b, passed: 1, failed: 0, duration_ms: 1, ok: true,
    blocking_violations: [],
  })),
  invariants: [{ id: 'INV-9.9-A', holds: true, evidence: 'ok' }],
  ratification_artifact_hash: ratA.artifact.artifact_hash,
  completion_state: 'L9_PRODUCTION_READY',
});
assert(certArt.level === L9CertificationLevel.PRODUCTION_GREEN,
  'E.26 green cert → PRODUCTION_GREEN');
assert(certArt.rollout_recommended, 'E.27 green cert → rollout');
assert(certArt.artifact_fingerprint.length === 8,
  'E.28 cert artifact fingerprint');
registerL9CertificationArtifact(certArt);
assert(getLatestL9CertificationArtifact()?.certification_run_id ===
  'cert.E.1', 'E.29 latest cert retrievable');
assert(listL9CertificationArtifacts().length === 1, 'E.30 cert log');
clearL9CertificationArtifacts();

assert(fingerprintL9('x') !== fingerprintL9('y'),
  'E.31 fingerprint sensitive');
assert(canonicalizeL9Artifact(certArt).length > 0,
  'E.32 artifact canonicalization non-empty');

console.log(`  Band E cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND F — Ratification + rollout + rollback + playbooks done gate
// ═══════════════════════════════════════════════════════════════
console.log(
  '\n═══ BAND F: Ratification and done gate (rollout+rollback) ═══');

const missingSl = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.missing',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS
      .filter(sl => sl !== 'L9.5')
      .map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS
    .filter(sl => sl !== 'L9.5')
    .map(greenCertRef),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(!missingSl.allowed, 'F.01 missing sublayer blocks');
assert(missingSl.blocking_violations.includes(
  L9RatificationViolationCode.MISSING_SUBLAYER,
), 'F.02 MISSING_SUBLAYER emitted');

const failedSl = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.failed',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(sl =>
    sl === 'L9.3'
      ? { ...greenCertRef(sl), level: 'FAILED' as const,
          rollout_recommended: false,
          blocking_violations: ['runtime determinism fail'] }
      : greenCertRef(sl),
  ),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(!failedSl.allowed, 'F.03 failed sublayer blocks');

const noHandoff = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.nohandoff',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: [],
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(!noHandoff.allowed, 'F.04 empty handoff blocks');
assert(noHandoff.blocking_violations.includes(
  L9RatificationViolationCode.MISSING_HANDOFF_SURFACE,
), 'F.05 MISSING_HANDOFF_SURFACE emitted');

const notReady = validator.validate({
  ...greenEv, runtime_deterministic: false,
});
const notReadyRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.notready',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion: notReady,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(!notReadyRat.allowed, 'F.06 non-PRODUCTION_READY blocks');
assert(
  !notReadyRat.artifact.downstream_dependency_allowed,
  'F.07 downstream disabled on blocked ratification');

const okRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.ok',
  sub_layer_versions: Object.fromEntries(
    L9_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L9_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L9FreezeStatus.FROZEN,
  extension_policy_version: L9_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L9_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L9.9/v1',
  final_definition_surface: L9_DEFINITION_SURFACE,
  execution_sequence: L9_EXECUTION_SEQUENCE,
});
assert(okRat.allowed, 'F.08 green ratification allowed');
assert(okRat.blocking_violations.length === 0, 'F.09 no blockers');
assert(okRat.artifact.completion_result ===
  L9CompletionState.L9_PRODUCTION_READY,
  'F.10 completion result PRODUCTION_READY');

// Rollout phase surface
assert(L9_ROLLOUT_FORWARD_ORDER.length === 6,
  'F.11 6 forward-ordered rollout phases');
assert(L9_DOWNSTREAM_VISIBLE_PHASES.length === 4,
  'F.12 4 downstream-visible phases');
for (const ph of L9_ROLLOUT_FORWARD_ORDER) {
  assert((L9_ROLLOUT_PHASE_DESCRIPTION[ph] || '').length > 0,
    `F.13 rollout phase ${ph} documented`);
}
assert(isL9ForwardPhaseTransitionLegal(
  L9RolloutPhase.SHADOW, L9RolloutPhase.CANARY),
  'F.14 SHADOW → CANARY legal');
assert(!isL9ForwardPhaseTransitionLegal(
  L9RolloutPhase.SHADOW, L9RolloutPhase.FULL_LIVE),
  'F.15 SHADOW → FULL_LIVE illegal');

const gate = new Layer9RolloutGate();
const bootstrap = gate.decide({
  request_id: 'F.gate.bootstrap',
  from_phase: L9RolloutPhase.PRE_ROLLOUT,
  to_phase: L9RolloutPhase.SHADOW,
  ratification: null,
  freeze_status: L9FreezeStatus.OPEN,
});
assert(bootstrap.allowed, 'F.16 PRE_ROLLOUT → SHADOW allowed without cert');

const canaryBlocked = gate.decide({
  request_id: 'F.gate.canary.nocert',
  from_phase: L9RolloutPhase.SHADOW,
  to_phase: L9RolloutPhase.CANARY,
  ratification: null,
  freeze_status: L9FreezeStatus.OPEN,
});
assert(!canaryBlocked.allowed,
  'F.17 CANARY without ratification blocked');
assert(canaryBlocked.violations.includes(
  L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION),
  'F.18 ROLLOUT_WITHOUT_CERTIFICATION emitted');

const canaryUnfrozen = gate.decide({
  request_id: 'F.gate.canary.unfrozen',
  from_phase: L9RolloutPhase.SHADOW,
  to_phase: L9RolloutPhase.CANARY,
  ratification: okRat.artifact,
  freeze_status: L9FreezeStatus.OPEN,
});
assert(!canaryUnfrozen.allowed,
  'F.19 CANARY without freeze blocked');

const canaryOk = gate.decide({
  request_id: 'F.gate.canary.ok',
  from_phase: L9RolloutPhase.SHADOW,
  to_phase: L9RolloutPhase.CANARY,
  ratification: okRat.artifact,
  freeze_status: L9FreezeStatus.FROZEN,
});
assert(canaryOk.allowed, 'F.20 CANARY with ratification+freeze allowed');

const scrambledGate = gate.decide({
  request_id: 'F.gate.scrambled',
  from_phase: L9RolloutPhase.SHADOW,
  to_phase: L9RolloutPhase.FULL_LIVE,
  ratification: okRat.artifact,
  freeze_status: L9FreezeStatus.FROZEN,
});
assert(!scrambledGate.allowed,
  'F.21 scrambled forward order blocked');
assert(scrambledGate.violations.includes(
  L9RatificationViolationCode.EXECUTION_ORDER_VIOLATION),
  'F.22 EXECUTION_ORDER_VIOLATION emitted');

// Enable/disable policy
const edp = new Layer9EnableDisablePolicy();
const disableNoop = edp.decide({
  request_id: 'F.ed.disable.noop',
  action: 'DISABLE',
  template_id: null,
  current_phase: L9RolloutPhase.PRE_ROLLOUT,
  ratification: null,
});
assert(!disableNoop.allowed,
  'F.23 disable in PRE_ROLLOUT blocked (no-op)');

const disableLive = edp.decide({
  request_id: 'F.ed.disable.live',
  action: 'DISABLE',
  template_id: null,
  current_phase: L9RolloutPhase.FULL_LIVE,
  ratification: okRat.artifact,
});
assert(disableLive.allowed,
  'F.24 disable in FULL_LIVE allowed (soft kill)');

const enableUnready = edp.decide({
  request_id: 'F.ed.enable.unready',
  action: 'ENABLE',
  template_id: 't1',
  current_phase: L9RolloutPhase.SHADOW,
  ratification: okRat.artifact,
});
assert(!enableUnready.allowed,
  'F.25 enable requires downstream-visible phase');

const enableOk = edp.decide({
  request_id: 'F.ed.enable.ok',
  action: 'ENABLE',
  template_id: 't1',
  current_phase: L9RolloutPhase.CANARY,
  ratification: okRat.artifact,
});
assert(enableOk.allowed, 'F.26 enable with ratification+canary allowed');

// Rollback policy
assert(L9_LEGAL_ROLLBACK_CLASSES.length >= 3,
  'F.27 ≥3 legal rollback classes');
assert(L9_PROHIBITED_ROLLBACK_CLASSES.length >= 3,
  'F.28 ≥3 prohibited rollback classes');
const rp = new Layer9RollbackPolicy();

const deleteHist = rp.decide({
  request_id: 'F.rb.delete',
  rollback_class: L9RollbackClass.DESTRUCTIVE_DELETE_HISTORY,
  preserves_historical_facts: false,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'attempt',
});
assert(!deleteHist.allowed, 'F.29 delete-history blocked');
assert(deleteHist.violations.includes(
  L9RatificationViolationCode.ROLLBACK_ERASES_HISTORY),
  'F.30 ROLLBACK_ERASES_HISTORY emitted');

const unlink = rp.decide({
  request_id: 'F.rb.unlink',
  rollback_class: L9RollbackClass.UNLINK_LINEAGE,
  preserves_historical_facts: true,
  preserves_lineage_continuity: false,
  downgrades_frozen_state: false,
  rationale: 'attempt',
});
assert(!unlink.allowed, 'F.31 unlink-lineage blocked');
assert(unlink.violations.includes(
  L9RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE),
  'F.32 ROLLBACK_BREAKS_LINEAGE emitted');

const legalPhase = rp.decide({
  request_id: 'F.rb.phase',
  rollback_class: L9RollbackClass.ROLL_BACK_PHASE,
  preserves_historical_facts: true,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'canary regression',
});
assert(legalPhase.allowed, 'F.33 phase rollback allowed');

const legalFence = rp.decide({
  request_id: 'F.rb.fence',
  rollback_class: L9RollbackClass.FENCE_DOWNSTREAM,
  preserves_historical_facts: true,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'downstream breach',
});
assert(legalFence.allowed, 'F.34 fence-downstream allowed');

// Failure playbooks
assert(L9_FAILURE_PLAYBOOKS.length >= ALL_L9_FAILURE_CLASSES.length,
  'F.35 failure playbooks cover all failure classes');
for (const fc of ALL_L9_FAILURE_CLASSES) {
  const pb = getL9FailurePlaybook(fc);
  assert(pb !== null, `F.36 playbook for ${fc} present`);
  assert(pb !== null && pb.remediation_summary.length > 0,
    `F.37 playbook for ${fc} has remediation summary`);
}
const coverage = verifyL9FailurePlaybookCoverage();
assert(coverage.all_covered,
  `F.38 playbook coverage complete (missing=${coverage.missing.length})`);

console.log(`  Band F cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND G — Full master regression (audit + invariants + master)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND G: Full master regression ═══');

clearL9FinalAuditLog();
const auditRat = emitL9RatificationDecision('rat.G.1', true, []);
assert(auditRat.severity === L9FinalAuditSeverity.INFO,
  'G.01 allowed rat → INFO');
const auditRatBad = emitL9RatificationDecision('rat.G.2', false,
  [L9RatificationViolationCode.MISSING_SUBLAYER]);
assert(auditRatBad.severity === L9FinalAuditSeverity.BLOCK,
  'G.02 blocked rat → BLOCK');
const auditCmp = emitL9CompletionFailure('rat.G.3',
  validator.validate({ ...greenEv, runtime_deterministic: false }));
assert(auditCmp.kind === L9FinalAuditKind.COMPLETION_FAILURE,
  'G.03 completion failure kind');
const auditFrz = emitL9FreezeActivation('frz.G.1',
  L9FreezeStatus.FROZEN, true, [], 'ok');
assert(auditFrz.kind === L9FinalAuditKind.FREEZE_ACTIVATION,
  'G.04 freeze activation kind');
const auditExt = emitL9ExtensionClassification({
  proposal_id: 'p.G.1',
  classification: L9ExtensionClass.MIGRATION_REQUIRED,
  requires_recertification: true,
  rationale: ['t'],
});
assert(auditExt.severity === L9FinalAuditSeverity.WARN,
  'G.05 migration classification → WARN');
const auditDep = emitL9DownstreamDependencyViolation({
  request_id: 'dep.G.1',
  allowance: L9DependencyAllowance.DENIED,
  rationale: 'forbidden',
}, L9RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY);
assert(auditDep.kind ===
  L9FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
  'G.06 downstream audit kind');
const auditRol = emitL9RolloutDecision('rol.G.1',
  L9RolloutPhase.SHADOW, L9RolloutPhase.CANARY, false,
  [L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION],
  'no cert');
assert(auditRol.kind === L9FinalAuditKind.ROLLOUT_DECISION,
  'G.07 rollout audit kind');
assert(auditRol.severity === L9FinalAuditSeverity.BLOCK,
  'G.08 blocked rollout → BLOCK');
const auditRbk = emitL9RollbackDecision('rbk.G.1',
  L9RollbackClass.DESTRUCTIVE_DELETE_HISTORY, false,
  [L9RatificationViolationCode.ROLLBACK_ERASES_HISTORY],
  'prohibited');
assert(auditRbk.kind === L9FinalAuditKind.ROLLBACK_DECISION,
  'G.09 rollback audit kind');

assert(listL9FinalAuditRecords().length === 8,
  'G.10 8 audit records');
assert(queryL9FinalAuditByKind(
  L9FinalAuditKind.RATIFICATION_DECISION).length === 2,
  'G.11 query by kind');
assert(queryL9FinalAuditBySubject('rat.G.1').length === 1,
  'G.12 query by subject');
clearL9FinalAuditLog();
assert(listL9FinalAuditRecords().length === 0, 'G.13 audit cleared');

const invs = checkAllL9_9Invariants();
assert(invs.length === 7, 'G.14 7 L9.9 invariants');
assert(invs.every(i => i.holds),
  `G.15 all L9.9 invariants hold: ${invs.filter(i => !i.holds)
    .map(i => i.id + ':' + i.evidence).join(',')}`);

const a = checkINV_99_A(); assert(a.holds, `G.16 ${a.id}: ${a.evidence}`);
const b = checkINV_99_B(); assert(b.holds, `G.17 ${b.id}: ${b.evidence}`);
const c = checkINV_99_C(); assert(c.holds, `G.18 ${c.id}: ${c.evidence}`);
const d = checkINV_99_D(); assert(d.holds, `G.19 ${d.id}: ${d.evidence}`);
const e = checkINV_99_E(); assert(e.holds, `G.20 ${e.id}: ${e.evidence}`);
const f = checkINV_99_F(); assert(f.holds, `G.21 ${f.id}: ${f.evidence}`);
const g = checkINV_99_G(); assert(g.holds, `G.22 ${g.id}: ${g.evidence}`);

// Master certification: runs all bands + aggregates invariants.
clearL9RatificationArtifacts();
clearL9CertificationArtifacts();
(async () => {
  const master = await runL9MasterCertification({
    certification_run_id: 'master.G.1',
  });
  assert(master.certification_run_id === 'master.G.1',
    'G.23 master run id respected');
  assert(master.level === L9CertificationLevel.PRODUCTION_GREEN,
    `G.24 master PRODUCTION_GREEN (got ${master.level}, blockers=` +
      `${master.blocking_violations.slice(0, 5).join('|')})`);
  assert(master.rollout_recommended,
    'G.25 rollout recommended on green master');
  assert(master.bands.length === 7, 'G.26 master produced 7 band outcomes');
  assert(master.bands.every(bnd => bnd.ok),
    `G.27 all master bands green (failing: ${
      master.bands.filter(bnd => !bnd.ok).map(bnd => bnd.band).join(',')
    })`);
  assert(master.invariants.length >= 40,
    `G.28 master aggregated ≥40 invariants (got ${
      master.invariants.length})`);
  assert(master.invariants.every(inv => inv.holds),
    `G.29 all aggregated invariants hold (failing: ${
      master.invariants.filter(inv => !inv.holds).map(inv => inv.id)
        .join(',')})`);
  assert(master.completion_state === 'L9_PRODUCTION_READY',
    'G.30 completion state recorded');
  assert(master.ratification_artifact_hash.length === 8,
    'G.31 ratification hash present');
  assert(master.artifact_fingerprint.length === 8,
    'G.32 cert artifact fingerprint');
  assert(master.critical_breach_count === 0,
    `G.33 no critical breaches (got ${master.critical_breach_count})`);

  // Full regression: execution sequence untouched.
  assert(L9_EXECUTION_SEQUENCE.length === 9,
    'G.34 execution sequence still canonical after master run');

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
