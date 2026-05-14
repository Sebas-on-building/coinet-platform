/**
 * L11.3 — Score Formulas and Subcomponents
 * Certification Test Suite (§11.3.23)
 *
 * 5 Bands:
 *   A — Formula registry (§11.3.23 Band A)
 *   B — Component and input law (§11.3.23 Band B)
 *   C — Weights, caps, penalties, modifiers (§11.3.23 Band C)
 *   D — Formula evaluation (§11.3.23 Band D)
 *   E — Audit and invariants INV-11.3-A..H (§11.3.23 Band E)
 */

import {
  // contracts
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  L11_RESERVED_SCORE_FAMILIES,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ScoreFamilyDirectionClass,
  L11FormulaStatus,
  ALL_L11_FORMULA_STATUSES,
  formulaStatusAllowsCurrentEmission,
  formulaStatusForbidsProductionEmission,
  L11ScoreFormulaDefinition,
  canonicalScoreFormulaReplayHash,
  L11_PRODUCTION_FORMULAS,
  getL11ProductionFormulaForFamily,
  L11_FORMULA_POLICY_VERSION,
  L11ScoreComponentDefinition,
  L11ScoreComponentRole,
  L11ComponentDirectionClass,
  ALL_L11_SCORE_COMPONENT_ROLES,
  ALL_L11_COMPONENT_DIRECTION_CLASSES,
  L11MissingDataBehaviorClass,
  ALL_L11_MISSING_DATA_BEHAVIOR_CLASSES,
  L11FormulaWeightProfile,
  L11WeightSumPolicy,
  ALL_L11_WEIGHT_SUM_POLICIES,
  isL11WeightSumLegal,
  computeL11WeightSums,
  L11FormulaCapRule,
  L11CapType,
  L11CapDirection,
  ALL_L11_CAP_TYPES,
  ALL_L11_CAP_DIRECTIONS,
  isL11CapRuleStructurallyValid,
  L11FormulaPenaltyRule,
  L11PenaltyApplicationMode,
  isL11PenaltyRuleStructurallyValid,
  L11FormulaModifierRule,
  L11ModifierSourceLayer,
  L11ModifierEffect,
  ALL_L11_MODIFIER_SOURCE_LAYERS,
  ALL_L11_MODIFIER_EFFECTS,
  isL11ModifierRuleStructurallyValid,
  L11FormulaMissingDataRule,
  L11InputConditionClass,
  ALL_L11_INPUT_CONDITION_CLASSES,
  isL11MissingDataRuleLegal,
  L11FormulaEvaluationResult,
  L11FormulaReadinessClass,
  ALL_L11_FORMULA_READINESS_CLASSES,
  canonicalFormulaEvaluationReplayHash,
  L11_FULL_FORMULA_REPLAY_MATERIAL,
  L11DependencySurfaceClass,
} from '../l11/contracts';

import {
  buildL11FormulaRegistryReport,
  getL11FormulaById,
  getL11ProductionFormula,
  buildL11ComponentRegistryReport,
  getL11ComponentsForFormula,
  buildL11WeightProfileRegistryReport,
  getL11WeightProfileForFamily,
  buildL11CapRuleRegistryReport,
  getL11CapRulesForFormula,
  buildL11PenaltyRuleRegistryReport,
  getL11PenaltyRulesForFormula,
  buildL11ModifierRuleRegistryReport,
  getL11ModifierRulesForFormula,
  buildL11MissingDataRuleRegistryReport,
  getL11MissingDataRulesForFormula,
} from '../l11/registry';

import {
  L11ScoreFormulaViolationCode,
  ALL_L11_SCORE_FORMULA_VIOLATION_CODES,
  severityForL11FormulaCode,
  makeL11ScoreFormulaIssue,
  validateL11ScoreFormulaDefinition,
  validateL11ScoreComponentDefinition,
  validateL11FormulaWeightProfile,
  validateL11FormulaCapRules,
  validateL11FormulaPenaltyRules,
  validateL11FormulaModifierRules,
  validateL11FormulaMissingDataRules,
  validateL11FormulaEvaluationResult,
  validateL11FormulaFamilyConsistency,
} from '../l11/validation';

import {
  L11FormulaAuditSubjectClass,
  ALL_L11_FORMULA_AUDIT_SUBJECT_CLASSES,
  makeL11FormulaAuditRecord,
  emitL11FormulaAuditRecords,
  emitL11FormulaAuditBatch,
} from '../l11/constitution/l11-formula-audit';

import {
  runAllL11_3Invariants,
  checkInvariantL11_3_A_FormulaCoverage,
  checkInvariantL11_3_B_ReservedEmbargo,
  checkInvariantL11_3_C_DirectionConsistency,
  checkInvariantL11_3_D_ComponentCompleteness,
  checkInvariantL11_3_E_WeightLegality,
  checkInvariantL11_3_F_CapPenaltyModifierMissingData,
  checkInvariantL11_3_G_DeterministicEvaluation,
  checkInvariantL11_3_H_NonJudgment,
} from '../l11/invariants/l11_3-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

// ── Helpers to build evaluation results ──
function buildEvalFor(
  formula: L11ScoreFormulaDefinition,
  overrides: Partial<L11FormulaEvaluationResult> = {},
): L11FormulaEvaluationResult {
  const base: Omit<L11FormulaEvaluationResult, 'replay_hash'> = {
    formula_id: formula.formula_id,
    score_family: formula.score_family,
    formula_version: formula.formula_version,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: '2026-05-05T00:00:00Z',
    component_results: formula.component_definitions.map(c => ({
      component_id: c.component_id,
      component_name: c.component_name,
      value: 60,
      weight: c.weight,
      weighted_contribution: 60 * c.weight,
      omitted: false,
      attribution_ref: `attr.${c.component_id}`,
    })),
    raw_score: 60,
    applied_penalties: [],
    applied_caps: [],
    applied_modifiers: [],
    missing_data_effects: [],
    formula_readiness: L11FormulaReadinessClass.FORMULA_READY,
    policy_version: L11_FORMULA_POLICY_VERSION,
    ...overrides,
  };
  const replay_hash = canonicalFormulaEvaluationReplayHash(base);
  return { ...base, replay_hash };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Formula registry (§11.3.23 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Formula Registry ═══');

assert(L11_PRODUCTION_FORMULAS.length === 8, 'A.01 8 production formulas exist');

const expectedFamilies: readonly L11ScoreFamily[] = [
  L11ScoreFamily.OPPORTUNITY,
  L11ScoreFamily.RISK,
  L11ScoreFamily.TIMING,
  L11ScoreFamily.THESIS_COHERENCE,
  L11ScoreFamily.SIGNAL_CONFIDENCE,
  L11ScoreFamily.MARKET_STRUCTURE,
  L11ScoreFamily.WHALE_CONVICTION,
  L11ScoreFamily.UNLOCK_RISK,
];
expectedFamilies.forEach((fam, i) => {
  const f = getL11ProductionFormula(fam);
  assert(!!f, `A.${(2 + i).toString().padStart(2, '0')} ${fam} has production formula`);
  assert(f?.formula_status === L11FormulaStatus.PRODUCTION_ENABLED,
    `A.${(10 + i).toString().padStart(2, '0')} ${fam} formula PRODUCTION_ENABLED`);
});

const baselineRegistry = buildL11FormulaRegistryReport();
assert(baselineRegistry.ok, 'A.18 production formula registry report ok');
assert(baselineRegistry.count === 8, 'A.19 registry sees 8 formulas');
assert(Object.keys(baselineRegistry.production_formula_ids_by_family).length === 8,
  'A.20 8 production_formula_ids_by_family entries');

// duplicate formula
const opp = getL11ProductionFormula(L11ScoreFamily.OPPORTUNITY)!;
const dupReport = buildL11FormulaRegistryReport([
  ...L11_PRODUCTION_FORMULAS,
  opp,
]);
assert(!dupReport.ok, 'A.21 duplicate formula_id rejected');
assert(dupReport.issues.some(i => i.reason.includes('duplicate formula_id')),
  'A.22 duplicate-id reason emitted');

// missing family
const partial = L11_PRODUCTION_FORMULAS.filter(f => f.score_family !== L11ScoreFamily.RISK);
const missingReport = buildL11FormulaRegistryReport(partial);
assert(!missingReport.ok, 'A.23 missing production family rejected');
assert(missingReport.issues.some(i => i.reason.includes('RISK has no production formula')),
  'A.24 missing-family reason emitted');

// reserved family with production status
const reservedFormula: L11ScoreFormulaDefinition = {
  ...opp,
  formula_id: 'l11f.formula.narrative_quality.v1',
  score_family: L11ScoreFamily.NARRATIVE_QUALITY,
  formula_status: L11FormulaStatus.PRODUCTION_ENABLED,
};
const reservedReport = buildL11FormulaRegistryReport([
  ...L11_PRODUCTION_FORMULAS,
  reservedFormula,
]);
assert(!reservedReport.ok, 'A.25 reserved family with production formula rejected');
assert(reservedReport.issues.some(i => i.reason.includes('reserved family')),
  'A.26 reserved-embargo reason emitted');

// version uniqueness
const versionDup: L11ScoreFormulaDefinition = {
  ...opp,
  formula_id: 'l11f.formula.opportunity.v1.dup',
};
const versionReport = buildL11FormulaRegistryReport([
  ...L11_PRODUCTION_FORMULAS,
  versionDup,
]);
assert(!versionReport.ok, 'A.27 duplicate formula_version within family rejected');

// ALL_L11_FORMULA_STATUSES
assert(ALL_L11_FORMULA_STATUSES.length === 5, 'A.28 5 formula statuses');
assert(formulaStatusAllowsCurrentEmission(L11FormulaStatus.PRODUCTION_ENABLED),
  'A.29 PRODUCTION_ENABLED allows emission');
assert(formulaStatusAllowsCurrentEmission(L11FormulaStatus.FROZEN),
  'A.30 FROZEN allows emission');
assert(formulaStatusForbidsProductionEmission(L11FormulaStatus.SHADOW_ONLY),
  'A.31 SHADOW_ONLY forbids production emission');
assert(formulaStatusForbidsProductionEmission(L11FormulaStatus.EXPERIMENTAL_BLOCKED),
  'A.32 EXPERIMENTAL_BLOCKED forbids production emission');
assert(formulaStatusForbidsProductionEmission(L11FormulaStatus.DEPRECATED),
  'A.33 DEPRECATED forbids production emission');

assert(getL11FormulaById('does.not.exist') === null, 'A.34 unknown formula id returns null');
assert(getL11FormulaById(opp.formula_id)?.score_family === L11ScoreFamily.OPPORTUNITY,
  'A.35 known formula id returns correct formula');

// family-consistency validator end-to-end
const consistency = validateL11FormulaFamilyConsistency();
assert(consistency.ok, 'A.36 catalogue family-consistency validator ok');
for (const fam of L11_PRODUCTION_SCORE_FAMILIES) {
  assert(consistency.production_count_by_family[fam] === 1,
    `A.37.${fam} has 1 production formula`);
}

// every reserved family has zero production formulas
for (const fam of L11_RESERVED_SCORE_FAMILIES) {
  assert(!consistency.production_count_by_family[fam],
    `A.38.${fam} reserved family has 0 production formulas`);
}

// ═══════════════════════════════════════════════════════════════
// BAND B — Component and input law (§11.3.23 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Component and Input Law ═══');

const componentReport = buildL11ComponentRegistryReport();
assert(componentReport.ok, 'B.01 component registry ok');
assert(componentReport.total_components > 0, 'B.02 components present');

let allComponentsBounded = true;
let anyMissingNormalizer = false;
let allRequireAttribution = true;
let anyOutOfFamily = false;
for (const f of L11_PRODUCTION_FORMULAS) {
  for (const c of f.component_definitions) {
    if (c.min_value !== 0 || c.max_value !== 100) allComponentsBounded = false;
    if (!c.normalizer_id || !c.normalizer_version) anyMissingNormalizer = true;
    if (!c.attribution_required) allRequireAttribution = false;
    if (c.score_family !== f.score_family) anyOutOfFamily = true;
  }
}
assert(allComponentsBounded, 'B.03 all components bounded [0,100]');
assert(!anyMissingNormalizer, 'B.04 all components carry normalizer_id+version');
assert(allRequireAttribution, 'B.05 all components require attribution');
assert(!anyOutOfFamily, 'B.06 every component family matches its formula family');

assert(ALL_L11_SCORE_COMPONENT_ROLES.length === 10, 'B.07 10 component roles');
assert(ALL_L11_COMPONENT_DIRECTION_CLASSES.length === 6, 'B.08 6 component direction classes');
assert(ALL_L11_MISSING_DATA_BEHAVIOR_CLASSES.length === 7, 'B.09 7 missing-data behavior classes');

// component validator: out-of-bounds
const oppFormula = getL11ProductionFormula(L11ScoreFamily.OPPORTUNITY)!;
const goodComponent = oppFormula.component_definitions[0];
const goodComponentResult = validateL11ScoreComponentDefinition(
  goodComponent, oppFormula.score_family, oppFormula.formula_id);
assert(goodComponentResult.ok, 'B.10 valid component passes validator');

const badBounds: L11ScoreComponentDefinition = {
  ...goodComponent, max_value: 50,
};
const badBoundsResult = validateL11ScoreComponentDefinition(
  badBounds, oppFormula.score_family, oppFormula.formula_id);
assert(!badBoundsResult.ok, 'B.11 bounds-violating component rejected');
assert(badBoundsResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_COMPONENT_OUT_OF_BOUNDS),
  'B.12 L11F_COMPONENT_OUT_OF_BOUNDS emitted');

const noNormalizer: L11ScoreComponentDefinition = {
  ...goodComponent, normalizer_id: '', normalizer_version: '',
};
const noNormResult = validateL11ScoreComponentDefinition(
  noNormalizer, oppFormula.score_family, oppFormula.formula_id);
assert(!noNormResult.ok, 'B.13 missing normalizer rejected');
assert(noNormResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_COMPONENT_NORMALIZER_MISSING),
  'B.14 L11F_COMPONENT_NORMALIZER_MISSING emitted');

const wrongFamily: L11ScoreComponentDefinition = {
  ...goodComponent, score_family: L11ScoreFamily.RISK,
};
const wrongFamilyResult = validateL11ScoreComponentDefinition(
  wrongFamily, oppFormula.score_family, oppFormula.formula_id);
assert(!wrongFamilyResult.ok, 'B.15 wrong-family component rejected');
assert(wrongFamilyResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_COMPONENT_FAMILY_MISMATCH),
  'B.16 L11F_COMPONENT_FAMILY_MISMATCH emitted');

const requiredZero: L11ScoreComponentDefinition = {
  ...goodComponent, weight: 0,
};
const requiredZeroResult = validateL11ScoreComponentDefinition(
  requiredZero, oppFormula.score_family, oppFormula.formula_id);
assert(!requiredZeroResult.ok, 'B.17 required-component zero weight rejected');
assert(requiredZeroResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_COMPONENT_REQUIRED_ZERO_WEIGHT),
  'B.18 L11F_COMPONENT_REQUIRED_ZERO_WEIGHT emitted');

const noAttribution: L11ScoreComponentDefinition = {
  ...goodComponent, attribution_required: false,
};
const noAttributionResult = validateL11ScoreComponentDefinition(
  noAttribution, oppFormula.score_family, oppFormula.formula_id);
assert(!noAttributionResult.ok, 'B.19 attribution_required=false rejected');

// evidence_only used as decisive component
const evidenceOnly: L11ScoreComponentDefinition = {
  ...goodComponent,
  required_for_formula: true,
  required_input_surfaces: [
    {
      surface_class: L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
      evidence_only: true,
    },
  ],
};
const evidenceOnlyResult = validateL11ScoreComponentDefinition(
  evidenceOnly, oppFormula.score_family, oppFormula.formula_id);
assert(!evidenceOnlyResult.ok, 'B.20 evidence-only used as decisive component rejected');
assert(evidenceOnlyResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_EVIDENCE_ONLY_USED_AS_DECISIVE),
  'B.21 L11F_EVIDENCE_ONLY_USED_AS_DECISIVE emitted');

// formula has no required input surfaces
const noInputs: L11ScoreFormulaDefinition = {
  ...oppFormula,
  required_input_surfaces: [],
};
const noInputsResult = validateL11ScoreFormulaDefinition(noInputs);
assert(!noInputsResult.ok, 'B.22 formula without required input surfaces rejected');
assert(noInputsResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_REQUIRED_INPUT_SURFACE_MISSING),
  'B.23 L11F_REQUIRED_INPUT_SURFACE_MISSING emitted');

// ═══════════════════════════════════════════════════════════════
// BAND C — Weights, Caps, Penalties, Modifiers, Missing-Data (§11.3.23 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Weights, Caps, Penalties, Modifiers ═══');

// Weight profiles
assert(ALL_L11_WEIGHT_SUM_POLICIES.length === 4, 'C.01 4 weight sum policies');
const wpReport = buildL11WeightProfileRegistryReport();
assert(wpReport.ok, 'C.02 weight profile registry ok');
assert(wpReport.count === 8, 'C.03 8 weight profiles registered');

for (const f of L11_PRODUCTION_FORMULAS) {
  const wp = f.weight_profile;
  const sumCheck = isL11WeightSumLegal(wp);
  assert(sumCheck.ok, `C.04.${f.score_family} weight sum legal`);
}

// computeL11WeightSums sanity
const sums = computeL11WeightSums({ a: 0.5, b: 0.5, c: -0.2 });
assert(Math.abs(sums.positive - 1) < 1e-9, 'C.05 computeL11WeightSums positive sums');
assert(Math.abs(sums.penalty + 0.2) < 1e-9, 'C.06 computeL11WeightSums penalty sums');
assert(Math.abs(sums.absolute - 1.2) < 1e-9, 'C.07 computeL11WeightSums absolute sums');

// invalid weight profile (positive sum != 1)
const badWeights: L11FormulaWeightProfile = {
  ...oppFormula.weight_profile,
  positive_weight_sum: 0.5,
};
const badWeightFormula: L11ScoreFormulaDefinition = {
  ...oppFormula, weight_profile: badWeights,
};
const badWeightResult = validateL11FormulaWeightProfile(badWeightFormula);
assert(!badWeightResult.ok, 'C.08 illegal weight sum rejected');
assert(badWeightResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_WEIGHT_SUM_INVALID),
  'C.09 L11F_WEIGHT_SUM_INVALID emitted');

// hidden component weight
const hiddenWeights: L11FormulaWeightProfile = {
  ...oppFormula.weight_profile,
  component_weights: { ...oppFormula.weight_profile.component_weights, ghost_id: 0.1 },
};
const hiddenFormula: L11ScoreFormulaDefinition = {
  ...oppFormula, weight_profile: hiddenWeights,
};
const hiddenResult = validateL11FormulaWeightProfile(hiddenFormula);
assert(!hiddenResult.ok, 'C.10 hidden component weight rejected');
assert(hiddenResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_HIDDEN_COMPONENT_WEIGHT),
  'C.11 L11F_HIDDEN_COMPONENT_WEIGHT emitted');

// Cap rules
const capReport = buildL11CapRuleRegistryReport();
assert(capReport.ok, 'C.12 cap rule registry ok');
assert(capReport.count > 0, 'C.13 caps registered');
assert(ALL_L11_CAP_TYPES.length === 5, 'C.14 5 cap types');
assert(ALL_L11_CAP_DIRECTIONS.length === 4, 'C.15 4 cap directions');

// Bad cap rule: UPPER_VALUE with wrong direction
const badCap: L11FormulaCapRule = {
  ...oppFormula.cap_rules[0],
  cap_rule_id: 'l11f.cap.bad.x',
  cap_type: L11CapType.UPPER_VALUE,
  cap_direction: L11CapDirection.LIMIT_DOWNSIDE,
  cap_value: 80,
};
const badCapV = isL11CapRuleStructurallyValid(badCap);
assert(!badCapV.ok, 'C.16 UPPER_VALUE+LIMIT_DOWNSIDE rejected');
const badCapFormula: L11ScoreFormulaDefinition = {
  ...oppFormula,
  cap_rules: [...oppFormula.cap_rules, badCap],
};
const badCapResult = validateL11FormulaCapRules(badCapFormula);
assert(!badCapResult.ok, 'C.17 bad cap-rule formula rejected');
assert(badCapResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_CAP_RULE_INVALID),
  'C.18 L11F_CAP_RULE_INVALID emitted');

// Penalty rules
const penReport = buildL11PenaltyRuleRegistryReport();
assert(penReport.ok, 'C.19 penalty rule registry ok');
assert(penReport.count > 0, 'C.20 penalties registered');

// Bad penalty: multiplicative > 1
const badPen: L11FormulaPenaltyRule = {
  ...oppFormula.penalty_rules[0],
  penalty_rule_id: 'l11f.penalty.bad.x',
  application_mode: L11PenaltyApplicationMode.MULTIPLICATIVE,
  magnitude: 2.5,
};
assert(!isL11PenaltyRuleStructurallyValid(badPen).ok, 'C.21 multiplicative magnitude > 1 rejected');
const badPenFormula: L11ScoreFormulaDefinition = {
  ...oppFormula,
  penalty_rules: [...oppFormula.penalty_rules, badPen],
};
const badPenResult = validateL11FormulaPenaltyRules(badPenFormula);
assert(!badPenResult.ok, 'C.22 bad penalty formula rejected');
assert(badPenResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_PENALTY_RULE_INVALID),
  'C.23 L11F_PENALTY_RULE_INVALID emitted');

// Modifier rules
const modReport = buildL11ModifierRuleRegistryReport();
assert(modReport.ok, 'C.24 modifier rule registry ok');
assert(ALL_L11_MODIFIER_SOURCE_LAYERS.length === 7, 'C.25 7 modifier source layers');
assert(ALL_L11_MODIFIER_EFFECTS.length === 6, 'C.26 6 modifier effects');

// Bad modifier: unknown effect
const badMod: L11FormulaModifierRule = {
  ...oppFormula.modifier_rules[0],
  modifier_rule_id: 'l11f.modifier.bad.x',
  effect: 'NOT_A_REAL_EFFECT' as L11ModifierEffect,
  magnitude: 999,
};
assert(!isL11ModifierRuleStructurallyValid(badMod).ok, 'C.27 unknown modifier effect rejected');

// Missing-data rules
const mdReport = buildL11MissingDataRuleRegistryReport();
assert(mdReport.ok, 'C.28 missing-data rule registry ok');
assert(ALL_L11_INPUT_CONDITION_CLASSES.length === 7, 'C.29 7 input condition classes');

// Each formula covers all 7 conditions
for (const f of L11_PRODUCTION_FORMULAS) {
  const conditions = new Set(f.missing_data_rules.map(r => r.input_condition));
  assert(conditions.size === 7, `C.30.${f.score_family} covers all 7 input conditions`);
}

// REQUIRED_MISSING + OMIT_OPTIONAL_COMPONENT is illegal
const illegalMD: L11FormulaMissingDataRule = {
  missing_data_rule_id: 'l11f.mdr.illegal.x',
  score_family: L11ScoreFamily.OPPORTUNITY,
  input_condition: L11InputConditionClass.REQUIRED_MISSING,
  behavior: L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
  reason_code: 'illegal_missing_data',
  attribution_required: true,
  policy_version: L11_FORMULA_POLICY_VERSION,
};
assert(!isL11MissingDataRuleLegal(illegalMD).ok, 'C.31 OMIT_OPTIONAL for REQUIRED_MISSING rejected');

// EVIDENCE_ONLY+BLOCK_SCORE rejected
const illegalEvidence: L11FormulaMissingDataRule = {
  ...illegalMD,
  missing_data_rule_id: 'l11f.mdr.illegal.evidence',
  input_condition: L11InputConditionClass.EVIDENCE_ONLY,
  behavior: L11MissingDataBehaviorClass.BLOCK_SCORE,
};
assert(!isL11MissingDataRuleLegal(illegalEvidence).ok, 'C.32 BLOCK_SCORE for EVIDENCE_ONLY rejected');

// formula-level validator on baseline formulas
for (const f of L11_PRODUCTION_FORMULAS) {
  const r = validateL11ScoreFormulaDefinition(f);
  assert(r.ok, `C.33.${f.score_family} baseline formula validator ok`);
}

// direction mismatch
const wrongDirection: L11ScoreFormulaDefinition = {
  ...oppFormula,
  score_direction: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
};
const wrongDirResult = validateL11ScoreFormulaDefinition(wrongDirection);
assert(!wrongDirResult.ok, 'C.34 wrong score direction rejected');
assert(wrongDirResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_FORMULA_DIRECTION_MISMATCH),
  'C.35 L11F_FORMULA_DIRECTION_MISMATCH emitted');

// reserved family
const reservedAsProduction: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.narrative_quality.v2',
  score_family: L11ScoreFamily.NARRATIVE_QUALITY,
  formula_status: L11FormulaStatus.PRODUCTION_ENABLED,
};
const reservedResult = validateL11ScoreFormulaDefinition(reservedAsProduction);
assert(!reservedResult.ok, 'C.36 reserved family with production formula rejected');
assert(reservedResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_RESERVED_FAMILY_HAS_FORMULA),
  'C.37 L11F_RESERVED_FAMILY_HAS_FORMULA emitted');

// missing meaning_claim_ref equivalent — calibration_target_ref empty
const noCalibration: L11ScoreFormulaDefinition = {
  ...oppFormula, calibration_target_ref: '',
};
const noCalibrationResult = validateL11ScoreFormulaDefinition(noCalibration);
assert(!noCalibrationResult.ok, 'C.38 missing calibration target rejected');
assert(noCalibrationResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_CALIBRATION_TARGET_MISSING),
  'C.39 L11F_CALIBRATION_TARGET_MISSING emitted');

const noBandPolicy: L11ScoreFormulaDefinition = {
  ...oppFormula, output_band_policy_ref: '',
};
const noBandResult = validateL11ScoreFormulaDefinition(noBandPolicy);
assert(noBandResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_OUTPUT_BAND_POLICY_MISSING),
  'C.40 L11F_OUTPUT_BAND_POLICY_MISSING emitted');

// ═══════════════════════════════════════════════════════════════
// BAND D — Formula evaluation (§11.3.23 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Formula Evaluation ═══');

assert(ALL_L11_FORMULA_READINESS_CLASSES.length === 6, 'D.01 6 formula readiness classes');

// Each production formula evaluates a green fixture
for (const f of L11_PRODUCTION_FORMULAS) {
  const ev = buildEvalFor(f);
  const r = validateL11FormulaEvaluationResult(ev, f);
  assert(r.ok, `D.02.${f.score_family} green evaluation passes validator`);
  assert(ev.raw_score >= 0 && ev.raw_score <= 100, `D.03.${f.score_family} raw_score in [0,100]`);
  assert(ev.replay_hash.startsWith('l11f.h.'), `D.04.${f.score_family} evaluation replay hash present`);
}

// Replay determinism: identical material → identical hash
const oppEval = buildEvalFor(oppFormula);
const oppEval2 = buildEvalFor(oppFormula);
assert(oppEval.replay_hash === oppEval2.replay_hash,
  'D.05 identical evaluation material → identical replay hash');

// Material change → hash flip
const oppEvalChanged: L11FormulaEvaluationResult = (() => {
  const e = buildEvalFor(oppFormula, { raw_score: 65 });
  return e;
})();
assert(oppEvalChanged.replay_hash !== oppEval.replay_hash,
  'D.06 raw_score change flips replay hash');

const oppEvalScopeChanged = buildEvalFor(oppFormula, { scope_id: 'asset:eth' });
assert(oppEvalScopeChanged.replay_hash !== oppEval.replay_hash,
  'D.07 scope change flips replay hash');

// Replay deterministic across re-extraction
assert(canonicalFormulaEvaluationReplayHash(oppEval) === oppEval.replay_hash,
  'D.08 canonicalFormulaEvaluationReplayHash matches recorded hash');

// raw_score out of range
const outOfRange = buildEvalFor(oppFormula, { raw_score: 150 });
const oorResult = validateL11FormulaEvaluationResult(outOfRange, oppFormula);
assert(!oorResult.ok, 'D.09 raw_score > 100 rejected');
assert(oorResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_RAW_SCORE_OUT_OF_RANGE),
  'D.10 L11F_RAW_SCORE_OUT_OF_RANGE emitted');

const nonFinite = buildEvalFor(oppFormula, { raw_score: Number.NaN });
const nonFiniteResult = validateL11FormulaEvaluationResult(nonFinite, oppFormula);
assert(!nonFiniteResult.ok, 'D.11 raw_score NaN rejected');
assert(nonFiniteResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_RAW_SCORE_NOT_FINITE),
  'D.12 L11F_RAW_SCORE_NOT_FINITE emitted');

// missing required component result
const missingRequired = buildEvalFor(oppFormula, {
  component_results: oppFormula.component_definitions.slice(1).map(c => ({
    component_id: c.component_id,
    component_name: c.component_name,
    value: 60, weight: c.weight, weighted_contribution: 60 * c.weight,
    omitted: false, attribution_ref: `attr.${c.component_id}`,
  })),
});
const missingRequiredResult = validateL11FormulaEvaluationResult(missingRequired, oppFormula);
assert(!missingRequiredResult.ok, 'D.13 missing required component result rejected');
assert(missingRequiredResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_REQUIRED_COMPONENT_RESULT_MISSING),
  'D.14 L11F_REQUIRED_COMPONENT_RESULT_MISSING emitted');

// component result out of bounds
const oobComponent = buildEvalFor(oppFormula, {
  component_results: oppFormula.component_definitions.map((c, i) => ({
    component_id: c.component_id,
    component_name: c.component_name,
    value: i === 0 ? 200 : 60,
    weight: c.weight, weighted_contribution: c.weight * (i === 0 ? 200 : 60),
    omitted: false, attribution_ref: `attr.${c.component_id}`,
  })),
});
const oobResult = validateL11FormulaEvaluationResult(oobComponent, oppFormula);
assert(!oobResult.ok, 'D.15 component value > max rejected');
assert(oobResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_COMPONENT_RESULT_OUT_OF_BOUNDS),
  'D.16 L11F_COMPONENT_RESULT_OUT_OF_BOUNDS emitted');

// applied penalty not declared
const undeclaredPenalty = buildEvalFor(oppFormula, {
  applied_penalties: [{
    penalty_rule_id: 'l11f.penalty.NOT_DECLARED',
    magnitude_applied: 5, mode: 'ADDITIVE', reason_code: 'invalid',
  }],
});
const updenResult = validateL11FormulaEvaluationResult(undeclaredPenalty, oppFormula);
assert(!updenResult.ok, 'D.17 undeclared applied penalty rejected');
assert(updenResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_PENALTY_APPLIED_NOT_DECLARED),
  'D.18 L11F_PENALTY_APPLIED_NOT_DECLARED emitted');

// applied cap not declared
const undeclaredCap = buildEvalFor(oppFormula, {
  applied_caps: [{
    cap_rule_id: 'l11f.cap.NOT_DECLARED', cap_type: 'UPPER_VALUE',
    cap_direction: 'LIMIT_UPSIDE', cap_value: 80, reason_code: 'invalid',
  }],
});
const upcapResult = validateL11FormulaEvaluationResult(undeclaredCap, oppFormula);
assert(!upcapResult.ok, 'D.19 undeclared applied cap rejected');
assert(upcapResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_CAP_APPLIED_NOT_DECLARED),
  'D.20 L11F_CAP_APPLIED_NOT_DECLARED emitted');

// applied modifier not declared
const undeclaredMod = buildEvalFor(oppFormula, {
  applied_modifiers: [{
    modifier_rule_id: 'l11f.modifier.NOT_DECLARED',
    source_layer: 'L8_REGIME', effect: 'AMPLIFY',
    magnitude_applied: 5, trigger_code: 'NONE',
  }],
});
const upmodResult = validateL11FormulaEvaluationResult(undeclaredMod, oppFormula);
assert(!upmodResult.ok, 'D.21 undeclared applied modifier rejected');
assert(upmodResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_MODIFIER_APPLIED_NOT_DECLARED),
  'D.22 L11F_MODIFIER_APPLIED_NOT_DECLARED emitted');

// omitted component without missing_data_effect
const omittedNoEffect = buildEvalFor(oppFormula, {
  component_results: oppFormula.component_definitions.map((c, i) => ({
    component_id: c.component_id,
    component_name: c.component_name,
    value: i === 0 ? 0 : 60, weight: c.weight,
    weighted_contribution: i === 0 ? 0 : c.weight * 60,
    omitted: i === 0, attribution_ref: `attr.${c.component_id}`,
  })),
  missing_data_effects: [],
});
const omittedResult = validateL11FormulaEvaluationResult(omittedNoEffect, oppFormula);
assert(!omittedResult.ok, 'D.23 omitted component without missing-data effect rejected');
assert(omittedResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_MISSING_DATA_EFFECT_ABSENT),
  'D.24 L11F_MISSING_DATA_EFFECT_ABSENT emitted');

// readiness inconsistent: FORMULA_READY despite applied caps
const readyDespiteCap = buildEvalFor(oppFormula, {
  applied_caps: [{
    cap_rule_id: oppFormula.cap_rules[0].cap_rule_id, cap_type: 'UPPER_VALUE',
    cap_direction: 'LIMIT_UPSIDE', cap_value: 70, reason_code: 'capped',
  }],
  formula_readiness: L11FormulaReadinessClass.FORMULA_READY,
});
const inconsistentResult = validateL11FormulaEvaluationResult(readyDespiteCap, oppFormula);
assert(inconsistentResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_FORMULA_READINESS_INCONSISTENT),
  'D.25 L11F_FORMULA_READINESS_INCONSISTENT emitted when ready despite caps');

// formula identity mismatch
const wrongIdentity = buildEvalFor(oppFormula, { formula_id: 'l11f.wrong.id' });
const wrongIdResult = validateL11FormulaEvaluationResult(wrongIdentity, oppFormula);
assert(!wrongIdResult.ok, 'D.26 evaluation with wrong formula_id rejected');
assert(wrongIdResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_FORMULA_EVALUATION_FAMILY_MISMATCH),
  'D.27 L11F_FORMULA_EVALUATION_FAMILY_MISMATCH emitted');

// replay hash tampering
const tampered: L11FormulaEvaluationResult = {
  ...oppEval, replay_hash: 'l11f.h.deadbeef',
};
const tamperedResult = validateL11FormulaEvaluationResult(tampered, oppFormula);
assert(!tamperedResult.ok, 'D.28 tampered replay hash rejected');
assert(tamperedResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_REPLAY_HASH_MISMATCH),
  'D.29 L11F_REPLAY_HASH_MISMATCH emitted');

// missing replay hash
const noHash: L11FormulaEvaluationResult = { ...oppEval, replay_hash: '' };
const noHashResult = validateL11FormulaEvaluationResult(noHash, oppFormula);
assert(noHashResult.issues.some(
  i => i.code === L11ScoreFormulaViolationCode.L11F_REPLAY_HASH_MISSING),
  'D.30 L11F_REPLAY_HASH_MISSING emitted');

// formula replay hash determinism
const oppHash1 = canonicalScoreFormulaReplayHash(oppFormula);
const oppHash2 = canonicalScoreFormulaReplayHash(oppFormula);
assert(oppHash1 === oppHash2, 'D.31 formula replay hash deterministic');
const tamperedFormula: L11ScoreFormulaDefinition = {
  ...oppFormula, formula_version: 'v1.0.1',
};
assert(canonicalScoreFormulaReplayHash(tamperedFormula) !== oppHash1,
  'D.32 formula version change flips replay hash');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants (§11.3.23 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');

assert(ALL_L11_SCORE_FORMULA_VIOLATION_CODES.length >= 30,
  'E.01 violation code namespace populated (≥30 codes)');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_RESERVED_FAMILY_HAS_FORMULA) === 'CRITICAL',
  'E.02 reserved-family-has-formula = CRITICAL');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_FORMULA_DIRECTION_MISMATCH) === 'CRITICAL',
  'E.03 direction mismatch = CRITICAL');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_RECOMMENDATION_LEAK) === 'CRITICAL',
  'E.04 recommendation leak = CRITICAL');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_WEIGHT_SUM_INVALID) === 'ERROR',
  'E.05 weight sum invalid = ERROR');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_COMPONENT_MISSING) === 'ERROR',
  'E.06 component missing = ERROR');
assert(severityForL11FormulaCode(L11ScoreFormulaViolationCode.L11F_MISSING_DATA_RULE_MISSING) === 'ERROR',
  'E.07 missing-data rule missing = ERROR');

// Audit subject classes
assert(ALL_L11_FORMULA_AUDIT_SUBJECT_CLASSES.length === 10, 'E.08 10 audit subject classes');
const sampleIssue = makeL11ScoreFormulaIssue(
  L11ScoreFormulaViolationCode.L11F_WEIGHT_SUM_INVALID,
  'demo', { formula_id: 'l11f.formula.opportunity.v1' });
const auditRecord = makeL11FormulaAuditRecord(
  L11FormulaAuditSubjectClass.WEIGHT_PROFILE,
  'l11f.formula.opportunity.v1', sampleIssue, '2026-05-05T00:00:00Z');
assert(auditRecord.audit_id.startsWith('l11f.audit.'), 'E.09 audit id deterministic prefix');
assert(auditRecord.severity === 'ERROR', 'E.10 audit severity flows through');

const auditRecord2 = makeL11FormulaAuditRecord(
  L11FormulaAuditSubjectClass.WEIGHT_PROFILE,
  'l11f.formula.opportunity.v1', sampleIssue, '2026-05-05T00:00:00Z');
assert(auditRecord.audit_id === auditRecord2.audit_id, 'E.11 audit id stable for identical input');

const auditRecord3 = makeL11FormulaAuditRecord(
  L11FormulaAuditSubjectClass.WEIGHT_PROFILE,
  'l11f.formula.risk.v1', sampleIssue, '2026-05-05T00:00:00Z');
assert(auditRecord.audit_id !== auditRecord3.audit_id, 'E.12 audit id changes when subject_ref changes');

const auditBatch = emitL11FormulaAuditRecords(
  L11FormulaAuditSubjectClass.FORMULA_DEFINITION,
  oppFormula.formula_id, [sampleIssue, sampleIssue], '2026-05-05T00:00:00Z');
assert(auditBatch.length === 2, 'E.13 emit batch returns one record per issue');

const issueWithComponent = makeL11ScoreFormulaIssue(
  L11ScoreFormulaViolationCode.L11F_COMPONENT_MISSING,
  'comp missing', { component_id: 'l11f.opportunity.foo.v1', formula_id: oppFormula.formula_id });
const componentBatch = emitL11FormulaAuditBatch(
  L11FormulaAuditSubjectClass.COMPONENT_DEFINITION,
  oppFormula.formula_id, [issueWithComponent], '2026-05-05T00:00:00Z');
assert(componentBatch[0].subject_ref === 'l11f.opportunity.foo.v1',
  'E.14 batch routes component_id into subject_ref for COMPONENT_DEFINITION');

// Invariant suite
const suite = runAllL11_3Invariants();
assert(suite.ok, `E.15 invariant suite green: ${suite.results.filter(r => !r.ok).map(r => r.invariant_id + ' (' + r.violations.join(';') + ')').join(' | ')}`);
assert(suite.results.length === 8, 'E.16 8 invariants in suite');

// Individual invariants
assert(checkInvariantL11_3_A_FormulaCoverage().ok, 'E.17 INV-11.3-A green');
assert(checkInvariantL11_3_B_ReservedEmbargo().ok, 'E.18 INV-11.3-B green');
assert(checkInvariantL11_3_C_DirectionConsistency().ok, 'E.19 INV-11.3-C green');
assert(checkInvariantL11_3_D_ComponentCompleteness().ok, 'E.20 INV-11.3-D green');
assert(checkInvariantL11_3_E_WeightLegality().ok, 'E.21 INV-11.3-E green');
assert(checkInvariantL11_3_F_CapPenaltyModifierMissingData().ok, 'E.22 INV-11.3-F green');
assert(checkInvariantL11_3_G_DeterministicEvaluation().ok, 'E.23 INV-11.3-G green');
assert(checkInvariantL11_3_H_NonJudgment().ok, 'E.24 INV-11.3-H green');

// Crafted offenders break specific invariants
const offenderCoverage = L11_PRODUCTION_FORMULAS.filter(f => f.score_family !== L11ScoreFamily.RISK);
assert(!checkInvariantL11_3_A_FormulaCoverage(offenderCoverage).ok,
  'E.25 INV-11.3-A breaks when family missing');

const offenderReserved: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.reserved_offender',
  score_family: L11ScoreFamily.NARRATIVE_QUALITY,
};
assert(!checkInvariantL11_3_B_ReservedEmbargo([...L11_PRODUCTION_FORMULAS, offenderReserved]).ok,
  'E.26 INV-11.3-B breaks with reserved-family production formula');

const offenderDirection: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.direction_offender',
  score_direction: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
};
assert(!checkInvariantL11_3_C_DirectionConsistency([offenderDirection]).ok,
  'E.27 INV-11.3-C breaks with wrong direction');

const offenderWeights: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.weight_offender',
  weight_profile: { ...oppFormula.weight_profile, positive_weight_sum: 0.7 },
};
assert(!checkInvariantL11_3_E_WeightLegality([offenderWeights]).ok,
  'E.28 INV-11.3-E breaks with bad weight sum');

const offenderJudgment: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.judgment_offender',
  modifier_rules: [
    ...oppFormula.modifier_rules,
    {
      modifier_rule_id: 'l11f.modifier.opportunity.judgment_offender.v1',
      score_family: L11ScoreFamily.OPPORTUNITY,
      source_layer: L11ModifierSourceLayer.L10_HYPOTHESIS,
      effect: L11ModifierEffect.AMPLIFY,
      trigger_code: 'BUY_NOW',
      description: 'this is a strong buy recommendation',
      magnitude: 10,
      attribution_required: true,
      policy_version: L11_FORMULA_POLICY_VERSION,
    },
  ],
};
assert(!checkInvariantL11_3_H_NonJudgment([offenderJudgment]).ok,
  'E.29 INV-11.3-H breaks when description contains "buy"');

const offenderMissingData: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.md_offender',
  missing_data_rules: oppFormula.missing_data_rules.filter(
    r => r.input_condition !== L11InputConditionClass.REQUIRED_MISSING),
};
assert(!checkInvariantL11_3_F_CapPenaltyModifierMissingData([offenderMissingData]).ok,
  'E.30 INV-11.3-F breaks when REQUIRED_MISSING rule missing');

const offenderCapBad: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.cap_offender',
  cap_rules: [
    ...oppFormula.cap_rules,
    {
      cap_rule_id: 'l11f.cap.opportunity.bad.v1',
      score_family: L11ScoreFamily.OPPORTUNITY,
      trigger_condition: { trigger_code: 'X', description: 'X' },
      cap_type: L11CapType.UPPER_VALUE,
      cap_value: 200,
      cap_direction: L11CapDirection.LIMIT_UPSIDE,
      reason_code: 'x',
      attribution_required: true,
      policy_version: L11_FORMULA_POLICY_VERSION,
    },
  ],
};
assert(!checkInvariantL11_3_F_CapPenaltyModifierMissingData([offenderCapBad]).ok,
  'E.31 INV-11.3-F breaks with cap_value > 100');

// component completeness offender — bounds wrong
const offenderBounds: L11ScoreFormulaDefinition = {
  ...oppFormula,
  formula_id: 'l11f.formula.bounds_offender',
  component_definitions: oppFormula.component_definitions.map((c, i) =>
    i === 0 ? { ...c, max_value: 50 } : c),
};
assert(!checkInvariantL11_3_D_ComponentCompleteness([offenderBounds]).ok,
  'E.32 INV-11.3-D breaks with wrong component bounds');

// determinism offender — construct an eval whose recorded hash does not
// match its canonical material (buildEvalFor recomputes hash, so we
// patch the result *after* construction)
const detOffender: L11FormulaEvaluationResult = {
  ...buildEvalFor(oppFormula),
  replay_hash: 'l11f.h.tampered',
};
const detResult = checkInvariantL11_3_G_DeterministicEvaluation({
  evaluation_pairs: [{ formula: oppFormula, result: detOffender }],
});
assert(!detResult.ok, 'E.33 INV-11.3-G breaks when evaluation result has tampered hash');

// Replay material spec defaults are full
assert(L11_FULL_FORMULA_REPLAY_MATERIAL.include_components, 'E.34 full replay material includes components');
assert(L11_FULL_FORMULA_REPLAY_MATERIAL.include_weights, 'E.35 full replay material includes weights');

// ─────────── Final summary ───────────
console.log('\n════════════════════════════════════════════════════════');
console.log(`L11.3 — Score Formulas Certification`);
console.log(`Total assertions: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log('════════════════════════════════════════════════════════\n');

if (failed === 0) {
  console.log('✓ L11.3 — Formula law CERTIFIED');
  process.exit(0);
} else {
  console.error('✗ L11.3 certification failed:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
