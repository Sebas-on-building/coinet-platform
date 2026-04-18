/**
 * L8.2 — Regime Doctrine, Object Model, and Families
 * Certification Test Suite
 *
 * 4 Bands (§8.2.11.2):
 *   A — Doctrine and family legality
 *   B — Regime object model
 *   C — Coexistence law (intra- and cross-family)
 *   D — Audit and invariants (INV-8.2-A..G)
 */

// ── Contracts ──
import {
  L8RegimeFamily, ALL_L8_REGIME_FAMILIES, ALL_L8_REGIME_SCOPE_TYPES,
  L8_REGIME_FAMILY_DESCRIPTORS, getL8RegimeFamilyDescriptor,
  isL8RegisteredRegimeFamily, familyAllowsScope, familiesMayCoexist,
  L8MacroRegimeClass, ALL_L8_MACRO_REGIME_CLASSES,
  L8CryptoStructureRegimeClass, ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES,
  L8TokenRegimeClass, ALL_L8_TOKEN_REGIME_CLASSES,
  L8EcosystemRegimeClass, ALL_L8_ECOSYSTEM_REGIME_CLASSES,
  L8_REGIME_CLASS_DESCRIPTORS, getL8RegimeClassDescriptor,
  isL8RegisteredRegimeClass, getL8RegimeClassesForFamily,
  regimeClassBelongsToFamily, regimeClassAllowsScope, getLifecyclePosture,
  L8RegimeCoexistenceClass, ALL_L8_REGIME_COEXISTENCE_CLASSES,
  L8TransitionRiskClass, ALL_L8_TRANSITION_RISK_CLASSES,
  L8RegimeConfidenceBand, ALL_L8_REGIME_CONFIDENCE_BANDS,
  canonicalizeRegimeStateForHash, buildL8ReplayHash,
  buildL8RegimeStateId, buildL8RegimeSubjectId, buildL8RegimeTemplateId,
  L8_COEXISTENCE_RULES, getCoexistenceRule, decideCoexistence,
  isIllegalIntraFamilyPair,
  L8RegimeOutputClass, ALL_L8_REGIME_OUTPUT_CLASSES,
  L8RegimeObjectViolationCode, ALL_L8_REGIME_OBJECT_VIOLATION_CODES,
} from '../l8/contracts';

// ── Registries ──
import {
  L8RegimeFamilyRegistry, getDefaultL8RegimeFamilyRegistry,
  L8RegimeClassRegistry, getDefaultL8RegimeClassRegistry,
  L8RegimeCoexistenceRegistry, getDefaultL8CoexistenceRegistry,
  L8RegimeOutputClassRegistry, getDefaultL8RegimeOutputClassRegistry,
  L8_REGIME_OUTPUT_CLASS_DESCRIPTORS,
} from '../l8/registry';

// ── Validators ──
import {
  validateRegimeFamily,
  validateRegimeState,
  validateIntraFamilyCoexistence,
  validateCrossFamilyCoexistence,
  validateRegimeOutputObject,
} from '../l8/validation';

// ── Constitution (object audit) ──
import {
  resetL8ObjectAuditLog,
  emitL8ObjectAuditRecord,
  getL8ObjectAuditLog,
  getL8ObjectCriticalViolations,
  getL8ObjectViolationsByCode,
  hasAnyL8ObjectViolations,
  getL8ObjectViolationCount,
  emitL8InvalidRegimeStateViolation,
  emitL8IllegalCoexistenceViolation,
  emitL8FakeCleanSingleViolation,
  emitL8LifecycleViolation,
  emitL8InvalidOutputObjectViolation,
  emitL8MultiplierWithoutAnchorViolation,
  emitL8OutputJudgmentLeakViolation,
  emitL8OutputScoreOverrideViolation,
} from '../l8/constitution';

// ── Invariants ──
import {
  checkAllL82Invariants,
  checkINV_82_A, checkINV_82_B, checkINV_82_C, checkINV_82_D,
  checkINV_82_E, checkINV_82_F, checkINV_82_G,
  buildL8GreenRegimeState,
} from '../l8/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function resetAll(): void {
  resetL8ObjectAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Doctrine and Family Legality
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Doctrine and Family Legality ═══');
resetAll();

assert(ALL_L8_REGIME_FAMILIES.length === 4, 'A.01 4 regime families');
assert(ALL_L8_REGIME_FAMILIES.includes(L8RegimeFamily.MACRO), 'A.02 MACRO family');
assert(ALL_L8_REGIME_FAMILIES.includes(L8RegimeFamily.CRYPTO_STRUCTURE),
  'A.03 CRYPTO_STRUCTURE family');
assert(ALL_L8_REGIME_FAMILIES.includes(L8RegimeFamily.TOKEN_SPECIFIC),
  'A.04 TOKEN_SPECIFIC family');
assert(ALL_L8_REGIME_FAMILIES.includes(L8RegimeFamily.ECOSYSTEM),
  'A.05 ECOSYSTEM family');

assert(L8_REGIME_FAMILY_DESCRIPTORS.length === 4, 'A.06 4 family descriptors');
for (const d of L8_REGIME_FAMILY_DESCRIPTORS) {
  assert(d.conditioningOnly === true, `A.cond.${d.family}`);
  assert(d.legalScopeTypes.length >= 2, `A.scopes.${d.family}`);
  assert(d.coexistsWith.length >= 2, `A.coexist.${d.family}`);
  assert(d.description.length > 20, `A.desc.${d.family}`);
}

assert(getL8RegimeFamilyDescriptor(L8RegimeFamily.MACRO) !== undefined,
  'A.07 MACRO descriptor retrievable');
assert(getL8RegimeFamilyDescriptor('FAKE_FAMILY' as L8RegimeFamily) === undefined,
  'A.08 fake family → undefined');
assert(isL8RegisteredRegimeFamily('MACRO'), 'A.09 isL8RegisteredRegimeFamily');
assert(!isL8RegisteredRegimeFamily('WHATEVER'),
  'A.10 fake family not registered');

// Scope legality
assert(familyAllowsScope(L8RegimeFamily.MACRO, 'MARKET'),
  'A.11 MACRO allows MARKET');
assert(!familyAllowsScope(L8RegimeFamily.MACRO, 'CHAIN'),
  'A.12 MACRO does not allow CHAIN');
assert(familyAllowsScope(L8RegimeFamily.TOKEN_SPECIFIC, 'TOKEN'),
  'A.13 TOKEN_SPECIFIC allows TOKEN');
assert(!familyAllowsScope(L8RegimeFamily.TOKEN_SPECIFIC, 'MARKET'),
  'A.14 TOKEN_SPECIFIC does not allow MARKET');
assert(familyAllowsScope(L8RegimeFamily.ECOSYSTEM, 'CHAIN'),
  'A.15 ECOSYSTEM allows CHAIN');
assert(familyAllowsScope(L8RegimeFamily.CRYPTO_STRUCTURE, 'TOKEN'),
  'A.16 CRYPTO_STRUCTURE allows TOKEN');

// Family coexistence pairs — all four families coexist pairwise
for (const a of ALL_L8_REGIME_FAMILIES) {
  for (const b of ALL_L8_REGIME_FAMILIES) {
    if (a === b) continue;
    assert(familiesMayCoexist(a, b), `A.coexist.${a}.${b}`);
  }
}

// Family/class counts per spec
assert(ALL_L8_MACRO_REGIME_CLASSES.length === 4, 'A.17 4 macro classes');
assert(ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES.length === 4,
  'A.18 4 crypto-structure classes');
assert(ALL_L8_TOKEN_REGIME_CLASSES.length === 7, 'A.19 7 token classes');
assert(ALL_L8_ECOSYSTEM_REGIME_CLASSES.length === 6, 'A.20 6 ecosystem classes');

// Every class descriptor is consistent
assert(L8_REGIME_CLASS_DESCRIPTORS.length ===
  ALL_L8_MACRO_REGIME_CLASSES.length +
  ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES.length +
  ALL_L8_TOKEN_REGIME_CLASSES.length +
  ALL_L8_ECOSYSTEM_REGIME_CLASSES.length,
  'A.21 total class descriptors match family counts');

for (const d of L8_REGIME_CLASS_DESCRIPTORS) {
  assert(isL8RegisteredRegimeClass(d.regimeClass), `A.cls.reg.${d.regimeClass}`);
  assert(d.semantic.length > 20, `A.cls.semantic.${d.regimeClass}`);
  assert(d.legalScopeTypes.length >= 1, `A.cls.scopes.${d.regimeClass}`);
  assert(regimeClassBelongsToFamily(d.regimeClass, d.family),
    `A.cls.family.${d.regimeClass}`);
  for (const scope of d.legalScopeTypes) {
    assert(regimeClassAllowsScope(d.regimeClass, scope),
      `A.cls.scope.${d.regimeClass}.${scope}`);
  }
  // class scope must be a subset of its family scope
  const familyDesc = getL8RegimeFamilyDescriptor(d.family)!;
  for (const scope of d.legalScopeTypes) {
    assert(familyDesc.legalScopeTypes.includes(scope),
      `A.cls.family_scope.${d.regimeClass}.${scope}`);
  }
}

// Lifecycle postures
assert(getLifecyclePosture(L8TokenRegimeClass.LAUNCH_DISCOVERY) === 'PRE_TREND',
  'A.22 launch discovery lifecycle = PRE_TREND');
assert(getLifecyclePosture(L8TokenRegimeClass.MATURE_TREND) === 'TREND_ESTABLISHED',
  'A.23 mature trend lifecycle = TREND_ESTABLISHED');
assert(getLifecyclePosture(L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE) === 'LATE_STAGE',
  'A.24 blowoff lifecycle = LATE_STAGE');
assert(getLifecyclePosture(L8TokenRegimeClass.DISTRIBUTION) === 'EXITING_TREND',
  'A.25 distribution lifecycle = EXITING_TREND');
assert(getLifecyclePosture(L8TokenRegimeClass.POST_UNLOCK_DIGESTION) === 'DIGESTING',
  'A.26 post-unlock lifecycle = DIGESTING');
assert(getLifecyclePosture(L8MacroRegimeClass.RISK_ON) === null,
  'A.27 non-token has null lifecycle');

// §8.2.7.5 — ecosystem caution law
const ecoDesc = getL8RegimeFamilyDescriptor(L8RegimeFamily.ECOSYSTEM)!;
assert(ecoDesc.environmentalConditioningOnly,
  'A.28 ECOSYSTEM is environmentalConditioningOnly');
const tokenDesc = getL8RegimeFamilyDescriptor(L8RegimeFamily.TOKEN_SPECIFIC)!;
assert(!tokenDesc.environmentalConditioningOnly,
  'A.29 TOKEN_SPECIFIC is not environmentalConditioningOnly');

// Family validator
const famOk = validateRegimeFamily({
  family: L8RegimeFamily.MACRO,
  regimeClass: L8MacroRegimeClass.RISK_ON,
  scope_type: 'MARKET',
});
assert(famOk.valid, 'A.30 legal family + class + scope passes');

const famWrongClass = validateRegimeFamily({
  family: L8RegimeFamily.MACRO,
  regimeClass: L8TokenRegimeClass.EARLY_ACCUMULATION,
  scope_type: 'MARKET',
});
assert(!famWrongClass.valid, 'A.31 cross-family class rejected');
assert(famWrongClass.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.CLASS_NOT_IN_FAMILY),
  'A.32 CLASS_NOT_IN_FAMILY surfaced');

const famWrongScope = validateRegimeFamily({
  family: L8RegimeFamily.MACRO,
  regimeClass: L8MacroRegimeClass.RISK_ON,
  scope_type: 'CHAIN',
});
assert(!famWrongScope.valid, 'A.33 illegal family scope rejected');

const famUnregistered = validateRegimeFamily({
  family: 'FAKE_FAMILY' as L8RegimeFamily,
  regimeClass: L8MacroRegimeClass.RISK_ON,
  scope_type: 'MARKET',
});
assert(!famUnregistered.valid, 'A.34 unregistered family rejected');

// Scope types full set
assert(ALL_L8_REGIME_SCOPE_TYPES.length === 9,
  `A.35 9 scope types (got ${ALL_L8_REGIME_SCOPE_TYPES.length})`);

// Descriptor retrieval
const macroOnDescriptor = getL8RegimeClassDescriptor(L8MacroRegimeClass.RISK_ON);
assert(macroOnDescriptor !== undefined, 'A.36 RISK_ON descriptor present');
assert(macroOnDescriptor!.family === L8RegimeFamily.MACRO,
  'A.37 RISK_ON → MACRO family');

// Family registry
const famRegistry = getDefaultL8RegimeFamilyRegistry();
assert(famRegistry.list().length === 4, 'A.38 family registry has 4 families');
assert(famRegistry.isLifecycleAware(L8RegimeFamily.TOKEN_SPECIFIC),
  'A.39 TOKEN_SPECIFIC lifecycle aware');
assert(!famRegistry.isLifecycleAware(L8RegimeFamily.MACRO),
  'A.40 MACRO not lifecycle aware');

// Custom registry construction
const customFamRegistry = new L8RegimeFamilyRegistry();
assert(customFamRegistry.list().length === 4,
  'A.41 custom family registry constructs');

// Class registry coverage
const clsRegistry = getDefaultL8RegimeClassRegistry();
assert(clsRegistry.list().length === L8_REGIME_CLASS_DESCRIPTORS.length,
  'A.42 class registry covers all descriptors');
assert(clsRegistry.listForFamily(L8RegimeFamily.TOKEN_SPECIFIC).length === 7,
  'A.43 token family has 7 classes');
assert(clsRegistry.listForFamily(L8RegimeFamily.MACRO).length === 4,
  'A.44 macro family has 4 classes');
assert(clsRegistry.familyOf(L8TokenRegimeClass.MATURE_TREND) ===
  L8RegimeFamily.TOKEN_SPECIFIC,
  'A.45 MATURE_TREND → TOKEN_SPECIFIC');
const customClsRegistry = new L8RegimeClassRegistry();
assert(customClsRegistry.list().length === L8_REGIME_CLASS_DESCRIPTORS.length,
  'A.46 custom class registry constructs');

// For-family helper
assert(getL8RegimeClassesForFamily(L8RegimeFamily.ECOSYSTEM).length === 6,
  'A.47 helper returns 6 ecosystem classes');

// ═══════════════════════════════════════════════════════════════
// BAND B — Regime Object Model
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Regime Object Model ═══');
resetAll();

const gMacro = buildL8GreenRegimeState(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
);
const gCrypto = buildL8GreenRegimeState(
  L8RegimeFamily.CRYPTO_STRUCTURE,
  L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
);
const gToken = buildL8GreenRegimeState(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.EARLY_ACCUMULATION,
  'TOKEN',
);
const gEco = buildL8GreenRegimeState(
  L8RegimeFamily.ECOSYSTEM,
  L8EcosystemRegimeClass.CHAIN_EXPANSION,
  'CHAIN',
);

assert(validateRegimeState(gMacro).valid, 'B.01 green macro passes');
assert(validateRegimeState(gCrypto).valid, 'B.02 green crypto passes');
assert(validateRegimeState(gToken).valid, 'B.03 green token passes');
assert(validateRegimeState(gEco).valid, 'B.04 green ecosystem passes');

// Missing required fields
const missingId = validateRegimeState({ ...gMacro, regime_state_id: '' });
assert(!missingId.valid && missingId.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.STATE_MISSING_STATE_ID),
  'B.05 missing state id');
assert(!validateRegimeState({ ...gMacro, regime_subject_id: '' }).valid,
  'B.06 missing subject id');
assert(!validateRegimeState({ ...gMacro, regime_template_id: '' }).valid,
  'B.07 missing template id');
assert(!validateRegimeState({ ...gMacro, regime_version: '' }).valid,
  'B.08 missing version');
assert(!validateRegimeState({ ...gMacro, scope_id: '' }).valid,
  'B.09 missing scope id');
assert(!validateRegimeState({ ...gMacro, as_of: '' }).valid,
  'B.10 missing as_of');
assert(!validateRegimeState({ ...gMacro, supporting_surface_refs: [] }).valid,
  'B.11 missing supporting surfaces');
assert(!validateRegimeState({ ...gMacro, validation_refs: [] }).valid,
  'B.12 missing validation refs');
assert(!validateRegimeState({ ...gMacro, evidence_pack_ref: '' }).valid,
  'B.13 missing evidence pack');
assert(!validateRegimeState({ ...gMacro, input_snapshot_ref: '' }).valid,
  'B.14 missing input snapshot');
assert(!validateRegimeState({ ...gMacro, multiplier_profile_ref: '' }).valid,
  'B.15 missing multiplier profile');
assert(!validateRegimeState({ ...gMacro, replay_hash: '' }).valid,
  'B.16 missing replay hash');
assert(!validateRegimeState({ ...gMacro, compute_run_id: '' }).valid,
  'B.17 missing compute run id');
assert(!validateRegimeState({ ...gMacro, policy_version: '' }).valid,
  'B.18 missing policy version');
assert(!validateRegimeState({
  ...gMacro,
  lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
}).valid, 'B.19 missing lineage trace_id');
assert(!validateRegimeState({
  ...gMacro,
  lineage_refs: { trace_id: 't', manifest_id: '', upstream_refs: [] },
}).valid, 'B.20 missing lineage manifest_id');

// Scope + family legality
assert(!validateRegimeState({
  ...gMacro,
  scope_type: 'CHAIN',
}).valid, 'B.21 macro + CHAIN scope blocked');
assert(!validateRegimeState({
  ...gToken,
  scope_type: 'MARKET',
}).valid, 'B.22 token + MARKET scope blocked');

// Wrong-family primary
assert(!validateRegimeState({
  ...gMacro,
  primary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
}).valid, 'B.23 macro state with token primary blocked');

// Fake family
assert(!validateRegimeState({
  ...gMacro,
  regime_family: 'FAKE_FAMILY' as L8RegimeFamily,
}).valid, 'B.24 fake family rejected');

// Unregistered class
assert(!validateRegimeState({
  ...gMacro,
  primary_regime: 'FAKE_CLASS' as L8MacroRegimeClass,
}).valid, 'B.25 unregistered primary class rejected');

// Confidence out of range
assert(!validateRegimeState({
  ...gMacro,
  regime_confidence_score: 1.2,
}).valid, 'B.26 confidence > 1 blocked');
assert(!validateRegimeState({
  ...gMacro,
  regime_confidence_score: -0.1,
}).valid, 'B.27 negative confidence blocked');

// Band inconsistent with score
assert(!validateRegimeState({
  ...gMacro,
  regime_confidence_score: 0.1,
  regime_confidence_band: L8RegimeConfidenceBand.FULL,
}).valid, 'B.28 band inconsistent with score');

// Transition score + class
assert(!validateRegimeState({
  ...gMacro,
  transition_risk_score: 0.9,
  transition_risk_class: L8TransitionRiskClass.STABLE,
}).valid, 'B.29 transition class inconsistent');
assert(!validateRegimeState({
  ...gMacro,
  transition_risk_score: 2,
}).valid, 'B.30 transition score OOR');

// Coexistence scores OOR
assert(!validateRegimeState({
  ...gMacro,
  ambiguity_score: 1.2,
}).valid, 'B.31 ambiguity score OOR');
assert(!validateRegimeState({
  ...gMacro,
  staleness_score: -0.5,
}).valid, 'B.32 staleness score OOR');
assert(!validateRegimeState({
  ...gMacro,
  degradation_score: 5,
}).valid, 'B.33 degradation score OOR');

// Secondary regime confidence accounting
assert(!validateRegimeState({
  ...gMacro,
  secondary_regime: L8MacroRegimeClass.TRANSITION,
  secondary_regime_confidence: null,
  coexistence_class: L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
}).valid, 'B.34 secondary without confidence blocked');
assert(!validateRegimeState({
  ...gMacro,
  secondary_regime: null,
  secondary_regime_confidence: 0.3,
}).valid, 'B.35 dangling secondary confidence blocked');

// Secondary equals primary
assert(!validateRegimeState({
  ...gMacro,
  secondary_regime: L8MacroRegimeClass.RISK_ON,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
}).valid, 'B.36 secondary equals primary blocked');

// Secondary in wrong family
assert(!validateRegimeState({
  ...gMacro,
  secondary_regime: L8TokenRegimeClass.EARLY_ACCUMULATION,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
}).valid, 'B.37 secondary wrong family blocked');

// Judgment leak in description
assert(!validateRegimeState({
  ...gMacro,
  description: 'best regime with buy signal',
}).valid, 'B.38 judgment-leak description blocked');

// Deterministic hash / id builders
const id1 = buildL8RegimeSubjectId({
  regime_family: L8RegimeFamily.MACRO,
  scope_type: 'MARKET',
  scope_id: 'global',
  as_of: '2026-04-17T12:00:00Z',
});
const id2 = buildL8RegimeSubjectId({
  regime_family: L8RegimeFamily.MACRO,
  scope_type: 'MARKET',
  scope_id: 'global',
  as_of: '2026-04-17T12:00:00Z',
});
assert(id1 === id2, 'B.39 subject id deterministic');
assert(id1.startsWith('rsub_'), 'B.40 subject id prefix');

const tid1 = buildL8RegimeTemplateId(L8RegimeFamily.MACRO, 'default', '1.0.0');
const tid2 = buildL8RegimeTemplateId(L8RegimeFamily.MACRO, 'default', '1.0.0');
assert(tid1 === tid2 && tid1.startsWith('rtpl_'),
  'B.41 template id deterministic');

const sid1 = buildL8RegimeStateId({
  regime_subject_id: 'rsub_x',
  primary_regime: L8MacroRegimeClass.RISK_ON,
  secondary_regime: null,
  as_of: '2026-04-17T12:00:00Z',
  compute_run_id: 'run-1',
});
const sid2 = buildL8RegimeStateId({
  regime_subject_id: 'rsub_x',
  primary_regime: L8MacroRegimeClass.RISK_ON,
  secondary_regime: null,
  as_of: '2026-04-17T12:00:00Z',
  compute_run_id: 'run-1',
});
assert(sid1 === sid2 && sid1.startsWith('rstate_'),
  'B.42 state id deterministic');

const canon1 = canonicalizeRegimeStateForHash(gMacro);
const canon2 = canonicalizeRegimeStateForHash(gMacro);
assert(canon1 === canon2, 'B.43 canonical hash deterministic');
assert(buildL8ReplayHash(canon1) === buildL8ReplayHash(canon2),
  'B.44 replay hash deterministic');

// Coexistence / transition / band enum sanity
assert(ALL_L8_REGIME_COEXISTENCE_CLASSES.length === 5,
  'B.45 5 coexistence classes');
assert(ALL_L8_TRANSITION_RISK_CLASSES.length === 5, 'B.46 5 transition classes');
assert(ALL_L8_REGIME_CONFIDENCE_BANDS.length === 4, 'B.47 4 confidence bands');

// Object violation code breadth
assert(ALL_L8_REGIME_OBJECT_VIOLATION_CODES.length >= 30,
  `B.48 ≥30 object violation codes (got ${ALL_L8_REGIME_OBJECT_VIOLATION_CODES.length})`);

// Output class registry
const outRegistry = getDefaultL8RegimeOutputClassRegistry();
assert(outRegistry.list().length === 4, 'B.49 4 output classes registered');
assert(ALL_L8_REGIME_OUTPUT_CLASSES.length === 4,
  'B.50 4 output classes in enum');
for (const cls of ALL_L8_REGIME_OUTPUT_CLASSES) {
  assert(outRegistry.isRegistered(cls), `B.out.${cls}`);
}
assert(L8_REGIME_OUTPUT_CLASS_DESCRIPTORS.every(d => d.regimeAnchored === true),
  'B.51 every output class regime-anchored');
assert(outRegistry.requiresEvidence(L8RegimeOutputClass.REGIME_STATE),
  'B.52 regime state requires evidence');
assert(outRegistry.requiresContradictionPosture(
  L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE),
  'B.53 multiplier requires contradiction posture');
const customOutRegistry = new L8RegimeOutputClassRegistry();
assert(customOutRegistry.list().length === 4,
  'B.54 custom output registry constructs');

// Output object validator — positive + negative paths
const outOk = validateRegimeOutputObject({
  output_class: L8RegimeOutputClass.REGIME_STATE,
  regime_state_id: 'rstate_x',
  description: 'regime state with governed evidence',
  supporting_surface_refs: ['l6:current_feature_state'],
  contradiction_bundle_ref: 'l7:contradiction_bundle/x',
  restriction_profile_ref: 'l7:restriction_profile/x',
  preserves_ambiguity_posture: true,
  is_final_score_shape: false,
});
assert(outOk.valid, 'B.55 clean output passes');

const outUnreg = validateRegimeOutputObject({
  output_class: 'FAKE_OUTPUT' as L8RegimeOutputClass,
  regime_state_id: 'rstate_x',
  description: '',
  supporting_surface_refs: [],
  contradiction_bundle_ref: null,
  restriction_profile_ref: null,
  preserves_ambiguity_posture: false,
  is_final_score_shape: false,
});
assert(!outUnreg.valid, 'B.56 unregistered output class blocked');

const outNoAnchor = validateRegimeOutputObject({
  output_class: L8RegimeOutputClass.REGIME_STATE,
  regime_state_id: '',
  description: 'regime state',
  supporting_surface_refs: ['l6:current_feature_state'],
  contradiction_bundle_ref: 'l7:contradiction_bundle/x',
  restriction_profile_ref: 'l7:restriction_profile/x',
  preserves_ambiguity_posture: true,
  is_final_score_shape: false,
});
assert(!outNoAnchor.valid, 'B.57 missing regime anchor blocked');

const outNoEvidence = validateRegimeOutputObject({
  output_class: L8RegimeOutputClass.REGIME_STATE,
  regime_state_id: 'rstate_x',
  description: 'regime state',
  supporting_surface_refs: [],
  contradiction_bundle_ref: 'l7:contradiction_bundle/x',
  restriction_profile_ref: 'l7:restriction_profile/x',
  preserves_ambiguity_posture: true,
  is_final_score_shape: false,
});
assert(!outNoEvidence.valid, 'B.58 output missing evidence blocked');

const outScoreShape = validateRegimeOutputObject({
  output_class: L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE,
  regime_state_id: 'rstate_x',
  description: 'multiplier profile',
  supporting_surface_refs: ['l6:current_feature_state'],
  contradiction_bundle_ref: 'l7:contradiction_bundle/x',
  restriction_profile_ref: 'l7:restriction_profile/x',
  preserves_ambiguity_posture: true,
  is_final_score_shape: true,
});
assert(!outScoreShape.valid, 'B.59 score-shaped multiplier blocked');
assert(outScoreShape.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.OUTPUT_SCORE_OVERRIDE),
  'B.60 OUTPUT_SCORE_OVERRIDE surfaced');

const outJudgment = validateRegimeOutputObject({
  output_class: L8RegimeOutputClass.REGIME_STATE,
  regime_state_id: 'rstate_x',
  description: 'best regime with buy signal',
  supporting_surface_refs: ['l6:current_feature_state'],
  contradiction_bundle_ref: 'l7:contradiction_bundle/x',
  restriction_profile_ref: 'l7:restriction_profile/x',
  preserves_ambiguity_posture: true,
  is_final_score_shape: false,
});
assert(!outJudgment.valid, 'B.61 judgment description blocked');
assert(outJudgment.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.OUTPUT_JUDGMENT_LEAK),
  'B.62 OUTPUT_JUDGMENT_LEAK surfaced');

// ═══════════════════════════════════════════════════════════════
// BAND C — Coexistence Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Coexistence Law ═══');
resetAll();

assert(L8_COEXISTENCE_RULES.length >= 20,
  `C.01 ≥20 coexistence rules (got ${L8_COEXISTENCE_RULES.length})`);
for (const r of L8_COEXISTENCE_RULES) {
  assert(r.reason.length > 10, `C.rule.${r.pair[0]}_${r.pair[1]}`);
}

// Intra-family ILLEGAL pairs
const macroRegOnOff = getCoexistenceRule(
  L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_ON, L8MacroRegimeClass.RISK_OFF);
assert(macroRegOnOff?.kind === 'ILLEGAL', 'C.02 macro risk_on/off ILLEGAL');
assert(isIllegalIntraFamilyPair(L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON, L8MacroRegimeClass.RISK_OFF),
  'C.03 isIllegalIntraFamilyPair(macro risk_on/off)');

// Commutative lookup
const commutative = getCoexistenceRule(
  L8RegimeFamily.MACRO, L8MacroRegimeClass.RISK_OFF, L8MacroRegimeClass.RISK_ON);
assert(commutative?.kind === 'ILLEGAL',
  'C.04 rule lookup is commutative');

// Intra-family decisions
const dClean = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  null,
  L8RegimeCoexistenceClass.CLEAN_SINGLE,
);
assert(dClean.allowed, 'C.05 single primary → CLEAN_SINGLE passes');

const dIllegal = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  L8MacroRegimeClass.RISK_OFF,
  L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!dIllegal.allowed, 'C.06 illegal pair blocked');
assert(dIllegal.requiredClass === L8RegimeCoexistenceClass.ILLEGAL_COLLISION,
  'C.07 required class ILLEGAL_COLLISION');

const dTransDemanded = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  L8MacroRegimeClass.TRANSITION,
  L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!dTransDemanded.allowed, 'C.08 transition-only pair demands transition');
assert(dTransDemanded.requiredClass ===
  L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP, 'C.09 required = TRANSITIONAL_OVERLAP');

const dTransCorrect = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  L8MacroRegimeClass.TRANSITION,
  L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
);
assert(dTransCorrect.allowed, 'C.10 transition-only pair under TRANSITION passes');

const dAmbDemanded = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  L8MacroRegimeClass.CHOP,
  L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!dAmbDemanded.allowed, 'C.11 ambiguity-only pair demands ambiguity');
assert(dAmbDemanded.requiredClass ===
  L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE, 'C.12 required = AMBIGUOUS');

const dAmbCorrect = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  L8MacroRegimeClass.CHOP,
  L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE,
);
assert(dAmbCorrect.allowed, 'C.13 ambiguity-only under AMBIGUOUS passes');

const dAllowed = decideCoexistence(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.EARLY_ACCUMULATION,
  L8TokenRegimeClass.NARRATIVE_BREAKOUT,
  L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(dAllowed.allowed, 'C.14 ALLOWED pair under PRIMARY_PLUS_SECONDARY passes');

const dAllowedFakeClean = decideCoexistence(
  L8RegimeFamily.TOKEN_SPECIFIC,
  L8TokenRegimeClass.EARLY_ACCUMULATION,
  L8TokenRegimeClass.NARRATIVE_BREAKOUT,
  L8RegimeCoexistenceClass.CLEAN_SINGLE,
);
assert(!dAllowedFakeClean.allowed,
  'C.15 ALLOWED pair cannot be declared CLEAN_SINGLE');

const dNullSecondaryBadClass = decideCoexistence(
  L8RegimeFamily.MACRO,
  L8MacroRegimeClass.RISK_ON,
  null,
  L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
);
assert(!dNullSecondaryBadClass.allowed,
  'C.16 null secondary with PRIMARY_PLUS_SECONDARY blocked');

// Intra-family validator + lifecycle integrity
const coexViolation = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.MACRO,
  primary: L8MacroRegimeClass.RISK_ON,
  secondary: L8MacroRegimeClass.RISK_OFF,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!coexViolation.valid, 'C.17 illegal intra-family blocked');
assert(coexViolation.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION),
  'C.18 COEXISTENCE_ILLEGAL_COLLISION surfaced');

const fakeCleanCoex = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.TOKEN_SPECIFIC,
  primary: L8TokenRegimeClass.EARLY_ACCUMULATION,
  secondary: L8TokenRegimeClass.NARRATIVE_BREAKOUT,
  coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
});
assert(!fakeCleanCoex.valid, 'C.19 fake CLEAN_SINGLE blocked');
assert(fakeCleanCoex.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE),
  'C.20 FAKE_CLEAN_SINGLE surfaced');

const transDemand = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.TOKEN_SPECIFIC,
  primary: L8TokenRegimeClass.MATURE_TREND,
  secondary: L8TokenRegimeClass.DISTRIBUTION,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!transDemand.valid, 'C.21 transition-required pair without transition blocked');
assert(transDemand.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_MISSING_TRANSITION),
  'C.22 COEXISTENCE_MISSING_TRANSITION surfaced');

const ambDemand = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.MACRO,
  primary: L8MacroRegimeClass.RISK_ON,
  secondary: L8MacroRegimeClass.CHOP,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!ambDemand.valid, 'C.23 ambiguity-required pair blocked');
assert(ambDemand.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_MISSING_AMBIGUITY),
  'C.24 COEXISTENCE_MISSING_AMBIGUITY surfaced');

const lifecycleBad = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.TOKEN_SPECIFIC,
  primary: L8TokenRegimeClass.EARLY_ACCUMULATION,
  secondary: L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!lifecycleBad.valid, 'C.25 lifecycle conflict blocked');
assert(lifecycleBad.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_LIFECYCLE_VIOLATION),
  'C.26 COEXISTENCE_LIFECYCLE_VIOLATION surfaced');

const lifecycleUnderTransition = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.TOKEN_SPECIFIC,
  primary: L8TokenRegimeClass.EARLY_ACCUMULATION,
  secondary: L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE,
  coexistence_class: L8RegimeCoexistenceClass.ILLEGAL_COLLISION,
});
// EARLY_ACCUMULATION + BLOWOFF is declared ILLEGAL — ILLEGAL_COLLISION
// declared class is the "correct" required class for this pair
assert(!lifecycleUnderTransition.valid,
  'C.27 lifecycle collision still blocked by ILLEGAL rule');

const selfCollision = validateIntraFamilyCoexistence({
  family: L8RegimeFamily.MACRO,
  primary: L8MacroRegimeClass.RISK_ON,
  secondary: L8MacroRegimeClass.RISK_ON,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!selfCollision.valid, 'C.28 secondary equals primary blocked');
assert(selfCollision.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.STATE_SECONDARY_EQUALS_PRIMARY),
  'C.29 STATE_SECONDARY_EQUALS_PRIMARY surfaced');

// Cross-family — duplicates + illegal (none currently, but test legal case)
const crossLegal = validateCrossFamilyCoexistence({
  rows: [
    {
      family: L8RegimeFamily.MACRO,
      primary: L8MacroRegimeClass.RISK_OFF,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
    {
      family: L8RegimeFamily.CRYPTO_STRUCTURE,
      primary: L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
    {
      family: L8RegimeFamily.TOKEN_SPECIFIC,
      primary: L8TokenRegimeClass.NARRATIVE_BREAKOUT,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
    {
      family: L8RegimeFamily.ECOSYSTEM,
      primary: L8EcosystemRegimeClass.SECTOR_ROTATION,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
  ],
});
assert(crossLegal.valid, 'C.30 all 4 families coexist legally');

const crossDup = validateCrossFamilyCoexistence({
  rows: [
    {
      family: L8RegimeFamily.MACRO,
      primary: L8MacroRegimeClass.RISK_ON,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
    {
      family: L8RegimeFamily.MACRO,
      primary: L8MacroRegimeClass.RISK_OFF,
      scope_id: 'ASSET:xyz',
      as_of: '2026-04-17T12:00:00Z',
    },
  ],
});
assert(!crossDup.valid, 'C.31 duplicate family in cross-family blocked');
assert(crossDup.issues.some(i =>
  i.code === L8RegimeObjectViolationCode.COEXISTENCE_CROSS_FAMILY_DUPLICATE),
  'C.32 CROSS_FAMILY_DUPLICATE surfaced');

// Coexistence registry interface
const coexRegistry = getDefaultL8CoexistenceRegistry();
assert(coexRegistry.list().length === L8_COEXISTENCE_RULES.length,
  'C.33 coex registry covers all rules');
assert(coexRegistry.listForFamily(L8RegimeFamily.TOKEN_SPECIFIC).length >= 6,
  'C.34 token family has coexistence rules');
assert(coexRegistry.isIllegal(L8RegimeFamily.ECOSYSTEM,
  L8EcosystemRegimeClass.CHAIN_EXPANSION,
  L8EcosystemRegimeClass.CHAIN_CONTRACTION),
  'C.35 ecosystem exp/con illegal via registry');
const customCoex = new L8RegimeCoexistenceRegistry();
assert(customCoex.list().length === L8_COEXISTENCE_RULES.length,
  'C.36 custom coex registry');

// Regime state integration: decide returns via state validator path too
const collisionState = validateRegimeState({
  ...gMacro,
  secondary_regime: L8MacroRegimeClass.RISK_OFF,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY,
});
assert(!collisionState.valid, 'C.37 regime state with illegal collision blocked');

const validTransitionState = validateRegimeState({
  ...gMacro,
  secondary_regime: L8MacroRegimeClass.TRANSITION,
  secondary_regime_confidence: 0.3,
  coexistence_class: L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP,
});
assert(validTransitionState.valid,
  'C.38 regime state with legal transition passes');

// ═══════════════════════════════════════════════════════════════
// BAND D — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Audit and Invariants ═══');
resetAll();

// Audit emission smoke (all emitters)
emitL8InvalidRegimeStateViolation('src',
  L8RegimeObjectViolationCode.STATE_MISSING_EVIDENCE,
  'rstate_x', 'missing');
emitL8IllegalCoexistenceViolation('src', 'rstate_x', 'illegal');
emitL8FakeCleanSingleViolation('src', 'rstate_x', 'fake');
emitL8LifecycleViolation('src', 'rstate_x', 'lifecycle');
emitL8InvalidOutputObjectViolation('src',
  L8RegimeObjectViolationCode.OUTPUT_MISSING_EVIDENCE,
  'REGIME_STATE', 'missing ev');
emitL8MultiplierWithoutAnchorViolation('src',
  'REGIME_MULTIPLIER_PROFILE', 'no anchor');
emitL8OutputJudgmentLeakViolation('src', 'REGIME_STATE', 'judgment leak');
emitL8OutputScoreOverrideViolation('src',
  'REGIME_MULTIPLIER_PROFILE', 'score override');

const log = getL8ObjectAuditLog();
assert(log.length === 8, `D.01 8 audit records (got ${log.length})`);
assert(getL8ObjectViolationCount() === 8, 'D.02 violation count matches');
assert(hasAnyL8ObjectViolations(), 'D.03 hasAnyL8ObjectViolations true');

const crit = getL8ObjectCriticalViolations();
assert(crit.length >= 4, `D.04 ≥4 critical (got ${crit.length})`);

assert(getL8ObjectViolationsByCode(
  L8RegimeObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION).length === 1,
  'D.05 query by coexistence code');
assert(getL8ObjectViolationsByCode(
  L8RegimeObjectViolationCode.OUTPUT_JUDGMENT_LEAK).length === 1,
  'D.06 query by judgment leak code');

// Custom audit record
const custom = emitL8ObjectAuditRecord({
  violationCode: L8RegimeObjectViolationCode.OUTPUT_SCORE_OVERRIDE,
  source: 'custom',
  regimeStateId: 'r',
  regimeSubjectId: null,
  outputClass: 'REGIME_MULTIPLIER_PROFILE',
  detail: 'score shape',
  context: { x: 1 },
  severity: 'CRITICAL',
});
assert(custom.timestamp.length > 0, 'D.07 audit record has timestamp');
assert(getL8ObjectAuditLog().length === 9, 'D.08 custom appended');

resetAll();
assert(getL8ObjectAuditLog().length === 0, 'D.09 audit log cleared');
assert(!hasAnyL8ObjectViolations(),
  'D.10 hasAnyL8ObjectViolations false after reset');

// Invariants INV-8.2-A..G
const inv = checkAllL82Invariants();
assert(inv.length === 7, 'D.11 7 L8.2 invariants');
for (const r of inv) {
  assert(r.holds, `D.inv.${r.id} ${r.evidence}`);
}

const a = checkINV_82_A(); assert(a.holds, `D.A ${a.evidence}`);
const b = checkINV_82_B(); assert(b.holds, `D.B ${b.evidence}`);
const c = checkINV_82_C(); assert(c.holds, `D.C ${c.evidence}`);
const d = checkINV_82_D(); assert(d.holds, `D.D ${d.evidence}`);
const e = checkINV_82_E(); assert(e.holds, `D.E ${e.evidence}`);
const f = checkINV_82_F(); assert(f.holds, `D.F ${f.evidence}`);
const g = checkINV_82_G(); assert(g.holds, `D.G ${g.evidence}`);

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`L8.2 OBJECTS — passed=${passed} failed=${failed}`);
console.log('================================================================');
if (failed > 0) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ Layer 8 regime doctrine and object model green.');
  process.exit(0);
}
