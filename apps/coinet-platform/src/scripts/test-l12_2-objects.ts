/**
 * L12.2 — Scenario Doctrine, Object Model & Family Law
 * Certification Test Suite (§12.2.23)
 *
 * 5 Bands:
 *   A — Family and type registration
 *   B — Object completeness
 *   C — Multi-path and coexistence law
 *   D — Confidence, restriction, and semantic integrity
 *   E — Audit and invariants INV-12.2-A..H
 */

import {
  ALL_L12_COEXISTENCE_CLASSES,
  ALL_L12_CONDITION_MATERIALITY_CLASSES,
  ALL_L12_CONDITION_OPERATORS,
  ALL_L12_CONDITION_ROLES,
  ALL_L12_CONDITION_SOURCE_LAYERS,
  ALL_L12_CONDITION_STATUSES,
  ALL_L12_CONDITION_TYPES,
  ALL_L12_INVALIDATION_EFFECTS,
  ALL_L12_INVALIDATION_STATUSES,
  ALL_L12_INVALIDATION_TYPES,
  ALL_L12_MULTI_PATH_CLASSES,
  ALL_L12_PATH_CONFIDENCE_BANDS,
  ALL_L12_REQUIRED_CONTEXT_CLASSES,
  ALL_L12_SCENARIO_ALLOWED_USES,
  ALL_L12_SCENARIO_BLOCKED_USES,
  ALL_L12_SCENARIO_DISCLOSURE_REQUIREMENTS,
  ALL_L12_SCENARIO_FAMILIES,
  ALL_L12_SCENARIO_FAMILY_PRODUCTION_STATUSES,
  ALL_L12_SCENARIO_READINESS_CLASSES,
  ALL_L12_SCENARIO_SPREAD_CLASSES,
  ALL_L12_SCENARIO_SUBJECT_CLASSES,
  ALL_L12_SCENARIO_SUMMARY_CODES,
  ALL_L12_SCENARIO_TIME_HORIZONS,
  ALL_L12_SCENARIO_TYPES,
  ALL_L12_SUPPORTING_LAYER_CLASSES,
  ALL_L12_TRIGGER_EFFECTS,
  ALL_L12_TRIGGER_STATUSES,
  ALL_L12_TRIGGER_TYPES,
  L12_MANDATORY_BLOCKED_USES,
  L12_SCENARIO_FAMILY_DESCRIPTORS,
  L12ConditionMaterialityClass,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ConditionOperator,
  L12InvalidationEffect,
  L12InvalidationStatus,
  L12InvalidationType,
  L12MultiPathClass,
  L12PathConfidenceBand,
  L12ScenarioAllowedUse,
  L12ScenarioBlockedUse,
  L12ScenarioCoexistenceClass,
  L12ScenarioConditionType,
  L12ScenarioFamily,
  L12ScenarioFamilyProductionStatus,
  L12ScenarioReadinessClass,
  L12ScenarioSpreadClass,
  L12ScenarioSubjectClass,
  L12ScenarioSummaryCode,
  L12ScenarioTimeHorizon,
  L12ScenarioType,
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
  buildL12ConditionId,
  buildL12InvalidationId,
  buildL12PathConfidenceProfileId,
  buildL12ScenarioId,
  buildL12ScenarioReplayHash,
  buildL12ScenarioSetId,
  buildL12ScenarioSubjectId,
  buildL12TriggerId,
  canonicalizeL12ScenarioObject,
  getL12FamilyDescriptor,
  isL12FamilyRegistered,
  isL12HighConfidenceBand,
  isL12LegalScopeForFamily,
  isL12LegalSinglePathClass,
  isL12LegalTypeFamilyPair,
  isL12NarrowOrUnresolvedSpread,
  l12ConfidenceBandFor,
} from '../l12/contracts';

import {
  ALL_L12_SCENARIO_OUTPUT_OBJECT_KINDS,
  L12FamilyRegistryAuditIssue,
  L12ScenarioOutputObjectKind,
  auditL12FamilyRegistry,
  clearL12ScenarioConditionRegistry,
  clearL12ScenarioInvalidationRegistry,
  clearL12ScenarioSubjectRegistry,
  clearL12ScenarioTriggerRegistry,
  getL12FamilyRegistryCount,
  getL12OutputSurfaceForObjectKind,
  getL12ScenarioConditionRegistryCount,
  getL12ScenarioSubjectRegistryCount,
  getL12ScenarioTypeRegistryCount,
  isL12FamilyBlocked,
  isL12FamilyProductionEnabled,
  isL12FamilyRegisteredInRegistry,
  isL12LegalConditionTypeAndLayer,
  isL12LegalInvalidationStatus,
  isL12LegalObjectKindSurfacePair,
  isL12LegalScopeForRegisteredFamily,
  isL12LegalTriggerStatus,
  isL12LegalTriggerTypeEffect,
  isL12LegalTypeFamilyPairing,
  isL12RegisteredScenarioOutputObjectKind,
  isL12ScenarioConditionRegistered,
  isL12ScenarioInvalidationRegistered,
  isL12ScenarioSubjectRegistered,
  isL12ScenarioTriggerRegistered,
  isL12ScenarioTypeRegistered,
  listL12FamiliesByStatus,
  listRegisteredL12Families,
  registerL12ScenarioCondition,
  registerL12ScenarioInvalidation,
  registerL12ScenarioSubject,
  registerL12ScenarioTrigger,
} from '../l12/registry';

import {
  L12ObjectError,
  L12ObjectViolationCode,
  classifyL12Coexistence,
  deriveL12ReadinessClass,
  l12ResolveBand,
  validateL12FamilyDescriptor,
  validateL12FamilyRegistration,
  validateL12PathConfidenceProfile,
  validateL12Scenario,
  validateL12ScenarioCondition,
  validateL12ScenarioInvalidation,
  validateL12ScenarioObjectReadiness,
  validateL12ScenarioRestrictionProfile,
  validateL12ScenarioSet,
  validateL12ScenarioShiftConditionSet,
  validateL12ScenarioSubject,
  validateL12ScenarioTrigger,
} from '../l12/validation';

import {
  ALL_L12_OBJECT_AUDIT_SUBJECT_CLASSES,
  L12ObjectAuditSubjectClass,
  emitL12ObjectAuditRecords,
  getL12ObjectAuditLog,
  getL12ObjectCriticalViolations,
  getL12ObjectViolationCount,
  getL12ObjectViolationsByCode,
  getL12ObjectViolationsBySubjectClass,
  hasAnyL12ObjectViolations,
  makeL12ObjectAuditRecord,
  resetL12ObjectAuditLog,
  severityForL12ObjectViolationCode,
} from '../l12/constitution';

import {
  checkAllL12_2Invariants,
  checkINV_122_A,
  checkINV_122_B,
  checkINV_122_C,
  checkINV_122_D,
  checkINV_122_E,
  checkINV_122_F,
  checkINV_122_G,
  checkINV_122_H,
} from '../l12/invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function resetAll(): void {
  resetL12ObjectAuditLog();
  clearL12ScenarioSubjectRegistry();
  clearL12ScenarioConditionRegistry();
  clearL12ScenarioTriggerRegistry();
  clearL12ScenarioInvalidationRegistry();
}

const POLICY = 'l12.2.test_policy.v1';
const TS = '2026-05-08T00:00:00.000Z';

const FULL_BUNDLE_REFS: readonly string[] = [
  'l11:current_score_snapshot',
  'l11:score_attribution',
  'l11:score_components',
  'l11:score_modifier_profile',
  'l11:score_missing_data_profile',
  'l11:score_calibration_hook',
  'l11:score_drift_report',
  'l11:score_restriction_profile',
  'l11:score_evidence_pack',
  'l11:score_lineage_pack',
];

function buildSubject(family: L12ScenarioFamily = L12ScenarioFamily.SPOT_LED_CONTINUATION) {
  const id = buildL12ScenarioSubjectId({
    scope_type: 'asset',
    scope_id: 'BTC',
    as_of: TS,
    policy_version: POLICY,
  });
  return {
    scenario_subject_id: id,
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'BTC',
    scope_granularity: 'asset/global',
    as_of: TS,
    requested_scenario_families: [family],
    excluded_scenario_families: [],
    required_validation_refs: ['l7:validation_assessment'],
    required_regime_refs: ['l8:current_regime_state'],
    required_sequence_refs: ['l9:current_sequence_state'],
    required_hypothesis_refs: ['l10:current_hypothesis_ranking'],
    required_score_context_refs: [...FULL_BUNDLE_REFS],
    optional_context_refs: [],
    historical_context_refs: [],
    evidence_only_refs: [],
    scenario_window: {
      window_start: TS,
      window_end: TS,
      horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    conditionality_policy_ref: 'l12.policy.conditionality.v1',
    multi_path_policy_ref: 'l12.policy.multi_path.v1',
    lineage_refs: ['l12.lineage.subject.v1'],
    input_snapshot_ref: 'l12.snap.v1',
    policy_version: POLICY,
    replay_hash: buildL12ScenarioReplayHash({
      domain: 'subject',
      policy_version: POLICY,
      material: { scope: 'asset/BTC', as_of: TS },
    }),
  };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Family and Type Registration
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Family and Type Registration ═══');
resetAll();

assert(ALL_L12_SCENARIO_FAMILIES.length === 12, 'A.01 12 scenario families enumerated');
assert(L12_SCENARIO_FAMILY_DESCRIPTORS.length === 12, 'A.02 12 family descriptors registered');
assert(getL12FamilyRegistryCount() === 12, 'A.03 family registry size = 12');
assert(ALL_L12_SCENARIO_FAMILIES.every(f => isL12FamilyRegistered(f)), 'A.04 contracts: every family registered');
assert(ALL_L12_SCENARIO_FAMILIES.every(f => isL12FamilyRegisteredInRegistry(f)), 'A.05 registry: every family registered');
assert(ALL_L12_SCENARIO_FAMILIES.every(f => isL12FamilyProductionEnabled(f)), 'A.06 every family is PRODUCTION_ENABLED');
assert(ALL_L12_SCENARIO_FAMILIES.every(f => !isL12FamilyBlocked(f)), 'A.07 no family is BLOCKED');
assert(listRegisteredL12Families().length === 12, 'A.08 list returns 12');
assert(
  listL12FamiliesByStatus(L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED).length === 12,
  'A.09 12 production-enabled families',
);
assert(auditL12FamilyRegistry().length === 0, 'A.10 family registry audit clean');
assert(validateL12FamilyRegistration().length === 0, 'A.11 family validation registration clean');

assert(ALL_L12_SCENARIO_TYPES.length === 8, 'A.12 8 scenario types');
assert(getL12ScenarioTypeRegistryCount() === 8, 'A.13 type registry count');
assert(ALL_L12_SCENARIO_TYPES.every(t => isL12ScenarioTypeRegistered(t)), 'A.14 every type registered');

// Legal pairs
assert(
  isL12LegalTypeFamilyPair(L12ScenarioType.BASE_CASE, L12ScenarioFamily.SPOT_LED_CONTINUATION),
  'A.15 BASE_CASE is legal under SPOT_LED_CONTINUATION',
);
assert(
  isL12LegalTypeFamilyPair(L12ScenarioType.BULLISH_CONTINUATION, L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION),
  'A.16 BULLISH_CONTINUATION legal under LEVERAGE_DRIVEN_CONTINUATION',
);
assert(
  isL12LegalTypeFamilyPair(L12ScenarioType.BEARISH_FAILURE, L12ScenarioFamily.THIN_LIQUIDITY_FAILURE),
  'A.17 BEARISH_FAILURE legal under THIN_LIQUIDITY_FAILURE',
);
assert(
  isL12LegalTypeFamilyPair(L12ScenarioType.RECOVERY_CASE, L12ScenarioFamily.POST_UNLOCK_RECOVERY),
  'A.18 RECOVERY_CASE legal under POST_UNLOCK_RECOVERY',
);
assert(
  isL12LegalTypeFamilyPair(L12ScenarioType.INSUFFICIENT_DATA_CASE, L12ScenarioFamily.INSUFFICIENT_DATA_CASE),
  'A.19 INSUFFICIENT_DATA_CASE legal under INSUFFICIENT_DATA_CASE',
);

// Illegal pairs
assert(
  !isL12LegalTypeFamilyPair(L12ScenarioType.RECOVERY_CASE, L12ScenarioFamily.RISK_OFF_BREAKDOWN),
  'A.20 RECOVERY_CASE illegal under RISK_OFF_BREAKDOWN',
);
assert(
  !isL12LegalTypeFamilyPair(L12ScenarioType.BULLISH_CONTINUATION, L12ScenarioFamily.RISK_OFF_BREAKDOWN),
  'A.21 BULLISH_CONTINUATION illegal under RISK_OFF_BREAKDOWN',
);
assert(
  !isL12LegalTypeFamilyPair(L12ScenarioType.STRESS_CASE, L12ScenarioFamily.SPOT_LED_CONTINUATION),
  'A.22 STRESS_CASE illegal under SPOT_LED_CONTINUATION',
);
assert(
  !isL12LegalTypeFamilyPair(L12ScenarioType.BULLISH_CONTINUATION, L12ScenarioFamily.INSUFFICIENT_DATA_CASE),
  'A.23 BULLISH_CONTINUATION illegal under INSUFFICIENT_DATA_CASE',
);

// Registry-level pairing
assert(
  isL12LegalTypeFamilyPairing(L12ScenarioType.BASE_CASE, L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION),
  'A.24 registry: BASE_CASE legal under LEVERAGE_DRIVEN_CONTINUATION',
);
assert(
  !isL12LegalTypeFamilyPairing(L12ScenarioType.RECOVERY_CASE, L12ScenarioFamily.RISK_OFF_BREAKDOWN),
  'A.25 registry: RECOVERY_CASE illegal under RISK_OFF_BREAKDOWN',
);

// Scope legality
for (const f of ALL_L12_SCENARIO_FAMILIES) {
  assert(isL12LegalScopeForFamily('asset', f), `A.26.${f} scope=asset legal`);
  assert(isL12LegalScopeForRegisteredFamily('asset', f), `A.27.${f} registry: scope=asset legal`);
}
assert(!isL12LegalScopeForFamily('exotic_scope', L12ScenarioFamily.SPOT_LED_CONTINUATION), 'A.28 exotic scope rejected');

// Validate descriptors directly
for (const d of L12_SCENARIO_FAMILY_DESCRIPTORS) {
  assert(validateL12FamilyDescriptor(d).length === 0, `A.29.${d.scenario_family} descriptor passes validation`);
}

// Output object kind ↔ surface mapping
assert(ALL_L12_SCENARIO_OUTPUT_OBJECT_KINDS.length === 11, 'A.30 11 scenario output object kinds');
assert(
  ALL_L12_SCENARIO_OUTPUT_OBJECT_KINDS.every(k => isL12RegisteredScenarioOutputObjectKind(k)),
  'A.31 every output object kind registered',
);
assert(
  isL12LegalObjectKindSurfacePair(
    L12ScenarioOutputObjectKind.SCENARIO_SET,
    getL12OutputSurfaceForObjectKind(L12ScenarioOutputObjectKind.SCENARIO_SET),
  ),
  'A.32 scenario set kind/surface pair legal',
);

// Enum coverage
assert(ALL_L12_SCENARIO_TIME_HORIZONS.length === 6, 'A.33 6 time horizons');
assert(ALL_L12_SCENARIO_SUMMARY_CODES.length >= 24, 'A.34 ≥24 summary codes');
assert(ALL_L12_SCENARIO_FAMILY_PRODUCTION_STATUSES.length === 4, 'A.35 4 family production statuses');
assert(ALL_L12_REQUIRED_CONTEXT_CLASSES.length === 15, 'A.36 15 required context classes');
assert(ALL_L12_SUPPORTING_LAYER_CLASSES.length >= 15, 'A.37 ≥15 supporting layer classes');
assert(ALL_L12_SCENARIO_SUBJECT_CLASSES.length === 8, 'A.38 8 subject classes');
assert(ALL_L12_SCENARIO_SPREAD_CLASSES.length === 5, 'A.39 5 spread classes');
assert(ALL_L12_MULTI_PATH_CLASSES.length === 5, 'A.40 5 multi-path classes');
assert(ALL_L12_PATH_CONFIDENCE_BANDS.length === 5, 'A.41 5 confidence bands');
assert(ALL_L12_SCENARIO_READINESS_CLASSES.length === 7, 'A.42 7 readiness classes');
assert(ALL_L12_COEXISTENCE_CLASSES.length === 6, 'A.43 6 coexistence classes');
assert(ALL_L12_CONDITION_TYPES.length === 9, 'A.44 9 condition types');
assert(ALL_L12_CONDITION_ROLES.length === 7, 'A.45 7 condition roles');
assert(ALL_L12_CONDITION_STATUSES.length === 7, 'A.46 7 condition statuses');
assert(ALL_L12_CONDITION_SOURCE_LAYERS.length === 5, 'A.47 5 condition source layers');
assert(ALL_L12_CONDITION_OPERATORS.length === 10, 'A.48 10 condition operators');
assert(ALL_L12_CONDITION_MATERIALITY_CLASSES.length === 4, 'A.49 4 condition materiality classes');
assert(ALL_L12_TRIGGER_TYPES.length === 7, 'A.50 7 trigger types');
assert(ALL_L12_TRIGGER_STATUSES.length === 6, 'A.51 6 trigger statuses');
assert(ALL_L12_TRIGGER_EFFECTS.length === 7, 'A.52 7 trigger effects');
assert(ALL_L12_INVALIDATION_TYPES.length === 8, 'A.53 8 invalidation types');
assert(ALL_L12_INVALIDATION_STATUSES.length === 5, 'A.54 5 invalidation statuses');
assert(ALL_L12_INVALIDATION_EFFECTS.length === 5, 'A.55 5 invalidation effects');
assert(ALL_L12_SCENARIO_ALLOWED_USES.length === 5, 'A.56 5 allowed uses');
assert(ALL_L12_SCENARIO_BLOCKED_USES.length === 7, 'A.57 7 blocked uses');
assert(ALL_L12_SCENARIO_DISCLOSURE_REQUIREMENTS.length === 7, 'A.58 7 disclosure reqs');
assert(L12_MANDATORY_BLOCKED_USES.length === 6, 'A.59 6 mandatory blocked uses');

// Family-level invalidation/score-context laws hold
for (const d of L12_SCENARIO_FAMILY_DESCRIPTORS) {
  assert(d.requires_invalidation_profile, `A.60.${d.scenario_family} requires invalidation profile`);
  assert(d.requires_l11_score_context, `A.61.${d.scenario_family} requires L11 score context`);
}
assert(getL12FamilyDescriptor(L12ScenarioFamily.FRAGILE_BREAKOUT)?.family_name.length! > 0, 'A.62 family lookup works');

// ═══════════════════════════════════════════════════════════════
// BAND B — Object Completeness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Object Completeness ═══');
resetAll();

const subj = buildSubject(L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION);
const subjErrs = validateL12ScenarioSubject(subj);
assert(subjErrs.length === 0, 'B.01 complete subject passes');
assert(registerL12ScenarioSubject(subj).registered, 'B.02 subject registered');
assert(isL12ScenarioSubjectRegistered(subj.scenario_subject_id), 'B.03 subject lookup');
assert(!registerL12ScenarioSubject(subj).registered, 'B.04 duplicate subject rejected');
assert(getL12ScenarioSubjectRegistryCount() === 1, 'B.05 subject registry count = 1');

// Subject missing fields
const sBad: any = { ...subj, scenario_subject_id: '' };
assert(validateL12ScenarioSubject(sBad).some(e => e.code === L12ObjectViolationCode.L12O_SUBJECT_ID_MISSING), 'B.06 subject id missing rejected');
const sNoFamily = { ...subj, requested_scenario_families: [] };
assert(validateL12ScenarioSubject(sNoFamily).some(e => e.code === L12ObjectViolationCode.L12O_SUBJECT_NO_REQUESTED_FAMILY), 'B.07 no requested family rejected');
const sNoCtx = { ...subj, required_score_context_refs: [] };
assert(validateL12ScenarioSubject(sNoCtx).some(e => e.code === L12ObjectViolationCode.L12O_SUBJECT_SCORE_CONTEXT_REFS_ABSENT), 'B.08 missing score-context refs rejected');
const sL13 = { ...subj, optional_context_refs: ['l13:judgment'] };
assert(validateL12ScenarioSubject(sL13).some(e => e.code === L12ObjectViolationCode.L12O_SUBJECT_REFERENCES_L13_PLUS), 'B.09 L13+ ref rejected');
const sTrade = { ...subj, scope_id: 'btc_buy_signal' };
assert(validateL12ScenarioSubject(sTrade).some(e => e.code === L12ObjectViolationCode.L12O_SUBJECT_TRADE_INTENT), 'B.10 trade intent rejected');

// Build a complete scenario object
const setId = buildL12ScenarioSetId({
  scenario_subject_id: subj.scenario_subject_id,
  as_of: TS,
  policy_version: POLICY,
});
const baseId = buildL12ScenarioId({
  scenario_set_id: setId,
  scenario_family: L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION,
  scenario_type: L12ScenarioType.BASE_CASE,
  as_of: TS,
  policy_version: POLICY,
});
const condId = buildL12ConditionId({
  scenario_id: baseId,
  source_layer: L12ConditionSourceLayer.L11,
  required_surface_ref: 'l11:current_score_snapshot',
  operator: L12ConditionOperator.POSTURE_REQUIRED,
});
const trigId = buildL12TriggerId({ scenario_id: baseId, trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER, trigger_name: 'spot_strengthens' });
const invId = buildL12InvalidationId({ scenario_id: baseId, invalidation_type: L12InvalidationType.SUPPORT_FAILURE, invalidation_name: 'support_loses' });
const replay = buildL12ScenarioReplayHash({ domain: 'scenario', policy_version: POLICY, material: { setId, baseId } });

const cond = {
  condition_id: condId,
  scenario_id: baseId,
  scenario_set_id: setId,
  condition_type: L12ScenarioConditionType.SCORE_CONDITION,
  condition_role: L12ConditionRole.REQUIRED_FOR_PATH,
  source_layer: L12ConditionSourceLayer.L11,
  required_surface_ref: 'l11:current_score_snapshot',
  current_state_ref: 'l11:snapshot.now',
  operator: L12ConditionOperator.POSTURE_REQUIRED,
  condition_status: L12ConditionStatus.SATISFIED,
  materiality_class: L12ConditionMaterialityClass.MATERIAL,
  evidence_refs: ['l11:score_evidence_pack'],
  lineage_refs: ['l12.lineage.condition.v1'],
  policy_version: POLICY,
  replay_hash: replay,
};
assert(validateL12ScenarioCondition(cond).length === 0, 'B.11 complete condition passes');
assert(registerL12ScenarioCondition(cond).registered, 'B.12 condition registered');
assert(isL12ScenarioConditionRegistered(condId), 'B.13 condition lookup');
assert(!registerL12ScenarioCondition(cond).registered, 'B.14 duplicate condition rejected');
assert(getL12ScenarioConditionRegistryCount() === 1, 'B.15 condition registry count = 1');

// Condition type/source-layer mismatch
const condBadLayer = { ...cond, condition_id: 'l12.condition.bad', source_layer: L12ConditionSourceLayer.L7, condition_type: L12ScenarioConditionType.SCORE_CONDITION };
assert(validateL12ScenarioCondition(condBadLayer).some(e => e.code === L12ObjectViolationCode.L12O_CONDITION_TYPE_LAYER_MISMATCH), 'B.16 condition type/layer mismatch rejected');
const condRaw = { ...cond, condition_id: 'l12.condition.raw', required_surface_ref: 'l1:tick.btc' };
assert(validateL12ScenarioCondition(condRaw).some(e => e.code === L12ObjectViolationCode.L12O_CONDITION_USES_RAW_DATA), 'B.17 raw-data ref rejected');
assert(isL12LegalConditionTypeAndLayer(L12ScenarioConditionType.REGIME_CONDITION, L12ConditionSourceLayer.L8), 'B.18 REGIME_CONDITION/L8 legal');
assert(!isL12LegalConditionTypeAndLayer(L12ScenarioConditionType.REGIME_CONDITION, L12ConditionSourceLayer.L11), 'B.19 REGIME_CONDITION/L11 illegal');

const trig = {
  trigger_id: trigId,
  scenario_id: baseId,
  scenario_set_id: setId,
  trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
  trigger_name: 'spot_strengthens',
  trigger_condition_refs: [condId],
  trigger_status: L12TriggerStatus.WATCHING,
  trigger_strength_score: 0.4,
  trigger_materiality_class: L12ConditionMaterialityClass.MATERIAL,
  expected_effect_on_scenario: L12TriggerEffect.STRENGTHENS_PRIMARY,
  evidence_refs: ['l11:score_evidence_pack'],
  lineage_refs: ['l12.lineage.trigger.v1'],
  policy_version: POLICY,
  replay_hash: replay,
};
assert(validateL12ScenarioTrigger(trig).length === 0, 'B.20 complete trigger passes');
assert(registerL12ScenarioTrigger(trig).registered, 'B.21 trigger registered');
assert(isL12ScenarioTriggerRegistered(trigId), 'B.22 trigger lookup');

const trigBadEff = { ...trig, trigger_id: 'l12.trigger.bad', expected_effect_on_scenario: L12TriggerEffect.WATCH_ONLY };
assert(validateL12ScenarioTrigger(trigBadEff).some(e => e.code === L12ObjectViolationCode.L12O_TRIGGER_ILLEGAL_TYPE_EFFECT_PAIR), 'B.23 trigger type/effect mismatch rejected');
const trigBadStrength = { ...trig, trigger_id: 'l12.trigger.bad2', trigger_strength_score: 1.5 };
assert(validateL12ScenarioTrigger(trigBadStrength).some(e => e.code === L12ObjectViolationCode.L12O_TRIGGER_STRENGTH_OUT_OF_RANGE), 'B.24 trigger strength oor rejected');
const trigTrade = { ...trig, trigger_id: 'l12.trigger.bad3', trigger_name: 'buy_now_signal' };
assert(validateL12ScenarioTrigger(trigTrade).some(e => e.code === L12ObjectViolationCode.L12O_TRIGGER_TRADE_INSTRUCTION), 'B.25 trigger trade language rejected');
assert(isL12LegalTriggerStatus(L12TriggerType.BULLISH_CONFIRMATION_TRIGGER, L12TriggerStatus.ACTIVE), 'B.26 BULLISH/ACTIVE legal');
assert(isL12LegalTriggerTypeEffect(L12TriggerType.WATCH_TRIGGER, L12TriggerEffect.WATCH_ONLY), 'B.27 WATCH/WATCH_ONLY legal');
assert(!isL12LegalTriggerTypeEffect(L12TriggerType.WATCH_TRIGGER, L12TriggerEffect.CONFIRMS_RECOVERY), 'B.28 WATCH/CONFIRMS_RECOVERY illegal');

const inv = {
  invalidation_id: invId,
  scenario_id: baseId,
  scenario_set_id: setId,
  invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
  invalidation_name: 'support_loses',
  invalidation_condition_refs: [condId],
  invalidation_strength_score: 0.5,
  invalidation_status: L12InvalidationStatus.WATCHING,
  expected_effect: L12InvalidationEffect.PATH_NARROWED,
  evidence_refs: ['l11:score_evidence_pack'],
  lineage_refs: ['l12.lineage.invalidation.v1'],
  policy_version: POLICY,
  replay_hash: replay,
};
assert(validateL12ScenarioInvalidation(inv).length === 0, 'B.29 complete invalidation passes');
assert(registerL12ScenarioInvalidation(inv).registered, 'B.30 invalidation registered');
assert(isL12ScenarioInvalidationRegistered(invId), 'B.31 invalidation lookup');

const invBadEff = { ...inv, invalidation_id: 'l12.inv.bad', expected_effect: L12InvalidationEffect.RANKING_FLIP };
assert(validateL12ScenarioInvalidation(invBadEff).some(e => e.code === L12ObjectViolationCode.L12O_INVALIDATION_ILLEGAL_TYPE_EFFECT_PAIR), 'B.32 invalidation type/effect mismatch rejected');
const invBadStrength = { ...inv, invalidation_id: 'l12.inv.bad2', invalidation_strength_score: -0.1 };
assert(validateL12ScenarioInvalidation(invBadStrength).some(e => e.code === L12ObjectViolationCode.L12O_INVALIDATION_STRENGTH_OUT_OF_RANGE), 'B.33 invalidation strength oor rejected');
assert(isL12LegalInvalidationStatus(L12InvalidationType.REGIME_SHIFT, L12InvalidationStatus.ACTIVE), 'B.34 REGIME_SHIFT/ACTIVE legal');

const baseScen = {
  scenario_id: baseId,
  scenario_set_id: setId,
  scenario_subject_id: subj.scenario_subject_id,
  scenario_type: L12ScenarioType.BASE_CASE,
  scenario_family: L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION,
  scenario_name: 'base_case_leverage_driven',
  scenario_summary_code: L12ScenarioSummaryCode.BASE_CASE_LEVERAGE_DRIVEN,
  scope_type: 'asset',
  scope_id: 'BTC',
  as_of: TS,
  path_claim: 'base case strengthens if spot improves; failure risk rises if OI expands and liquidity weakens',
  required_condition_refs: [condId],
  supporting_condition_refs: [],
  weakening_condition_refs: [],
  trigger_refs: [trigId],
  invalidation_refs: [invId],
  supporting_evidence_refs: ['l11:score_evidence_pack'],
  contradicting_evidence_refs: [],
  required_confirmation_refs: [],
  unresolved_dependency_refs: [],
  path_confidence_score: 0.45,
  path_confidence_band: L12PathConfidenceBand.MEDIUM,
  path_time_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
  readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
  restriction_profile_ref: 'l12.restriction.btc.v1',
  evidence_pack_ref: 'l11:score_evidence_pack',
  input_snapshot_ref: subj.input_snapshot_ref,
  compute_run_id: 'l12.run.001',
  lineage_refs: ['l12.lineage.scenario.v1'],
  replay_hash: replay,
  policy_version: POLICY,
};
assert(validateL12Scenario(baseScen).length === 0, 'B.35 complete scenario passes');

// Missing required fields
const noType = { ...baseScen, scenario_type: undefined as unknown as L12ScenarioType };
assert(validateL12Scenario(noType).some(e => e.code === L12ObjectViolationCode.L12O_SCENARIO_TYPE_MISSING), 'B.36 missing type rejected');
const noPath = { ...baseScen, path_claim: '' };
assert(validateL12Scenario(noPath).some(e => e.code === L12ObjectViolationCode.L12O_PATH_CLAIM_MISSING), 'B.37 missing path_claim rejected');
const noCond = { ...baseScen, required_condition_refs: [] };
assert(validateL12Scenario(noCond).some(e => e.code === L12ObjectViolationCode.L12O_CONDITION_REFS_MISSING), 'B.38 missing condition refs rejected');
const noTrig = { ...baseScen, trigger_refs: [] };
assert(validateL12Scenario(noTrig).some(e => e.code === L12ObjectViolationCode.L12O_TRIGGER_REFS_MISSING), 'B.39 missing trigger refs rejected');
const noInvRef = { ...baseScen, invalidation_refs: [] };
assert(validateL12Scenario(noInvRef).some(e => e.code === L12ObjectViolationCode.L12O_INVALIDATION_REFS_MISSING), 'B.40 missing invalidation refs rejected');
const noEvid = { ...baseScen, supporting_evidence_refs: [], contradicting_evidence_refs: [] };
assert(validateL12Scenario(noEvid).some(e => e.code === L12ObjectViolationCode.L12O_EVIDENCE_REFS_MISSING), 'B.41 missing evidence rejected');
const noLineage = { ...baseScen, lineage_refs: [] };
assert(validateL12Scenario(noLineage).some(e => e.code === L12ObjectViolationCode.L12O_LINEAGE_REFS_MISSING), 'B.42 missing lineage rejected');
const noReplay = { ...baseScen, replay_hash: '' };
assert(validateL12Scenario(noReplay).some(e => e.code === L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING), 'B.43 missing replay hash rejected');
const oorScore = { ...baseScen, path_confidence_score: 1.5 };
assert(validateL12Scenario(oorScore).some(e => e.code === L12ObjectViolationCode.L12O_CONFIDENCE_SCORE_OUT_OF_RANGE), 'B.44 confidence oor rejected');
const illegalPair = { ...baseScen, scenario_type: L12ScenarioType.RECOVERY_CASE, scenario_family: L12ScenarioFamily.RISK_OFF_BREAKDOWN };
assert(validateL12Scenario(illegalPair).some(e => e.code === L12ObjectViolationCode.L12O_ILLEGAL_TYPE_FAMILY_PAIR), 'B.45 illegal type/family pair rejected');

// Deterministic ID/replay
const idA = buildL12ScenarioSubjectId({ scope_type: 'asset', scope_id: 'BTC', as_of: TS, policy_version: POLICY });
const idB = buildL12ScenarioSubjectId({ scope_type: 'asset', scope_id: 'BTC', as_of: TS, policy_version: POLICY });
const idC = buildL12ScenarioSubjectId({ scope_type: 'asset', scope_id: 'ETH', as_of: TS, policy_version: POLICY });
assert(idA === idB, 'B.46 subject id deterministic');
assert(idA !== idC, 'B.47 subject id distinguishes scope');

const r1 = buildL12ScenarioReplayHash({ domain: 'set', policy_version: POLICY, material: { a: 1, b: 2 } });
const r2 = buildL12ScenarioReplayHash({ domain: 'set', policy_version: POLICY, material: { b: 2, a: 1 } });
const r3 = buildL12ScenarioReplayHash({ domain: 'set', policy_version: POLICY, material: { a: 1, b: 3 } });
assert(r1 === r2, 'B.48 replay hash key-order independent');
assert(r1 !== r3, 'B.49 replay hash material-sensitive');
const c1 = canonicalizeL12ScenarioObject({ b: 2, a: [3, 1, 2] });
const c2 = canonicalizeL12ScenarioObject({ a: [3, 1, 2], b: 2 });
assert(c1 === c2, 'B.50 canonical serializer key-order stable');

// ═══════════════════════════════════════════════════════════════
// BAND C — Multi-Path and Coexistence Law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Multi-Path and Coexistence Law ═══');
resetAll();

const baseSet = {
  scenario_set_id: 'l12.set.test',
  scenario_subject_id: 'sub_x',
  scope_type: 'asset',
  scope_id: 'BTC',
  as_of: TS,
  base_case_ref: 'l12.scenario.base',
  bullish_scenario_refs: [] as string[],
  bearish_scenario_refs: [] as string[],
  neutral_scenario_refs: [] as string[],
  stress_scenario_refs: [] as string[],
  recovery_scenario_refs: [] as string[],
  primary_scenario_ref: 'l12.scenario.base',
  secondary_scenario_ref: '',
  scenario_count: 1,
  scenario_spread_score: 1.0,
  scenario_spread_class: L12ScenarioSpreadClass.CLEAR_PRIMARY,
  multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
  path_confidence_profile_ref: 'l12.pcp.x',
  trigger_profile_refs: ['l12.trig.x'],
  invalidation_profile_refs: ['l12.inv.x'],
  shift_condition_set_ref: 'l12.shift.x',
  restriction_profile_ref: 'l12.restr.x',
  supporting_evidence_refs: ['e'],
  contradicting_evidence_refs: [],
  evidence_pack_ref: 'e',
  input_snapshot_ref: 'snap',
  compute_run_id: 'run',
  lineage_refs: ['l12.lineage.set.v1'],
  replay_hash: 'rh',
  policy_version: POLICY,
};

// Single-path fake certainty
const singleErrs = validateL12ScenarioSet(baseSet);
assert(singleErrs.some(e => e.code === L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY), 'C.01 single-path fake certainty rejected');

// Insufficient declaration is legal
const insuff = { ...baseSet, multi_path_class: L12MultiPathClass.INSUFFICIENT_INPUTS_FOR_ALTERNATIVES };
const insuffErrs = validateL12ScenarioSet(insuff);
assert(!insuffErrs.some(e => e.code === L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY), 'C.02 INSUFFICIENT_INPUTS_FOR_ALTERNATIVES allows single path');

// Narrow spread without secondary
const narrow = {
  ...baseSet,
  bullish_scenario_refs: ['b1'],
  bearish_scenario_refs: ['b2'],
  scenario_count: 3,
  scenario_spread_class: L12ScenarioSpreadClass.NARROW_PRIMARY,
};
assert(
  validateL12ScenarioSet(narrow).some(e => e.code === L12ObjectViolationCode.L12O_SECONDARY_REQUIRED_UNDER_NARROW_SPREAD),
  'C.03 narrow spread without secondary rejected',
);

// Multi-path good
const good = {
  ...baseSet,
  bullish_scenario_refs: ['b1'],
  bearish_scenario_refs: ['b2'],
  scenario_count: 3,
  secondary_scenario_ref: 'b2',
  scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
  multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
};
assert(validateL12ScenarioSet(good).length === 0, 'C.04 multi-path set passes');

// Forbidden naming on base/primary
const judg = { ...good, base_case_ref: 'final_scenario_winner' };
assert(validateL12ScenarioSet(judg).some(e => e.code === L12ObjectViolationCode.L12O_BASE_CASE_AS_FINAL_JUDGMENT), 'C.05 base_case_ref with judgment naming rejected');
const guar = { ...good, primary_scenario_ref: 'guaranteed_path_btc' };
assert(validateL12ScenarioSet(guar).some(e => e.code === L12ObjectViolationCode.L12O_PRIMARY_AS_GUARANTEED_WINNER), 'C.06 primary_scenario_ref with guaranteed naming rejected');

// CLEAR_PRIMARY without secondary
const clearNoSec = {
  ...baseSet,
  bullish_scenario_refs: ['b1'],
  scenario_count: 2,
  scenario_spread_class: L12ScenarioSpreadClass.CLEAR_PRIMARY,
  multi_path_class: L12MultiPathClass.SINGLE_PATH_BLOCKED, // legal single-path
};
assert(validateL12ScenarioSet(clearNoSec).every(e => e.code !== L12ObjectViolationCode.L12O_SECONDARY_REQUIRED_UNDER_NARROW_SPREAD), 'C.07 CLEAR_PRIMARY + insufficiency declaration legal');

// Coexistence classifier
const collapsed = classifyL12Coexistence(baseSet, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(collapsed.coexistenceClass === L12ScenarioCoexistenceClass.ILLEGAL_COLLAPSED_SINGLE_PATH, 'C.08 illegal collapsed single path classified');

const insuffNoDisc = classifyL12Coexistence(insuff, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(insuffNoDisc.coexistenceClass === L12ScenarioCoexistenceClass.SINGLE_PATH_INSUFFICIENT, 'C.09 SINGLE_PATH_INSUFFICIENT classified');
assert(insuffNoDisc.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_SINGLE_PATH_WITHOUT_DISCLOSURE), 'C.10 single path without disclosure rejected');

const insuffWithDisc = classifyL12Coexistence(insuff, {
  contradictionUnresolved: false,
  disclosuresPresent: true,
  hasContradictoryPaths: false,
});
assert(insuffWithDisc.violations.length === 0, 'C.11 single path with disclosure passes');

const bullishOnly = {
  ...baseSet,
  bullish_scenario_refs: ['b1'],
  bearish_scenario_refs: [],
  recovery_scenario_refs: [],
  scenario_count: 2,
  multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
  scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
};
const bullCo = classifyL12Coexistence(bullishOnly, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(bullCo.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_BULLISH_WITHOUT_BEARISH), 'C.12 bullish without bearish rejected');

const bearOnly = {
  ...baseSet,
  bearish_scenario_refs: ['b1'],
  recovery_scenario_refs: [],
  invalidation_profile_refs: [],
  scenario_count: 2,
  multi_path_class: L12MultiPathClass.BASE_WITH_ALTERNATIVES,
  scenario_spread_class: L12ScenarioSpreadClass.MODERATE_PRIMARY,
};
const bearCo = classifyL12Coexistence(bearOnly, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(bearCo.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_BEARISH_WITHOUT_RECOVERY_OR_INVALIDATION), 'C.13 bearish without recovery/invalidation rejected');

const narrowNoSec = {
  ...good,
  scenario_spread_class: L12ScenarioSpreadClass.NARROW_PRIMARY,
  secondary_scenario_ref: '',
};
const narrowCo = classifyL12Coexistence(narrowNoSec, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(narrowCo.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_NARROW_WITHOUT_SECONDARY), 'C.14 narrow without secondary rejected');

const hidden = classifyL12Coexistence(good, {
  contradictionUnresolved: false,
  disclosuresPresent: false,
  hasContradictoryPaths: true,
});
assert(hidden.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_HIDDEN_CONTRADICTORY_PATHS), 'C.15 contradictory paths without disclosure rejected');
const disclosed = classifyL12Coexistence(good, {
  contradictionUnresolved: false,
  disclosuresPresent: true,
  hasContradictoryPaths: true,
});
assert(disclosed.coexistenceClass === L12ScenarioCoexistenceClass.CONTRADICTORY_PATHS_WITH_DISCLOSURE, 'C.16 contradictory paths with disclosure classified');

const moderateContra = classifyL12Coexistence(good, {
  contradictionUnresolved: true,
  disclosuresPresent: false,
  hasContradictoryPaths: false,
});
assert(
  moderateContra.violations.every(e => e.code !== L12ObjectViolationCode.L12O_COEXISTENCE_CLEAN_BUT_CONTRADICTION_UNRESOLVED),
  'C.17 MODERATE_PRIMARY + unresolved contradiction does not trigger CLEAR_PRIMARY downgrade',
);
const clearContra = classifyL12Coexistence(
  { ...good, scenario_spread_class: L12ScenarioSpreadClass.CLEAR_PRIMARY },
  { contradictionUnresolved: true, disclosuresPresent: false, hasContradictoryPaths: false },
);
assert(clearContra.violations.some(e => e.code === L12ObjectViolationCode.L12O_COEXISTENCE_CLEAN_BUT_CONTRADICTION_UNRESOLVED), 'C.18 CLEAR_PRIMARY + unresolved contradiction rejected');

assert(isL12LegalSinglePathClass(L12MultiPathClass.SINGLE_PATH_BLOCKED), 'C.19 SINGLE_PATH_BLOCKED legal single path');
assert(isL12LegalSinglePathClass(L12MultiPathClass.INSUFFICIENT_INPUTS_FOR_ALTERNATIVES), 'C.20 INSUFFICIENT_INPUTS_FOR_ALTERNATIVES legal single path');
assert(!isL12LegalSinglePathClass(L12MultiPathClass.BASE_WITH_ALTERNATIVES), 'C.21 BASE_WITH_ALTERNATIVES is not single-path');
assert(isL12NarrowOrUnresolvedSpread(L12ScenarioSpreadClass.NARROW_PRIMARY), 'C.22 NARROW_PRIMARY is narrow');
assert(isL12NarrowOrUnresolvedSpread(L12ScenarioSpreadClass.UNRESOLVED_COMPETITION), 'C.23 UNRESOLVED_COMPETITION is narrow');
assert(!isL12NarrowOrUnresolvedSpread(L12ScenarioSpreadClass.CLEAR_PRIMARY), 'C.24 CLEAR_PRIMARY is not narrow');

// ═══════════════════════════════════════════════════════════════
// BAND D — Confidence, Restriction, and Semantic Integrity
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Confidence, Restriction, and Semantic Integrity ═══');
resetAll();

// Bands resolve correctly
assert(l12ConfidenceBandFor(0.05) === L12PathConfidenceBand.VERY_LOW, 'D.01 0.05 → VERY_LOW');
assert(l12ConfidenceBandFor(0.25) === L12PathConfidenceBand.LOW, 'D.02 0.25 → LOW');
assert(l12ConfidenceBandFor(0.5) === L12PathConfidenceBand.MEDIUM, 'D.03 0.5 → MEDIUM');
assert(l12ConfidenceBandFor(0.7) === L12PathConfidenceBand.HIGH, 'D.04 0.7 → HIGH');
assert(l12ConfidenceBandFor(0.95) === L12PathConfidenceBand.VERY_HIGH, 'D.05 0.95 → VERY_HIGH');
assert(l12ConfidenceBandFor(1.0) === L12PathConfidenceBand.VERY_HIGH, 'D.06 1.0 → VERY_HIGH');
assert(l12ResolveBand(0.55) === L12PathConfidenceBand.MEDIUM, 'D.07 helper resolves');
assert(isL12HighConfidenceBand(L12PathConfidenceBand.HIGH), 'D.08 HIGH is high band');
assert(!isL12HighConfidenceBand(L12PathConfidenceBand.MEDIUM), 'D.09 MEDIUM is not high band');

const profile = {
  path_confidence_profile_id: buildL12PathConfidenceProfileId({ scenario_set_id: 'set', policy_version: POLICY }),
  scenario_set_id: 'set',
  scenario_confidences: { s1: 0.5, s2: 0.85 },
  primary_path_confidence_score: 0.85,
  primary_path_confidence_band: L12PathConfidenceBand.VERY_HIGH,
  confidence_spread_to_secondary: 0.4,
  confidence_cap_refs: [],
  confidence_penalty_refs: [],
  ambiguity_score: 0.1,
  contradiction_pressure_score: 0.0,
  missing_visibility_score: 0.0,
  transition_risk_score: 0.0,
  drift_pressure_score: 0.0,
  readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
  lineage_refs: ['l'],
  replay_hash: 'rh',
  policy_version: POLICY,
};
const cleanPosture = { hasActiveInvalidation: false, hasUnresolvedContradiction: false, hasMaterialMissingVisibility: false, hasCriticalDrift: false };
assert(validateL12PathConfidenceProfile(profile, cleanPosture).length === 0, 'D.10 high confidence with clean posture passes');
assert(
  validateL12PathConfidenceProfile(profile, { ...cleanPosture, hasActiveInvalidation: true })
    .some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_ACTIVE_INVALIDATION),
  'D.11 high confidence + active invalidation rejected',
);
assert(
  validateL12PathConfidenceProfile(profile, { ...cleanPosture, hasUnresolvedContradiction: true })
    .some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_UNRESOLVED_CONTRADICTION),
  'D.12 high confidence + unresolved contradiction rejected',
);
assert(
  validateL12PathConfidenceProfile(profile, { ...cleanPosture, hasMaterialMissingVisibility: true })
    .some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_MISSING_VISIBILITY),
  'D.13 high confidence + missing visibility rejected',
);
assert(
  validateL12PathConfidenceProfile(profile, { ...cleanPosture, hasCriticalDrift: true })
    .some(e => e.code === L12ObjectViolationCode.L12O_HIGH_CONFIDENCE_WITH_CRITICAL_DRIFT),
  'D.14 high confidence + critical drift rejected',
);
const bandMismatch = { ...profile, primary_path_confidence_band: L12PathConfidenceBand.LOW };
assert(
  validateL12PathConfidenceProfile(bandMismatch, cleanPosture)
    .some(e => e.code === L12ObjectViolationCode.L12O_CONFIDENCE_BAND_MISMATCH),
  'D.15 band/score mismatch rejected',
);

// Restriction profile
const restrIncomplete = {
  restriction_profile_id: 'r1',
  scenario_set_id: 'set',
  allowed_uses: [L12ScenarioAllowedUse.SCENARIO_WEIGHTING],
  blocked_uses: [],
  required_disclosures: [],
  restriction_reason_codes: [],
  lineage_refs: ['l'],
  replay_hash: 'rh',
  policy_version: POLICY,
};
const restrErrs = validateL12ScenarioRestrictionProfile(restrIncomplete);
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_RECOMMENDATION_NOT_BLOCKED), 'D.16 recommendation not blocked rejected');
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_PREDICTION_NOT_BLOCKED), 'D.17 prediction not blocked rejected');
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_TRADE_NOT_BLOCKED), 'D.18 trade not blocked rejected');
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_FINAL_JUDGMENT_NOT_BLOCKED), 'D.19 final judgment not blocked rejected');
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_CERTAINTY_NOT_BLOCKED), 'D.20 certainty not blocked rejected');
assert(restrErrs.some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_SCORE_REPLACEMENT_NOT_BLOCKED), 'D.21 score replacement not blocked rejected');

const restrComplete = { ...restrIncomplete, blocked_uses: [...L12_MANDATORY_BLOCKED_USES] };
assert(validateL12ScenarioRestrictionProfile(restrComplete).length === 0, 'D.22 complete restriction profile passes');

const restrEmptyAllowed = { ...restrComplete, allowed_uses: [] };
assert(
  validateL12ScenarioRestrictionProfile(restrEmptyAllowed).some(e => e.code === L12ObjectViolationCode.L12O_RESTRICTION_ALLOWED_USES_EMPTY),
  'D.23 empty allowed_uses rejected',
);

// Prediction theater / recommendation / judgment / trade in scenario path_claim
const predictPath = { ...baseScen, scenario_id: 's_p1', path_claim: 'this path is guaranteed and cannot fail', invalidation_refs: [invId], required_condition_refs: [condId], trigger_refs: [trigId] };
assert(validateL12Scenario(predictPath).some(e => e.code === L12ObjectViolationCode.L12O_PREDICTION_THEATER), 'D.24 prediction theater rejected');
const recPath = { ...baseScen, scenario_id: 's_r1', path_claim: 'buy signal active for this asset' };
assert(validateL12Scenario(recPath).some(e => e.code === L12ObjectViolationCode.L12O_RECOMMENDATION_LEAK), 'D.25 recommendation leak rejected');
const judgPath = { ...baseScen, scenario_id: 's_j1', path_claim: 'final scenario winner is bullish' };
assert(validateL12Scenario(judgPath).some(e => e.code === L12ObjectViolationCode.L12O_JUDGMENT_LEAK), 'D.26 judgment leak rejected');
const tradePath = { ...baseScen, scenario_id: 's_t1', path_claim: 'allocate now and exit later' };
assert(validateL12Scenario(tradePath).some(e => e.code === L12ObjectViolationCode.L12O_TRADE_ACTION_LEAK), 'D.27 trade action leak rejected');

// Forbidden scenario name
const badName = { ...baseScen, scenario_id: 's_n1', scenario_name: 'guaranteed_path_btc' };
assert(validateL12Scenario(badName).some(e => e.code === L12ObjectViolationCode.L12O_PREDICTION_THEATER), 'D.28 forbidden scenario_name rejected');

// Trigger guaranteed outcome
const trigGuar = { ...trig, trigger_id: 'trig_guar', trigger_name: 'guaranteed_continuation_trigger' };
assert(validateL12ScenarioTrigger(trigGuar).some(e => e.code === L12ObjectViolationCode.L12O_TRIGGER_GUARANTEED_OUTCOME), 'D.29 trigger guaranteed outcome rejected');

// Shift conditions
const shiftCloseEmpty = {
  shift_condition_set_id: 'sh',
  scenario_set_id: 'set',
  current_primary_scenario_ref: 'p',
  current_secondary_scenario_ref: '',
  conditions_that_strengthen_primary: [] as string[],
  conditions_that_weaken_primary: [] as string[],
  conditions_that_promote_secondary: [] as string[],
  conditions_that_collapse_base_case: [] as string[],
  conditions_that_raise_bullish_path: [] as string[],
  conditions_that_raise_bearish_path: [] as string[],
  spread_narrowing_conditions: [] as string[],
  spread_widening_conditions: [] as string[],
  lineage_refs: ['l'],
  replay_hash: 'rh',
  policy_version: POLICY,
};
const shiftErrs = validateL12ScenarioShiftConditionSet(shiftCloseEmpty, { competitionIsClose: true });
assert(shiftErrs.some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_SECONDARY_REF_MISSING), 'D.30 close competition without secondary rejected');
assert(shiftErrs.some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_MISSING_UNDER_CLOSE_SPREAD), 'D.31 close competition without shift conditions rejected');
const shiftTrade = { ...shiftCloseEmpty, current_secondary_scenario_ref: 's', conditions_that_promote_secondary: ['buy_now_signal'] };
assert(validateL12ScenarioShiftConditionSet(shiftTrade, { competitionIsClose: true }).some(e => e.code === L12ObjectViolationCode.L12O_SHIFT_CONDITIONS_TRADE_LANGUAGE), 'D.32 shift trade language rejected');
const shiftCleanFar = { ...shiftCloseEmpty };
assert(validateL12ScenarioShiftConditionSet(shiftCleanFar, { competitionIsClose: false }).every(e => e.code !== L12ObjectViolationCode.L12O_SHIFT_SECONDARY_REF_MISSING), 'D.33 far competition does not require secondary');

// Readiness derivation + validation
assert(deriveL12ReadinessClass({ hasActiveInvalidation: false, contradictionUnresolved: false, hasMaterialMissingVisibility: false, hasCriticalDrift: false, disclosuresPresent: false, multiPathUnresolved: false }) === L12ScenarioReadinessClass.SCENARIO_READY, 'D.34 readiness clean → SCENARIO_READY');
assert(deriveL12ReadinessClass({ hasActiveInvalidation: false, contradictionUnresolved: false, hasMaterialMissingVisibility: false, hasCriticalDrift: true, disclosuresPresent: false, multiPathUnresolved: false }) === L12ScenarioReadinessClass.BLOCKED_BY_DRIFT_OR_RESTRICTION, 'D.35 critical drift → BLOCKED');
assert(deriveL12ReadinessClass({ hasActiveInvalidation: true, contradictionUnresolved: false, hasMaterialMissingVisibility: false, hasCriticalDrift: false, disclosuresPresent: false, multiPathUnresolved: false }) === L12ScenarioReadinessClass.NARROWED_BY_CONTRADICTION, 'D.36 active invalidation → NARROWED');
assert(deriveL12ReadinessClass({ hasActiveInvalidation: false, contradictionUnresolved: false, hasMaterialMissingVisibility: true, hasCriticalDrift: false, disclosuresPresent: false, multiPathUnresolved: false }) === L12ScenarioReadinessClass.NARROWED_BY_MISSING_VISIBILITY, 'D.37 missing visibility → NARROWED_BY_MISSING_VISIBILITY');
assert(deriveL12ReadinessClass({ hasActiveInvalidation: false, contradictionUnresolved: false, hasMaterialMissingVisibility: false, hasCriticalDrift: false, disclosuresPresent: true, multiPathUnresolved: false }) === L12ScenarioReadinessClass.READY_WITH_DISCLOSURE, 'D.38 disclosures → READY_WITH_DISCLOSURE');

const readyErrs = validateL12ScenarioObjectReadiness({
  subjectId: 's',
  declaredReadiness: L12ScenarioReadinessClass.SCENARIO_READY,
  primaryConfidenceBand: L12PathConfidenceBand.HIGH,
  inputs: { hasActiveInvalidation: false, contradictionUnresolved: false, hasMaterialMissingVisibility: false, hasCriticalDrift: true, disclosuresPresent: false, multiPathUnresolved: false },
});
assert(readyErrs.some(e => e.code === L12ObjectViolationCode.L12O_READINESS_MISMATCH), 'D.39 declared READY with blocking posture rejected');

// L12ObjectError
let objThrew = false;
try {
  throw new L12ObjectError(L12ObjectViolationCode.L12O_PREDICTION_THEATER, 'demo');
} catch (e) {
  objThrew = e instanceof L12ObjectError;
}
assert(objThrew, 'D.40 L12ObjectError throws and is detectable');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and Invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');
resetAll();

assert(ALL_L12_OBJECT_AUDIT_SUBJECT_CLASSES.length === 12, 'E.01 12 audit subject classes');

assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_PREDICTION_THEATER) === 'CRITICAL', 'E.02 PREDICTION_THEATER critical');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_RECOMMENDATION_LEAK) === 'CRITICAL', 'E.03 RECOMMENDATION_LEAK critical');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_BASE_CASE_MISSING) === 'CRITICAL', 'E.04 BASE_CASE_MISSING critical');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_INVALIDATION_REFS_MISSING) === 'CRITICAL', 'E.05 INVALIDATION_REFS_MISSING critical');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_SINGLE_PATH_FAKE_CERTAINTY) === 'CRITICAL', 'E.06 SINGLE_PATH_FAKE_CERTAINTY critical');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_TRIGGER_REFS_MISSING) === 'ERROR', 'E.07 TRIGGER_REFS_MISSING error');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_EVIDENCE_REFS_MISSING) === 'ERROR', 'E.08 EVIDENCE_REFS_MISSING error');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_REPLAY_HASH_MISSING) === 'ERROR', 'E.09 REPLAY_HASH_MISSING error');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_READINESS_MISMATCH) === 'WARNING', 'E.10 READINESS_MISMATCH warning');
assert(severityForL12ObjectViolationCode(L12ObjectViolationCode.L12O_CONFIDENCE_BAND_MISMATCH) === 'WARNING', 'E.11 CONFIDENCE_BAND_MISMATCH warning');

resetL12ObjectAuditLog();
const a1 = makeL12ObjectAuditRecord(L12ObjectAuditSubjectClass.SCENARIO_SET, L12ObjectViolationCode.L12O_BASE_CASE_MISSING, 'src', 'set_x', 'd');
const a2 = makeL12ObjectAuditRecord(L12ObjectAuditSubjectClass.SCENARIO, L12ObjectViolationCode.L12O_PREDICTION_THEATER, 'src', 's_x', 'd');
assert(a1.audit_id === 'l12.object_audit.00000001', 'E.12 first audit id deterministic');
assert(a2.audit_id === 'l12.object_audit.00000002', 'E.13 second audit id deterministic');
assert(a1.severity === 'CRITICAL' && a2.severity === 'CRITICAL', 'E.14 severities mapped');
assert(getL12ObjectViolationCount() === 2, 'E.15 audit count = 2');
assert(hasAnyL12ObjectViolations(), 'E.16 hasAny true');
assert(getL12ObjectCriticalViolations().length === 2, 'E.17 2 critical');
assert(getL12ObjectViolationsByCode(L12ObjectViolationCode.L12O_PREDICTION_THEATER).length === 1, 'E.18 by-code lookup');
assert(getL12ObjectViolationsBySubjectClass(L12ObjectAuditSubjectClass.SCENARIO_SET).length === 1, 'E.19 by-subject lookup');
assert(getL12ObjectAuditLog().length === 2, 'E.20 audit log read');

// emit batch
const emitted = emitL12ObjectAuditRecords(L12ObjectAuditSubjectClass.SCENARIO, 'src', [
  { code: L12ObjectViolationCode.L12O_RECOMMENDATION_LEAK, subject_id: 's', detail: 'd' },
  { code: L12ObjectViolationCode.L12O_TRIGGER_REFS_MISSING, subject_id: 's', detail: 'd' },
]);
assert(emitted.length === 2, 'E.21 batch emit returns 2');
assert(getL12ObjectViolationCount() === 4, 'E.22 audit count grows');
resetL12ObjectAuditLog();
assert(getL12ObjectViolationCount() === 0, 'E.23 reset works');
assert(!hasAnyL12ObjectViolations(), 'E.24 hasAny false after reset');

// Invariants
const all = checkAllL12_2Invariants();
assert(all.length === 8, 'E.25 8 invariants');
const ids = all.map(r => r.id).sort();
assert(JSON.stringify(ids) === JSON.stringify([
  'INV-12.2-A','INV-12.2-B','INV-12.2-C','INV-12.2-D','INV-12.2-E','INV-12.2-F','INV-12.2-G','INV-12.2-H',
]), 'E.26 invariant ids correct');
const a = checkINV_122_A(); assert(a.holds, `E.27 INV-12.2-A — ${a.evidence}`);
const b = checkINV_122_B(); assert(b.holds, `E.28 INV-12.2-B — ${b.evidence}`);
const c = checkINV_122_C(); assert(c.holds, `E.29 INV-12.2-C — ${c.evidence}`);
const d = checkINV_122_D(); assert(d.holds, `E.30 INV-12.2-D — ${d.evidence}`);
const e = checkINV_122_E(); assert(e.holds, `E.31 INV-12.2-E — ${e.evidence}`);
const f = checkINV_122_F(); assert(f.holds, `E.32 INV-12.2-F — ${f.evidence}`);
const g = checkINV_122_G(); assert(g.holds, `E.33 INV-12.2-G — ${g.evidence}`);
const h = checkINV_122_H(); assert(h.holds, `E.34 INV-12.2-H — ${h.evidence}`);
assert(all.every(r => r.holds), 'E.35 all 8 invariants hold');

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`L12.2 — Scenario Doctrine, Object Model & Family Law suite`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('═══════════════════════════════════════════════════════════');

if (failed > 0) {
  console.error('\nFailures:');
  for (const fl of failures) console.error(`  - ${fl}`);
  process.exit(1);
}
process.exit(0);

// silence unused imports for re-exported helpers
type _L12_2_used_types = L12FamilyRegistryAuditIssue;
