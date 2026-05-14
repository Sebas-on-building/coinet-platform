/**
 * L11.6 — Score Calibration Hooks and Empirical Accountability
 * Certification Test Suite (§11.6.20)
 *
 * 5 Bands:
 *   A — Calibration target coverage (§11.6.20 Band A)
 *   B — Metric, horizon, and direction law (§11.6.20 Band B)
 *   C — Cohort and exclusion law (§11.6.20 Band C)
 *   D — Hook generation and readiness (§11.6.20 Band D)
 *   E — Audit and invariants INV-11.6-A..H (§11.6.20 Band E)
 */

import {
  // Score & formula context (L11.2/L11.3/L11.5)
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
  isL11ReservedScoreFamily,
  L11ScoreBand,
  ALL_L11_SCORE_BANDS,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11ScoreOutput,
  L11ScoreVisibilityClass,

  // L11.6 contracts
  L11CalibrationHorizon,
  ALL_L11_CALIBRATION_HORIZONS,
  L11_HORIZON_DURATION_MS,
  getL11HorizonDurationMs,
  isL11HorizonAllowedForFamily,
  computeL11EvaluationWindow,
  isL11EvaluationWindowLegal,
  L11OutcomeMetric,
  ALL_L11_OUTCOME_METRICS,
  L11OutcomeBetterDirection,
  L11_OUTCOME_METRIC_DEFINITIONS,
  getL11OutcomeMetricDefinition,
  isL11OutcomeMetricLegalForFamily,
  isL11OutcomeMetricLegalForHorizon,
  L11ExpectedOutcomeDirection,
  ALL_L11_EXPECTED_OUTCOME_DIRECTIONS,
  isL11ExpectedDirectionCompatible,
  isL11CalibrationDescriptionCausalityFree,
  L11CalibrationCohortDefinition,
  L11CohortDimension,
  ALL_L11_COHORT_DIMENSIONS,
  isL11CalibrationCohortStructurallyValid,
  deriveL11CohortKey,
  doesL11CohortAcceptContext,
  L11CalibrationExclusionRule,
  L11CalibrationExclusionClass,
  ALL_L11_CALIBRATION_EXCLUSION_CLASSES,
  L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES,
  getMissingRequiredExclusionClasses,
  L11CalibrationReadinessClass,
  ALL_L11_CALIBRATION_READINESS_CLASSES,
  isL11CalibrationReadinessReady,
  isL11CalibrationReadinessBlocked,
  L11ScoreCalibrationTarget,
  L11_CALIBRATION_TARGET_POLICY_VERSION,
  isL11CalibrationTargetStructurallyValid,
  extractL11CalibrationTargetReplayMaterial,
  canonicalCalibrationTargetReplayHash,
  L11ScoreCalibrationHook,
  L11_CALIBRATION_HOOK_POLICY_VERSION,
  isL11CalibrationHookStructurallyValid,
  extractL11CalibrationHookReplayMaterial,
  canonicalCalibrationHookReplayHash,
  L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES,
  getL11ScoreFamilyCalibrationPolicy,
} from '../l11/contracts';

import {
  L11_PRODUCTION_CALIBRATION_TARGETS,
  L11_PRODUCTION_CALIBRATION_COHORTS,
  L11_PRODUCTION_EXCLUSION_RULES,
  getL11CalibrationTarget,
  getL11CalibrationTargetsForFamily,
  getL11CalibrationCohortsForFamily,
  buildL11CalibrationTargetRegistryReport,
  buildL11CohortRegistryReport,
  buildL11ExclusionRegistryReport,
  buildL11OutcomeMetricRegistryReport,
  buildL11CalibrationHookRegistryReport,
  getL11RequiredProductionExclusionRules,
} from '../l11/registry';

import {
  runL11CalibrationHookEngine,
  runL11CalibrationHookEngineBatch,
  L11CalibrationEngineContext,
} from '../l11/calibration';

import {
  L11CalibrationViolationCode,
  ALL_L11_CALIBRATION_VIOLATION_CODES,
  severityForL11CalibrationCode,
  validateL11CalibrationTarget,
  validateL11CalibrationHook,
  validateL11ExpectedDirection,
  validateL11CalibrationDescription,
  validateL11OutcomeMetricForFamily,
  validateL11CalibrationCohort,
  validateL11CalibrationExclusionRule,
  validateL11CalibrationExclusionRuleSet,
  validateL11CalibrationReadiness,
  validateL11ScoreFamilyTargetCoverage,
  validateL11ScoreHookCoverage,
} from '../l11/validation';

import {
  L11CalibrationAuditSubjectClass,
  ALL_L11_CALIBRATION_AUDIT_SUBJECT_CLASSES,
  makeL11CalibrationAuditRecord,
  emitL11CalibrationAuditRecords,
  emitL11CalibrationAuditBatch,
} from '../l11/constitution/l11-calibration-audit';

import {
  checkInv11_6_A_TargetLaw,
  checkInv11_6_B_HookLaw,
  checkInv11_6_C_DirectionLaw,
  checkInv11_6_D_CohortLaw,
  checkInv11_6_E_ExclusionLaw,
  checkInv11_6_F_NonCausalityLaw,
  checkInv11_6_G_ReplayLaw,
  checkInv11_6_H_NonJudgmentLaw,
  runL11_6InvariantSuite,
} from '../l11/invariants/l11_6-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.error(`  ✗ FAIL: ${label}`); }
}

// ─────────────────────────────────────────────────────────────────────
// Synthetic builders
// ─────────────────────────────────────────────────────────────────────

const AS_OF = '2026-05-05T00:00:00.000Z';

function buildScore(
  family: L11ScoreFamily,
  finalScore: number,
  band: L11ScoreBand,
  scoreId?: string,
): L11ScoreOutput {
  const id = scoreId ?? `l11.score.${family.toLowerCase()}.001`;
  return {
    score_id: id,
    score_family: family,
    score_name: `${family} v1`,
    score_version: 'v1',
    scope_type: 'ASSET',
    scope_id: 'asset:btc',
    as_of: AS_OF,
    raw_score: finalScore,
    modified_score: finalScore,
    final_score: finalScore,
    score_band: band,
    score_meaning_claim_ref: `l11.meaning.${family.toLowerCase()}.v1`,
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family] ??
      L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
    component_score_refs: [],
    positive_attribution_refs: [],
    negative_attribution_refs: [],
    missing_data_profile_ref: `l11.missing.${family.toLowerCase()}`,
    missing_data_penalty_refs: [],
    regime_modifier_refs: [],
    sequence_modifier_refs: [],
    hypothesis_modifier_refs: [],
    confidence_modifier_ref: null,
    restriction_profile_ref: `l11.restriction.${family.toLowerCase()}`,
    calibration_target_ref: `l11.target.${family.toLowerCase()}`,
    evidence_pack_ref: `l11.evidence.${family.toLowerCase()}`,
    input_snapshot_ref: `l11.snapshot.${family.toLowerCase()}`,
    compute_run_id: 'run.l11.001',
    replay_hash: 'l11.h.score.001',
    policy_version: 'l11.2.score.v1',
  };
}

function defaultEngineCtx(): L11CalibrationEngineContext {
  return {
    formula_id: 'l11.formula.v1',
    formula_version: 'v1',
    cohort_context: {
      regime: 'SPOT_LED_EXPANSION',
      sequence_state: 'CONFIRMED_TREND',
      hypothesis_family: 'ACCUMULATION',
      visibility_class: L11ScoreVisibilityClass.FULL_VISIBILITY,
      liquidity_bucket: 'HIGH',
      market_cap_bucket: 'LARGE',
      asset_class: 'crypto.spot',
    },
    context_refs: {
      regime_context_ref: 'l8.regime.001',
      sequence_context_ref: 'l9.sequence.001',
      hypothesis_context_ref: 'l10.hypothesis.001',
      visibility_context_ref: 'l11.5.visibility.001',
      attribution_ref: 'l11.4.attribution.001',
      missing_data_profile_ref: 'l11.5.missing.001',
    },
    outcome_window_already_observed: false,
  };
}

const opportunityScore = buildScore(L11ScoreFamily.OPPORTUNITY, 78, L11ScoreBand.HIGH);
const riskScore = buildScore(L11ScoreFamily.RISK, 65, L11ScoreBand.HIGH,
  'l11.score.risk.001');

// ═══════════════════════════════════════════════════════════════
// BAND A — Calibration target coverage (§11.6.20 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Calibration Target Coverage ═══');

assert(ALL_L11_CALIBRATION_HORIZONS.length === 8, 'A.01 8 calibration horizons registered');
assert(getL11HorizonDurationMs(L11CalibrationHorizon.H_1H) === 3_600_000,
  'A.02 H_1H = 1 hour ms');
assert(getL11HorizonDurationMs(L11CalibrationHorizon.D_30) === 30 * 86_400_000,
  'A.03 D_30 = 30 days ms');
assert(L11_HORIZON_DURATION_MS[L11CalibrationHorizon.D_90] === 90 * 86_400_000,
  'A.04 D_90 duration table');

const opportunityWindow = computeL11EvaluationWindow(AS_OF, L11CalibrationHorizon.D_7);
assert(opportunityWindow.window_offset_ms === 7 * 86_400_000,
  'A.05 evaluation window offset = horizon by default');
assert(opportunityWindow.window_length_ms === 0,
  'A.06 evaluation window length 0 by default');
assert(isL11EvaluationWindowLegal(opportunityWindow, L11CalibrationHorizon.D_7).ok,
  'A.07 evaluation window legal');
assert(!isL11EvaluationWindowLegal(
  { window_offset_ms: 3 * 86_400_000, window_length_ms: 0,
    window_start: AS_OF, window_end: AS_OF }, L11CalibrationHorizon.D_7).ok,
  'A.08 short evaluation window rejected');

assert(ALL_L11_OUTCOME_METRICS.length >= 19, 'A.09 ≥19 outcome metrics registered');
assert(L11_OUTCOME_METRIC_DEFINITIONS.length === ALL_L11_OUTCOME_METRICS.length,
  'A.10 every metric has a definition');

const tgtReport = buildL11CalibrationTargetRegistryReport();
assert(tgtReport.ok, 'A.11 target registry report ok');
assert(tgtReport.missing_families.length === 0,
  'A.12 every production family has a target');
for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
  const list = getL11CalibrationTargetsForFamily(f);
  assert(list.length >= 1, `A.13 family ${f} has ≥1 target`);
}

assert(L11_PRODUCTION_CALIBRATION_TARGETS.every(
  t => !isL11ReservedScoreFamily(t.score_family)),
  'A.14 no reserved-family production targets');

for (const t of L11_PRODUCTION_CALIBRATION_TARGETS) {
  const sv = isL11CalibrationTargetStructurallyValid(t);
  assert(sv.ok, `A.15 target ${t.calibration_target_id} structurally valid`);
}

const oppFwd = getL11CalibrationTarget('tgt.opportunity.fwd_return.7d');
assert(oppFwd !== null, 'A.16 opportunity fwd_return target resolves by id');
assert(oppFwd!.replay_hash.startsWith('l11c.h.'),
  'A.17 target replay hash uses l11c namespace');

const recomputedHash = canonicalCalibrationTargetReplayHash(
  extractL11CalibrationTargetReplayMaterial(oppFwd!));
assert(recomputedHash === oppFwd!.replay_hash,
  'A.18 target replay hash deterministic across recomputes');

// Target replay flips when material changes
const mutated = { ...oppFwd!, target_version: 'v2' };
const mutatedHash = canonicalCalibrationTargetReplayHash(
  extractL11CalibrationTargetReplayMaterial(mutated));
assert(mutatedHash !== oppFwd!.replay_hash,
  'A.19 target replay hash flips when target_version changes');

// Reserved family rejected by validator
const reservedTarget: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.reserved.bad',
  score_family: L11ScoreFamily.NARRATIVE_QUALITY,
};
const reservedIssues = validateL11CalibrationTarget(reservedTarget);
assert(reservedIssues.some(
  i => i.code === L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET),
  'A.20 reserved family with target rejected');

assert(L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES.length === 8,
  'A.21 8 production family calibration policies');
assert(getL11ScoreFamilyCalibrationPolicy(L11ScoreFamily.OPPORTUNITY) !== null,
  'A.22 opportunity has a family policy');
assert(getL11ScoreFamilyCalibrationPolicy(L11ScoreFamily.NARRATIVE_QUALITY) === null,
  'A.23 reserved family has no family policy');

assert(L11_CALIBRATION_TARGET_POLICY_VERSION === 'l11.6.target.v1',
  'A.24 target policy version frozen as l11.6.target.v1');

// ═══════════════════════════════════════════════════════════════
// BAND B — Metric, horizon, and direction law (§11.6.20 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Metric, Horizon, and Direction Law ═══');

assert(isL11OutcomeMetricLegalForFamily(
  L11OutcomeMetric.FORWARD_RETURN, L11ScoreFamily.OPPORTUNITY),
  'B.01 FORWARD_RETURN legal for OPPORTUNITY');
assert(!isL11OutcomeMetricLegalForFamily(
  L11OutcomeMetric.FORWARD_RETURN, L11ScoreFamily.RISK),
  'B.02 FORWARD_RETURN illegal for RISK family');
assert(isL11OutcomeMetricLegalForFamily(
  L11OutcomeMetric.MAX_DRAWDOWN, L11ScoreFamily.RISK),
  'B.03 MAX_DRAWDOWN legal for RISK');
assert(!isL11OutcomeMetricLegalForFamily(
  L11OutcomeMetric.POST_UNLOCK_DRAWDOWN, L11ScoreFamily.OPPORTUNITY),
  'B.04 POST_UNLOCK_DRAWDOWN illegal for OPPORTUNITY');

assert(isL11HorizonAllowedForFamily(
  L11ScoreFamily.OPPORTUNITY, L11CalibrationHorizon.D_7),
  'B.05 D_7 horizon legal for OPPORTUNITY');
assert(!isL11HorizonAllowedForFamily(
  L11ScoreFamily.OPPORTUNITY, L11CalibrationHorizon.H_1H),
  'B.06 H_1H horizon illegal for OPPORTUNITY');
assert(isL11HorizonAllowedForFamily(
  L11ScoreFamily.TIMING, L11CalibrationHorizon.H_4H),
  'B.07 H_4H horizon legal for TIMING');

assert(isL11OutcomeMetricLegalForHorizon(
  L11OutcomeMetric.FORWARD_RETURN, L11CalibrationHorizon.D_7),
  'B.08 FORWARD_RETURN legal at D_7');
assert(!isL11OutcomeMetricLegalForHorizon(
  L11OutcomeMetric.FORWARD_RETURN, L11CalibrationHorizon.H_1H),
  'B.09 FORWARD_RETURN illegal at H_1H');

const fwdDef = getL11OutcomeMetricDefinition(L11OutcomeMetric.FORWARD_RETURN)!;
assert(fwdDef.better_direction === L11OutcomeBetterDirection.HIGHER_IS_BETTER,
  'B.10 FORWARD_RETURN higher is better');
const drawdownDef = getL11OutcomeMetricDefinition(L11OutcomeMetric.MAX_DRAWDOWN)!;
assert(drawdownDef.better_direction === L11OutcomeBetterDirection.LOWER_IS_BETTER,
  'B.11 MAX_DRAWDOWN lower is better');

assert(ALL_L11_EXPECTED_OUTCOME_DIRECTIONS.length === 7,
  'B.12 7 expected outcome directions');

// Direction compatibility — happy path
assert(isL11ExpectedDirectionCompatible(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.FORWARD_RETURN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME).ok,
  'B.13 OPPORTUNITY × FORWARD_RETURN × HIGHER direction compatible');
assert(isL11ExpectedDirectionCompatible(
  L11ScoreFamily.RISK, L11OutcomeMetric.MAX_DRAWDOWN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME).ok,
  'B.14 RISK × MAX_DRAWDOWN × HIGHER direction compatible (danger family inversion)');
assert(isL11ExpectedDirectionCompatible(
  L11ScoreFamily.TIMING, L11OutcomeMetric.TIME_TO_CONFIRMATION,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_FASTER_CONFIRMATION).ok,
  'B.15 TIMING × TIME_TO_CONFIRMATION × FASTER direction compatible');
assert(isL11ExpectedDirectionCompatible(
  L11ScoreFamily.SIGNAL_CONFIDENCE, L11OutcomeMetric.CONTRADICTION_EMERGENCE_RATE,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LESS_FREQUENT_EVENT).ok,
  'B.16 SIGNAL_CONFIDENCE × CONTRADICTION × LESS_FREQUENT compatible');

// Direction compatibility — rejection paths
assert(!isL11ExpectedDirectionCompatible(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.FORWARD_RETURN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME).ok,
  'B.17 OPPORTUNITY × FORWARD_RETURN × LOWER rejected');
assert(!isL11ExpectedDirectionCompatible(
  L11ScoreFamily.RISK, L11OutcomeMetric.MAX_DRAWDOWN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME).ok,
  'B.18 RISK × MAX_DRAWDOWN × LOWER rejected (danger family cannot calibrate constructively)');
assert(!isL11ExpectedDirectionCompatible(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.FORWARD_RETURN,
  L11ExpectedOutcomeDirection.FAMILY_DEFINED).ok,
  'B.19 FAMILY_DEFINED rejected as production direction');
assert(!isL11ExpectedDirectionCompatible(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.MAX_DRAWDOWN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME).ok,
  'B.20 OPPORTUNITY × MAX_DRAWDOWN rejected (metric not allowed for family)');

// Causality leakage detection
assert(isL11CalibrationDescriptionCausalityFree(
  'higher Opportunity Score is expected to correlate with higher 7-day forward return').ok,
  'B.21 calibration description with "expected to correlate" passes');
assert(!isL11CalibrationDescriptionCausalityFree(
  'high score causes higher forward return').ok,
  'B.22 calibration description with "causes" rejected');
assert(!isL11CalibrationDescriptionCausalityFree(
  'always buy when score is high').ok,
  'B.23 calibration description with "buy" rejected');
assert(!isL11CalibrationDescriptionCausalityFree(
  'this guarantees positive return').ok,
  'B.24 calibration description with "guarantees" rejected');

// Validators wired correctly
const dirIssuesGood = validateL11ExpectedDirection(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.FORWARD_RETURN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_HIGHER_OUTCOME);
assert(dirIssuesGood.length === 0, 'B.25 valid direction has zero issues');

const dirIssuesBad = validateL11ExpectedDirection(
  L11ScoreFamily.OPPORTUNITY, L11OutcomeMetric.FORWARD_RETURN,
  L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME);
assert(dirIssuesBad.length > 0, 'B.26 invalid direction produces issues');
assert(dirIssuesBad.some(i =>
  i.code === L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_CONTRADICTS_OUTCOME_METRIC),
  'B.27 invalid direction issue tagged as metric contradiction');

const causalityIssues = validateL11CalibrationDescription('this causes a guaranteed buy signal');
assert(causalityIssues.length > 0, 'B.28 causality leakage produces issues');
assert(causalityIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_CALIBRATION_ACTS_AS_JUDGMENT ||
  i.code === L11CalibrationViolationCode.L11C_CALIBRATION_IMPLIES_CAUSALITY),
  'B.29 causality issue tagged as causality or judgment violation');

const metricIssuesGood = validateL11OutcomeMetricForFamily(
  L11OutcomeMetric.FORWARD_RETURN, L11ScoreFamily.OPPORTUNITY,
  L11CalibrationHorizon.D_7);
assert(metricIssuesGood.length === 0, 'B.30 metric/family/horizon trio passes validator');

const metricIssuesBadFamily = validateL11OutcomeMetricForFamily(
  L11OutcomeMetric.FORWARD_RETURN, L11ScoreFamily.RISK,
  L11CalibrationHorizon.D_7);
assert(metricIssuesBadFamily.some(i =>
  i.code === L11CalibrationViolationCode.L11C_OUTCOME_METRIC_NOT_ALLOWED_FOR_FAMILY),
  'B.31 metric not allowed for family flagged');

const metricRegistryReport = buildL11OutcomeMetricRegistryReport();
assert(metricRegistryReport.ok, 'B.32 outcome-metric registry report ok');

// ═══════════════════════════════════════════════════════════════
// BAND C — Cohort and exclusion law (§11.6.20 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Cohort and Exclusion Law ═══');

assert(ALL_L11_COHORT_DIMENSIONS.length === 9,
  'C.01 9 required cohort dimensions');
assert(ALL_L11_COHORT_DIMENSIONS.includes(L11CohortDimension.FORMULA_VERSION),
  'C.02 FORMULA_VERSION dimension registered');
assert(ALL_L11_COHORT_DIMENSIONS.includes(L11CohortDimension.VISIBILITY_CLASS),
  'C.03 VISIBILITY_CLASS dimension registered');

const cohortReport = buildL11CohortRegistryReport();
assert(cohortReport.ok, 'C.04 cohort registry report ok');
assert(cohortReport.missing_families.length === 0,
  'C.05 every production family has a cohort');

const oppCohort = getL11CalibrationCohortsForFamily(L11ScoreFamily.OPPORTUNITY)[0];
assert(oppCohort !== undefined, 'C.06 opportunity cohort exists');
assert(isL11CalibrationCohortStructurallyValid(oppCohort).ok,
  'C.07 opportunity cohort structurally valid');

// Cohort key determinism
const ctxA = {
  score_family: L11ScoreFamily.OPPORTUNITY,
  score_band: L11ScoreBand.HIGH,
  formula_version: 'v1',
  regime: 'SPOT_LED_EXPANSION',
  visibility_class: L11ScoreVisibilityClass.FULL_VISIBILITY,
};
const k1 = deriveL11CohortKey(ctxA);
const k2 = deriveL11CohortKey(ctxA);
assert(k1 === k2, 'C.08 cohort key deterministic');
assert(k1.includes('fam=OPPORTUNITY'), 'C.09 cohort key contains family');
assert(k1.includes('band=HIGH'), 'C.10 cohort key contains band');
assert(k1.includes('fver=v1'), 'C.11 cohort key contains formula_version');
assert(k1.includes('reg=SPOT_LED_EXPANSION'), 'C.12 cohort key contains regime');

const k3 = deriveL11CohortKey({ ...ctxA, regime: 'RISK_OFF' });
assert(k1 !== k3, 'C.13 cohort key differs when regime changes');

assert(doesL11CohortAcceptContext(oppCohort, ctxA).ok,
  'C.14 cohort accepts compatible context');
assert(!doesL11CohortAcceptContext(oppCohort, {
  ...ctxA, score_family: L11ScoreFamily.RISK }).ok,
  'C.15 cohort rejects family mismatch');

// Cohort validator catches missing fields
const brokenCohort: L11CalibrationCohortDefinition = {
  ...oppCohort,
  score_band_filters: undefined as unknown as readonly L11ScoreBand[],
};
const brokenCohortIssues = validateL11CalibrationCohort(
  brokenCohort, L11ScoreFamily.OPPORTUNITY);
assert(brokenCohortIssues.length > 0, 'C.16 broken cohort produces issues');

const familyMismatchCohort = { ...oppCohort, score_family: L11ScoreFamily.RISK };
const familyMismatchIssues = validateL11CalibrationCohort(
  familyMismatchCohort, L11ScoreFamily.OPPORTUNITY);
assert(familyMismatchIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_COHORT_FAMILY_MISMATCH),
  'C.17 cohort family mismatch flagged');

const noVisCohort = { ...oppCohort, visibility_class_filters: [] as L11ScoreVisibilityClass[] };
const noVisIssues = validateL11CalibrationCohort(
  noVisCohort, L11ScoreFamily.OPPORTUNITY);
assert(noVisIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_COHORT_IGNORES_VISIBILITY_CLASS),
  'C.18 cohort ignoring visibility flagged');

const noFvCohort = { ...oppCohort, formula_version_filters: [] as string[] };
const noFvIssues = validateL11CalibrationCohort(
  noFvCohort, L11ScoreFamily.OPPORTUNITY);
assert(noFvIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_COHORT_IGNORES_FORMULA_VERSION),
  'C.19 cohort ignoring formula version flagged');

// Exclusion rules
assert(ALL_L11_CALIBRATION_EXCLUSION_CLASSES.length === 9,
  'C.20 9 calibration exclusion classes');
assert(L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES.length === 5,
  'C.21 5 required production exclusion classes');

const exclReport = buildL11ExclusionRegistryReport();
assert(exclReport.ok, 'C.22 exclusion registry report ok');
assert(exclReport.missing_required_classes.length === 0,
  'C.23 all required exclusion classes registered');

const requiredRules = getL11RequiredProductionExclusionRules();
assert(requiredRules.length >= L11_REQUIRED_PRODUCTION_EXCLUSION_CLASSES.length,
  'C.24 required production exclusion rule set covers required classes');

const incompleteRuleSet: readonly L11CalibrationExclusionRule[] =
  L11_PRODUCTION_EXCLUSION_RULES.filter(r =>
    r.exclusion_class !== L11CalibrationExclusionClass.SCORE_QUARANTINED);
const missingRequired = getMissingRequiredExclusionClasses(incompleteRuleSet);
assert(missingRequired.includes(L11CalibrationExclusionClass.SCORE_QUARANTINED),
  'C.25 missing required exclusion class detected');

const incompleteSetIssues = validateL11CalibrationExclusionRuleSet(incompleteRuleSet);
assert(incompleteSetIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_REQUIRED_EXCLUSION_CLASS_MISSING),
  'C.26 incomplete exclusion set raises L11C_REQUIRED_EXCLUSION_CLASS_MISSING');

// Bias-safe rejection
const biasedRule: L11CalibrationExclusionRule = {
  exclusion_rule_id: 'excl.bad.survivorship.v1',
  exclusion_class: L11CalibrationExclusionClass.SCORE_QUARANTINED,
  description: 'remove negative outcomes',
  applies_to_score_families: [L11ScoreFamily.OPPORTUNITY],
  applies_to_metrics: [L11OutcomeMetric.FORWARD_RETURN],
  required_for_production: true,
  is_bias_safe: false,
  bias_safe_justification: '',
  policy_version: 'v1',
};
const biasedIssues = validateL11CalibrationExclusionRule(biasedRule);
assert(biasedIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_EXCLUSION_CAUSES_SURVIVORSHIP_BIAS),
  'C.27 survivorship-bias offender rejected');

// Empty exclusion set
const emptyExcIssues = validateL11CalibrationExclusionRuleSet([]);
assert(emptyExcIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_EXCLUSION_RULES_MISSING),
  'C.28 empty exclusion set raises L11C_EXCLUSION_RULES_MISSING');

// ═══════════════════════════════════════════════════════════════
// BAND D — Hook generation and readiness (§11.6.20 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Hook Generation and Readiness ═══');

const oppResult = runL11CalibrationHookEngine(opportunityScore, defaultEngineCtx());
assert(oppResult.issues.length === 0, 'D.01 opportunity engine emits no issues');
assert(oppResult.hooks.length >= 1, 'D.02 opportunity engine emits ≥1 hook');
assert(oppResult.hooks.length === 2,
  'D.03 opportunity emits 2 hooks (FORWARD_RETURN@D_7 + RELATIVE_OUTPERF@D_30)');

for (const h of oppResult.hooks) {
  assert(isL11CalibrationHookStructurallyValid(h).ok,
    `D.04 hook ${h.calibration_hook_id} structurally valid`);
}

const oppHook = oppResult.hooks[0];
assert(oppHook.score_family === L11ScoreFamily.OPPORTUNITY,
  'D.05 hook score_family = OPPORTUNITY');
assert(oppHook.cohort_key.startsWith('fam=OPPORTUNITY'),
  'D.06 hook cohort_key starts with family');
assert(oppHook.calibration_target_ref.startsWith('tgt.opportunity'),
  'D.07 hook references opportunity target');
assert(oppHook.replay_hash.startsWith('l11c.h.'),
  'D.08 hook replay hash uses l11c namespace');

const expectedOppHookHash = canonicalCalibrationHookReplayHash(
  extractL11CalibrationHookReplayMaterial(oppHook));
assert(expectedOppHookHash === oppHook.replay_hash,
  'D.09 hook replay hash deterministic across recomputes');

// Evaluation window correctly anchored to as_of
const expectedWindowEnd = new Date(
  Date.parse(AS_OF) + getL11HorizonDurationMs(oppHook.horizon)).toISOString();
assert(oppHook.evaluation_window_end === expectedWindowEnd,
  'D.10 hook evaluation_window_end = as_of + horizon');

// Readiness reflects context
assert(oppHook.calibration_readiness_class ===
       L11CalibrationReadinessClass.PENDING_OUTCOME_WINDOW,
  'D.11 ready hook with future window → PENDING_OUTCOME_WINDOW');
assert(isL11CalibrationReadinessReady(oppHook.calibration_readiness_class),
  'D.12 PENDING_OUTCOME_WINDOW classified as ready');
assert(!isL11CalibrationReadinessBlocked(oppHook.calibration_readiness_class),
  'D.13 PENDING_OUTCOME_WINDOW not blocked');

// Stratification readiness
const noRegimeCtx = {
  ...defaultEngineCtx(),
  cohort_context: { ...defaultEngineCtx().cohort_context, regime: undefined },
};
const noRegimeResult = runL11CalibrationHookEngine(opportunityScore, noRegimeCtx);
assert(noRegimeResult.hooks[0].calibration_readiness_class ===
       L11CalibrationReadinessClass.READY_WITH_STRATIFICATION,
  'D.14 missing regime context → READY_WITH_STRATIFICATION');

// Version mismatch readiness
const wrongFormulaVersionCtx = {
  ...defaultEngineCtx(),
  formula_version: 'v999',
};
const wrongFvResult = runL11CalibrationHookEngine(
  opportunityScore, wrongFormulaVersionCtx);
assert(wrongFvResult.hooks[0].calibration_readiness_class ===
       L11CalibrationReadinessClass.BLOCKED_VERSION_MISMATCH,
  'D.15 wrong formula_version → BLOCKED_VERSION_MISMATCH');

// Reserved family blocked
const reservedScore = buildScore(
  L11ScoreFamily.NARRATIVE_QUALITY, 50, L11ScoreBand.MEDIUM,
  'l11.score.reserved.001');
const reservedResult = runL11CalibrationHookEngine(reservedScore, defaultEngineCtx());
assert(reservedResult.hooks.length === 0, 'D.16 reserved family emits 0 hooks');
assert(reservedResult.issues.length > 0, 'D.17 reserved family produces engine issue');

// Multi-score batch
const batchResult = runL11CalibrationHookEngineBatch(
  [opportunityScore, riskScore], defaultEngineCtx());
const oppHooks = batchResult.hooks.filter(h => h.score_family === L11ScoreFamily.OPPORTUNITY);
const riskHooks = batchResult.hooks.filter(h => h.score_family === L11ScoreFamily.RISK);
assert(oppHooks.length === 2, 'D.18 batch emits 2 opportunity hooks');
assert(riskHooks.length === 2, 'D.19 batch emits 2 risk hooks');

// Hook validator + registry
const hookRegistryReport = buildL11CalibrationHookRegistryReport(batchResult.hooks);
assert(hookRegistryReport.ok, 'D.20 hook registry batch report ok');

const hookValidatorIssues = validateL11CalibrationHook(
  oppHook, getL11CalibrationTarget(oppHook.calibration_target_ref));
assert(hookValidatorIssues.length === 0, 'D.21 valid hook passes validator');

const hookWithoutTarget = validateL11CalibrationHook(oppHook, null);
assert(hookWithoutTarget.some(i =>
  i.code === L11CalibrationViolationCode.L11C_HOOK_TARGET_REF_UNRESOLVED),
  'D.22 hook with unresolved target rejected');

// Tampered hook
const tamperedHook: L11ScoreCalibrationHook = { ...oppHook, final_score: 99 };
const tamperedIssues = validateL11CalibrationHook(
  tamperedHook, getL11CalibrationTarget(oppHook.calibration_target_ref));
assert(tamperedIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH),
  'D.23 tampered hook → replay hash mismatch');

// Score-hook coverage
const coverageIssues = validateL11ScoreHookCoverage(
  [opportunityScore], oppResult.hooks);
assert(coverageIssues.length === 0, 'D.24 score-hook coverage clean for emitted hooks');

const orphanScore = buildScore(L11ScoreFamily.RISK, 50, L11ScoreBand.MEDIUM, 'orphan.001');
const orphanIssues = validateL11ScoreHookCoverage([orphanScore], []);
assert(orphanIssues.some(i =>
  i.code === L11CalibrationViolationCode.L11C_SCORE_LACKS_CALIBRATION_HOOK),
  'D.25 orphan score (no hook) flagged');

// Readiness validator
const readinessIssues = validateL11CalibrationReadiness(
  oppHook, getL11CalibrationTarget(oppHook.calibration_target_ref));
assert(readinessIssues.length === 0, 'D.26 valid readiness passes validator');

const inconsistentHook: L11ScoreCalibrationHook = {
  ...oppHook,
  score_version: 'v999',
  calibration_readiness_class: L11CalibrationReadinessClass.CALIBRATION_READY,
};
const inconsistentReadiness = validateL11CalibrationReadiness(
  inconsistentHook, getL11CalibrationTarget(oppHook.calibration_target_ref));
assert(inconsistentReadiness.some(i =>
  i.code === L11CalibrationViolationCode.L11C_READINESS_CLASS_INCONSISTENT),
  'D.27 readiness inconsistent with version mismatch flagged');

assert(L11_CALIBRATION_HOOK_POLICY_VERSION === 'l11.6.hook.v1',
  'D.28 hook policy version frozen as l11.6.hook.v1');

assert(ALL_L11_CALIBRATION_READINESS_CLASSES.length === 8,
  'D.29 8 readiness classes registered');

// ═══════════════════════════════════════════════════════════════
// BAND E — Audit and invariants (§11.6.20 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Audit and Invariants ═══');

assert(ALL_L11_CALIBRATION_AUDIT_SUBJECT_CLASSES.length === 9,
  'E.01 9 audit subject classes registered');

// Severity mapping deterministic
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET) === 'CRITICAL',
  'E.02 reserved-family-has-target = CRITICAL');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_PRODUCTION_FAMILY_LACKS_TARGET) === 'CRITICAL',
  'E.03 production-family-lacks-target = CRITICAL');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_EXPECTED_DIRECTION_MISSING) === 'CRITICAL',
  'E.04 expected-direction-missing = CRITICAL');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_CALIBRATION_IMPLIES_CAUSALITY) === 'CRITICAL',
  'E.05 calibration-implies-causality = CRITICAL');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISSING) === 'ERROR',
  'E.06 hook-replay-hash-missing = ERROR');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_COHORT_IGNORES_VISIBILITY_CLASS) === 'ERROR',
  'E.07 cohort-ignores-visibility = ERROR');
assert(severityForL11CalibrationCode(
  L11CalibrationViolationCode.L11C_EXCLUSION_RULES_MISSING) === 'ERROR',
  'E.08 exclusion-rules-missing = ERROR');

// Audit emission deterministic
const sampleIssue = {
  code: L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH,
  severity: severityForL11CalibrationCode(
    L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH),
  message: 'tampered',
  hook_id: 'hk.test',
  score_id: 'l11.score.test',
  score_family: L11ScoreFamily.OPPORTUNITY as unknown as string,
};
const auditA = makeL11CalibrationAuditRecord(
  L11CalibrationAuditSubjectClass.CALIBRATION_HOOK,
  'hk.test', sampleIssue, '2026-05-05T12:00:00.000Z');
const auditB = makeL11CalibrationAuditRecord(
  L11CalibrationAuditSubjectClass.CALIBRATION_HOOK,
  'hk.test', sampleIssue, '2026-05-05T12:00:00.000Z');
assert(auditA.audit_id === auditB.audit_id,
  'E.09 audit id deterministic for identical inputs');
assert(auditA.audit_id.startsWith('l11c.audit.'),
  'E.10 audit id uses l11c namespace');

const records = emitL11CalibrationAuditRecords(
  L11CalibrationAuditSubjectClass.CALIBRATION_HOOK,
  'hk.test', [sampleIssue, sampleIssue], '2026-05-05T12:00:00.000Z');
assert(records.length === 2, 'E.11 audit emit returns one record per issue');
assert(records.every(r => r.severity === 'CRITICAL'),
  'E.12 emitted records carry mapped severity');

const batchRecords = emitL11CalibrationAuditBatch(
  L11CalibrationAuditSubjectClass.CALIBRATION_HOOK,
  'fallback.ref',
  [sampleIssue, { ...sampleIssue, hook_id: undefined, target_id: 'tgt.x' }],
  '2026-05-05T12:00:00.000Z');
assert(batchRecords[0].subject_ref === 'hk.test',
  'E.13 batch audit prefers hook_id when present');
assert(batchRecords[1].subject_ref === 'tgt.x',
  'E.14 batch audit falls back to target_id when hook_id absent');

// Invariants — happy path
const allHooks = batchResult.hooks;
const A = checkInv11_6_A_TargetLaw(L11_PRODUCTION_CALIBRATION_TARGETS);
const B = checkInv11_6_B_HookLaw([opportunityScore, riskScore], allHooks);
const C = checkInv11_6_C_DirectionLaw(L11_PRODUCTION_CALIBRATION_TARGETS);
const D = checkInv11_6_D_CohortLaw(L11_PRODUCTION_CALIBRATION_TARGETS);
const E = checkInv11_6_E_ExclusionLaw(L11_PRODUCTION_CALIBRATION_TARGETS);
const F = checkInv11_6_F_NonCausalityLaw(L11_PRODUCTION_CALIBRATION_TARGETS);
const G = checkInv11_6_G_ReplayLaw(L11_PRODUCTION_CALIBRATION_TARGETS, allHooks);
const H = checkInv11_6_H_NonJudgmentLaw(L11_PRODUCTION_CALIBRATION_TARGETS);

assert(A.ok, 'E.15 INV-11.6-A target law green');
assert(B.ok, 'E.16 INV-11.6-B hook law green');
assert(C.ok, 'E.17 INV-11.6-C direction law green');
assert(D.ok, 'E.18 INV-11.6-D cohort law green');
assert(E.ok, 'E.19 INV-11.6-E exclusion law green');
assert(F.ok, 'E.20 INV-11.6-F non-causality law green');
assert(G.ok, 'E.21 INV-11.6-G replay determinism green');
assert(H.ok, 'E.22 INV-11.6-H non-judgment law green');

const suite = runL11_6InvariantSuite({
  targets: L11_PRODUCTION_CALIBRATION_TARGETS,
  hooks: allHooks,
  scores: [opportunityScore, riskScore],
});
assert(suite.ok, 'E.23 invariant suite aggregate green');

// Crafted offenders fail precisely

// (A) reserved family target
const offenderTargets_A = [
  ...L11_PRODUCTION_CALIBRATION_TARGETS,
  { ...oppFwd!, calibration_target_id: 'tgt.bad.reserved',
    score_family: L11ScoreFamily.NARRATIVE_QUALITY },
];
const A_off = checkInv11_6_A_TargetLaw(offenderTargets_A);
assert(!A_off.ok && A_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_RESERVED_FAMILY_HAS_TARGET),
  'E.24 INV-11.6-A fails on reserved-family offender');

// (B) score with no hook
const orphanResult = checkInv11_6_B_HookLaw([orphanScore], []);
assert(!orphanResult.ok && orphanResult.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_SCORE_LACKS_CALIBRATION_HOOK),
  'E.25 INV-11.6-B fails on uncovered score');

// (C) direction contradicts metric
const offenderTarget_C: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.direction',
  expected_direction:
    L11ExpectedOutcomeDirection.HIGHER_SCORE_SHOULD_CORRELATE_WITH_LOWER_OUTCOME,
};
const C_off = checkInv11_6_C_DirectionLaw([offenderTarget_C]);
assert(!C_off.ok, 'E.26 INV-11.6-C fails on contradicting direction');

// (D) cohort with empty visibility filter when stratification required
const offenderTarget_D: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.cohort',
  cohort_definition: {
    ...oppFwd!.cohort_definition,
    visibility_class_filters: [],
  },
};
const D_off = checkInv11_6_D_CohortLaw([offenderTarget_D]);
assert(!D_off.ok && D_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_COHORT_IGNORES_VISIBILITY_CLASS),
  'E.27 INV-11.6-D fails on cohort ignoring visibility');

// (E) target without required exclusion
const offenderTarget_E: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.exclusion',
  exclusion_rules: oppFwd!.exclusion_rules.filter(r =>
    r.exclusion_class !== L11CalibrationExclusionClass.SCORE_QUARANTINED),
};
const E_off = checkInv11_6_E_ExclusionLaw([offenderTarget_E]);
assert(!E_off.ok && E_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_REQUIRED_EXCLUSION_CLASS_MISSING),
  'E.28 INV-11.6-E fails on missing required exclusion class');

// (F) causality leakage
const offenderTarget_F: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.causality',
  description: 'high opportunity score causes higher forward returns',
};
const F_off = checkInv11_6_F_NonCausalityLaw([offenderTarget_F]);
assert(!F_off.ok && F_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_CALIBRATION_IMPLIES_CAUSALITY),
  'E.29 INV-11.6-F fails on causality leakage');

// (G) replay drift on target
const offenderTarget_G: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.replay',
  replay_hash: 'l11c.h.deadbeef',
};
const G_off = checkInv11_6_G_ReplayLaw([offenderTarget_G], []);
assert(!G_off.ok && G_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_TARGET_REPLAY_HASH_MISMATCH),
  'E.30 INV-11.6-G fails on target replay drift');

// (G) replay drift on hook
const offenderHook_G: L11ScoreCalibrationHook = {
  ...oppHook,
  replay_hash: 'l11c.h.deadbeef',
};
const G_off_hook = checkInv11_6_G_ReplayLaw([], [offenderHook_G]);
assert(!G_off_hook.ok && G_off_hook.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_HOOK_REPLAY_HASH_MISMATCH),
  'E.31 INV-11.6-G fails on hook replay drift');

// (H) judgment language
const offenderTarget_H: L11ScoreCalibrationTarget = {
  ...oppFwd!,
  calibration_target_id: 'tgt.bad.judgment',
  description: 'recommended buy when opportunity score is high',
};
const H_off = checkInv11_6_H_NonJudgmentLaw([offenderTarget_H]);
assert(!H_off.ok && H_off.violations.some(v =>
  v.code === L11CalibrationViolationCode.L11C_CALIBRATION_ACTS_AS_JUDGMENT),
  'E.32 INV-11.6-H fails on judgment language');

// Coverage validator parity with INV-A
const coverage = validateL11ScoreFamilyTargetCoverage(L11_PRODUCTION_CALIBRATION_TARGETS);
assert(coverage.length === 0,
  'E.33 production target catalogue passes family-coverage validator');

// Sanity — full target+hook validator pipeline
for (const t of L11_PRODUCTION_CALIBRATION_TARGETS) {
  const issues = validateL11CalibrationTarget(t);
  assert(issues.length === 0,
    `E.34 production target ${t.calibration_target_id} validator clean`);
}

assert(ALL_L11_CALIBRATION_VIOLATION_CODES.length >= 50,
  'E.35 ≥50 L11C_ violation codes registered');

// ─────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────

console.log('\n═══ L11.6 CERTIFICATION SUMMARY ═══');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('\n✓ All L11.6 certification bands green');
  process.exit(0);
}

// Suppress unused-import lints for symbols that are only re-exports
void L11_CALIBRATION_TARGET_POLICY_VERSION;
void L11_PRODUCTION_CALIBRATION_COHORTS;
void L11_PRODUCTION_EXCLUSION_RULES;
