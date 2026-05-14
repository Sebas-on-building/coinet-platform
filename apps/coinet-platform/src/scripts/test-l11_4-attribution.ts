/**
 * L11.4 — Score Attribution
 * Certification Test Suite (§11.4.20)
 *
 * 5 Bands:
 *   A — Attribution object and driver classes (§11.4.20 Band A)
 *   B — Contribution coverage (§11.4.20 Band B)
 *   C — Top-driver and summary-code law (§11.4.20 Band C)
 *   D — Attribution engine and replay (§11.4.20 Band D)
 *   E — Audit and invariants INV-11.4-A..H (§11.4.20 Band E)
 */

import {
  // L11.2/L11.3 contracts we need
  L11ScoreFamily,
  L11ScoreBand,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11_PRODUCTION_FORMULAS,
  getL11ProductionFormulaForFamily,
  L11ScoreOutput,
  L11ScoreFormulaDefinition,
  L11FormulaEvaluationResult,
  L11FormulaReadinessClass,
  L11_FORMULA_POLICY_VERSION,
  L11AppliedCap,
  L11AppliedPenalty,
  L11AppliedModifier,
  L11FormulaMissingDataEffect,
  canonicalFormulaEvaluationReplayHash,
  L11CapType,
  L11CapDirection,
  L11PenaltyApplicationMode,
  L11ModifierEffect,
  L11ModifierSourceLayer,
  L11InputConditionClass,
  L11MissingDataBehaviorClass,

  // L11.4 contracts
  L11ScoreAttribution,
  L11AttributionDriverClass,
  ALL_L11_ATTRIBUTION_DRIVER_CLASSES,
  L11ContributionDirection,
  ALL_L11_CONTRIBUTION_DIRECTIONS,
  L11AttributionMaterialityClass,
  ALL_L11_ATTRIBUTION_MATERIALITY_CLASSES,
  L11_DEFAULT_MATERIALITY_THRESHOLDS,
  classifyL11Materiality,
  isL11MaterialOrAbove,
  compareL11Materiality,
  L11AttributionSummaryCode,
  ALL_L11_ATTRIBUTION_SUMMARY_CODES,
  L11AttributionCompletenessClass,
  ALL_L11_ATTRIBUTION_COMPLETENESS_CLASSES,
  isL11AttributionEmissible,
  isL11AttributionBlocked,
  L11ComponentContribution,
  L11CapContribution,
  L11PenaltyContribution,
  L11ModifierContribution,
  L11MissingDataContribution,
  L11TopDriverSelectionPolicy,
  L11_DEFAULT_TOP_DRIVER_POLICY,
  L11TopDriverTieBreakRule,
  ALL_L11_TOP_DRIVER_TIE_BREAK_RULES,
  isL11TopDriverPolicyStructurallyValid,
  L11_ATTRIBUTION_POLICY_VERSION,
  extractL11AttributionReplayMaterial,
  canonicalScoreAttributionReplayHash,
  isPositiveDirection,
  isNegativeDirection,
} from '../l11/contracts';

import {
  runL11ScoreAttributionEngine,
  selectL11TopDrivers,
  deriveL11SummaryCodes,
  buildL11ComponentContributions,
  buildL11CapContributions,
  buildL11PenaltyContributions,
  buildL11ModifierContributions,
  buildL11MissingDataContributions,
  classifyL11AttributionCompleteness,
  driverFromComponent,
  driverFromCap,
  driverFromMissingData,
} from '../l11/attribution';

import {
  L11ScoreAttributionViolationCode,
  ALL_L11_SCORE_ATTRIBUTION_VIOLATION_CODES,
  severityForL11AttributionCode,
  validateL11ScoreAttribution,
  validateL11ComponentContribution,
  validateL11CapContribution,
  validateL11CapAttributionCoverage,
  validateL11PenaltyContribution,
  validateL11PenaltyAttributionCoverage,
  validateL11ModifierContribution,
  validateL11ModifierAttributionCoverage,
  validateL11MissingDataContribution,
  validateL11MissingDataCoverage,
  validateL11TopDriverSelection,
  validateL11SummaryCode,
  validateL11AttributionCompleteness,
} from '../l11/validation';

import {
  L11AttributionAuditSubjectClass,
  ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES,
  makeL11AttributionAuditRecord,
  emitL11AttributionAuditRecords,
  emitL11AttributionAuditBatch,
} from '../l11/constitution/l11-attribution-audit';

import {
  checkInvariantL11_4_A_AttributionRequired,
  checkInvariantL11_4_B_ContributionCoverage,
  checkInvariantL11_4_C_MaterialDriverVisibility,
  checkInvariantL11_4_D_CapMissingDataDisclosure,
  checkInvariantL11_4_E_GovernedInputs,
  checkInvariantL11_4_F_SummaryCodeSupport,
  checkInvariantL11_4_G_ReplayDeterminism,
  checkInvariantL11_4_H_NonJudgment,
} from '../l11/invariants/l11_4-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

// ─────────────────────────────────────────────────────────────────────
// Builders for synthetic score / evaluation pairs
// ─────────────────────────────────────────────────────────────────────

interface BuildEvalOpts {
  readonly baseValue?: number;
  readonly applied_caps?: readonly L11AppliedCap[];
  readonly applied_penalties?: readonly L11AppliedPenalty[];
  readonly applied_modifiers?: readonly L11AppliedModifier[];
  readonly missing_data_effects?: readonly L11FormulaMissingDataEffect[];
  readonly raw_score?: number;
}

function buildEvaluation(formula: L11ScoreFormulaDefinition, o: BuildEvalOpts = {}): L11FormulaEvaluationResult {
  const baseValue = o.baseValue ?? 60;
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
      value: baseValue,
      weight: c.weight,
      weighted_contribution: baseValue * c.weight,
      omitted: false,
      attribution_ref: `l11.attr.${c.component_id}`,
    })),
    raw_score: o.raw_score ?? baseValue,
    applied_penalties: o.applied_penalties ?? [],
    applied_caps: o.applied_caps ?? [],
    applied_modifiers: o.applied_modifiers ?? [],
    missing_data_effects: o.missing_data_effects ?? [],
    formula_readiness: L11FormulaReadinessClass.FORMULA_READY,
    policy_version: L11_FORMULA_POLICY_VERSION,
  };
  const replay_hash = canonicalFormulaEvaluationReplayHash(base);
  return { ...base, replay_hash };
}

function buildScoreFor(formula: L11ScoreFormulaDefinition, finalScore: number, band: L11ScoreBand): L11ScoreOutput {
  return {
    score_id: `l11.score.${formula.score_family.toLowerCase()}.001`,
    score_family: formula.score_family,
    score_name: `${formula.score_family} v1`,
    score_version: formula.formula_version,
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: '2026-05-05T00:00:00Z',
    raw_score: finalScore,
    modified_score: finalScore,
    final_score: finalScore,
    score_band: band,
    score_meaning_claim_ref: `l11.meaning.${formula.score_family.toLowerCase()}.v1`,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[formula.score_family],
    component_score_refs: [],
    positive_attribution_refs: [],
    negative_attribution_refs: [],
    missing_data_profile_ref: `l11.missing.${formula.score_family.toLowerCase()}`,
    missing_data_penalty_refs: [],
    regime_modifier_refs: [],
    sequence_modifier_refs: [],
    hypothesis_modifier_refs: [],
    confidence_modifier_ref: null,
    restriction_profile_ref: `l11.restriction.${formula.score_family.toLowerCase()}`,
    calibration_target_ref: `l11.calibration.${formula.score_family.toLowerCase()}`,
    evidence_pack_ref: `l11.evidence.${formula.score_family.toLowerCase()}`,
    input_snapshot_ref: `l11.snapshot.${formula.score_family.toLowerCase()}`,
    compute_run_id: 'run.l11.001',
    replay_hash: 'l11.h.score.001',
    policy_version: 'l11.2.score.v1',
  };
}

function bandFor(score: number): L11ScoreBand {
  if (score >= 80) return L11ScoreBand.VERY_HIGH;
  if (score >= 60) return L11ScoreBand.HIGH;
  if (score >= 40) return L11ScoreBand.MEDIUM;
  if (score >= 20) return L11ScoreBand.LOW;
  return L11ScoreBand.VERY_LOW;
}

const opportunityFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.OPPORTUNITY)!;
const riskFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.RISK)!;
const unlockFormula = getL11ProductionFormulaForFamily(L11ScoreFamily.UNLOCK_RISK)!;

function buildBaseAttribution(
  formula: L11ScoreFormulaDefinition,
  scoreFinal = 75,
): L11ScoreAttribution {
  const score = buildScoreFor(formula, scoreFinal, bandFor(scoreFinal));
  const evaluation = buildEvaluation(formula);
  const result = runL11ScoreAttributionEngine({
    score, evaluation, formula,
  });
  if (!result.ok || !result.attribution) {
    throw new Error('failed to build base attribution: ' + JSON.stringify(result.errors));
  }
  return result.attribution;
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Attribution object and driver classes (§11.4.20 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Attribution Object and Driver Classes ═══');

assert(ALL_L11_ATTRIBUTION_DRIVER_CLASSES.length === 13, 'A.01 13 driver classes registered');
assert(ALL_L11_ATTRIBUTION_DRIVER_CLASSES.includes(L11AttributionDriverClass.VALIDATION_DRIVER),
  'A.02 VALIDATION_DRIVER registered');
assert(ALL_L11_ATTRIBUTION_DRIVER_CLASSES.includes(L11AttributionDriverClass.CONTRADICTION_DRIVER),
  'A.03 CONTRADICTION_DRIVER registered');
assert(ALL_L11_ATTRIBUTION_DRIVER_CLASSES.includes(L11AttributionDriverClass.CONFIDENCE_DRIVER),
  'A.04 CONFIDENCE_DRIVER registered');

assert(ALL_L11_CONTRIBUTION_DIRECTIONS.length === 8, 'A.05 8 contribution directions');
assert(isPositiveDirection(L11ContributionDirection.RAISES_SCORE), 'A.06 RAISES_SCORE positive');
assert(isPositiveDirection(L11ContributionDirection.FLOORS_SCORE), 'A.07 FLOORS_SCORE positive');
assert(isPositiveDirection(L11ContributionDirection.INCREASES_RISK_SCORE), 'A.08 INCREASES_RISK_SCORE positive');
assert(isNegativeDirection(L11ContributionDirection.LOWERS_SCORE), 'A.09 LOWERS_SCORE negative');
assert(isNegativeDirection(L11ContributionDirection.CAPS_SCORE), 'A.10 CAPS_SCORE negative');
assert(isNegativeDirection(L11ContributionDirection.NARROWS_CONFIDENCE), 'A.11 NARROWS_CONFIDENCE negative');
assert(!isPositiveDirection(L11ContributionDirection.DISCLOSURE_ONLY) &&
       !isNegativeDirection(L11ContributionDirection.DISCLOSURE_ONLY),
  'A.12 DISCLOSURE_ONLY is neither positive nor negative');

assert(ALL_L11_ATTRIBUTION_MATERIALITY_CLASSES.length === 5, 'A.13 5 materiality classes');
assert(classifyL11Materiality(0.35) === L11AttributionMaterialityClass.CRITICAL, 'A.14 0.35 → CRITICAL');
assert(classifyL11Materiality(0.25) === L11AttributionMaterialityClass.MAJOR, 'A.15 0.25 → MAJOR');
assert(classifyL11Materiality(0.15) === L11AttributionMaterialityClass.MATERIAL, 'A.16 0.15 → MATERIAL');
assert(classifyL11Materiality(0.07) === L11AttributionMaterialityClass.MINOR, 'A.17 0.07 → MINOR');
assert(classifyL11Materiality(0.01) === L11AttributionMaterialityClass.TRACE, 'A.18 0.01 → TRACE');
assert(isL11MaterialOrAbove(L11AttributionMaterialityClass.CRITICAL), 'A.19 CRITICAL is material+');
assert(isL11MaterialOrAbove(L11AttributionMaterialityClass.MAJOR), 'A.20 MAJOR is material+');
assert(isL11MaterialOrAbove(L11AttributionMaterialityClass.MATERIAL), 'A.21 MATERIAL is material+');
assert(!isL11MaterialOrAbove(L11AttributionMaterialityClass.MINOR), 'A.22 MINOR is not material+');
assert(!isL11MaterialOrAbove(L11AttributionMaterialityClass.TRACE), 'A.23 TRACE is not material+');
assert(compareL11Materiality(L11AttributionMaterialityClass.CRITICAL, L11AttributionMaterialityClass.MAJOR) < 0,
  'A.24 CRITICAL outranks MAJOR (sort ascending)');
assert(compareL11Materiality(L11AttributionMaterialityClass.MINOR, L11AttributionMaterialityClass.TRACE) < 0,
  'A.25 MINOR outranks TRACE');

assert(ALL_L11_ATTRIBUTION_SUMMARY_CODES.length === 12, 'A.26 12 summary codes');
assert(ALL_L11_ATTRIBUTION_SUMMARY_CODES.includes(L11AttributionSummaryCode.SCORE_HIGH_DUE_TO_PRIMARY_COMPONENTS),
  'A.27 SCORE_HIGH_DUE_TO_PRIMARY_COMPONENTS registered');
assert(ALL_L11_ATTRIBUTION_SUMMARY_CODES.includes(L11AttributionSummaryCode.SCORE_LIMITED_BY_DEGRADED_VISIBILITY),
  'A.28 SCORE_LIMITED_BY_DEGRADED_VISIBILITY registered');

assert(ALL_L11_ATTRIBUTION_COMPLETENESS_CLASSES.length === 5, 'A.29 5 completeness classes');
assert(isL11AttributionEmissible(L11AttributionCompletenessClass.COMPLETE_ATTRIBUTION),
  'A.30 COMPLETE_ATTRIBUTION emissible');
assert(isL11AttributionEmissible(L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE),
  'A.31 COMPLETE_WITH_DISCLOSURE emissible');
assert(!isL11AttributionEmissible(L11AttributionCompletenessClass.PARTIAL_ATTRIBUTION),
  'A.32 PARTIAL_ATTRIBUTION not emissible');
assert(isL11AttributionBlocked(L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE),
  'A.33 BLOCKED_INSUFFICIENT_TRACE blocked');
assert(isL11AttributionBlocked(L11AttributionCompletenessClass.BLOCKED_UNGOVERNED_INPUT),
  'A.34 BLOCKED_UNGOVERNED_INPUT blocked');

// Build a base attribution and inspect its shape
const baseAttr = buildBaseAttribution(opportunityFormula, 75);
assert(!!baseAttr.attribution_id, 'A.35 attribution carries attribution_id');
assert(!!baseAttr.formula_evaluation_ref, 'A.36 attribution carries formula_evaluation_ref');
assert(!!baseAttr.replay_hash, 'A.37 attribution carries replay_hash');
assert(baseAttr.policy_version === L11_ATTRIBUTION_POLICY_VERSION, 'A.38 attribution policy_version is L11.4');
assert(baseAttr.score_family === L11ScoreFamily.OPPORTUNITY, 'A.39 attribution.score_family matches');
assert(baseAttr.component_contributions.length === opportunityFormula.component_definitions.length,
  'A.40 every component appears in attribution');
assert(baseAttr.attribution_completeness_class === L11AttributionCompletenessClass.COMPLETE_ATTRIBUTION,
  'A.41 base attribution complete (no missing data)');

// Missing identity ⇒ rejection
const missingIdentity = { ...baseAttr, attribution_id: '' } as L11ScoreAttribution;
const missingIdentityResult = validateL11ScoreAttribution({
  attribution: missingIdentity,
  evaluation: buildEvaluation(opportunityFormula),
  formula: opportunityFormula,
});
assert(!missingIdentityResult.ok, 'A.42 missing attribution_id rejected');
assert(missingIdentityResult.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ID_MISSING),
  'A.43 L11A_ATTRIBUTION_ID_MISSING emitted');

// ═══════════════════════════════════════════════════════════════
// BAND B — Contribution coverage (§11.4.20 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Contribution Coverage ═══');

// Build evaluation with cap, penalty, modifier, missing-data effects.
// Pick a cap with a measurable numeric effect so contributions become
// material rather than TRACE.
const oppCap = opportunityFormula.cap_rules.find(
  c => c.cap_type === L11CapType.UPPER_VALUE,
) ?? opportunityFormula.cap_rules[0];
const oppPenalty = opportunityFormula.penalty_rules[0];
const oppModifier = opportunityFormula.modifier_rules[0];
const oppMissing = opportunityFormula.missing_data_rules[0];

const richEval = buildEvaluation(opportunityFormula, {
  raw_score: 90,
  applied_caps: oppCap ? [{
    cap_rule_id: oppCap.cap_rule_id,
    cap_type: oppCap.cap_type,
    cap_direction: oppCap.cap_direction,
    cap_value: Number.isFinite(oppCap.cap_value) ? oppCap.cap_value : 50,
    reason_code: oppCap.reason_code,
    attribution_ref: 'l11.cap.attr.001',
  }] : [],
  applied_penalties: oppPenalty ? [{
    penalty_rule_id: oppPenalty.penalty_rule_id,
    magnitude_applied: oppPenalty.magnitude,
    mode: oppPenalty.application_mode,
    reason_code: oppPenalty.reason_code,
    attribution_ref: 'l11.pen.attr.001',
  }] : [],
  applied_modifiers: oppModifier ? [{
    modifier_rule_id: oppModifier.modifier_rule_id,
    source_layer: oppModifier.source_layer,
    effect: oppModifier.effect,
    magnitude_applied: oppModifier.magnitude,
    trigger_code: oppModifier.trigger_code,
    attribution_ref: 'l11.mod.attr.001',
  }] : [],
  missing_data_effects: oppMissing ? [{
    missing_data_rule_id: oppMissing.missing_data_rule_id,
    input_condition: oppMissing.input_condition,
    behavior: oppMissing.behavior,
    disclosure_ref: `l11a.disclosure.${oppMissing.missing_data_rule_id}`,
  }] : [],
});

const richScore = buildScoreFor(opportunityFormula, 65, L11ScoreBand.HIGH);
const richResult = runL11ScoreAttributionEngine({ score: richScore, evaluation: richEval, formula: opportunityFormula });
assert(richResult.ok, 'B.01 engine builds attribution with caps/penalties/modifiers/missing');
const richAttr = richResult.attribution!;
assert(richAttr.cap_contributions.length === 1, 'B.02 1 cap contribution emitted');
assert(richAttr.penalty_contributions.length === 1, 'B.03 1 penalty contribution emitted');
assert(richAttr.modifier_contributions.length === 1, 'B.04 1 modifier contribution emitted');
assert(richAttr.missing_data_contributions.length === 1, 'B.05 1 missing-data contribution emitted');
assert(richAttr.attribution_completeness_class === L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE,
  'B.06 missing-data ⇒ COMPLETE_WITH_DISCLOSURE');

// Cap coverage validator detects unattributed caps
const tamperedNoCapAttr: L11ScoreAttribution = { ...richAttr, cap_contributions: [] };
const capCoverage = validateL11CapAttributionCoverage({
  cap_contributions: [], evaluation: richEval,
});
assert(!capCoverage.ok, 'B.07 cap coverage validator rejects empty cap_contributions');
assert(capCoverage.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_CAP_APPLIED_BUT_NOT_ATTRIBUTED),
  'B.08 L11A_CAP_APPLIED_BUT_NOT_ATTRIBUTED emitted');

const fullValTampered = validateL11ScoreAttribution({
  attribution: tamperedNoCapAttr, evaluation: richEval, formula: opportunityFormula,
});
assert(!fullValTampered.ok, 'B.09 full validator catches missing cap contribution');

// Penalty coverage
const penCoverage = validateL11PenaltyAttributionCoverage({
  penalty_contributions: [], evaluation: richEval,
});
assert(!penCoverage.ok, 'B.10 penalty coverage rejects empty penalty_contributions');
assert(penCoverage.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_PENALTY_APPLIED_BUT_NOT_ATTRIBUTED),
  'B.11 L11A_PENALTY_APPLIED_BUT_NOT_ATTRIBUTED emitted');

// Modifier coverage
const modCoverage = validateL11ModifierAttributionCoverage({
  modifier_contributions: [], evaluation: richEval,
});
assert(!modCoverage.ok, 'B.12 modifier coverage rejects empty modifier_contributions');
assert(modCoverage.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_MODIFIER_APPLIED_BUT_NOT_ATTRIBUTED),
  'B.13 L11A_MODIFIER_APPLIED_BUT_NOT_ATTRIBUTED emitted');

// Missing-data coverage
const missingCoverage = validateL11MissingDataCoverage({
  missing_data_contributions: [], evaluation: richEval,
});
assert(!missingCoverage.ok, 'B.14 missing-data coverage rejects empty contributions');
assert(missingCoverage.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_MISSING_DATA_EFFECT_NOT_ATTRIBUTED),
  'B.15 L11A_MISSING_DATA_EFFECT_NOT_ATTRIBUTED emitted');

// Component contribution validator
const okComp = richAttr.component_contributions[0];
assert(validateL11ComponentContribution(okComp).ok, 'B.16 valid component contribution passes');

const badComp: L11ComponentContribution = { ...okComp, component_normalized_value: 999 };
const badCompResult = validateL11ComponentContribution(badComp);
assert(!badCompResult.ok, 'B.17 out-of-bounds component normalized value rejected');
assert(badCompResult.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_OUT_OF_BOUNDS),
  'B.18 L11A_COMPONENT_CONTRIBUTION_OUT_OF_BOUNDS emitted');

// Material component lacks evidence
const materialNoEvidence: L11ComponentContribution = {
  ...okComp,
  materiality_class: L11AttributionMaterialityClass.CRITICAL,
  evidence_refs: [],
};
const matCheck = validateL11ComponentContribution(materialNoEvidence);
assert(matCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_MATERIAL_COMPONENT_LACKS_EVIDENCE),
  'B.19 material component without evidence rejected');

// Direction mismatch
const dirMismatch: L11ComponentContribution = {
  ...okComp,
  contribution_direction: L11ContributionDirection.INCREASES_RISK_SCORE,
};
const dirCheck = validateL11ComponentContribution(dirMismatch);
assert(dirCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_COMPONENT_DIRECTION_MISMATCH),
  'B.20 risk direction in non-risk family rejected');

// Cap contribution validator
assert(validateL11CapContribution(richAttr.cap_contributions[0]).ok, 'B.21 valid cap contribution passes');
const badCap: L11CapContribution = { ...richAttr.cap_contributions[0], cap_value: NaN };
assert(!validateL11CapContribution(badCap).ok, 'B.22 NaN cap_value rejected');

// Penalty contribution validator
assert(validateL11PenaltyContribution(richAttr.penalty_contributions[0]).ok,
  'B.23 valid penalty contribution passes');
const badPenDir: L11PenaltyContribution = {
  ...richAttr.penalty_contributions[0],
  contribution_direction: L11ContributionDirection.RAISES_SCORE,
};
const badPenResult = validateL11PenaltyContribution(badPenDir);
assert(!badPenResult.ok, 'B.24 penalty raising score in constructive family rejected');
assert(badPenResult.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_PENALTY_DIRECTION_INCONSISTENT),
  'B.25 L11A_PENALTY_DIRECTION_INCONSISTENT emitted');

// Modifier contribution validator
assert(validateL11ModifierContribution(richAttr.modifier_contributions[0]).ok,
  'B.26 valid modifier contribution passes');
const badModSource: L11ModifierContribution = {
  ...richAttr.modifier_contributions[0],
  modifier_source_layer: 'L11' as any,
};
const badModResult = validateL11ModifierContribution(badModSource);
assert(!badModResult.ok, 'B.27 illegal modifier source layer rejected');
assert(badModResult.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_MODIFIER_SOURCE_LAYER_MISSING),
  'B.28 L11A_MODIFIER_SOURCE_LAYER_MISSING emitted');

// Missing-data contribution validator
assert(validateL11MissingDataContribution(richAttr.missing_data_contributions[0]).ok,
  'B.29 valid missing-data contribution passes');
const badMissing: L11MissingDataContribution = {
  ...richAttr.missing_data_contributions[0],
  missing_input_class: '' as any,
};
assert(!validateL11MissingDataContribution(badMissing).ok,
  'B.30 missing-data without input class rejected');

// Required component coverage from L11.3 evaluation
const droppedComponentEval = buildEvaluation(opportunityFormula);
const droppedAttr: L11ScoreAttribution = {
  ...buildBaseAttribution(opportunityFormula),
  component_contributions: buildBaseAttribution(opportunityFormula).component_contributions.slice(1),
};
const droppedResult = validateL11ScoreAttribution({
  attribution: droppedAttr, evaluation: droppedComponentEval, formula: opportunityFormula,
});
assert(!droppedResult.ok, 'B.31 dropping a component contribution rejected');
assert(droppedResult.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_COMPONENT_CONTRIBUTION_MISSING),
  'B.32 L11A_COMPONENT_CONTRIBUTION_MISSING emitted');

// Risk-family direction handling
const riskAttr = buildBaseAttribution(riskFormula, 70);
const riskComp = riskAttr.component_contributions[0];
assert(
  riskComp.contribution_direction === L11ContributionDirection.INCREASES_RISK_SCORE ||
  riskComp.contribution_direction === L11ContributionDirection.REDUCES_RISK_SCORE ||
  riskComp.contribution_direction === L11ContributionDirection.CAPS_SCORE ||
  riskComp.contribution_direction === L11ContributionDirection.NARROWS_CONFIDENCE ||
  riskComp.contribution_direction === L11ContributionDirection.DISCLOSURE_ONLY,
  'B.33 risk-family components carry risk-direction semantics');

// Unlock-risk direction handling
const unlockAttr = buildBaseAttribution(unlockFormula, 70);
assert(unlockAttr.score_family === L11ScoreFamily.UNLOCK_RISK, 'B.34 unlock attribution familyOK');
const unlockDirOK = unlockAttr.component_contributions.every(c =>
  c.contribution_direction !== L11ContributionDirection.RAISES_SCORE &&
  c.contribution_direction !== L11ContributionDirection.LOWERS_SCORE);
assert(unlockDirOK, 'B.35 unlock components do not use constructive directions');

// ═══════════════════════════════════════════════════════════════
// BAND C — Top-driver and summary-code law (§11.4.20 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Top-Driver and Summary-Code Law ═══');

assert(ALL_L11_TOP_DRIVER_TIE_BREAK_RULES.length === 5, 'C.01 5 tie-break rules registered');
assert(L11_DEFAULT_TOP_DRIVER_POLICY.max_positive_drivers === 5, 'C.02 default max_positive_drivers=5');
assert(L11_DEFAULT_TOP_DRIVER_POLICY.max_negative_drivers === 5, 'C.03 default max_negative_drivers=5');
assert(Math.abs(L11_DEFAULT_TOP_DRIVER_POLICY.min_materiality_threshold - 0.05) < 1e-9,
  'C.04 default min_materiality_threshold=0.05');
const policyValid = isL11TopDriverPolicyStructurallyValid(L11_DEFAULT_TOP_DRIVER_POLICY);
assert(policyValid.ok, 'C.05 default policy structurally valid');

const badTieOrder: L11TopDriverSelectionPolicy = {
  ...L11_DEFAULT_TOP_DRIVER_POLICY,
  tie_break_order: [L11TopDriverTieBreakRule.MATERIALITY_CLASS],
};
assert(!isL11TopDriverPolicyStructurallyValid(badTieOrder).ok,
  'C.06 tie-break order without DRIVER_ID_LEXICOGRAPHIC last rejected');

const richDrivers = [
  ...richAttr.component_contributions.map(driverFromComponent),
  ...richAttr.cap_contributions.map(driverFromCap),
  ...richAttr.missing_data_contributions.map(driverFromMissingData),
];
const sel = selectL11TopDrivers(richDrivers, L11_DEFAULT_TOP_DRIVER_POLICY);
assert(sel.top_negative_drivers.length > 0, 'C.07 negative drivers selected from rich attribution');
const cap0 = `l11a.driver.cap.${richAttr.cap_contributions[0].cap_contribution_id}`;
const mdc0 = `l11a.driver.mdc.${richAttr.missing_data_contributions[0].missing_data_contribution_id}`;
assert(sel.top_negative_drivers.some(d => d.driver_id === cap0) ||
       richAttr.negative_driver_refs.includes(cap0),
  'C.08 cap candidate reachable via negative drivers');
assert(richAttr.negative_driver_refs.includes(mdc0),
  'C.09 missing-data candidate reachable via negative drivers');

// Top driver selection validator detects tampering
const tamperedAttr: L11ScoreAttribution = {
  ...richAttr,
  top_positive_driver_refs: ['l11a.driver.cc.tampered'],
};
const tampVal = validateL11TopDriverSelection({ attribution: tamperedAttr });
assert(!tampVal.ok, 'C.10 tampered top_positive_driver_refs rejected');
assert(tampVal.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC ||
  i.code === L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_REF_UNKNOWN),
  'C.11 nondeterministic / unknown driver code emitted');

// Top driver policy invalid is reported
const invalidPolicyVal = validateL11TopDriverSelection({
  attribution: richAttr,
  policy: badTieOrder,
});
assert(!invalidPolicyVal.ok, 'C.12 invalid policy reported by validator');
assert(invalidPolicyVal.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_POLICY_INVALID),
  'C.13 L11A_TOP_DRIVER_POLICY_INVALID emitted');

// Summary code law — code present in attribution must be supported
const summaryCheck = validateL11SummaryCode(richAttr);
assert(summaryCheck.ok, 'C.14 derived summary codes are supported');

const tamperedSummary: L11ScoreAttribution = {
  ...richAttr,
  explanatory_summary_codes: [...richAttr.explanatory_summary_codes,
    L11AttributionSummaryCode.SCORE_RAISED_BY_HYPOTHESIS_RELIANCE],
};
const tamperedSummaryCheck = validateL11SummaryCode(tamperedSummary);
assert(!tamperedSummaryCheck.ok, 'C.15 unsupported summary code rejected');
assert(tamperedSummaryCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_UNSUPPORTED),
  'C.16 L11A_SUMMARY_CODE_UNSUPPORTED emitted');

// Invalid enum value
const invalidSummaryEnum: L11ScoreAttribution = {
  ...richAttr,
  explanatory_summary_codes: ['NOT_A_REAL_CODE' as any],
};
const invalidSummaryCheck = validateL11SummaryCode(invalidSummaryEnum);
assert(invalidSummaryCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_SUMMARY_CODE_INVALID),
  'C.17 L11A_SUMMARY_CODE_INVALID emitted');

// Summary code derivation
const codes = deriveL11SummaryCodes({
  score_family: L11ScoreFamily.OPPORTUNITY,
  final_score: 85,
  score_band: L11ScoreBand.VERY_HIGH,
  component_contributions: richAttr.component_contributions,
  cap_contributions: richAttr.cap_contributions,
  modifier_contributions: richAttr.modifier_contributions,
  missing_data_contributions: richAttr.missing_data_contributions,
});
assert(Array.isArray(codes) && codes.length > 0,
  'C.18 deriveL11SummaryCodes returns at least one code for high score with caps/missing');

// Top driver selector ensures caps included
const onlyCapDrivers = richAttr.cap_contributions.map(driverFromCap);
const capSel = selectL11TopDrivers(onlyCapDrivers, L11_DEFAULT_TOP_DRIVER_POLICY);
assert(capSel.top_negative_drivers.length === 1, 'C.19 single cap selected as negative driver');

// max_negative_drivers respected
const limitedPolicy: L11TopDriverSelectionPolicy = {
  ...L11_DEFAULT_TOP_DRIVER_POLICY,
  max_negative_drivers: 1,
};
const limitedSel = selectL11TopDrivers(richDrivers, limitedPolicy);
assert(limitedSel.top_negative_drivers.length === 1, 'C.20 max_negative_drivers=1 honored');

// Materiality threshold filter
const traceDrivers = richAttr.component_contributions.map(c => ({
  ...driverFromComponent(c),
  normalized_impact: 0.001,
  materiality_class: L11AttributionMaterialityClass.TRACE,
}));
const traceSel = selectL11TopDrivers(traceDrivers, L11_DEFAULT_TOP_DRIVER_POLICY);
assert(traceSel.top_positive_drivers.length === 0,
  'C.21 trace-only drivers filtered by min_materiality_threshold');

// ═══════════════════════════════════════════════════════════════
// BAND D — Attribution engine and replay (§11.4.20 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Attribution Engine and Replay ═══');

const goodEvalScore = buildScoreFor(opportunityFormula, 75, L11ScoreBand.HIGH);
const goodEval = buildEvaluation(opportunityFormula);
const goodResult = runL11ScoreAttributionEngine({
  score: goodEvalScore, evaluation: goodEval, formula: opportunityFormula,
});
assert(goodResult.ok && goodResult.attribution !== null,
  'D.01 green formula evaluation generates valid attribution');

// Score/family mismatch
const wrongFamilyEval = { ...goodEval, score_family: L11ScoreFamily.RISK } as L11FormulaEvaluationResult;
const wrongFamilyResult = runL11ScoreAttributionEngine({
  score: goodEvalScore, evaluation: wrongFamilyEval, formula: opportunityFormula,
});
assert(!wrongFamilyResult.ok, 'D.02 score/evaluation family mismatch rejected');
assert(wrongFamilyResult.errors.some(e => e.code === 'FAMILY_MISMATCH'),
  'D.03 FAMILY_MISMATCH error emitted');

// Formula version mismatch
const wrongFormulaEval = { ...goodEval, formula_id: 'fake.formula.id' } as L11FormulaEvaluationResult;
const wrongFormulaResult = runL11ScoreAttributionEngine({
  score: goodEvalScore, evaluation: wrongFormulaEval, formula: opportunityFormula,
});
assert(!wrongFormulaResult.ok, 'D.04 formula id mismatch rejected');

// Replay determinism: identical inputs → identical hash
const r1 = runL11ScoreAttributionEngine({
  score: goodEvalScore, evaluation: goodEval, formula: opportunityFormula,
});
const r2 = runL11ScoreAttributionEngine({
  score: goodEvalScore, evaluation: goodEval, formula: opportunityFormula,
});
assert(r1.attribution!.replay_hash === r2.attribution!.replay_hash,
  'D.05 identical inputs produce identical replay_hash');

// Material change flips hash
const tamperedFinal = { ...r1.attribution!, final_score: 99 };
const tamperedHash = canonicalScoreAttributionReplayHash(extractL11AttributionReplayMaterial(tamperedFinal));
assert(tamperedHash !== r1.attribution!.replay_hash,
  'D.06 changing final_score flips replay_hash');

// Order-only change in unordered driver refs does NOT change hash
const reordered = {
  ...r1.attribution!,
  positive_driver_refs: [...r1.attribution!.positive_driver_refs].reverse(),
};
const reorderedHash = canonicalScoreAttributionReplayHash(extractL11AttributionReplayMaterial(reordered));
assert(reorderedHash === r1.attribution!.replay_hash,
  'D.07 reordering positive_driver_refs does not change hash (set semantics)');

// Order in top driver refs IS preserved (ranked semantics)
const reorderedTop = {
  ...r1.attribution!,
  top_positive_driver_refs: [...r1.attribution!.top_positive_driver_refs].reverse(),
};
const reorderedTopHash = canonicalScoreAttributionReplayHash(extractL11AttributionReplayMaterial(reorderedTop));
if (r1.attribution!.top_positive_driver_refs.length > 1) {
  assert(reorderedTopHash !== r1.attribution!.replay_hash,
    'D.08 reordering top_positive_driver_refs flips hash (ranked semantics)');
} else {
  assert(true, 'D.08 reordering top_positive_driver_refs (only one driver, vacuously true)');
}

// Tampered replay hash is detected by full validator
const tamperedHashAttr: L11ScoreAttribution = {
  ...r1.attribution!,
  replay_hash: 'l11a.h.tampered',
};
const tamperedHashCheck = validateL11ScoreAttribution({
  attribution: tamperedHashAttr, evaluation: goodEval, formula: opportunityFormula,
});
assert(!tamperedHashCheck.ok, 'D.09 tampered replay_hash rejected by validator');
assert(tamperedHashCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISMATCH),
  'D.10 L11A_REPLAY_HASH_MISMATCH emitted');

// Engine completeness — missing-data ⇒ COMPLETE_WITH_DISCLOSURE
const eng2 = runL11ScoreAttributionEngine({
  score: richScore, evaluation: richEval, formula: opportunityFormula,
});
assert(eng2.attribution!.attribution_completeness_class === L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE,
  'D.11 engine sets COMPLETE_WITH_DISCLOSURE when missing-data present');

// classifyL11AttributionCompleteness directly
const cls = classifyL11AttributionCompleteness({
  formula: opportunityFormula,
  evaluation: richEval,
  component_contributions: eng2.attribution!.component_contributions,
  cap_contributions: eng2.attribution!.cap_contributions,
  penalty_contributions: eng2.attribution!.penalty_contributions,
  modifier_contributions: eng2.attribution!.modifier_contributions,
  missing_data_contributions: eng2.attribution!.missing_data_contributions,
});
assert(cls === L11AttributionCompletenessClass.COMPLETE_WITH_DISCLOSURE,
  'D.12 classifyL11AttributionCompleteness returns COMPLETE_WITH_DISCLOSURE');

// Dropping a cap contribution → BLOCKED_INSUFFICIENT_TRACE
const dropped = classifyL11AttributionCompleteness({
  formula: opportunityFormula,
  evaluation: richEval,
  component_contributions: eng2.attribution!.component_contributions,
  cap_contributions: [],
  penalty_contributions: eng2.attribution!.penalty_contributions,
  modifier_contributions: eng2.attribution!.modifier_contributions,
  missing_data_contributions: eng2.attribution!.missing_data_contributions,
});
assert(dropped === L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE,
  'D.13 dropping caps yields BLOCKED_INSUFFICIENT_TRACE');

// Required component coverage missing → PARTIAL_ATTRIBUTION
const partial = classifyL11AttributionCompleteness({
  formula: opportunityFormula,
  evaluation: richEval,
  component_contributions: eng2.attribution!.component_contributions.slice(1),
  cap_contributions: eng2.attribution!.cap_contributions,
  penalty_contributions: eng2.attribution!.penalty_contributions,
  modifier_contributions: eng2.attribution!.modifier_contributions,
  missing_data_contributions: eng2.attribution!.missing_data_contributions,
});
assert(partial === L11AttributionCompletenessClass.PARTIAL_ATTRIBUTION,
  'D.14 dropping required component yields PARTIAL_ATTRIBUTION');

// Builders return individually
const compsOnly = buildL11ComponentContributions({
  score_id: 'l11.score.bld.001',
  evaluation: goodEval,
  component_definitions: opportunityFormula.component_definitions,
});
assert(compsOnly.length === opportunityFormula.component_definitions.length,
  'D.15 buildL11ComponentContributions covers every component');

const capsOnly = buildL11CapContributions({
  score_id: 'l11.score.bld.001',
  evaluation: richEval,
  formula: opportunityFormula,
});
assert(capsOnly.length === richEval.applied_caps.length,
  'D.16 buildL11CapContributions covers every applied cap');

const pensOnly = buildL11PenaltyContributions({
  score_id: 'l11.score.bld.001',
  evaluation: richEval,
  formula: opportunityFormula,
});
assert(pensOnly.length === richEval.applied_penalties.length,
  'D.17 buildL11PenaltyContributions covers every applied penalty');

const modsOnly = buildL11ModifierContributions({
  score_id: 'l11.score.bld.001',
  evaluation: richEval,
  formula: opportunityFormula,
});
assert(modsOnly.length === richEval.applied_modifiers.length,
  'D.18 buildL11ModifierContributions covers every applied modifier');

const mdcsOnly = buildL11MissingDataContributions({
  score_id: 'l11.score.bld.001',
  evaluation: richEval,
  formula: opportunityFormula,
});
assert(mdcsOnly.length === richEval.missing_data_effects.length,
  'D.19 buildL11MissingDataContributions covers every missing-data effect');

// Score id mismatch in score arg
const wrongScoreId = { ...goodEvalScore, score_id: 'mismatched.score' };
const wrongScoreCheck = validateL11ScoreAttribution({
  attribution: r1.attribution!, evaluation: goodEval, formula: opportunityFormula, score: wrongScoreId,
});
assert(!wrongScoreCheck.ok, 'D.20 attribution.score_id != score.score_id rejected');

// Ungoverned input ref is rejected by the validator
const ungovernedAttr: L11ScoreAttribution = {
  ...r1.attribution!,
  evidence_refs: ['random.evidence', 'l11.evidence.opportunity'],
};
const ungovernedCheck = validateL11ScoreAttribution({
  attribution: ungovernedAttr, evaluation: goodEval, formula: opportunityFormula,
});
assert(!ungovernedCheck.ok, 'D.21 ungoverned evidence ref rejected');
assert(ungovernedCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_UNGOVERNED_INPUT_REF),
  'D.22 L11A_UNGOVERNED_INPUT_REF emitted');

// Empty lineage refs rejected
const emptyLineage: L11ScoreAttribution = { ...r1.attribution!, lineage_refs: [] };
const emptyLinCheck = validateL11ScoreAttribution({
  attribution: emptyLineage, evaluation: goodEval, formula: opportunityFormula,
});
assert(emptyLinCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_LINEAGE_REFS_MISSING),
  'D.23 L11A_LINEAGE_REFS_MISSING emitted when lineage empty');

// Completeness validator catches blocked emission
const blockedAttr: L11ScoreAttribution = {
  ...r1.attribution!,
  attribution_completeness_class: L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE,
};
const blockedCheck = validateL11AttributionCompleteness(blockedAttr);
assert(!blockedCheck.ok, 'D.24 BLOCKED completeness class rejected by completeness validator');
assert(blockedCheck.issues.some(i =>
  i.code === L11ScoreAttributionViolationCode.L11A_COMPLETENESS_BLOCKED_EMITTED),
  'D.25 L11A_COMPLETENESS_BLOCKED_EMITTED emitted');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants INV-11.4-A..H (§11.4.20 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');

assert(ALL_L11_SCORE_ATTRIBUTION_VIOLATION_CODES.length >= 30,
  'E.01 at least 30 attribution violation codes registered');
assert(severityForL11AttributionCode(L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISMATCH) === 'CRITICAL',
  'E.02 L11A_REPLAY_HASH_MISMATCH is CRITICAL');
assert(severityForL11AttributionCode(L11ScoreAttributionViolationCode.L11A_MATERIAL_CAP_HIDDEN) === 'CRITICAL',
  'E.03 L11A_MATERIAL_CAP_HIDDEN is CRITICAL');
assert(severityForL11AttributionCode(L11ScoreAttributionViolationCode.L11A_MATERIAL_MISSING_DATA_HIDDEN) === 'CRITICAL',
  'E.04 L11A_MATERIAL_MISSING_DATA_HIDDEN is CRITICAL');
assert(severityForL11AttributionCode(L11ScoreAttributionViolationCode.L11A_ATTRIBUTION_ACTS_AS_RECOMMENDATION) === 'CRITICAL',
  'E.05 L11A_ATTRIBUTION_ACTS_AS_RECOMMENDATION is CRITICAL');
assert(severityForL11AttributionCode(L11ScoreAttributionViolationCode.L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC) === 'ERROR',
  'E.06 L11A_TOP_DRIVER_SELECTION_NONDETERMINISTIC is ERROR');

// Audit subjects
assert(ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES.length === 11,
  'E.07 11 audit subject classes registered');
assert(ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES.includes(L11AttributionAuditSubjectClass.ATTRIBUTION_OBJECT),
  'E.08 ATTRIBUTION_OBJECT subject class registered');
assert(ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES.includes(L11AttributionAuditSubjectClass.REPLAY_IDENTITY),
  'E.09 REPLAY_IDENTITY subject class registered');

// Audit emission
const sampleIssue = {
  code: L11ScoreAttributionViolationCode.L11A_REPLAY_HASH_MISSING,
  severity: 'CRITICAL' as const,
  message: 'replay_hash missing on attribution=test',
  attribution_id: 'l11a.attr.test',
};
const sampleRec = makeL11AttributionAuditRecord(
  L11AttributionAuditSubjectClass.REPLAY_IDENTITY,
  'l11a.attr.test',
  sampleIssue,
  '2026-05-05T00:00:00Z',
);
assert(!!sampleRec.audit_id && sampleRec.audit_id.startsWith('l11a.audit.'),
  'E.10 audit record has deterministic l11a.audit. id');

const dupRec = makeL11AttributionAuditRecord(
  L11AttributionAuditSubjectClass.REPLAY_IDENTITY,
  'l11a.attr.test', sampleIssue, '2026-05-05T00:00:00Z',
);
assert(dupRec.audit_id === sampleRec.audit_id, 'E.11 same input → same audit_id');

const batchRecs = emitL11AttributionAuditBatch(
  L11AttributionAuditSubjectClass.ATTRIBUTION_OBJECT,
  'default.ref',
  [sampleIssue],
  '2026-05-05T00:00:00Z',
);
assert(batchRecs.length === 1 && batchRecs[0].subject_ref === 'l11a.attr.test',
  'E.12 batch emitter prefers attribution_id over default ref');

const recs = emitL11AttributionAuditRecords(
  L11AttributionAuditSubjectClass.REPLAY_IDENTITY,
  'l11a.attr.test',
  [sampleIssue, sampleIssue],
  '2026-05-05T00:00:00Z',
);
assert(recs.length === 2, 'E.13 emitL11AttributionAuditRecords emits 1 record per issue');

// ── Invariants

// INV-11.4-A
const invA = checkInvariantL11_4_A_AttributionRequired({
  score: goodEvalScore, attribution: r1.attribution,
});
assert(invA.ok, 'E.14 INV-11.4-A passes when attribution exists');
const invAFail = checkInvariantL11_4_A_AttributionRequired({
  score: goodEvalScore, attribution: null,
});
assert(!invAFail.ok, 'E.15 INV-11.4-A fails when attribution missing');

// INV-11.4-B
const invB = checkInvariantL11_4_B_ContributionCoverage({
  attribution: r1.attribution!, evaluation: goodEval,
});
assert(invB.ok, 'E.16 INV-11.4-B passes when coverage complete');
const invBFail = checkInvariantL11_4_B_ContributionCoverage({
  attribution: tamperedNoCapAttr, evaluation: richEval,
});
assert(!invBFail.ok, 'E.17 INV-11.4-B fails when caps not attributed');

// INV-11.4-C
const invC = checkInvariantL11_4_C_MaterialDriverVisibility({
  attribution: richAttr,
});
assert(invC.ok, 'E.18 INV-11.4-C passes for engine-built attribution');
const invCFail = checkInvariantL11_4_C_MaterialDriverVisibility({
  attribution: { ...richAttr, top_negative_driver_refs: [] },
});
assert(!invCFail.ok, 'E.19 INV-11.4-C fails when material drivers absent from top list');

// INV-11.4-D
const invD = checkInvariantL11_4_D_CapMissingDataDisclosure({ attribution: richAttr });
assert(invD.ok, 'E.20 INV-11.4-D passes when caps and missing-data disclosed');

const hiddenCapAttr: L11ScoreAttribution = {
  ...richAttr,
  cap_contributions: richAttr.cap_contributions.map(c => ({
    ...c,
    materiality_class: L11AttributionMaterialityClass.CRITICAL,
  })),
  negative_driver_refs: [],
};
const invDFail = checkInvariantL11_4_D_CapMissingDataDisclosure({ attribution: hiddenCapAttr });
assert(!invDFail.ok, 'E.21 INV-11.4-D fails when material cap hidden');

// INV-11.4-E
const invE = checkInvariantL11_4_E_GovernedInputs({ attribution: richAttr });
assert(invE.ok, 'E.22 INV-11.4-E passes for governed refs');
const invEFail = checkInvariantL11_4_E_GovernedInputs({
  attribution: { ...richAttr, evidence_refs: ['random.evidence'] },
});
assert(!invEFail.ok, 'E.23 INV-11.4-E fails when evidence ref ungoverned');

// INV-11.4-F
const invF = checkInvariantL11_4_F_SummaryCodeSupport({ attribution: richAttr });
assert(invF.ok, 'E.24 INV-11.4-F passes when codes supported');
const invFFail = checkInvariantL11_4_F_SummaryCodeSupport({
  attribution: { ...richAttr, explanatory_summary_codes: ['BOGUS' as any] },
});
assert(!invFFail.ok, 'E.25 INV-11.4-F fails for unknown code');

// INV-11.4-G
const invG = checkInvariantL11_4_G_ReplayDeterminism({ attribution: richAttr });
assert(invG.ok, 'E.26 INV-11.4-G passes when replay_hash matches');
const tamperedG: L11ScoreAttribution = { ...richAttr, replay_hash: 'l11a.h.tampered' };
const invGFail = checkInvariantL11_4_G_ReplayDeterminism({ attribution: tamperedG });
assert(!invGFail.ok, 'E.27 INV-11.4-G fails when replay_hash tampered');

// INV-11.4-H
const invH = checkInvariantL11_4_H_NonJudgment({ attribution: richAttr, formula: opportunityFormula });
assert(invH.ok, 'E.28 INV-11.4-H passes for governed attribution');
const judgmentLeakAttr: L11ScoreAttribution = {
  ...richAttr,
  component_contributions: richAttr.component_contributions.map((c, i) =>
    i === 0 ? { ...c, component_name: 'Buy Signal Component' } : c),
};
const invHFail = checkInvariantL11_4_H_NonJudgment({
  attribution: judgmentLeakAttr, formula: opportunityFormula,
});
assert(!invHFail.ok, 'E.29 INV-11.4-H fails when text contains BUY recommendation');

// Coverage invariant fails when forbidden phrases appear in summary or reason fields
const judgmentLeak2: L11ScoreAttribution = {
  ...richAttr,
  cap_contributions: richAttr.cap_contributions.map(c => ({
    ...c, cap_reason_code: 'guaranteed cap reason',
  })),
};
const invHFail2 = checkInvariantL11_4_H_NonJudgment({
  attribution: judgmentLeak2, formula: opportunityFormula,
});
assert(!invHFail2.ok, 'E.30 INV-11.4-H fails when reason text contains GUARANTEED');

// Blocked completeness rejected by H
const blockedH: L11ScoreAttribution = {
  ...richAttr,
  attribution_completeness_class: L11AttributionCompletenessClass.BLOCKED_INSUFFICIENT_TRACE,
};
const invHBlocked = checkInvariantL11_4_H_NonJudgment({
  attribution: blockedH, formula: opportunityFormula,
});
assert(!invHBlocked.ok, 'E.31 INV-11.4-H fails when completeness class is blocked');

// Recommendation leak via summary code text from explanatory phrasing
const judgmentBySummary: L11ScoreAttribution = {
  ...richAttr,
  missing_data_contributions: richAttr.missing_data_contributions.map(c => ({
    ...c, missing_input_ref: 'l11.missing.this is a buy signal',
  })),
};
const invHSummary = checkInvariantL11_4_H_NonJudgment({
  attribution: judgmentBySummary, formula: opportunityFormula,
});
assert(!invHSummary.ok, 'E.32 INV-11.4-H fails when missing_input_ref text contains "buy"');

// All-invariants smoke check on a clean attribution
const allInvOk =
  checkInvariantL11_4_A_AttributionRequired({ score: richScore, attribution: richAttr }).ok &&
  checkInvariantL11_4_B_ContributionCoverage({ attribution: richAttr, evaluation: richEval }).ok &&
  checkInvariantL11_4_C_MaterialDriverVisibility({ attribution: richAttr }).ok &&
  checkInvariantL11_4_D_CapMissingDataDisclosure({ attribution: richAttr }).ok &&
  checkInvariantL11_4_E_GovernedInputs({ attribution: richAttr }).ok &&
  checkInvariantL11_4_F_SummaryCodeSupport({ attribution: richAttr }).ok &&
  checkInvariantL11_4_G_ReplayDeterminism({ attribution: richAttr }).ok &&
  checkInvariantL11_4_H_NonJudgment({ attribution: richAttr, formula: opportunityFormula }).ok;
assert(allInvOk, 'E.33 all 8 L11.4 invariants pass on engine-built attribution');

// Sanity: make sure all imported symbols are actually used (lint)
void ALL_L11_SCORE_ATTRIBUTION_VIOLATION_CODES;
void ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES;
void L11_DEFAULT_MATERIALITY_THRESHOLDS;
void compareL11Materiality;
void L11InputConditionClass;
void L11MissingDataBehaviorClass;
void L11ScoreFamilyDirectionClass;
void L11_REQUIRED_DIRECTION_BY_FAMILY;

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────
console.log(`\n══════════════════════════════════════════`);
console.log(`L11.4 Attribution Test Suite`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\n✓ ALL L11.4 ATTRIBUTION ASSERTIONS PASSED`);
