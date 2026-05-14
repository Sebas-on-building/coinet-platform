/**
 * L11.7 — Score Drift Monitoring Engine (§11.7.14)
 *
 * Deterministic 16-stage pipeline that consumes baseline +
 * observation samples and emits canonical
 * `L11ScoreDriftReport[]`.
 *
 * The engine is *stateless and replay-deterministic*: identical
 * inputs always produce identical drift reports.
 */

import { L11ScoreFamily } from '../contracts/score-family';
import { L11ScoreBand } from '../contracts/score-band-policy';
import {
  L11ScoreDriftType,
  getL11DriftTypeImpactClass,
  L11DriftTypeImpactClass,
} from '../contracts/drift-type';
import {
  L11DriftSeverity,
  isL11DriftSeverityAtLeast,
} from '../contracts/drift-severity';
import {
  L11DriftRecommendedAction,
  L11_LEGAL_ACTIONS_BY_SEVERITY,
} from '../contracts/drift-recommended-action';
import {
  L11DriftStatistic,
  L11DriftStatisticType,
  L11DriftStatisticConfidenceClass,
  L11DriftThresholdDirection,
  computeL11DriftStatisticPassed,
  isL11DriftStatisticSampleSufficient,
} from '../contracts/drift-statistic';
import {
  L11ScoreDriftReport,
  L11DistributionSummary,
  L11ObservedDriftChange,
  L11ExpectedDriftBaseline,
  L11_DRIFT_REPORT_POLICY_VERSION,
  extractL11DriftReportReplayMaterial,
  canonicalDriftReportReplayHash,
} from '../contracts/drift-report';

// ── Engine context and inputs ────────────────────────────────────

export interface L11DriftMonitorContext {
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly cohort_ref: string;
  readonly calibration_target_ref?: string;
  readonly baseline_window_start: string;
  readonly baseline_window_end: string;
  readonly observation_window_start: string;
  readonly observation_window_end: string;
  readonly minimum_sample_size: number;
  readonly drift_report_id_prefix: string;
}

export interface L11DriftSampleStats {
  readonly score_values: readonly number[];
  readonly band_frequency?: Readonly<Partial<Record<L11ScoreBand, number>>>;
  readonly missing_data_rate?: number;
  readonly outcome_correlation?: number;
  readonly top_driver_frequency?: Readonly<Record<string, number>>;
  readonly component_summaries?: Readonly<Record<string, L11DistributionSummary>>;
  readonly affected_regime_refs?: readonly string[];
  readonly affected_sequence_refs?: readonly string[];
  readonly affected_hypothesis_refs?: readonly string[];
}

export interface L11DriftMonitorInputs {
  readonly ctx: L11DriftMonitorContext;
  readonly baseline: L11DriftSampleStats;
  readonly observation: L11DriftSampleStats;
  readonly baseline_version: string;
  readonly lineage_refs: readonly string[];
  readonly evidence_refs?: readonly string[];
}

export interface L11DriftMonitorResult {
  readonly reports: readonly L11ScoreDriftReport[];
  readonly skipped: readonly { drift_type: L11ScoreDriftType; reason: string }[];
}

// ── Distribution helpers ─────────────────────────────────────────

export function summarizeDistribution(
  values: readonly number[],
): L11DistributionSummary {
  if (values.length === 0) {
    return {
      count: 0, mean: 0, median: 0, stddev: 0,
      p05: 0, p25: 0, p75: 0, p95: 0, min: 0, max: 0,
    };
  }
  const sorted = [...values].filter(v => Number.isFinite(v))
    .sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = sorted.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
  const stddev = Math.sqrt(variance);
  const q = (p: number): number => {
    if (n === 1) return sorted[0];
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return {
    count: n,
    mean,
    median: q(0.5),
    stddev,
    p05: q(0.05),
    p25: q(0.25),
    p75: q(0.75),
    p95: q(0.95),
    min: sorted[0],
    max: sorted[n - 1],
  };
}

function deriveConfidenceClass(
  sample: number,
  minimum: number,
): L11DriftStatisticConfidenceClass {
  if (sample <= 0 || sample < minimum) {
    return L11DriftStatisticConfidenceClass.INSUFFICIENT_SAMPLE;
  }
  if (sample < minimum * 2) return L11DriftStatisticConfidenceClass.LOW_CONFIDENCE;
  if (sample < minimum * 5) return L11DriftStatisticConfidenceClass.MODERATE_CONFIDENCE;
  return L11DriftStatisticConfidenceClass.HIGH_CONFIDENCE;
}

/**
 * Population stability index (PSI) over a fixed band partition:
 *   PSI = Σ (obs_i - exp_i) * ln(obs_i / exp_i)
 * with smoothing for zero buckets.
 */
function computePsi(
  baseline: Readonly<Partial<Record<L11ScoreBand, number>>>,
  observation: Readonly<Partial<Record<L11ScoreBand, number>>>,
): number {
  const bands: L11ScoreBand[] = [
    L11ScoreBand.VERY_LOW, L11ScoreBand.LOW, L11ScoreBand.MEDIUM,
    L11ScoreBand.HIGH, L11ScoreBand.VERY_HIGH,
  ];
  const sumB = bands.reduce((s, b) => s + (baseline[b] ?? 0), 0);
  const sumO = bands.reduce((s, b) => s + (observation[b] ?? 0), 0);
  if (sumB === 0 || sumO === 0) return 0;
  let psi = 0;
  for (const b of bands) {
    const eps = 1e-6;
    const e = ((baseline[b] ?? 0) / sumB) || eps;
    const o = ((observation[b] ?? 0) / sumO) || eps;
    psi += (o - e) * Math.log(o / e);
  }
  return psi;
}

// ── Severity derivation ──────────────────────────────────────────

interface SeverityDerivationInput {
  readonly drift_type: L11ScoreDriftType;
  readonly statistics: readonly L11DriftStatistic[];
}

/**
 * §11.7.6.3 — Severity is derived from the maximum-class
 * statistic, downgraded if confidence is insufficient.
 */
export function deriveDriftSeverity(
  inp: SeverityDerivationInput,
): L11DriftSeverity {
  if (inp.statistics.length === 0) return L11DriftSeverity.INFO;
  let candidate = L11DriftSeverity.INFO;
  for (const s of inp.statistics) {
    if (!s.passed_threshold) continue;
    const ratio = s.threshold_value !== 0
      ? Math.abs(s.statistic_value) / Math.abs(s.threshold_value)
      : Math.abs(s.statistic_value);
    let bucket: L11DriftSeverity;
    if (ratio >= 4) bucket = L11DriftSeverity.CRITICAL;
    else if (ratio >= 2.5) bucket = L11DriftSeverity.SEVERE;
    else if (ratio >= 1.5) bucket = L11DriftSeverity.MATERIAL;
    else bucket = L11DriftSeverity.WATCH;
    if (s.confidence_class === L11DriftStatisticConfidenceClass.INSUFFICIENT_SAMPLE) {
      bucket = L11DriftSeverity.INFO;
    } else if (s.confidence_class === L11DriftStatisticConfidenceClass.LOW_CONFIDENCE) {
      if (bucket === L11DriftSeverity.CRITICAL) bucket = L11DriftSeverity.MATERIAL;
      else if (bucket === L11DriftSeverity.SEVERE) bucket = L11DriftSeverity.MATERIAL;
    }
    if (driftSeverityRank(bucket) > driftSeverityRank(candidate)) {
      candidate = bucket;
    }
  }
  // Calibration drift may not be MATERIAL or stronger without a
  // calibration-class action; severity-engine just classifies.
  void getL11DriftTypeImpactClass(inp.drift_type);
  return candidate;
}

function driftSeverityRank(s: L11DriftSeverity): number {
  switch (s) {
    case L11DriftSeverity.INFO: return 0;
    case L11DriftSeverity.WATCH: return 1;
    case L11DriftSeverity.MATERIAL: return 2;
    case L11DriftSeverity.SEVERE: return 3;
    case L11DriftSeverity.CRITICAL: return 4;
  }
}

// ── Action derivation ────────────────────────────────────────────

/**
 * §11.7.10.2 — Pick the canonical recommended action for a drift
 * type at a given severity. The engine picks the *strongest
 * required* action, never a passive one for SEVERE/CRITICAL.
 */
export function deriveRecommendedAction(
  type: L11ScoreDriftType,
  severity: L11DriftSeverity,
): L11DriftRecommendedAction {
  const impact = getL11DriftTypeImpactClass(type);
  if (severity === L11DriftSeverity.CRITICAL) {
    if (impact === L11DriftTypeImpactClass.CALIBRATION) {
      return L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION;
    }
    if (impact === L11DriftTypeImpactClass.STRUCTURAL) {
      return L11DriftRecommendedAction.FREEZE_SCORE_FAMILY;
    }
    if (impact === L11DriftTypeImpactClass.THRESHOLD) {
      return L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION;
    }
    return L11DriftRecommendedAction.BLOCK_CURRENT_EMISSION;
  }
  if (severity === L11DriftSeverity.SEVERE) {
    if (impact === L11DriftTypeImpactClass.CALIBRATION) {
      return L11DriftRecommendedAction.REQUIRE_RECALIBRATION;
    }
    if (impact === L11DriftTypeImpactClass.THRESHOLD) {
      return L11DriftRecommendedAction.REQUIRE_THRESHOLD_UPDATE;
    }
    if (impact === L11DriftTypeImpactClass.STRUCTURAL) {
      return L11DriftRecommendedAction.REQUIRE_FORMULA_MIGRATION;
    }
    return L11DriftRecommendedAction.REQUIRE_RECALIBRATION;
  }
  if (severity === L11DriftSeverity.MATERIAL) {
    return L11DriftRecommendedAction.REQUIRE_REVIEW;
  }
  if (severity === L11DriftSeverity.WATCH) {
    return L11DriftRecommendedAction.CONTINUE_MONITORING;
  }
  return L11DriftRecommendedAction.NO_ACTION;
}

// ── Stage helpers ────────────────────────────────────────────────

function makeStat(
  ctx: L11DriftMonitorContext,
  type: L11DriftStatisticType,
  value: number,
  threshold: number,
  direction: L11DriftThresholdDirection,
  sampleSize: number,
  policyVersion: string,
): L11DriftStatistic {
  const minSample = ctx.minimum_sample_size;
  const confidence = deriveConfidenceClass(sampleSize, minSample);
  const passed = computeL11DriftStatisticPassed(value, threshold, direction);
  return {
    statistic_id: `stat:${type.toLowerCase()}::${ctx.formula_id}@${ctx.formula_version}`,
    statistic_type: type,
    statistic_value: value,
    threshold_value: threshold,
    threshold_direction: direction,
    passed_threshold: passed,
    sample_size: sampleSize,
    minimum_sample_size: minSample,
    confidence_class: confidence,
    policy_version: policyVersion,
  };
}

function buildReport(
  inp: L11DriftMonitorInputs,
  type: L11ScoreDriftType,
  observed: L11ObservedDriftChange,
  baseline: L11ExpectedDriftBaseline,
  statistics: readonly L11DriftStatistic[],
  affectedComponents: readonly string[],
  affectedBands: readonly L11ScoreBand[],
): L11ScoreDriftReport | null {
  const severity = deriveDriftSeverity({ drift_type: type, statistics });
  // We still emit INFO reports because the spec requires
  // governance-grade observability, not only material reports.
  const action = deriveRecommendedAction(type, severity);
  const ctx = inp.ctx;
  const id = `${ctx.drift_report_id_prefix}:${type.toLowerCase()}::${ctx.formula_id}@${ctx.formula_version}::${ctx.observation_window_start}->${ctx.observation_window_end}`;
  const draft: Omit<L11ScoreDriftReport, 'replay_hash'> = {
    drift_report_id: id,
    score_family: ctx.score_family,
    score_version: ctx.score_version,
    formula_id: ctx.formula_id,
    formula_version: ctx.formula_version,
    drift_type: type,
    drift_severity: severity,
    cohort_ref: ctx.cohort_ref,
    calibration_target_ref: ctx.calibration_target_ref,
    observation_window_start: ctx.observation_window_start,
    observation_window_end: ctx.observation_window_end,
    baseline_window_start: ctx.baseline_window_start,
    baseline_window_end: ctx.baseline_window_end,
    affected_components: affectedComponents,
    affected_score_bands: affectedBands,
    affected_regime_refs: inp.observation.affected_regime_refs ?? [],
    affected_sequence_refs: inp.observation.affected_sequence_refs ?? [],
    affected_hypothesis_refs: inp.observation.affected_hypothesis_refs ?? [],
    observed_change: observed,
    expected_baseline: baseline,
    drift_statistics: statistics,
    recommended_action: action,
    lineage_refs: inp.lineage_refs,
    evidence_refs: inp.evidence_refs ?? [],
    policy_version: L11_DRIFT_REPORT_POLICY_VERSION,
  };
  const material = extractL11DriftReportReplayMaterial(draft);
  const hash = canonicalDriftReportReplayHash(material);
  return { ...draft, replay_hash: hash };
}

// ── Engine entrypoint ────────────────────────────────────────────

export function runL11ScoreDriftMonitoringEngine(
  inputs: L11DriftMonitorInputs,
): L11DriftMonitorResult {
  const reports: L11ScoreDriftReport[] = [];
  const skipped: { drift_type: L11ScoreDriftType; reason: string }[] = [];
  const ctx = inputs.ctx;
  const baselineSummary = summarizeDistribution(inputs.baseline.score_values);
  const observedSummary = summarizeDistribution(inputs.observation.score_values);
  const obsCount = observedSummary.count;
  const baseCount = baselineSummary.count;

  // Stage 6 — score distribution drift (mean shift)
  {
    const meanShift = observedSummary.mean - baselineSummary.mean;
    const stat = makeStat(
      ctx,
      L11DriftStatisticType.MEAN_SHIFT,
      meanShift,
      Math.max(0.5, baselineSummary.stddev),
      L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN,
      Math.min(obsCount, baseCount),
      L11_DRIFT_REPORT_POLICY_VERSION,
    );
    const observed: L11ObservedDriftChange = {
      observed_value: observedSummary.mean,
      observed_distribution_summary: observedSummary,
      observed_band_frequency: inputs.observation.band_frequency,
      observed_missing_data_rate: inputs.observation.missing_data_rate,
    };
    const baseline: L11ExpectedDriftBaseline = {
      baseline_value: baselineSummary.mean,
      baseline_distribution_summary: baselineSummary,
      baseline_band_frequency: inputs.baseline.band_frequency,
      baseline_missing_data_rate: inputs.baseline.missing_data_rate,
      baseline_version: inputs.baseline_version,
    };
    const report = buildReport(
      inputs, L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT,
      observed, baseline, [stat], [], []);
    if (report) reports.push(report);
  }

  // Stage 8 — band frequency drift (PSI)
  if (inputs.baseline.band_frequency && inputs.observation.band_frequency) {
    const psi = computePsi(inputs.baseline.band_frequency,
      inputs.observation.band_frequency);
    const stat = makeStat(
      ctx,
      L11DriftStatisticType.PSI,
      psi,
      0.2,
      L11DriftThresholdDirection.GREATER_THAN,
      obsCount,
      L11_DRIFT_REPORT_POLICY_VERSION,
    );
    const observed: L11ObservedDriftChange = {
      observed_value: psi,
      observed_band_frequency: inputs.observation.band_frequency,
    };
    const baseline: L11ExpectedDriftBaseline = {
      baseline_value: 0,
      baseline_band_frequency: inputs.baseline.band_frequency,
      baseline_version: inputs.baseline_version,
    };
    const affectedBands: L11ScoreBand[] = [];
    for (const b of [
      L11ScoreBand.VERY_LOW, L11ScoreBand.LOW, L11ScoreBand.MEDIUM,
      L11ScoreBand.HIGH, L11ScoreBand.VERY_HIGH,
    ]) {
      const baseFreq = inputs.baseline.band_frequency[b] ?? 0;
      const obsFreq = inputs.observation.band_frequency[b] ?? 0;
      if (Math.abs(obsFreq - baseFreq) > 0) affectedBands.push(b);
    }
    const report = buildReport(
      inputs, L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT,
      observed, baseline, [stat], [], affectedBands);
    if (report) reports.push(report);
  } else {
    skipped.push({
      drift_type: L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT,
      reason: 'band_frequency missing on baseline or observation',
    });
  }

  // Stage 9 — calibration / outcome correlation drift
  if (typeof inputs.baseline.outcome_correlation === 'number' &&
      typeof inputs.observation.outcome_correlation === 'number') {
    const delta = inputs.observation.outcome_correlation -
      inputs.baseline.outcome_correlation;
    const stat = makeStat(
      ctx,
      L11DriftStatisticType.CORRELATION_DELTA,
      delta,
      0.10,
      L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN,
      Math.min(obsCount, baseCount),
      L11_DRIFT_REPORT_POLICY_VERSION,
    );
    const observed: L11ObservedDriftChange = {
      observed_value: inputs.observation.outcome_correlation,
      observed_correlation: inputs.observation.outcome_correlation,
    };
    const baseline: L11ExpectedDriftBaseline = {
      baseline_value: inputs.baseline.outcome_correlation,
      baseline_correlation: inputs.baseline.outcome_correlation,
      baseline_version: inputs.baseline_version,
    };
    const report = buildReport(
      inputs, L11ScoreDriftType.CALIBRATION_DRIFT,
      observed, baseline, [stat], [], []);
    if (report) reports.push(report);
  } else {
    skipped.push({
      drift_type: L11ScoreDriftType.CALIBRATION_DRIFT,
      reason: 'outcome_correlation missing on baseline or observation',
    });
  }

  // Stage 11 — attribution-driver drift (top driver shift)
  if (inputs.baseline.top_driver_frequency &&
      inputs.observation.top_driver_frequency) {
    const baseEntries = Object.entries(inputs.baseline.top_driver_frequency);
    const obsEntries = Object.entries(inputs.observation.top_driver_frequency);
    const baseSum = baseEntries.reduce((s, [, v]) => s + v, 0) || 1;
    const obsSum = obsEntries.reduce((s, [, v]) => s + v, 0) || 1;
    let l1 = 0;
    const keys = new Set<string>([
      ...baseEntries.map(([k]) => k),
      ...obsEntries.map(([k]) => k),
    ]);
    for (const k of keys) {
      const b = (inputs.baseline.top_driver_frequency[k] ?? 0) / baseSum;
      const o = (inputs.observation.top_driver_frequency[k] ?? 0) / obsSum;
      l1 += Math.abs(o - b);
    }
    const stat = makeStat(
      ctx,
      L11DriftStatisticType.TOP_DRIVER_FREQUENCY_SHIFT,
      l1,
      0.3,
      L11DriftThresholdDirection.GREATER_THAN,
      Math.min(obsCount, baseCount),
      L11_DRIFT_REPORT_POLICY_VERSION,
    );
    const observed: L11ObservedDriftChange = {
      observed_value: l1,
      observed_top_driver_frequency: inputs.observation.top_driver_frequency,
    };
    const baseline: L11ExpectedDriftBaseline = {
      baseline_value: 0,
      baseline_top_driver_frequency: inputs.baseline.top_driver_frequency,
      baseline_version: inputs.baseline_version,
    };
    const report = buildReport(
      inputs, L11ScoreDriftType.ATTRIBUTION_DRIVER_DRIFT,
      observed, baseline, [stat],
      Array.from(keys).sort(), []);
    if (report) reports.push(report);
  }

  // Stage 12 — missing-data frequency drift
  if (typeof inputs.baseline.missing_data_rate === 'number' &&
      typeof inputs.observation.missing_data_rate === 'number') {
    const delta = inputs.observation.missing_data_rate -
      inputs.baseline.missing_data_rate;
    const stat = makeStat(
      ctx,
      L11DriftStatisticType.MISSING_DATA_RATE_SHIFT,
      delta,
      0.05,
      L11DriftThresholdDirection.ABSOLUTE_GREATER_THAN,
      Math.min(obsCount, baseCount),
      L11_DRIFT_REPORT_POLICY_VERSION,
    );
    const observed: L11ObservedDriftChange = {
      observed_value: inputs.observation.missing_data_rate,
      observed_missing_data_rate: inputs.observation.missing_data_rate,
    };
    const baseline: L11ExpectedDriftBaseline = {
      baseline_value: inputs.baseline.missing_data_rate,
      baseline_missing_data_rate: inputs.baseline.missing_data_rate,
      baseline_version: inputs.baseline_version,
    };
    const report = buildReport(
      inputs, L11ScoreDriftType.MISSING_DATA_FREQUENCY_DRIFT,
      observed, baseline, [stat], [], []);
    if (report) reports.push(report);
  }

  return { reports, skipped };
}

/** Convenience helper: was sample size sufficient for a stat? */
export function isDriftStatSampleSufficient(s: L11DriftStatistic): boolean {
  return isL11DriftStatisticSampleSufficient(s);
}

/** Convenience helper: action / severity admissibility (re-export). */
export function isLegalActionForSeverity(
  action: L11DriftRecommendedAction,
  severity: L11DriftSeverity,
): boolean {
  return L11_LEGAL_ACTIONS_BY_SEVERITY[severity].includes(action);
}

/**
 * Severity escalation helper used by validators and downstream
 * adapters: returns true iff `severity` is at least MATERIAL.
 */
export function isMaterialOrStronger(severity: L11DriftSeverity): boolean {
  return isL11DriftSeverityAtLeast(severity, L11DriftSeverity.MATERIAL);
}
