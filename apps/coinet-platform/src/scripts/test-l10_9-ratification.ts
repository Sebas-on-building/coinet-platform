/**
 * L10.9 — Ratification, Freeze, Completion, Handoff, Rollout, Rollback
 *         Certification Test Suite
 *
 * Seven bands (§10.9.10):
 *   A — Final definition and completion law
 *   B — Freeze and protected-surface law
 *   C — Extension and migration law
 *   D — Downstream dependency law
 *   E — Certification artifact and lineage
 *   F — Ratification and done gate (rollout + rollback + playbooks)
 *   G — Full master regression (audit + invariants + master)
 */

import {
  L10_CANONICAL_DEFINITION,
  L10_MINIMAL_DEFINITION,
  L10_EXPANDED_DEFINITION,
  L10_NEGATIVE_DEFINITION,
  L10_DEPENDENCY_FINALITY,
  L10_OUTPUT_FINALITY,
  L10_STRUCTURAL_FORM,
  L10_EXECUTION_SEQUENCE,
  L10_REQUIRED_SUBLAYERS,
  L10_DEFINITION_SURFACE,
} from '../l10/contracts/l10-final-definition';
import {
  ALL_L10_COMPLETION_DIMENSIONS,
  L10CompletionState,
  ALL_L10_COMPLETION_STATES,
  L10RatificationViolationCode,
  ALL_L10_RATIFICATION_VIOLATION_CODES,
  L10_COMPLETION_REQUIREMENTS,
} from '../l10/contracts/l10-completion-standard';
import {
  L10FreezeStatus,
  L10_FREEZE_POLICY_V1,
  L10_FROZEN_SURFACES,
  L10_EVOLVABLE_SURFACES,
  L10_HARD_PROTECTED_SURFACES,
} from '../l10/contracts/l10-freeze-policy';
import {
  L10ExtensionClass,
  ALL_L10_EXTENSION_CLASSES,
  L10_EXTENSION_POLICY_V1,
} from '../l10/contracts/l10-extension-policy';
import {
  L10DependencyAllowance,
  L10DownstreamAccessKind,
  L10DownstreamConsumerMode,
  L10_STABLE_HANDOFF_SURFACES,
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L10_GOVERNED_ONLY_ACCESS_KINDS,
  ALL_L10_DOWNSTREAM_ACCESS_KINDS,
} from '../l10/contracts/l10-downstream-dependency';

import {
  Layer10CompletionValidator,
} from '../l10/completion/l10-completion-validator';
import {
  Layer10RatificationBuilder,
  canonicalizeL10Ratification,
  l10RatificationFingerprint,
  registerL10RatificationArtifact,
  getLatestL10RatificationArtifact,
  clearL10RatificationArtifacts,
  listL10RatificationArtifacts,
} from '../l10/completion/l10-ratification-builder';
import {
  Layer10FreezePolicyValidator,
} from '../l10/completion/l10-freeze-activator';
import {
  Layer10ExtensionClassifier,
} from '../l10/completion/l10-extension-classifier';
import {
  Layer10HandoffValidator,
} from '../l10/completion/l10-handoff-validator';

import {
  L10CertificationBand,
  ALL_L10_CERTIFICATION_BANDS,
  describeL10Band,
} from '../l10/certification/l10-certification-band';
import {
  L10CertificationLevel,
  L10_CONSTITUTIONAL_BANDS,
  L10_RUNTIME_BANDS,
  L10_PRODUCTION_BANDS,
  deriveL10CertificationLevel,
  l10LevelIsAtLeast,
} from '../l10/certification/l10-certification-level';
import {
  buildL10CertificationArtifact,
  canonicalizeL10Artifact,
  fingerprintL10,
  registerL10CertificationArtifact,
  clearL10CertificationArtifacts,
  listL10CertificationArtifacts,
  getLatestL10CertificationArtifact,
} from '../l10/certification/l10-certification-report';
import {
  runL10MasterCertification,
} from '../l10/certification/l10-master-certification';

import {
  L10RolloutPhase,
  L10_ROLLOUT_FORWARD_ORDER,
  L10_DOWNSTREAM_VISIBLE_PHASES,
  L10_ROLLOUT_PHASE_DESCRIPTION,
  isL10ForwardPhaseTransitionLegal,
} from '../l10/rollout/l10-rollout-phase';
import {
  Layer10RolloutGate,
} from '../l10/rollout/l10-rollout-gate';
import {
  Layer10EnableDisablePolicy,
} from '../l10/rollout/l10-enable-disable-policy';
import {
  Layer10RollbackPolicy,
  L10RollbackClass,
  L10_LEGAL_ROLLBACK_CLASSES,
  L10_PROHIBITED_ROLLBACK_CLASSES,
} from '../l10/rollout/l10-rollback-policy';
import {
  L10_FAILURE_PLAYBOOKS,
  ALL_L10_FAILURE_CLASSES,
  getL10FailurePlaybook,
  verifyL10FailurePlaybookCoverage,
} from '../l10/rollout/l10-failure-playbooks';

import {
  emitL10RatificationDecision,
  emitL10CompletionFailure,
  emitL10FreezeActivation,
  emitL10ExtensionClassification,
  emitL10DownstreamDependencyViolation,
  emitL10RolloutDecision,
  emitL10RollbackDecision,
  L10FinalAuditKind,
  L10FinalAuditSeverity,
  listL10FinalAuditRecords,
  queryL10FinalAuditByKind,
  queryL10FinalAuditBySubject,
  clearL10FinalAuditLog,
} from '../l10/constitution/l10-final-audit';

import {
  checkINV_109_A,
  checkINV_109_B,
  checkINV_109_C,
  checkINV_109_D,
  checkINV_109_E,
  checkINV_109_F,
  checkINV_109_G,
  checkAllL10_9Invariants,
  buildL10GreenEvidence,
} from '../l10/invariants/l10_9-invariants';

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

assert(L10_CANONICAL_DEFINITION.length > 0,
  'A.01 canonical def present');
assert(L10_MINIMAL_DEFINITION.length > 0, 'A.02 minimal def present');
assert(L10_EXPANDED_DEFINITION.length >= 3,
  'A.03 ≥3 expanded sentences');
assert(L10_NEGATIVE_DEFINITION.length >= 5,
  'A.04 ≥5 negative bullets');
assert(L10_DEPENDENCY_FINALITY.L5.includes('persistence authority'),
  'A.05 L5 frozen as persistence authority');
assert(L10_DEPENDENCY_FINALITY.L9.length > 0,
  'A.06 L9 sequence/temporal posture declared as dependency');
assert(L10_OUTPUT_FINALITY.length >= 5, 'A.07 ≥5 output surfaces');
assert(L10_STRUCTURAL_FORM.length === 9, 'A.08 9 structural sections');
assert(L10_EXECUTION_SEQUENCE.length === 9, 'A.09 9 execution steps');
assert(L10_REQUIRED_SUBLAYERS.length === 8, 'A.10 8 required sublayers');
assert(L10_DEFINITION_SURFACE.length ===
  2 + L10_EXPANDED_DEFINITION.length,
  'A.11 definition surface = canonical + minimal + expanded');

assert(ALL_L10_COMPLETION_DIMENSIONS.length === 4,
  'A.12 4 completion dimensions');
assert(ALL_L10_COMPLETION_STATES.length === 3,
  'A.13 3 completion states');
assert(ALL_L10_RATIFICATION_VIOLATION_CODES.length >= 20,
  'A.14 violation codes enumerated');
for (const d of ALL_L10_COMPLETION_DIMENSIONS) {
  const req = L10_COMPLETION_REQUIREMENTS[d];
  assert(req.bullets.length >= 3,
    `A.15 ${d} has ≥3 completion bullets`);
}

const validator = new Layer10CompletionValidator();
const greenEv = buildL10GreenEvidence();
const greenRes = validator.validate(greenEv);
assert(greenRes.overall_state === L10CompletionState.L10_PRODUCTION_READY,
  'A.16 green evidence → PRODUCTION_READY');
assert(greenRes.dimensions.every(d => d.satisfied),
  'A.17 every dimension satisfied');
assert(greenRes.violations.length === 0,
  'A.18 no violations on green evidence');

const runtimeBroken = validator.validate({
  ...greenEv, confidence_cap_bound: false,
});
assert(
  runtimeBroken.overall_state !== L10CompletionState.L10_PRODUCTION_READY,
  'A.19 runtime dimension failure downgrades completion');
const constConst = validator.validate({
  ...greenEv, mission_boundary_frozen: false,
});
assert(
  constConst.overall_state === L10CompletionState.L10_NOT_READY,
  'A.20 constitutional failure → NOT_READY');
const servingBroken = validator.validate({
  ...greenEv, read_surfaces_governed: false,
});
assert(
  servingBroken.overall_state !== L10CompletionState.L10_PRODUCTION_READY,
  'A.21 serving failure downgrades');
const persistBroken = validator.validate({
  ...greenEv, l5_only_persistence_authority: false,
});
assert(
  persistBroken.overall_state !== L10CompletionState.L10_PRODUCTION_READY,
  'A.22 persistence failure downgrades');
const collapse = validator.validate({
  ...greenEv, no_single_story_collapse: false,
});
assert(
  collapse.overall_state !== L10CompletionState.L10_PRODUCTION_READY,
  'A.23 single-story collapse downgrades');

console.log(`  Band A cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND B — Freeze and protected-surface law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Freeze and protected-surface law ═══');

assert(L10_FROZEN_SURFACES.length >= 5, 'B.01 ≥5 frozen surfaces');
assert(L10_EVOLVABLE_SURFACES.length >= 1, 'B.02 ≥1 evolvable surface');
assert(L10_HARD_PROTECTED_SURFACES.length >= 1,
  'B.03 ≥1 hard-protected surface');
assert(L10_FREEZE_POLICY_V1.version === '1.0.0',
  'B.04 freeze policy v1 version');

const freezeValidator = new Layer10FreezePolicyValidator();
const prem = freezeValidator.activate({
  request_id: 'B.premature',
  target_status: L10FreezeStatus.FROZEN,
  ratification: null,
  freeze_policy: L10_FREEZE_POLICY_V1,
});
assert(!prem.allowed, 'B.05 freeze without ratification denied');
assert(
  prem.violations.includes(
    L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION,
  ),
  'B.06 premature freeze emits violation code');

const premHard = freezeValidator.activate({
  request_id: 'B.premature.hard',
  target_status: L10FreezeStatus.HARD_PROTECTED,
  ratification: null,
  freeze_policy: L10_FREEZE_POLICY_V1,
});
assert(!premHard.allowed,
  'B.07 hard freeze without ratification denied');

const openOk = freezeValidator.activate({
  request_id: 'B.open',
  target_status: L10FreezeStatus.OPEN,
  ratification: null,
  freeze_policy: L10_FREEZE_POLICY_V1,
});
assert(openOk.allowed,
  'B.08 OPEN status allowed without ratification');

const builder = new Layer10RatificationBuilder();
const completion = validator.validate(greenEv);
const ratGreen = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.B.ok',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(ratGreen.allowed, 'B.09 green ratification allowed');

const freezeOk = freezeValidator.activate({
  request_id: 'B.freeze.ok',
  target_status: L10FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: L10_FREEZE_POLICY_V1,
});
assert(freezeOk.allowed, 'B.10 freeze with valid ratification allowed');
assert(freezeOk.activated_status === L10FreezeStatus.FROZEN,
  'B.11 activated status is FROZEN');

const hardOk = freezeValidator.activate({
  request_id: 'B.hard.ok',
  target_status: L10FreezeStatus.HARD_PROTECTED,
  ratification: ratGreen.artifact,
  freeze_policy: L10_FREEZE_POLICY_V1,
});
assert(hardOk.allowed,
  'B.12 hard-protected with ratification allowed');

const versionMismatch = freezeValidator.activate({
  request_id: 'B.freeze.verbad',
  target_status: L10FreezeStatus.FROZEN,
  ratification: ratGreen.artifact,
  freeze_policy: { ...L10_FREEZE_POLICY_V1, version: '9.9.9' },
});
assert(!versionMismatch.allowed,
  'B.13 mismatched freeze policy version denied');

console.log(`  Band B cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND C — Extension and migration law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Extension and migration law ═══');

assert(ALL_L10_EXTENSION_CLASSES.length === 5,
  'C.01 5 extension classes');
assert(
  L10_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L10ExtensionClass.MIGRATION_REQUIRED,
  ),
  'C.02 migration requires recertification');
assert(
  L10_EXTENSION_POLICY_V1.recertification_required_for.includes(
    L10ExtensionClass.BREAKING_SEMANTIC,
  ),
  'C.03 breaking requires recertification');

const classifier = new Layer10ExtensionClassifier();
const baseProp = {
  proposal_id: '',
  title: '',
  touches_frozen_surface: false,
  touches_hard_protected_surface: false,
  alters_hypothesis_family_ontology: false,
  alters_template_semantics: false,
  alters_subject_contract: false,
  alters_output_contract: false,
  alters_ranking_law: false,
  alters_spread_semantics: false,
  alters_cap_chain_law: false,
  alters_readiness_class_meaning: false,
  alters_restriction_right_meaning: false,
  alters_confidence_law: false,
  alters_support_semantics: false,
  alters_contradiction_semantics: false,
  alters_confirmation_semantics: false,
  alters_invalidation_semantics: false,
  alters_shift_condition_semantics: false,
  alters_read_surface: false,
  alters_stable_handoff_surface: false,
  introduces_judgment_semantics: false,
  introduces_scenario_semantics: false,
  introduces_scoring_finality: false,
  introduces_recommendation_semantics: false,
  enables_primary_as_final_judgment: false,
  enables_single_story_collapse: false,
  enables_live_lower_layer_rebuild: false,
  enables_redis_as_authority: false,
  bypasses_l5_persistence: false,
  introduces_causal_certainty_without_authorization: false,
  is_additive_only: false,
  preserves_replay_hashes: true,
  preserves_historical_meaning: true,
  widens_downstream_rights: false,
  notes: '',
};

const add = classifier.classify({
  ...baseProp, proposal_id: 'C.add', is_additive_only: true,
});
assert(add.classification === L10ExtensionClass.ADDITIVE_SAFE,
  'C.04 additive classified correctly');
assert(!add.requires_recertification, 'C.05 additive no recert');

const mig = classifier.classify({
  ...baseProp, proposal_id: 'C.mig', alters_template_semantics: true,
});
assert(mig.classification === L10ExtensionClass.MIGRATION_REQUIRED,
  'C.06 template change classified MIGRATION_REQUIRED');
assert(mig.requires_recertification, 'C.07 migration recert required');

const brk = classifier.classify({
  ...baseProp, proposal_id: 'C.brk',
  alters_ranking_law: true, touches_frozen_surface: true,
});
assert(brk.classification === L10ExtensionClass.BREAKING_SEMANTIC,
  'C.08 ranking-law change classified BREAKING');

const spread = classifier.classify({
  ...baseProp, proposal_id: 'C.spread',
  alters_spread_semantics: true, touches_frozen_surface: true,
});
assert(spread.classification === L10ExtensionClass.BREAKING_SEMANTIC,
  'C.09 spread semantics change classified BREAKING');

const forbidJudg = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.judgment',
  introduces_judgment_semantics: true,
});
assert(forbidJudg.classification === L10ExtensionClass.PROHIBITED,
  'C.10 judgment prohibited');

const forbidScenario = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.scenario',
  introduces_scenario_semantics: true,
});
assert(forbidScenario.classification === L10ExtensionClass.PROHIBITED,
  'C.11 scenario semantics prohibited');

const forbidScore = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.score',
  introduces_scoring_finality: true,
});
assert(forbidScore.classification === L10ExtensionClass.PROHIBITED,
  'C.12 scoring finality prohibited');

const forbidRec = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.rec',
  introduces_recommendation_semantics: true,
});
assert(forbidRec.classification === L10ExtensionClass.PROHIBITED,
  'C.13 recommendation prohibited');

const forbidPrimary = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.primary',
  enables_primary_as_final_judgment: true,
});
assert(forbidPrimary.classification === L10ExtensionClass.PROHIBITED,
  'C.14 primary-as-final-judgment prohibited');

const forbidCollapse = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.collapse',
  enables_single_story_collapse: true,
});
assert(forbidCollapse.classification === L10ExtensionClass.PROHIBITED,
  'C.15 single-story-collapse prohibited');

const forbidLive = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.live',
  enables_live_lower_layer_rebuild: true,
});
assert(forbidLive.classification === L10ExtensionClass.PROHIBITED,
  'C.16 live raw lower-layer rebuild prohibited');

const forbidRedis = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.redis',
  enables_redis_as_authority: true,
});
assert(forbidRedis.classification === L10ExtensionClass.PROHIBITED,
  'C.17 redis as authority prohibited');

const forbidBypass = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.bypass',
  bypasses_l5_persistence: true,
});
assert(forbidBypass.classification === L10ExtensionClass.PROHIBITED,
  'C.18 L5 bypass prohibited');

const forbidCausal = classifier.classify({
  ...baseProp, proposal_id: 'C.prohibit.causal',
  introduces_causal_certainty_without_authorization: true,
});
assert(forbidCausal.classification === L10ExtensionClass.PROHIBITED,
  'C.19 unauthorized causal certainty prohibited');

console.log(`  Band C cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND D — Downstream dependency law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Downstream dependency law ═══');

assert(ALL_L10_DOWNSTREAM_ACCESS_KINDS.length ===
  L10_STABLE_HANDOFF_SURFACES.length +
  L10_GOVERNED_ONLY_ACCESS_KINDS.length +
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length,
  'D.01 enum partitioned into handoff + governed + forbidden');
assert(L10_STABLE_HANDOFF_SURFACES.length >= 5,
  'D.02 ≥5 stable handoff surfaces');
assert(L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.length >= 5,
  'D.03 ≥5 forbidden access kinds');
assert(
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L10DownstreamAccessKind.JUDGMENT_FROM_L10,
  ),
  'D.04 JUDGMENT_FROM_L10 forbidden');
assert(
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L10DownstreamAccessKind.SCENARIO_FROM_L10,
  ),
  'D.05 SCENARIO_FROM_L10 forbidden');
assert(
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L10DownstreamAccessKind.SCORE_FROM_L10,
  ),
  'D.06 SCORE_FROM_L10 forbidden');
assert(
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(
    L10DownstreamAccessKind.PRIMARY_AS_FINAL_JUDGMENT,
  ),
  'D.07 PRIMARY_AS_FINAL_JUDGMENT forbidden');

const dv = new Layer10HandoffValidator();
for (const kind of L10_STABLE_HANDOFF_SURFACES) {
  const d = dv.validate({
    request_id: `D.stable.${kind}`,
    consumer_layer: 'L11',
    access_kind: kind,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L10DependencyAllowance.ALLOWED,
    `D.08 stable ${kind} allowed`);
  assert(dv.isStableHandoff(kind), `D.09 isStableHandoff(${kind})`);
}

for (const kind of L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS) {
  const d = dv.validate({
    request_id: `D.forbid.${kind}`,
    consumer_layer: 'L11',
    access_kind: kind,
    consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
    notes: '',
  });
  assert(d.allowance === L10DependencyAllowance.DENIED,
    `D.10 forbidden ${kind} denied`);
  assert(dv.isForbidden(kind), `D.11 isForbidden(${kind})`);
}

const replayNormal = dv.validate({
  request_id: 'D.replay.normal',
  consumer_layer: 'L11',
  access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
  consumer_mode: L10DownstreamConsumerMode.NORMAL_CONSUMPTION,
  notes: '',
});
assert(replayNormal.allowance === L10DependencyAllowance.DENIED,
  'D.12 ad-hoc replay under NORMAL denied');

for (const mode of [
  L10DownstreamConsumerMode.GOVERNED_REPLAY,
  L10DownstreamConsumerMode.GOVERNED_REPAIR,
  L10DownstreamConsumerMode.GOVERNED_AUDIT,
]) {
  const d = dv.validate({
    request_id: `D.replay.${mode}`,
    consumer_layer: 'L11',
    access_kind: L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
    consumer_mode: mode,
    notes: '',
  });
  assert(
    d.allowance === L10DependencyAllowance.CONDITIONALLY_ALLOWED,
    `D.13 ad-hoc replay under ${mode} conditional`);
}

console.log(`  Band D cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND E — Certification artifact and lineage
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Certification artifact and lineage ═══');

assert(ALL_L10_CERTIFICATION_BANDS.length === 7, 'E.01 7 L10 bands');
for (const b of ALL_L10_CERTIFICATION_BANDS) {
  assert(describeL10Band(b).length > 0, `E.02 description for ${b}`);
}
assert(L10_CONSTITUTIONAL_BANDS.length === 3, 'E.03 3 constitutional');
assert(L10_RUNTIME_BANDS.length === 5, 'E.04 5 runtime bands');
assert(L10_PRODUCTION_BANDS.length === 7, 'E.05 7 production bands');

const allPassing = new Set(ALL_L10_CERTIFICATION_BANDS);
assert(deriveL10CertificationLevel(allPassing) ===
  L10CertificationLevel.PRODUCTION_GREEN,
  'E.06 all bands → PRODUCTION_GREEN');
const rtPassing = new Set(L10_RUNTIME_BANDS);
assert(deriveL10CertificationLevel(rtPassing) ===
  L10CertificationLevel.RUNTIME_GREEN,
  'E.07 runtime bands → RUNTIME_GREEN');
const ctPassing = new Set(L10_CONSTITUTIONAL_BANDS);
assert(deriveL10CertificationLevel(ctPassing) ===
  L10CertificationLevel.CONSTITUTIONAL_GREEN,
  'E.08 constitutional bands → CONSTITUTIONAL_GREEN');
assert(deriveL10CertificationLevel(new Set()) ===
  L10CertificationLevel.NOT_CERTIFIED,
  'E.09 empty → NOT_CERTIFIED');
assert(l10LevelIsAtLeast(
  L10CertificationLevel.PRODUCTION_GREEN,
  L10CertificationLevel.RUNTIME_GREEN,
), 'E.10 level ordering');
assert(!l10LevelIsAtLeast(
  L10CertificationLevel.CONSTITUTIONAL_GREEN,
  L10CertificationLevel.PRODUCTION_GREEN,
), 'E.11 level ordering reverse');

clearL10RatificationArtifacts();
const ratA = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.E.1',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(ratA.allowed, 'E.12 ratification allowed');
assert(ratA.artifact.layer_id === 'L10', 'E.13 layer id L10');
assert(ratA.artifact.layer_name === 'Hypothesis Engine',
  'E.14 layer name Hypothesis Engine');
assert(ratA.artifact.artifact_hash.length === 8,
  'E.15 8-char fingerprint');
assert(ratA.artifact.downstream_dependency_allowed,
  'E.16 downstream allowed on green artifact');
assert(ratA.artifact.rollout_recommended,
  'E.17 rollout recommended on green artifact');
assert(ratA.artifact.freeze_status === L10FreezeStatus.FROZEN,
  'E.18 freeze status FROZEN');
assert(ratA.artifact.final_definition_surface_hash.length === 8,
  'E.19 definition surface hash present');
assert(ratA.artifact.execution_sequence_hash.length === 8,
  'E.20 execution sequence hash present');
assert(ratA.artifact.stable_handoff_surface_hash.length === 8,
  'E.21 handoff surface hash present');

const canonical = canonicalizeL10Ratification(ratA.artifact);
const canonical2 = canonicalizeL10Ratification(ratA.artifact);
assert(canonical === canonical2,
  'E.22 canonicalization deterministic');
assert(l10RatificationFingerprint('foo') ===
  l10RatificationFingerprint('foo'),
  'E.23 fingerprint deterministic');
assert(l10RatificationFingerprint('foo') !==
  l10RatificationFingerprint('bar'),
  'E.24 fingerprint sensitive');

registerL10RatificationArtifact(ratA.artifact);
assert(getLatestL10RatificationArtifact()?.artifact_hash ===
  ratA.artifact.artifact_hash,
  'E.25 latest ratification retrievable');
assert(listL10RatificationArtifacts().length === 1,
  'E.26 ratification log length');
clearL10RatificationArtifacts();
assert(listL10RatificationArtifacts().length === 0,
  'E.27 ratification log cleared');

clearL10CertificationArtifacts();
const certArt = buildL10CertificationArtifact({
  certification_run_id: 'cert.E.1',
  layer_version_set: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.concat(['L10.9']).map(sl => [sl, '1.0.0']),
  ),
  bands: ALL_L10_CERTIFICATION_BANDS.map(b => ({
    band: b, passed: 1, failed: 0, duration_ms: 1, ok: true,
    blocking_violations: [],
  })),
  invariants: [{ id: 'INV-10.9-A', holds: true, evidence: 'ok' }],
  ratification_artifact_hash: ratA.artifact.artifact_hash,
  completion_state: 'L10_PRODUCTION_READY',
});
assert(certArt.level === L10CertificationLevel.PRODUCTION_GREEN,
  'E.28 green cert → PRODUCTION_GREEN');
assert(certArt.rollout_recommended, 'E.29 green cert → rollout');
assert(certArt.artifact_fingerprint.length === 8,
  'E.30 cert artifact fingerprint');
registerL10CertificationArtifact(certArt);
assert(getLatestL10CertificationArtifact()?.certification_run_id ===
  'cert.E.1', 'E.31 latest cert retrievable');
assert(listL10CertificationArtifacts().length === 1, 'E.32 cert log');
clearL10CertificationArtifacts();

assert(fingerprintL10('x') !== fingerprintL10('y'),
  'E.33 fingerprint sensitive');
assert(canonicalizeL10Artifact(certArt).length > 0,
  'E.34 artifact canonicalization non-empty');

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
    L10_REQUIRED_SUBLAYERS
      .filter(sl => sl !== 'L10.5')
      .map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS
    .filter(sl => sl !== 'L10.5')
    .map(greenCertRef),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(!missingSl.allowed, 'F.01 missing sublayer blocks');
assert(missingSl.blocking_violations.includes(
  L10RatificationViolationCode.MISSING_SUBLAYER,
), 'F.02 MISSING_SUBLAYER emitted');

const failedSl = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.failed',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(sl =>
    sl === 'L10.3'
      ? { ...greenCertRef(sl), level: 'FAILED' as const,
          rollout_recommended: false,
          blocking_violations: ['runtime determinism fail'] }
      : greenCertRef(sl),
  ),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(!failedSl.allowed, 'F.03 failed sublayer blocks');

const noHandoff = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.nohandoff',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: [],
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(!noHandoff.allowed, 'F.04 empty handoff blocks');
assert(noHandoff.blocking_violations.includes(
  L10RatificationViolationCode.MISSING_HANDOFF_SURFACE,
), 'F.05 MISSING_HANDOFF_SURFACE emitted');

const notReady = validator.validate({
  ...greenEv, runtime_deterministic: false,
});
const notReadyRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.notready',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion: notReady,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(!notReadyRat.allowed, 'F.06 non-PRODUCTION_READY blocks');
assert(
  !notReadyRat.artifact.downstream_dependency_allowed,
  'F.07 downstream disabled on blocked ratification');
assert(
  !notReadyRat.artifact.rollout_recommended,
  'F.08 rollout-not-recommended on blocked ratification');

const okRat = builder.build({
  layer_version: '1.0.0',
  ratification_run_id: 'rat.F.ok',
  sub_layer_versions: Object.fromEntries(
    L10_REQUIRED_SUBLAYERS.map(sl => [sl, '1.0.0']),
  ),
  certification_artifact_refs: L10_REQUIRED_SUBLAYERS.map(greenCertRef),
  completion,
  freeze_status: L10FreezeStatus.FROZEN,
  extension_policy_version: L10_EXTENSION_POLICY_V1.version,
  stable_handoff_surfaces: L10_STABLE_HANDOFF_SURFACES,
  downstream_dependency_allowed: true,
  ratified_by_rule_set: 'L10.9/v1',
  final_definition_surface: L10_DEFINITION_SURFACE,
  execution_sequence: L10_EXECUTION_SEQUENCE,
});
assert(okRat.allowed, 'F.09 green ratification allowed');
assert(okRat.blocking_violations.length === 0, 'F.10 no blockers');
assert(okRat.artifact.completion_result ===
  L10CompletionState.L10_PRODUCTION_READY,
  'F.11 completion result PRODUCTION_READY');

// Rollout phase surface
assert(L10_ROLLOUT_FORWARD_ORDER.length === 6,
  'F.12 6 forward-ordered rollout phases');
assert(L10_DOWNSTREAM_VISIBLE_PHASES.length === 4,
  'F.13 4 downstream-visible phases');
for (const ph of L10_ROLLOUT_FORWARD_ORDER) {
  assert((L10_ROLLOUT_PHASE_DESCRIPTION[ph] || '').length > 0,
    `F.14 rollout phase ${ph} documented`);
}
assert(isL10ForwardPhaseTransitionLegal(
  L10RolloutPhase.SHADOW, L10RolloutPhase.CANARY),
  'F.15 SHADOW → CANARY legal');
assert(!isL10ForwardPhaseTransitionLegal(
  L10RolloutPhase.SHADOW, L10RolloutPhase.FULL_LIVE),
  'F.16 SHADOW → FULL_LIVE illegal');

const gate = new Layer10RolloutGate();
const bootstrap = gate.decide({
  request_id: 'F.gate.bootstrap',
  from_phase: L10RolloutPhase.PRE_ROLLOUT,
  to_phase: L10RolloutPhase.SHADOW,
  ratification: null,
  freeze_status: L10FreezeStatus.OPEN,
});
assert(bootstrap.allowed,
  'F.17 PRE_ROLLOUT → SHADOW allowed without cert');

const canaryBlocked = gate.decide({
  request_id: 'F.gate.canary.nocert',
  from_phase: L10RolloutPhase.SHADOW,
  to_phase: L10RolloutPhase.CANARY,
  ratification: null,
  freeze_status: L10FreezeStatus.OPEN,
});
assert(!canaryBlocked.allowed,
  'F.18 CANARY without ratification blocked');
assert(canaryBlocked.violations.includes(
  L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION),
  'F.19 ROLLOUT_WITHOUT_CERTIFICATION emitted');

const canaryUnfrozen = gate.decide({
  request_id: 'F.gate.canary.unfrozen',
  from_phase: L10RolloutPhase.SHADOW,
  to_phase: L10RolloutPhase.CANARY,
  ratification: okRat.artifact,
  freeze_status: L10FreezeStatus.OPEN,
});
assert(!canaryUnfrozen.allowed,
  'F.20 CANARY without freeze blocked');

const canaryOk = gate.decide({
  request_id: 'F.gate.canary.ok',
  from_phase: L10RolloutPhase.SHADOW,
  to_phase: L10RolloutPhase.CANARY,
  ratification: okRat.artifact,
  freeze_status: L10FreezeStatus.FROZEN,
});
assert(canaryOk.allowed,
  'F.21 CANARY with ratification+freeze allowed');

const scrambledGate = gate.decide({
  request_id: 'F.gate.scrambled',
  from_phase: L10RolloutPhase.SHADOW,
  to_phase: L10RolloutPhase.FULL_LIVE,
  ratification: okRat.artifact,
  freeze_status: L10FreezeStatus.FROZEN,
});
assert(!scrambledGate.allowed,
  'F.22 scrambled forward order blocked');
assert(scrambledGate.violations.includes(
  L10RatificationViolationCode.EXECUTION_ORDER_VIOLATION),
  'F.23 EXECUTION_ORDER_VIOLATION emitted');

// Enable/disable policy
const edp = new Layer10EnableDisablePolicy();
const disableNoop = edp.decide({
  request_id: 'F.ed.disable.noop',
  action: 'DISABLE',
  template_id: null,
  current_phase: L10RolloutPhase.PRE_ROLLOUT,
  ratification: null,
});
assert(!disableNoop.allowed,
  'F.24 disable in PRE_ROLLOUT blocked (no-op)');

const disableLive = edp.decide({
  request_id: 'F.ed.disable.live',
  action: 'DISABLE',
  template_id: null,
  current_phase: L10RolloutPhase.FULL_LIVE,
  ratification: okRat.artifact,
});
assert(disableLive.allowed,
  'F.25 disable in FULL_LIVE allowed (soft kill)');

const enableUnready = edp.decide({
  request_id: 'F.ed.enable.unready',
  action: 'ENABLE',
  template_id: 't1',
  current_phase: L10RolloutPhase.SHADOW,
  ratification: okRat.artifact,
});
assert(!enableUnready.allowed,
  'F.26 enable requires downstream-visible phase');

const enableOk = edp.decide({
  request_id: 'F.ed.enable.ok',
  action: 'ENABLE',
  template_id: 't1',
  current_phase: L10RolloutPhase.CANARY,
  ratification: okRat.artifact,
});
assert(enableOk.allowed, 'F.27 enable with ratification+canary allowed');

// Rollback policy
assert(L10_LEGAL_ROLLBACK_CLASSES.length >= 3,
  'F.28 ≥3 legal rollback classes');
assert(L10_PROHIBITED_ROLLBACK_CLASSES.length >= 3,
  'F.29 ≥3 prohibited rollback classes');
const rp = new Layer10RollbackPolicy();

const deleteHist = rp.decide({
  request_id: 'F.rb.delete',
  rollback_class: L10RollbackClass.DESTRUCTIVE_DELETE_HISTORY,
  preserves_historical_facts: false,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'attempt',
});
assert(!deleteHist.allowed, 'F.30 delete-history blocked');
assert(deleteHist.violations.includes(
  L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY),
  'F.31 ROLLBACK_ERASES_HISTORY emitted');

const unlink = rp.decide({
  request_id: 'F.rb.unlink',
  rollback_class: L10RollbackClass.UNLINK_LINEAGE,
  preserves_historical_facts: true,
  preserves_lineage_continuity: false,
  downgrades_frozen_state: false,
  rationale: 'attempt',
});
assert(!unlink.allowed, 'F.32 unlink-lineage blocked');
assert(unlink.violations.includes(
  L10RatificationViolationCode.ROLLBACK_BREAKS_LINEAGE),
  'F.33 ROLLBACK_BREAKS_LINEAGE emitted');

const legalPhase = rp.decide({
  request_id: 'F.rb.phase',
  rollback_class: L10RollbackClass.ROLL_BACK_PHASE,
  preserves_historical_facts: true,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'canary regression',
});
assert(legalPhase.allowed, 'F.34 phase rollback allowed');

const legalFence = rp.decide({
  request_id: 'F.rb.fence',
  rollback_class: L10RollbackClass.FENCE_DOWNSTREAM,
  preserves_historical_facts: true,
  preserves_lineage_continuity: true,
  downgrades_frozen_state: false,
  rationale: 'downstream breach',
});
assert(legalFence.allowed, 'F.35 fence-downstream allowed');

// Failure playbooks
assert(L10_FAILURE_PLAYBOOKS.length >= ALL_L10_FAILURE_CLASSES.length,
  'F.36 failure playbooks cover all failure classes');
for (const fc of ALL_L10_FAILURE_CLASSES) {
  const pb = getL10FailurePlaybook(fc);
  assert(pb !== null, `F.37 playbook for ${fc} present`);
  assert(pb !== null && pb.remediation_summary.length > 0,
    `F.38 playbook for ${fc} has remediation summary`);
}
const coverage = verifyL10FailurePlaybookCoverage();
assert(coverage.all_covered,
  `F.39 playbook coverage complete (missing=${coverage.missing.length})`);

console.log(`  Band F cumulative: passed=${passed} failed=${failed}`);

// ═══════════════════════════════════════════════════════════════
// BAND G — Full master regression (audit + invariants + master)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND G: Full master regression ═══');

clearL10FinalAuditLog();
const auditRat = emitL10RatificationDecision('rat.G.1', true, []);
assert(auditRat.severity === L10FinalAuditSeverity.INFO,
  'G.01 allowed rat → INFO');
const auditRatBad = emitL10RatificationDecision('rat.G.2', false,
  [L10RatificationViolationCode.MISSING_SUBLAYER]);
assert(auditRatBad.severity === L10FinalAuditSeverity.BLOCK,
  'G.02 blocked rat → BLOCK');
const auditCmp = emitL10CompletionFailure('rat.G.3',
  validator.validate({ ...greenEv, runtime_deterministic: false }));
assert(auditCmp.kind === L10FinalAuditKind.COMPLETION_FAILURE,
  'G.03 completion failure kind');
const auditFrz = emitL10FreezeActivation('frz.G.1',
  L10FreezeStatus.FROZEN, true, [], 'ok');
assert(auditFrz.kind === L10FinalAuditKind.FREEZE_ACTIVATION,
  'G.04 freeze activation kind');
const auditExt = emitL10ExtensionClassification({
  proposal_id: 'p.G.1',
  classification: L10ExtensionClass.MIGRATION_REQUIRED,
  requires_recertification: true,
  rationale: ['t'],
});
assert(auditExt.severity === L10FinalAuditSeverity.WARN,
  'G.05 migration classification → WARN');
const auditDep = emitL10DownstreamDependencyViolation({
  request_id: 'dep.G.1',
  allowance: L10DependencyAllowance.DENIED,
  rationale: 'forbidden',
}, L10RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY);
assert(auditDep.kind ===
  L10FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
  'G.06 downstream audit kind');
const auditDepCritical = emitL10DownstreamDependencyViolation({
  request_id: 'dep.G.2',
  allowance: L10DependencyAllowance.DENIED,
  rationale: 'judgment leakage attempt',
}, L10RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY, true);
assert(auditDepCritical.severity === L10FinalAuditSeverity.CRITICAL,
  'G.07 critical downstream violation → CRITICAL severity');

const auditRol = emitL10RolloutDecision('rol.G.1',
  L10RolloutPhase.SHADOW, L10RolloutPhase.CANARY, false,
  [L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION],
  'no cert');
assert(auditRol.kind === L10FinalAuditKind.ROLLOUT_DECISION,
  'G.08 rollout audit kind');
assert(auditRol.severity === L10FinalAuditSeverity.BLOCK,
  'G.09 blocked rollout → BLOCK');
const auditRbk = emitL10RollbackDecision('rbk.G.1',
  L10RollbackClass.DESTRUCTIVE_DELETE_HISTORY, false,
  [L10RatificationViolationCode.ROLLBACK_ERASES_HISTORY],
  'prohibited');
assert(auditRbk.kind === L10FinalAuditKind.ROLLBACK_DECISION,
  'G.10 rollback audit kind');

assert(listL10FinalAuditRecords().length === 9,
  'G.11 9 audit records');
assert(queryL10FinalAuditByKind(
  L10FinalAuditKind.RATIFICATION_DECISION).length === 2,
  'G.12 query by kind');
assert(queryL10FinalAuditBySubject('rat.G.1').length === 1,
  'G.13 query by subject');
clearL10FinalAuditLog();
assert(listL10FinalAuditRecords().length === 0, 'G.14 audit cleared');

const invs = checkAllL10_9Invariants();
assert(invs.length === 7, 'G.15 7 L10.9 invariants');
assert(invs.every(i => i.holds),
  `G.16 all L10.9 invariants hold: ${invs.filter(i => !i.holds)
    .map(i => i.id + ':' + i.evidence).join(',')}`);

const a = checkINV_109_A(); assert(a.holds, `G.17 ${a.id}: ${a.evidence}`);
const b = checkINV_109_B(); assert(b.holds, `G.18 ${b.id}: ${b.evidence}`);
const c = checkINV_109_C(); assert(c.holds, `G.19 ${c.id}: ${c.evidence}`);
const d = checkINV_109_D(); assert(d.holds, `G.20 ${d.id}: ${d.evidence}`);
const e = checkINV_109_E(); assert(e.holds, `G.21 ${e.id}: ${e.evidence}`);
const f = checkINV_109_F(); assert(f.holds, `G.22 ${f.id}: ${f.evidence}`);
const g = checkINV_109_G(); assert(g.holds, `G.23 ${g.id}: ${g.evidence}`);

// Master certification: runs all bands + aggregates invariants.
clearL10RatificationArtifacts();
clearL10CertificationArtifacts();
(async () => {
  const master = await runL10MasterCertification({
    certification_run_id: 'master.G.1',
  });
  assert(master.certification_run_id === 'master.G.1',
    'G.24 master run id respected');
  assert(master.level === L10CertificationLevel.PRODUCTION_GREEN,
    `G.25 master PRODUCTION_GREEN (got ${master.level}, blockers=` +
      `${master.blocking_violations.slice(0, 5).join('|')})`);
  assert(master.rollout_recommended,
    'G.26 rollout recommended on green master');
  assert(master.bands.length === 7, 'G.27 master produced 7 band outcomes');
  assert(master.bands.every(bnd => bnd.ok),
    `G.28 all master bands green (failing: ${
      master.bands.filter(bnd => !bnd.ok).map(bnd => bnd.band).join(',')
    })`);
  assert(master.invariants.length >= 60,
    `G.29 master aggregated ≥60 invariants (got ${
      master.invariants.length})`);
  assert(master.invariants.every(inv => inv.holds),
    `G.30 all aggregated invariants hold (failing: ${
      master.invariants.filter(inv => !inv.holds).map(inv => inv.id)
        .join(',')})`);
  assert(master.completion_state === 'L10_PRODUCTION_READY',
    'G.31 completion state recorded');
  assert(master.ratification_artifact_hash.length === 8,
    'G.32 ratification hash present');
  assert(master.artifact_fingerprint.length === 8,
    'G.33 cert artifact fingerprint');
  assert(master.critical_breach_count === 0,
    `G.34 no critical breaches (got ${master.critical_breach_count})`);

  // Full regression: execution sequence untouched.
  assert(L10_EXECUTION_SEQUENCE.length === 9,
    'G.35 execution sequence still canonical after master run');

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
