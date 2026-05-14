/**
 * L11.7 — Drift, Threshold, and Formula-change Governance
 * Certification Test Suite (§11.7.22)
 *
 * 5 Bands:
 *   A — drift taxonomy and report law (§11.7.22 Band A)
 *   B — drift statistics and action law (§11.7.22 Band B)
 *   C — threshold governance (§11.7.22 Band C)
 *   D — formula change governance (§11.7.22 Band D)
 *   E — audit and invariants INV-11.7-A..H (§11.7.22 Band E)
 */

import {
  // L11.2 / L11.3 / L11.5 / L11.6 context
  L11ScoreFamily,
  L11ScoreBand,
  ALL_L11_SCORE_BANDS,
  L11ScoreFamilyDirectionClass,
  L11_REQUIRED_DIRECTION_BY_FAMILY,
  L11FormulaStatus,
  L11ScoreComponentRole,
  L11ComponentDirectionClass,
  L11MissingDataBehaviorClass,
  L11ScoreFormulaDefinition,
  L11WeightSumPolicy,
  L11_FULL_FORMULA_REPLAY_MATERIAL,
  canonicalScoreFormulaReplayHash,
  // L11.7 contracts
  L11ScoreDriftType,
  ALL_L11_SCORE_DRIFT_TYPES,
  L11DriftSeverity,
  ALL_L11_DRIFT_SEVERITIES,
  L11_DRIFT_SEVERITY_RANK,
  isL11DriftSeverityAtLeast,
  L11DriftRecommendedAction,
  ALL_L11_DRIFT_RECOMMENDED_ACTIONS,
  L11_LEGAL_ACTIONS_BY_SEVERITY,
  isL11DriftActionLegalForSeverity,
  isL11DriftActionLegalForType,
  isL11DriftActionPassive,
  L11DriftStatistic,
  L11DriftStatisticType,
  ALL_L11_DRIFT_STATISTIC_TYPES,
  L11DriftStatisticConfidenceClass,
  L11DriftThresholdDirection,
  computeL11DriftStatisticPassed,
  isL11DriftStatisticConfidenceSufficient,
  isL11DriftStatisticSampleSufficient,
  isL11DriftStatisticStructurallyValid,
  L11ScoreDriftReport,
  L11_DRIFT_REPORT_POLICY_VERSION,
  isL11DriftReportStructurallyValid,
  extractL11DriftReportReplayMaterial,
  canonicalDriftReportReplayHash,
  L11ThresholdPolicy,
  L11ThresholdPolicyStatus,
  L11ThresholdBandRule,
  L11_THRESHOLD_POLICY_VERSION,
  isL11ThresholdPolicyStructurallyValid,
  checkL11ThresholdPolicyIntegrity,
  isL11ThresholdPolicyCoveringFullRange,
  resolveL11ThresholdBand,
  extractL11ThresholdPolicyReplayMaterial,
  canonicalThresholdPolicyReplayHash,
  L11ThresholdChangeClassification,
  ALL_L11_THRESHOLD_CHANGE_CLASSIFICATIONS,
  L11FormulaChangeClassification,
  ALL_L11_FORMULA_CHANGE_CLASSIFICATIONS,
  l11FormulaChangeRequiresMigration,
  l11FormulaChangeRequiresRecalibration,
  isL11FormulaChangeProhibited,
  L11FormulaChangeAssessment,
  L11FormulaChangeSurface,
  L11FormulaChangeReasonCode,
  L11_FORMULA_CHANGE_POLICY_VERSION,
  L11_PROHIBITED_SILENT_SURFACES,
  isL11FormulaChangeAssessmentStructurallyValid,
  extractL11FormulaChangeReplayMaterial,
  canonicalFormulaChangeReplayHash,
  getL11DriftTypeImpactClass,
  L11DriftTypeImpactClass,
  L11DependencySurfaceClass,
} from '../l11/contracts';

import {
  runL11ScoreDriftMonitoringEngine,
  L11DriftMonitorContext,
  L11DriftSampleStats,
  summarizeDistribution,
  deriveDriftSeverity,
  deriveRecommendedAction,
  validateL11ThresholdPolicy as engineValidateThreshold,
  classifyL11ThresholdChange,
  classifyL11FormulaChange,
  isL11FormulaAssessmentBlocked,
} from '../l11/drift';

import {
  L11DriftViolationCode,
  ALL_L11_DRIFT_VIOLATION_CODES,
  severityForL11DriftCode,
  validateL11ScoreDriftReport,
  validateL11DriftStatistic,
  validateL11DriftSeverity,
  validateL11DriftRecommendedAction,
  validateL11ThresholdPolicy,
  validateL11ThresholdChange,
  validateL11FormulaChangeAssessment,
  validateL11FormulaChangeClassification,
  validateL11DriftReplay,
} from '../l11/validation';

import {
  L11DriftAuditSubjectClass,
  ALL_L11_DRIFT_AUDIT_SUBJECT_CLASSES,
  makeL11DriftAuditRecord,
  emitL11DriftAuditRecords,
  emitL11DriftAuditBatch,
} from '../l11/constitution/l11-drift-audit';

import {
  invariantA_driftReportCompleteness,
  invariantB_severityActionConsistency,
  invariantC_thresholdVersioning,
  invariantD_thresholdChangeClassification,
  invariantE_formulaChangeClassification,
  invariantF_semanticPreservation,
  invariantG_sampleConfidence,
  invariantH_nonJudgment,
  runL11_7Invariants,
} from '../l11/invariants/l11_7-invariants';

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

const BASELINE_START = '2026-04-01T00:00:00.000Z';
const BASELINE_END = '2026-04-30T23:59:59.999Z';
const OBS_START = '2026-05-01T00:00:00.000Z';
const OBS_END = '2026-05-07T23:59:59.999Z';

function buildBandRule(
  band: L11ScoreBand, lo: number, hi: number,
  loInc: boolean, hiInc: boolean, label: string,
): L11ThresholdBandRule {
  return {
    score_band: band,
    ...(loInc ? { min_inclusive: lo } : { min_exclusive: lo }),
    ...(hiInc ? { max_inclusive: hi } : { max_exclusive: hi }),
    semantic_label: label,
    policy_version: L11_THRESHOLD_POLICY_VERSION,
  };
}

function buildDefaultThresholdRules(): L11ThresholdBandRule[] {
  return [
    buildBandRule(L11ScoreBand.VERY_LOW, 0, 20, true, true, 'very_low'),
    buildBandRule(L11ScoreBand.LOW, 20, 40, false, true, 'low'),
    buildBandRule(L11ScoreBand.MEDIUM, 40, 60, false, true, 'medium'),
    buildBandRule(L11ScoreBand.HIGH, 60, 80, false, true, 'high'),
    buildBandRule(L11ScoreBand.VERY_HIGH, 80, 100, false, true, 'very_high'),
  ];
}

function buildThresholdPolicy(
  family: L11ScoreFamily,
  status: L11ThresholdPolicyStatus = L11ThresholdPolicyStatus.ACTIVE,
  thresholds: readonly L11ThresholdBandRule[] = buildDefaultThresholdRules(),
  overrides: Partial<Omit<L11ThresholdPolicy, 'replay_hash'>> = {},
): L11ThresholdPolicy {
  const draft: Omit<L11ThresholdPolicy, 'replay_hash'> = {
    threshold_policy_id: `l11g.threshold.${family.toLowerCase()}.v1`,
    score_family: family,
    formula_id: `l11.formula.${family.toLowerCase()}.v1`,
    formula_version: 'v1',
    score_version: 'v1',
    band_policy_ref: `l11.band.${family.toLowerCase()}.v1`,
    thresholds,
    threshold_version: 'tv1',
    threshold_status: status,
    calibration_target_refs: [`tgt.${family.toLowerCase()}.fwd_return.7d`],
    drift_report_refs: [],
    effective_from: BASELINE_START,
    migration_required: false,
    lineage_refs: [`policy:${family}`],
    policy_version: L11_THRESHOLD_POLICY_VERSION,
    ...overrides,
  };
  const hash = canonicalThresholdPolicyReplayHash(
    extractL11ThresholdPolicyReplayMaterial(draft));
  return { ...draft, replay_hash: hash };
}

function buildDriftMonitorCtx(
  family: L11ScoreFamily = L11ScoreFamily.OPPORTUNITY,
): L11DriftMonitorContext {
  return {
    score_family: family,
    score_version: 'v1',
    formula_id: `l11.formula.${family.toLowerCase()}.v1`,
    formula_version: 'v1',
    cohort_ref: `coh.${family.toLowerCase()}.v1`,
    calibration_target_ref: `tgt.${family.toLowerCase()}.fwd_return.7d`,
    baseline_window_start: BASELINE_START,
    baseline_window_end: BASELINE_END,
    observation_window_start: OBS_START,
    observation_window_end: OBS_END,
    minimum_sample_size: 50,
    drift_report_id_prefix: 'l11g.drift',
  };
}

function buildSamples(
  scoreCount: number,
  meanShift: number,
): { baseline: L11DriftSampleStats; observation: L11DriftSampleStats } {
  const baseValues: number[] = [];
  const obsValues: number[] = [];
  for (let i = 0; i < scoreCount; i++) {
    baseValues.push(40 + (i * 0.13) % 20);
    obsValues.push(40 + meanShift + (i * 0.13) % 20);
  }
  return {
    baseline: {
      score_values: baseValues,
      band_frequency: { LOW: 20, MEDIUM: 60, HIGH: 20 } as never,
      missing_data_rate: 0.05,
      outcome_correlation: 0.35,
      top_driver_frequency: { 'comp.opp.validation': 60, 'comp.opp.timing': 40 },
      affected_regime_refs: ['l8.regime.001'],
      affected_sequence_refs: ['l9.sequence.001'],
      affected_hypothesis_refs: ['l10.hypothesis.001'],
    },
    observation: {
      score_values: obsValues,
      band_frequency: { LOW: 10, MEDIUM: 40, HIGH: 50 } as never,
      missing_data_rate: 0.07,
      outcome_correlation: 0.32,
      top_driver_frequency: { 'comp.opp.validation': 30, 'comp.opp.timing': 70 },
    },
  };
}

function buildDriftStat(
  type: L11DriftStatisticType,
  value: number,
  threshold: number,
  direction: L11DriftThresholdDirection = L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN,
  sample = 200,
  minSample = 50,
  conf: L11DriftStatisticConfidenceClass = L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE,
): L11DriftStatistic {
  return {
    statistic_id: `stat:${type.toLowerCase()}::001`,
    statistic_type: type,
    statistic_value: value,
    threshold_value: threshold,
    threshold_direction: direction,
    passed_threshold: computeL11DriftStatisticPassed(value, threshold, direction),
    sample_size: sample,
    minimum_sample_size: minSample,
    confidence_class: conf,
    policy_version: L11_DRIFT_REPORT_POLICY_VERSION,
  };
}

function buildDriftReport(
  family: L11ScoreFamily,
  type: L11ScoreDriftType,
  severity: L11DriftSeverity,
  action: L11DriftRecommendedAction,
  statistics: readonly L11DriftStatistic[],
): L11ScoreDriftReport {
  const ctx = buildDriftMonitorCtx(family);
  const draft: Omit<L11ScoreDriftReport, 'replay_hash'> = {
    drift_report_id: `l11g.drift:${type.toLowerCase()}::${family}::001`,
    score_family: family,
    score_version: 'v1',
    formula_id: ctx.formula_id,
    formula_version: ctx.formula_version,
    drift_type: type,
    drift_severity: severity,
    cohort_ref: ctx.cohort_ref,
    calibration_target_ref: ctx.calibration_target_ref,
    observation_window_start: OBS_START,
    observation_window_end: OBS_END,
    baseline_window_start: BASELINE_START,
    baseline_window_end: BASELINE_END,
    affected_components: [],
    affected_score_bands: [],
    affected_regime_refs: ['l8.regime.001'],
    affected_sequence_refs: ['l9.sequence.001'],
    affected_hypothesis_refs: ['l10.hypothesis.001'],
    observed_change: { observed_value: 1, observed_correlation: 0.30 },
    expected_baseline: {
      baseline_value: 0,
      baseline_correlation: 0.40,
      baseline_version: 'baseline.v1',
    },
    drift_statistics: statistics,
    recommended_action: action,
    lineage_refs: [`drift:${type.toLowerCase()}`],
    evidence_refs: [],
    policy_version: L11_DRIFT_REPORT_POLICY_VERSION,
  };
  const hash = canonicalDriftReportReplayHash(extractL11DriftReportReplayMaterial(draft));
  return { ...draft, replay_hash: hash };
}

function buildFormula(
  family: L11ScoreFamily,
  formulaId: string,
  formulaVersion: string,
  overrides: Partial<L11ScoreFormulaDefinition> = {},
): L11ScoreFormulaDefinition {
  const def: L11ScoreFormulaDefinition = {
    formula_id: formulaId,
    score_family: family,
    formula_version: formulaVersion,
    meaning_claim_ref: `l11.meaning.${family.toLowerCase()}.v1`,
    score_direction:
      L11_REQUIRED_DIRECTION_BY_FAMILY[family] ??
      L11ScoreFamilyDirectionClass.FAMILY_DEFINED,
    applicable_scope_types: ['ASSET'],
    required_input_surfaces: [
      { surface_class: L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
        label: 'validation' },
    ],
    optional_input_surfaces: [],
    evidence_only_input_surfaces: [],
    component_definitions: [
      {
        component_id: `comp.${family.toLowerCase()}.alpha`,
        score_family: family,
        component_name: 'alpha',
        component_role: L11ScoreComponentRole.PRIMARY_POSITIVE_COMPONENT,
        component_direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
        required_input_surfaces: [],
        optional_input_surfaces: [],
        normalizer_id: 'norm.linear', normalizer_version: 'v1',
        min_value: 0, max_value: 100, weight: 0.6,
        missing_data_behavior: L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
        required_for_formula: true, attribution_required: true,
        policy_version: 'l11.3.comp.v1',
      },
      {
        component_id: `comp.${family.toLowerCase()}.beta`,
        score_family: family,
        component_name: 'beta',
        component_role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
        component_direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
        required_input_surfaces: [],
        optional_input_surfaces: [],
        normalizer_id: 'norm.linear', normalizer_version: 'v1',
        min_value: 0, max_value: 100, weight: 0.4,
        missing_data_behavior: L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
        required_for_formula: true, attribution_required: true,
        policy_version: 'l11.3.comp.v1',
      },
    ],
    weight_profile: {
      weight_profile_id: `wp.${family.toLowerCase()}`,
      score_family: family,
      formula_version: formulaVersion,
      weight_sum_policy: L11WeightSumPolicy.POSITIVE_COMPONENTS_SUM_TO_ONE,
      component_weights: {
        [`comp.${family.toLowerCase()}.alpha`]: 0.6,
        [`comp.${family.toLowerCase()}.beta`]: 0.4,
      },
      positive_weight_sum: 1.0,
      penalty_weight_sum: 0,
      total_absolute_weight_sum: 1.0,
      policy_version: 'l11.3.weight.v1',
    },
    cap_rules: [],
    penalty_rules: [],
    modifier_rules: [],
    missing_data_rules: [],
    calibration_target_ref: `tgt.${family.toLowerCase()}.fwd_return.7d`,
    output_band_policy_ref: `l11.band.${family.toLowerCase()}.v1`,
    replay_hash_material: L11_FULL_FORMULA_REPLAY_MATERIAL,
    formula_status: L11FormulaStatus.PRODUCTION_ENABLED,
    policy_version: 'l11.3.formula.v1',
    ...overrides,
  };
  void canonicalScoreFormulaReplayHash;
  return def;
}

// ═══════════════════════════════════════════════════════════════
// BAND A — drift taxonomy and report law (§11.7.22 Band A)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: drift taxonomy and report law ═══');

assert(ALL_L11_SCORE_DRIFT_TYPES.length === 13, 'A.01 13 drift types registered');
assert(ALL_L11_DRIFT_SEVERITIES.length === 5, 'A.02 5 drift severities registered');
assert(ALL_L11_DRIFT_RECOMMENDED_ACTIONS.length === 8,
  'A.03 8 recommended actions registered');
assert(ALL_L11_DRIFT_STATISTIC_TYPES.length === 12,
  'A.04 12 drift-statistic types registered');
assert(ALL_L11_THRESHOLD_CHANGE_CLASSIFICATIONS.length === 6,
  'A.05 6 threshold change classifications registered');
assert(ALL_L11_FORMULA_CHANGE_CLASSIFICATIONS.length === 6,
  'A.06 6 formula change classifications registered');
assert(ALL_L11_DRIFT_VIOLATION_CODES.length >= 60,
  'A.07 ≥60 L11G_ violation codes registered');
assert(ALL_L11_DRIFT_AUDIT_SUBJECT_CLASSES.length === 8,
  'A.08 8 drift audit subject classes registered');

assert(L11_DRIFT_SEVERITY_RANK[L11DriftSeverity.INFO] === 0, 'A.09 INFO rank=0');
assert(L11_DRIFT_SEVERITY_RANK[L11DriftSeverity.CRITICAL] === 4, 'A.10 CRITICAL rank=4');
assert(isL11DriftSeverityAtLeast(L11DriftSeverity.CRITICAL, L11DriftSeverity.SEVERE),
  'A.11 CRITICAL ≥ SEVERE');
assert(!isL11DriftSeverityAtLeast(L11DriftSeverity.WATCH, L11DriftSeverity.MATERIAL),
  'A.12 WATCH < MATERIAL');

const cls = getL11DriftTypeImpactClass(L11ScoreDriftType.CALIBRATION_DRIFT);
assert(cls === L11DriftTypeImpactClass.CALIBRATION,
  'A.13 CALIBRATION_DRIFT impact class CALIBRATION');
assert(getL11DriftTypeImpactClass(L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT)
  === L11DriftTypeImpactClass.THRESHOLD,
  'A.14 SCORE_BAND_DISTRIBUTION_DRIFT impact class THRESHOLD');
assert(getL11DriftTypeImpactClass(L11ScoreDriftType.FORMULA_VERSION_DRIFT)
  === L11DriftTypeImpactClass.STRUCTURAL,
  'A.15 FORMULA_VERSION_DRIFT impact class STRUCTURAL');
assert(getL11DriftTypeImpactClass(L11ScoreDriftType.REGIME_SPECIFIC_DRIFT)
  === L11DriftTypeImpactClass.ENVIRONMENTAL,
  'A.16 REGIME_SPECIFIC_DRIFT impact class ENVIRONMENTAL');

// Distribution helpers
const summary = summarizeDistribution([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert(summary.count === 10, 'A.17 summary count');
assert(Math.abs(summary.mean - 5.5) < 1e-6, 'A.18 summary mean');
assert(summary.min === 1 && summary.max === 10, 'A.19 summary min/max');

// Drift report structure & replay
const ctx = buildDriftMonitorCtx();
const samples = buildSamples(200, 8);
const monitorResult = runL11ScoreDriftMonitoringEngine({
  ctx,
  baseline: samples.baseline,
  observation: samples.observation,
  baseline_version: 'baseline.v1',
  lineage_refs: ['drift:engine'],
});

assert(monitorResult.reports.length >= 4,
  'A.20 monitoring engine emits ≥4 reports');
for (const r of monitorResult.reports) {
  const sv = isL11DriftReportStructurallyValid(r);
  assert(sv.ok, `A.21 monitoring report ${r.drift_report_id} structurally valid`);
  const expected = canonicalDriftReportReplayHash(
    extractL11DriftReportReplayMaterial(r));
  assert(expected === r.replay_hash,
    `A.22 monitoring report ${r.drift_report_id} replay deterministic`);
}

// Replay determinism: same inputs → same hash
const monitorResult2 = runL11ScoreDriftMonitoringEngine({
  ctx,
  baseline: samples.baseline,
  observation: samples.observation,
  baseline_version: 'baseline.v1',
  lineage_refs: ['drift:engine'],
});
assert(monitorResult.reports.length === monitorResult2.reports.length,
  'A.23 monitoring engine emits same number of reports across runs');
const hashSet1 = monitorResult.reports.map(r => r.replay_hash).sort().join(',');
const hashSet2 = monitorResult2.reports.map(r => r.replay_hash).sort().join(',');
assert(hashSet1 === hashSet2,
  'A.24 monitoring engine replay-stable across reruns');

// Mutation breaks replay
const sampleReport = monitorResult.reports[0];
const mutated = { ...sampleReport, score_version: 'v2' };
const mutatedHash = canonicalDriftReportReplayHash(
  extractL11DriftReportReplayMaterial(mutated));
assert(mutatedHash !== sampleReport.replay_hash,
  'A.25 replay hash flips when score_version changes');

// Drift report structural validator catches missing window
const incompleteReport = { ...sampleReport, observation_window_start: '' };
assert(!isL11DriftReportStructurallyValid(incompleteReport).ok,
  'A.26 missing observation_window_start rejected');

// Validators
const reportIssues = validateL11ScoreDriftReport(sampleReport);
assert(reportIssues.length === 0,
  `A.27 baseline drift report has zero issues (got ${reportIssues.length})`);

assert(validateL11DriftSeverity(undefined).some(i =>
  i.code === L11DriftViolationCode.L11G_DRIFT_SEVERITY_MISSING),
  'A.28 missing severity caught');

const policyVersionFrozen = sampleReport.policy_version === 'l11.7.drift.v1';
assert(policyVersionFrozen, 'A.29 drift policy_version frozen as l11.7.drift.v1');

// Severity / action derivation determinism
assert(deriveDriftSeverity({
  drift_type: L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT,
  statistics: [],
}) === L11DriftSeverity.INFO,
  'A.30 empty stats derive INFO');

const highSev = deriveDriftSeverity({
  drift_type: L11ScoreDriftType.CALIBRATION_DRIFT,
  statistics: [buildDriftStat(L11DriftStatisticType.CORRELATION_DELTA, 0.6, 0.10)],
});
assert(highSev === L11DriftSeverity.CRITICAL,
  'A.31 large correlation delta derives CRITICAL');

assert(deriveRecommendedAction(L11ScoreDriftType.CALIBRATION_DRIFT, L11DriftSeverity.SEVERE)
  === L11DriftRecommendedAction.REQUIRE_RECALIBRATION,
  'A.32 SEVERE calibration drift → REQUIRE_RECALIBRATION');
assert(deriveRecommendedAction(L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT, L11DriftSeverity.SEVERE)
  === L11DriftRecommendedAction.REQUIRE_THRESHOLD_UPDATE,
  'A.33 SEVERE threshold-class drift → REQUIRE_THRESHOLD_UPDATE');

// ═══════════════════════════════════════════════════════════════
// BAND B — drift statistics and action law (§11.7.22 Band B)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: drift statistics and action law ═══');

const statValid = buildDriftStat(L11DriftStatisticType.MEAN_SHIFT, 5, 2);
assert(isL11DriftStatisticStructurallyValid(statValid).ok,
  'B.01 valid stat is structurally valid');
assert(validateL11DriftStatistic(statValid).length === 0,
  'B.02 valid stat passes validator');

// passed_threshold consistency
assert(computeL11DriftStatisticPassed(0.3, 0.2,
  L11DriftThresholdDirection.GREATER_THAN), 'B.03 passed when value > threshold');
assert(!computeL11DriftStatisticPassed(0.1, 0.2,
  L11DriftThresholdDirection.GREATER_THAN), 'B.04 not passed when value < threshold');
assert(computeL11DriftStatisticPassed(-0.5, 0.3,
  L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN),
  'B.05 abs-greater-than passes for negative magnitudes');

const tampered: L11DriftStatistic = { ...statValid, passed_threshold: false };
assert(validateL11DriftStatistic(tampered).some(i =>
  i.code === L11DriftViolationCode.L11G_STATISTIC_PASSED_INCONSISTENT),
  'B.06 tampered passed_threshold caught');

// Sample size sufficiency
const lowSample: L11DriftStatistic = { ...statValid, sample_size: 10 };
assert(!isL11DriftStatisticSampleSufficient(lowSample),
  'B.07 sample below minimum is insufficient');

// Confidence inconsistent with sample
const insufficient: L11DriftStatistic = {
  ...statValid,
  sample_size: 10,
  confidence_class: L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE,
};
assert(validateL11DriftStatistic(insufficient).some(i =>
  i.code === L11DriftViolationCode.L11G_CONFIDENCE_CLASS_INCONSISTENT_WITH_SAMPLE),
  'B.08 high confidence with insufficient sample rejected');

assert(isL11DriftStatisticConfidenceSufficient(
  L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE),
  'B.09 HIGH_CONFIDENCE sufficient');
assert(!isL11DriftStatisticConfidenceSufficient(
  L11DriftStatisticConfidenceClass.LOW_CONFIDENCE),
  'B.10 LOW_CONFIDENCE not sufficient');

// Severity / action consistency
assert(L11_LEGAL_ACTIONS_BY_SEVERITY[L11DriftSeverity.CRITICAL]
  .includes(L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION),
  'B.11 CRITICAL admits REQUIRE_FORMULA_MIGRATION');
assert(!L11_LEGAL_ACTIONS_BY_SEVERITY[L11DriftSeverity.CRITICAL]
  .includes(L11DriftRecommendedAction.NO_ACTION),
  'B.12 CRITICAL does not admit NO_ACTION');
assert(L11_LEGAL_ACTIONS_BY_SEVERITY[L11DriftSeverity.INFO]
  .includes(L11DriftRecommendedAction.NO_ACTION),
  'B.13 INFO admits NO_ACTION');

assert(isL11DriftActionPassive(L11DriftRecommendedAction.NO_ACTION),
  'B.14 NO_ACTION is passive');
assert(isL11DriftActionPassive(L11DriftRecommendedAction.CONTINUE_MONITORING),
  'B.15 CONTINUE_MONITORING is passive');
assert(!isL11DriftActionPassive(L11DriftRecommendedAction.REQUIRE_RECALIBRATION),
  'B.16 REQUIRE_RECALIBRATION not passive');

assert(isL11DriftActionLegalForSeverity(
  L11DriftRecommendedAction.REQUIRE_REVIEW, L11DriftSeverity.MATERIAL),
  'B.17 REQUIRE_REVIEW legal for MATERIAL');
assert(!isL11DriftActionLegalForSeverity(
  L11DriftRecommendedAction.NO_ACTION, L11DriftSeverity.SEVERE),
  'B.18 NO_ACTION illegal for SEVERE');

const calibTypeCheck = isL11DriftActionLegalForType(
  L11DriftRecommendedAction.CONTINUE_MONITORING,
  L11ScoreDriftType.CALIBRATION_DRIFT, L11DriftSeverity.SEVERE);
assert(!calibTypeCheck.ok,
  'B.19 SEVERE calibration drift cannot be CONTINUE_MONITORING');

const thresholdTypeCheck = isL11DriftActionLegalForType(
  L11DriftRecommendedAction.REQUIRE_REVIEW,
  L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT, L11DriftSeverity.MATERIAL);
assert(thresholdTypeCheck.ok,
  'B.20 threshold-class MATERIAL drift admits REQUIRE_REVIEW');

// Crafted offender — CRITICAL with NO_ACTION
const offenderReport_B = buildDriftReport(
  L11ScoreFamily.OPPORTUNITY, L11ScoreDriftType.CALIBRATION_DRIFT,
  L11DriftSeverity.CRITICAL, L11DriftRecommendedAction.NO_ACTION,
  [buildDriftStat(L11DriftStatisticType.CORRELATION_DELTA, 0.6, 0.10)],
);
const offenderIssues_B = validateL11ScoreDriftReport(offenderReport_B);
assert(offenderIssues_B.some(i =>
  i.code === L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION),
  'B.21 CRITICAL+NO_ACTION offender flagged');

// SEVERE calibration with passive action flagged
const offenderReport_C = buildDriftReport(
  L11ScoreFamily.OPPORTUNITY, L11ScoreDriftType.CALIBRATION_DRIFT,
  L11DriftSeverity.SEVERE, L11DriftRecommendedAction.CONTINUE_MONITORING,
  [buildDriftStat(L11DriftStatisticType.CORRELATION_DELTA, 0.3, 0.10)],
);
const offenderIssues_C = validateL11ScoreDriftReport(offenderReport_C);
assert(offenderIssues_C.some(i =>
  i.code === L11DriftViolationCode.L11G_SEVERE_CALIBRATION_DRIFT_PASSIVE_ACTION ||
  i.code === L11DriftViolationCode.L11G_RECOMMENDED_ACTION_INCOMPATIBLE_WITH_SEVERITY),
  'B.22 SEVERE calibration with passive action flagged');

// High-severity from insufficient sample without downgrade flagged
const offenderReport_D = buildDriftReport(
  L11ScoreFamily.OPPORTUNITY, L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT,
  L11DriftSeverity.SEVERE, L11DriftRecommendedAction.REQUIRE_RECALIBRATION,
  [buildDriftStat(L11DriftStatisticType.MEAN_SHIFT, 4, 1,
    L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN, 5, 50,
    L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE)],
);
const offenderIssues_D = validateL11ScoreDriftReport(offenderReport_D);
assert(offenderIssues_D.some(i =>
  i.code === L11DriftViolationCode.L11G_HIGH_SEVERITY_FROM_INSUFFICIENT_SAMPLE) ||
  offenderIssues_D.some(i =>
    i.code === L11DriftViolationCode.L11G_CONFIDENCE_CLASS_INCONSISTENT_WITH_SAMPLE),
  'B.23 SEVERE drift from insufficient sample flagged');

// Recommended action validator alone
const actIssues = validateL11DriftRecommendedAction({
  action: L11DriftRecommendedAction.NO_ACTION,
  severity: L11DriftSeverity.CRITICAL,
  type: L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT,
});
assert(actIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION),
  'B.24 action validator catches CRITICAL+NO_ACTION');

assert(severityForL11DriftCode(
  L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION) === 'CRITICAL',
  'B.25 CRITICAL+NO_ACTION mapped to CRITICAL');
assert(severityForL11DriftCode(
  L11DriftViolationCode.L11G_DRIFT_REPORT_ID_MISSING) === 'ERROR',
  'B.26 missing id mapped to ERROR');

// ═══════════════════════════════════════════════════════════════
// BAND C — threshold governance (§11.7.22 Band C)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: threshold governance ═══');

const goodPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY);
assert(isL11ThresholdPolicyStructurallyValid(goodPolicy).ok,
  'C.01 default threshold policy structurally valid');
assert(checkL11ThresholdPolicyIntegrity(goodPolicy.thresholds).ok,
  'C.02 default thresholds integrity ok');
assert(isL11ThresholdPolicyCoveringFullRange(goodPolicy.thresholds).ok,
  'C.03 default thresholds cover [0, 100]');
assert(validateL11ThresholdPolicy(goodPolicy).length === 0,
  'C.04 default threshold policy passes validator');

// Resolve band
assert(resolveL11ThresholdBand(goodPolicy, 75) === L11ScoreBand.HIGH,
  'C.05 score 75 → HIGH band');
assert(resolveL11ThresholdBand(goodPolicy, 0) === L11ScoreBand.VERY_LOW,
  'C.06 score 0 → VERY_LOW band');
assert(resolveL11ThresholdBand(goodPolicy, 80) === L11ScoreBand.HIGH,
  'C.07 boundary 80 belongs to exactly one band (HIGH)');
assert(resolveL11ThresholdBand(goodPolicy, 100) === L11ScoreBand.VERY_HIGH,
  'C.08 score 100 → VERY_HIGH band');

// Replay
const goodHash = canonicalThresholdPolicyReplayHash(
  extractL11ThresholdPolicyReplayMaterial(goodPolicy));
assert(goodHash === goodPolicy.replay_hash,
  'C.09 threshold policy replay deterministic');
assert(goodPolicy.replay_hash.startsWith('l11g.h.'),
  'C.10 threshold policy replay hash uses l11g namespace');

// Engine-side validation re-runs replay & integrity
const engineResult = engineValidateThreshold(goodPolicy);
assert(engineResult.ok, 'C.11 engine validator returns ok');

// Crafted offender — gap
const gapRules = buildDefaultThresholdRules().filter(r =>
  r.score_band !== L11ScoreBand.MEDIUM);
const gapPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, gapRules);
const gapIssues = validateL11ThresholdPolicy(gapPolicy);
assert(gapIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_POLICY_GAP),
  'C.12 gap detected by validator');

// Crafted offender — overlap
const overlapRules: L11ThresholdBandRule[] = [
  buildBandRule(L11ScoreBand.VERY_LOW, 0, 30, true, true, 'very_low'),
  buildBandRule(L11ScoreBand.LOW, 20, 40, false, true, 'low'),
  buildBandRule(L11ScoreBand.MEDIUM, 40, 60, false, true, 'medium'),
  buildBandRule(L11ScoreBand.HIGH, 60, 80, false, true, 'high'),
  buildBandRule(L11ScoreBand.VERY_HIGH, 80, 100, false, true, 'very_high'),
];
const overlapPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, overlapRules);
const overlapIssues = validateL11ThresholdPolicy(overlapPolicy);
assert(overlapIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_POLICY_OVERLAP),
  'C.13 overlap detected by validator');

// Crafted offender — missing semantic_label
const labelRules = buildDefaultThresholdRules().map((r, i) =>
  i === 2 ? { ...r, semantic_label: '' } : r);
const labelPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, labelRules);
const labelIssues = validateL11ThresholdPolicy(labelPolicy);
assert(labelIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_SEMANTIC_LABEL_MISSING),
  'C.14 missing semantic label flagged');

// Active without calibration target
const noTargetPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, buildDefaultThresholdRules(),
  { calibration_target_refs: [] });
const noTargetIssues = validateL11ThresholdPolicy(noTargetPolicy);
assert(noTargetIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_ACTIVE_THRESHOLD_LACKS_CALIBRATION_TARGET),
  'C.15 active policy without calibration target flagged');

// Threshold change classification — ADDITIVE_SAFE when no prior policy
const additive = classifyL11ThresholdChange(null, goodPolicy);
assert(additive.classification === L11ThresholdChangeClassification.ADDITIVE_SAFE,
  'C.16 no prior policy → ADDITIVE_SAFE');

// Threshold change — semantic break
const breakingRules = buildDefaultThresholdRules().map((r, i) =>
  i === 3 ? { ...r, semantic_label: 'high_BREAKING_SEMANTIC' } : r);
const breakingPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, breakingRules,
  { threshold_version: 'tv2' });
const breakingChange = classifyL11ThresholdChange(goodPolicy, breakingPolicy);
assert(breakingChange.classification === L11ThresholdChangeClassification.BREAKING_SEMANTIC,
  'C.17 semantic_label change → BREAKING_SEMANTIC');
assert(breakingChange.migration_required && breakingChange.recalibration_required,
  'C.18 BREAKING_SEMANTIC requires migration + recalibration');

// Bounds change → MIGRATION_REQUIRED
const movedRules = buildDefaultThresholdRules().map(r =>
  r.score_band === L11ScoreBand.HIGH
    ? buildBandRule(L11ScoreBand.HIGH, 65, 85, false, true, 'high')
    : r.score_band === L11ScoreBand.VERY_HIGH
      ? buildBandRule(L11ScoreBand.VERY_HIGH, 85, 100, false, true, 'very_high')
      : r);
const movedPolicy = buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
  L11ThresholdPolicyStatus.ACTIVE, movedRules,
  { threshold_version: 'tv2' });
const movedChange = classifyL11ThresholdChange(goodPolicy, movedPolicy);
assert(movedChange.classification === L11ThresholdChangeClassification.MIGRATION_REQUIRED,
  'C.19 bounds change → MIGRATION_REQUIRED');

// In-place active rewrite without version bump = PROHIBITED
const inPlace = classifyL11ThresholdChange(goodPolicy,
  buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
    L11ThresholdPolicyStatus.ACTIVE, movedRules));
assert(inPlace.classification === L11ThresholdChangeClassification.PROHIBITED,
  'C.20 active threshold rewrite without version bump → PROHIBITED');

// Threshold change validator detects unclassified
const unclassifiedChangeIssues = validateL11ThresholdChange({
  old_policy: goodPolicy,
  new_policy: movedPolicy,
});
assert(unclassifiedChangeIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED),
  'C.21 unclassified threshold change flagged');

// Declared too weak
const declaredWeakIssues = validateL11ThresholdChange({
  old_policy: goodPolicy,
  new_policy: movedPolicy,
  declared_classification: L11ThresholdChangeClassification.RECALIBRATION_REQUIRED,
});
assert(declaredWeakIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_CHANGE_REQUIRES_MIGRATION),
  'C.22 declared too weak vs engine flagged');

// Historical ambiguity — silent active → active rewrite
const historicalAmbiguity = validateL11ThresholdChange({
  old_policy: goodPolicy,
  new_policy: buildThresholdPolicy(L11ScoreFamily.OPPORTUNITY,
    L11ThresholdPolicyStatus.ACTIVE, movedRules),
  declared_classification: L11ThresholdChangeClassification.ADDITIVE_SAFE,
});
assert(historicalAmbiguity.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_CHANGE_HISTORICAL_AMBIGUITY ||
  i.code === L11DriftViolationCode.L11G_THRESHOLD_CHANGE_PROHIBITED),
  'C.23 historical ambiguity flagged on active in-place rewrite');

assert(L11_THRESHOLD_POLICY_VERSION === 'l11.7.threshold.v1',
  'C.24 threshold policy version frozen as l11.7.threshold.v1');

// Replay validator on a tampered threshold
const tamperedThreshold: L11ThresholdPolicy = {
  ...goodPolicy,
  replay_hash: 'l11g.h.deadbeef',
};
const replayIssues = validateL11DriftReplay({
  threshold_policies: [tamperedThreshold],
});
assert(replayIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_THRESHOLD_REPLAY_HASH_MISMATCH),
  'C.25 tampered threshold replay hash detected');

// ═══════════════════════════════════════════════════════════════
// BAND D — formula change governance (§11.7.22 Band D)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: formula change governance ═══');

const baseFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v1', 'v1');

// Identical formula = no real change → BACKWARD_COMPATIBLE / ADDITIVE_SAFE
const sameFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v1', 'v2');
const noopAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: sameFormula,
});
assert([
  L11FormulaChangeClassification.ADDITIVE_SAFE,
  L11FormulaChangeClassification.BACKWARD_COMPATIBLE,
].includes(noopAssessment.classification),
  'D.01 identical-shape formula change is safe');
assert(noopAssessment.replay_hash.startsWith('l11g.h.'),
  'D.02 formula change replay hash uses l11g namespace');

// Add component
const addedFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v2', 'v2', {
    component_definitions: [
      ...baseFormula.component_definitions,
      {
        component_id: 'comp.opportunity.gamma',
        score_family: L11ScoreFamily.OPPORTUNITY,
        component_name: 'gamma',
        component_role: L11ScoreComponentRole.SECONDARY_POSITIVE_COMPONENT,
        component_direction: L11ComponentDirectionClass.HIGHER_IMPROVES_SCORE,
        required_input_surfaces: [],
        optional_input_surfaces: [],
        normalizer_id: 'norm.linear', normalizer_version: 'v1',
        min_value: 0, max_value: 100, weight: 0.0,
        missing_data_behavior: L11MissingDataBehaviorClass.OMIT_OPTIONAL_COMPONENT,
        required_for_formula: false, attribution_required: true,
        policy_version: 'l11.3.comp.v1',
      },
    ],
  });
const addedAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: addedFormula,
});
assert(addedAssessment.changed_surfaces.includes(L11FormulaChangeSurface.COMPONENT_ADDED),
  'D.03 added component surface detected');
assert(addedAssessment.classification === L11FormulaChangeClassification.ADDITIVE_SAFE,
  'D.04 added component without other change → ADDITIVE_SAFE');

// Component weight changed → RECALIBRATION_REQUIRED
const reweightedFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v3', 'v3', {
    component_definitions: baseFormula.component_definitions.map((c, i) =>
      i === 0 ? { ...c, weight: 0.7 } : { ...c, weight: 0.3 }),
    weight_profile: {
      ...baseFormula.weight_profile,
      formula_version: 'v3',
      component_weights: {
        'comp.opportunity.alpha': 0.7,
        'comp.opportunity.beta': 0.3,
      },
    },
  });
const reweightAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: reweightedFormula,
});
assert(reweightAssessment.changed_surfaces.includes(
  L11FormulaChangeSurface.COMPONENT_WEIGHT_CHANGED),
  'D.05 weight change surface detected');
assert(reweightAssessment.classification ===
  L11FormulaChangeClassification.RECALIBRATION_REQUIRED,
  'D.06 weight change → RECALIBRATION_REQUIRED');
assert(reweightAssessment.recalibration_required, 'D.07 recalibration_required=true');
assert(!reweightAssessment.migration_required, 'D.08 migration_required=false');

// Component direction change → MIGRATION_REQUIRED
const directionFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v4', 'v4', {
    component_definitions: baseFormula.component_definitions.map((c, i) =>
      i === 0 ? { ...c, component_direction: L11ComponentDirectionClass.HIGHER_REDUCES_SCORE } : c),
  });
const dirAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: directionFormula,
});
assert(dirAssessment.changed_surfaces.includes(
  L11FormulaChangeSurface.COMPONENT_DIRECTION_CHANGED),
  'D.09 component direction change surface detected');
assert(dirAssessment.classification === L11FormulaChangeClassification.MIGRATION_REQUIRED,
  'D.10 component direction change → MIGRATION_REQUIRED');
assert(dirAssessment.migration_required, 'D.11 migration_required=true');

// Score direction change without ratification → PROHIBITED
const flippedFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v5', 'v5', {
    score_direction: L11ScoreFamilyDirectionClass.HIGHER_IS_MORE_DANGEROUS,
  });
const flipAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: flippedFormula,
});
assert(flipAssessment.changed_surfaces.includes(
  L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED),
  'D.12 score direction change surface detected');
assert(isL11FormulaAssessmentBlocked(flipAssessment),
  'D.13 silent direction flip → PROHIBITED');

// Score direction change WITH ratification → BREAKING_SEMANTIC
const flipRatified = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: flippedFormula,
  migration_ratification_ref: 'l11.7.ratification.001',
});
assert(flipRatified.classification === L11FormulaChangeClassification.BREAKING_SEMANTIC,
  'D.14 ratified direction flip → BREAKING_SEMANTIC');
assert(flipRatified.replay_backfill_required,
  'D.15 BREAKING_SEMANTIC requires replay backfill');

// Meaning claim change without ratification → PROHIBITED
const meaningFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v6', 'v6', {
    meaning_claim_ref: 'l11.meaning.opportunity.v2',
  });
const meaningAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: meaningFormula,
});
assert(isL11FormulaAssessmentBlocked(meaningAssessment),
  'D.16 silent meaning claim change → PROHIBITED');
const meaningIssues = validateL11FormulaChangeAssessment(meaningAssessment);
assert(meaningIssues.some(i =>
  i.code === L11DriftViolationCode.L11G_MEANING_CHANGE_SILENT),
  'D.17 silent meaning change flagged by validator');

// Required input change → MIGRATION_REQUIRED
const inputChangedFormula = buildFormula(L11ScoreFamily.OPPORTUNITY,
  'l11.formula.opportunity.v7', 'v7', {
    required_input_surfaces: [
      { surface_class: L11DependencySurfaceClass.L8_REGIME_STATE,
        label: 'regime' },
    ],
  });
const inputAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: inputChangedFormula,
});
assert(inputAssessment.changed_surfaces.includes(
  L11FormulaChangeSurface.REQUIRED_INPUT_CHANGED),
  'D.18 required input change surface detected');
assert(inputAssessment.classification ===
  L11FormulaChangeClassification.MIGRATION_REQUIRED,
  'D.19 required input change → MIGRATION_REQUIRED');

// In-place overwrite (no version bump) → PROHIBITED
const inPlaceAssessment = classifyL11FormulaChange({
  old_formula: baseFormula,
  new_formula: { ...baseFormula,
    component_definitions: baseFormula.component_definitions.map((c, i) =>
      i === 0 ? { ...c, weight: 0.99 } : c) },
});
assert(inPlaceAssessment.classification === L11FormulaChangeClassification.PROHIBITED,
  'D.20 in-place edit without version bump → PROHIBITED');

// Cross-checks
assert(l11FormulaChangeRequiresMigration(L11FormulaChangeClassification.BREAKING_SEMANTIC),
  'D.21 BREAKING_SEMANTIC requires migration');
assert(l11FormulaChangeRequiresRecalibration(L11FormulaChangeClassification.RECALIBRATION_REQUIRED),
  'D.22 RECALIBRATION_REQUIRED requires recalibration');
assert(isL11FormulaChangeProhibited(L11FormulaChangeClassification.PROHIBITED),
  'D.23 PROHIBITED is prohibited');
assert(L11_PROHIBITED_SILENT_SURFACES.includes(
  L11FormulaChangeSurface.SCORE_DIRECTION_CHANGED),
  'D.24 SCORE_DIRECTION_CHANGED is in prohibited-silent list');
assert(L11_PROHIBITED_SILENT_SURFACES.includes(
  L11FormulaChangeSurface.MEANING_CLAIM_CHANGED),
  'D.25 MEANING_CLAIM_CHANGED is in prohibited-silent list');

// Validators
const goodAssessmentIssues = validateL11FormulaChangeAssessment(reweightAssessment);
assert(goodAssessmentIssues.length === 0,
  `D.26 reweight assessment passes validator (got ${goodAssessmentIssues.length})`);
assert(isL11FormulaChangeAssessmentStructurallyValid(reweightAssessment).ok,
  'D.27 reweight assessment structurally valid');
assert(validateL11FormulaChangeClassification(undefined).some(i =>
  i.code === L11DriftViolationCode.L11G_FORMULA_CHANGE_UNCLASSIFIED),
  'D.28 missing classification caught');

// Replay determinism
const reweightHash = canonicalFormulaChangeReplayHash(
  extractL11FormulaChangeReplayMaterial(reweightAssessment));
assert(reweightHash === reweightAssessment.replay_hash,
  'D.29 formula change replay deterministic');
const tamperedFormulaChange: L11FormulaChangeAssessment = {
  ...reweightAssessment,
  classification: L11FormulaChangeClassification.ADDITIVE_SAFE,
};
const tamperedHash = canonicalFormulaChangeReplayHash(
  extractL11FormulaChangeReplayMaterial(tamperedFormulaChange));
assert(tamperedHash !== reweightAssessment.replay_hash,
  'D.30 mutated classification flips replay hash');

assert(L11_FORMULA_CHANGE_POLICY_VERSION === 'l11.7.formula-change.v1',
  'D.31 formula change policy version frozen');

// ═══════════════════════════════════════════════════════════════
// BAND E — audit and invariants INV-11.7-A..H (§11.7.22 Band E)
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: audit and invariants ═══');

// Audit deterministic
const audit1 = makeL11DriftAuditRecord(
  L11DriftAuditSubjectClass.DRIFT_REPORT,
  'l11g.drift:001',
  validateL11ScoreDriftReport(offenderReport_B)[0],
  '2026-05-07T00:00:00.000Z');
const audit2 = makeL11DriftAuditRecord(
  L11DriftAuditSubjectClass.DRIFT_REPORT,
  'l11g.drift:001',
  validateL11ScoreDriftReport(offenderReport_B)[0],
  '2026-05-07T00:00:00.000Z');
assert(audit1.audit_id === audit2.audit_id,
  'E.01 audit ID deterministic across recomputes');
assert(audit1.audit_id.startsWith('l11g.audit.'),
  'E.02 audit ID uses l11g.audit prefix');
assert(audit1.severity === 'CRITICAL',
  'E.03 CRITICAL+NO_ACTION audit severity = CRITICAL');

const auditBatch = emitL11DriftAuditRecords(
  L11DriftAuditSubjectClass.DRIFT_REPORT,
  offenderReport_B.drift_report_id,
  validateL11ScoreDriftReport(offenderReport_B),
  '2026-05-07T00:00:00.000Z');
assert(auditBatch.length > 0, 'E.04 audit batch non-empty for offender');

const batchEmit = emitL11DriftAuditBatch(
  L11DriftAuditSubjectClass.THRESHOLD_POLICY,
  'default',
  validateL11ThresholdPolicy(gapPolicy),
  '2026-05-07T00:00:00.000Z');
assert(batchEmit.length > 0, 'E.05 emitL11DriftAuditBatch non-empty');

// Build sample inputs for invariants
const goodReport = monitorResult.reports.find(r =>
  r.drift_type === L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT)!;
const okReports: L11ScoreDriftReport[] = [goodReport];
const okPolicies: L11ThresholdPolicy[] = [goodPolicy];
const okThresholdChanges = [{
  old_policy: goodPolicy,
  new_policy: movedPolicy,
  classification: L11ThresholdChangeClassification.MIGRATION_REQUIRED,
}];
const okFormulaAssessments: L11FormulaChangeAssessment[] = [reweightAssessment];

// INV-11.7-A
const A_pass = invariantA_driftReportCompleteness(okReports);
assert(A_pass.ok, `E.06 INV-11.7-A passes: ${A_pass.evidence}`);
const A_fail = invariantA_driftReportCompleteness([
  { ...goodReport, replay_hash: '' },
]);
assert(!A_fail.ok && A_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_REPLAY_HASH_MISSING),
  'E.07 INV-11.7-A fails on missing replay hash');

// INV-11.7-B
const B_pass = invariantB_severityActionConsistency(okReports);
assert(B_pass.ok, 'E.08 INV-11.7-B passes for good reports');
const B_fail = invariantB_severityActionConsistency([offenderReport_B]);
assert(!B_fail.ok && B_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_CRITICAL_DRIFT_WITH_NO_ACTION),
  'E.09 INV-11.7-B fails on CRITICAL+NO_ACTION offender');

// INV-11.7-C
const C_pass = invariantC_thresholdVersioning(okPolicies);
assert(C_pass.ok, 'E.10 INV-11.7-C passes for good policy');
const C_fail = invariantC_thresholdVersioning([gapPolicy]);
assert(!C_fail.ok && C_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_THRESHOLD_POLICY_GAP ||
  v.code === L11DriftViolationCode.L11G_THRESHOLD_POLICY_DOES_NOT_COVER_FULL_RANGE),
  'E.11 INV-11.7-C fails on gap policy');

// INV-11.7-D
const D_pass = invariantD_thresholdChangeClassification(okThresholdChanges);
assert(D_pass.ok, 'E.12 INV-11.7-D passes for classified change');
const D_fail = invariantD_thresholdChangeClassification([{
  old_policy: goodPolicy, new_policy: movedPolicy,
}]);
assert(!D_fail.ok && D_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED),
  'E.13 INV-11.7-D fails on unclassified change');

// INV-11.7-E
const E_pass = invariantE_formulaChangeClassification(okFormulaAssessments);
assert(E_pass.ok, 'E.14 INV-11.7-E passes on classified assessment');
const E_failBad: L11FormulaChangeAssessment = {
  ...reweightAssessment,
  classification: L11FormulaChangeClassification.MIGRATION_REQUIRED,
  migration_required: false,
};
const E_fail = invariantE_formulaChangeClassification([E_failBad]);
assert(!E_fail.ok && E_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_FORMULA_CHANGE_REQUIRES_MIGRATION),
  'E.15 INV-11.7-E fails on missing migration_required');

// INV-11.7-F (semantic preservation)
const F_pass = invariantF_semanticPreservation(okFormulaAssessments);
assert(F_pass.ok, 'E.16 INV-11.7-F passes on safe assessments');
const F_fail = invariantF_semanticPreservation([flipAssessment]);
assert(!F_fail.ok && F_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_DIRECTION_CHANGE_PROHIBITED),
  'E.17 INV-11.7-F fails on silent direction flip');

// INV-11.7-G (sample confidence)
const G_pass = invariantG_sampleConfidence(okReports);
assert(G_pass.ok, 'E.18 INV-11.7-G passes on sufficient samples');
const G_fail = invariantG_sampleConfidence([offenderReport_D]);
assert(!G_fail.ok, 'E.19 INV-11.7-G fails on SEVERE drift from insufficient sample');

// INV-11.7-H (non-judgment)
const H_pass = invariantH_nonJudgment(okReports);
assert(H_pass.ok, 'E.20 INV-11.7-H passes on neutral reports');
const judgmentReport: L11ScoreDriftReport = {
  ...goodReport,
  evidence_refs: ['recommend long this asset'],
  drift_report_id: 'l11g.drift:judgment.001',
};
const judgmentDraft = { ...judgmentReport };
const judgmentHash = canonicalDriftReportReplayHash(
  extractL11DriftReportReplayMaterial(judgmentDraft));
const judgmentReportFinal: L11ScoreDriftReport = {
  ...judgmentDraft, replay_hash: judgmentHash };
const H_fail = invariantH_nonJudgment([judgmentReportFinal]);
assert(!H_fail.ok && H_fail.violations.some(v =>
  v.code === L11DriftViolationCode.L11G_DRIFT_ACTS_AS_JUDGMENT),
  'E.21 INV-11.7-H fails on judgment-language report');

// Aggregate runner
const aggregate = runL11_7Invariants({
  drift_reports: okReports,
  threshold_policies: okPolicies,
  threshold_changes: okThresholdChanges,
  formula_change_assessments: okFormulaAssessments,
});
assert(aggregate.ok, 'E.22 aggregate runner ok on healthy inputs');
assert(Object.keys(aggregate.results).length === 8,
  'E.23 aggregate runner reports all 8 invariants');

// Drift replay validator runs cleanly on healthy inputs
const replayHealthy = validateL11DriftReplay({
  drift_reports: okReports,
  threshold_policies: okPolicies,
  formula_change_assessments: okFormulaAssessments,
});
assert(replayHealthy.length === 0,
  `E.24 replay validator clean on healthy inputs (got ${replayHealthy.length})`);

// Drift replay validator catches tampered drift report
const tamperedReport: L11ScoreDriftReport = {
  ...goodReport, replay_hash: 'l11g.h.deadbeef' };
const replayTampered = validateL11DriftReplay({
  drift_reports: [tamperedReport],
});
assert(replayTampered.some(i =>
  i.code === L11DriftViolationCode.L11G_REPLAY_HASH_MISMATCH),
  'E.25 tampered drift replay hash detected');

// Severity / action mapping rounds-trip across all severities
for (const sev of ALL_L11_DRIFT_SEVERITIES) {
  const legal = L11_LEGAL_ACTIONS_BY_SEVERITY[sev];
  assert(legal.length >= 1, `E.26 severity ${sev} admits ≥1 action`);
}

assert(ALL_L11_DRIFT_VIOLATION_CODES.every(c =>
  ['CRITICAL', 'ERROR', 'WARNING'].includes(severityForL11DriftCode(c))),
  'E.27 every L11G_ code has a severity mapping');

// Sanity: ScoreBands enum ALL_L11_SCORE_BANDS still accessible (cross-import)
assert(ALL_L11_SCORE_BANDS.length === 5, 'E.28 5 score bands accessible');

// ─────────────────────────────────────────────────────────────────────
// Final summary
// ─────────────────────────────────────────────────────────────────────
console.log('\n═══ L11.7 Certification Summary ═══');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
} else {
  console.log('\nL11.7 certification GREEN.');
  process.exit(0);
}
