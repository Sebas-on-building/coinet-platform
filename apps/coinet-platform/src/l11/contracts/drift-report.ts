/**
 * L11.7 — Score Drift Report (§11.7.7 / §11.7.8 / §11.7.18.1)
 *
 * Canonical drift-report object plus observed-change, baseline,
 * and distribution-summary helper objects, with deterministic
 * replay-hash material.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand, ALL_L11_SCORE_BANDS } from './score-band-policy';
import { L11ScoreDriftType } from './drift-type';
import { L11DriftSeverity } from './drift-severity';
import { L11DriftRecommendedAction } from './drift-recommended-action';
import { L11DriftStatistic } from './drift-statistic';
import { L11FormulaChangeClassification } from './formula-change-classification';
import { L11ThresholdChangeClassification } from './threshold-change-classification';

export const L11_DRIFT_REPORT_POLICY_VERSION = 'l11.7.drift.v1';

// ── Distribution / observed-change / baseline objects (§11.7.8) ──

export interface L11DistributionSummary {
  readonly count: number;
  readonly mean: number;
  readonly median: number;
  readonly stddev: number;
  readonly p05: number;
  readonly p25: number;
  readonly p75: number;
  readonly p95: number;
  readonly min: number;
  readonly max: number;
}

export interface L11ObservedDriftChange {
  readonly observed_value: number;
  readonly observed_distribution_summary?: L11DistributionSummary;
  readonly observed_rate?: number;
  readonly observed_correlation?: number;
  readonly observed_band_frequency?:
    Readonly<Partial<Record<L11ScoreBand, number>>>;
  readonly observed_component_summary?:
    Readonly<Record<string, L11DistributionSummary>>;
  readonly observed_missing_data_rate?: number;
  readonly observed_top_driver_frequency?:
    Readonly<Record<string, number>>;
}

export interface L11ExpectedDriftBaseline {
  readonly baseline_value: number;
  readonly baseline_distribution_summary?: L11DistributionSummary;
  readonly baseline_rate?: number;
  readonly baseline_correlation?: number;
  readonly baseline_band_frequency?:
    Readonly<Partial<Record<L11ScoreBand, number>>>;
  readonly baseline_component_summary?:
    Readonly<Record<string, L11DistributionSummary>>;
  readonly baseline_missing_data_rate?: number;
  readonly baseline_top_driver_frequency?:
    Readonly<Record<string, number>>;
  readonly baseline_version: string;
}

// ── Drift report (§11.7.7) ───────────────────────────────────────

export interface L11ScoreDriftReport {
  readonly drift_report_id: string;

  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly formula_id: string;
  readonly formula_version: string;

  readonly drift_type: L11ScoreDriftType;
  readonly drift_severity: L11DriftSeverity;

  readonly scope_type?: string;
  readonly scope_id?: string;

  readonly cohort_ref: string;
  readonly calibration_target_ref?: string;

  readonly observation_window_start: string;
  readonly observation_window_end: string;

  readonly baseline_window_start: string;
  readonly baseline_window_end: string;

  readonly affected_components: readonly string[];
  readonly affected_score_bands: readonly L11ScoreBand[];
  readonly affected_regime_refs: readonly string[];
  readonly affected_sequence_refs: readonly string[];
  readonly affected_hypothesis_refs: readonly string[];

  readonly observed_change: L11ObservedDriftChange;
  readonly expected_baseline: L11ExpectedDriftBaseline;

  readonly drift_statistics: readonly L11DriftStatistic[];

  readonly recommended_action: L11DriftRecommendedAction;

  readonly formula_change_classification?: L11FormulaChangeClassification;
  readonly threshold_change_classification?: L11ThresholdChangeClassification;

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL11DriftReportStructurallyValid(
  r: L11ScoreDriftReport,
): { ok: boolean; reason: string } {
  if (!r.drift_report_id) return { ok: false, reason: 'drift_report_id missing' };
  if (!r.score_family) return { ok: false, reason: 'score_family missing' };
  if (!r.score_version) return { ok: false, reason: 'score_version missing' };
  if (!r.formula_id) return { ok: false, reason: 'formula_id missing' };
  if (!r.formula_version) return { ok: false, reason: 'formula_version missing' };
  if (!r.drift_type) return { ok: false, reason: 'drift_type missing' };
  if (!r.drift_severity) return { ok: false, reason: 'drift_severity missing' };
  if (!r.observation_window_start || !r.observation_window_end) {
    return { ok: false, reason: 'observation window missing' };
  }
  if (!r.baseline_window_start || !r.baseline_window_end) {
    return { ok: false, reason: 'baseline window missing' };
  }
  if (!r.observed_change) {
    return { ok: false, reason: 'observed_change missing' };
  }
  if (!r.expected_baseline) {
    return { ok: false, reason: 'expected_baseline missing' };
  }
  if (!r.recommended_action) {
    return { ok: false, reason: 'recommended_action missing' };
  }
  if (!r.cohort_ref) return { ok: false, reason: 'cohort_ref missing' };
  if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (!r.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  return { ok: true, reason: 'ok' };
}

// ── Replay material (§11.7.18.1) ─────────────────────────────────

export interface L11DriftReportReplayMaterial {
  readonly drift_report_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;
  readonly formula_id: string;
  readonly formula_version: string;
  readonly drift_type: L11ScoreDriftType;
  readonly drift_severity: L11DriftSeverity;
  readonly cohort_ref: string;
  readonly calibration_target_ref?: string;
  readonly baseline_window: string;
  readonly observation_window: string;
  readonly affected_components: readonly string[];
  readonly affected_score_bands: readonly L11ScoreBand[];
  readonly affected_regime_refs: readonly string[];
  readonly affected_sequence_refs: readonly string[];
  readonly affected_hypothesis_refs: readonly string[];
  readonly observed_value: number;
  readonly baseline_value: number;
  readonly baseline_version: string;
  readonly statistic_keys: readonly string[];
  readonly recommended_action: L11DriftRecommendedAction;
  readonly formula_change_classification?: L11FormulaChangeClassification;
  readonly threshold_change_classification?: L11ThresholdChangeClassification;
  readonly policy_version: string;
}

function statKey(s: L11DriftStatistic): string {
  return [
    s.statistic_id,
    s.statistic_type,
    normalizeNum(s.statistic_value),
    normalizeNum(s.threshold_value),
    s.threshold_direction,
    s.passed_threshold ? '1' : '0',
    s.sample_size,
    s.minimum_sample_size,
    s.confidence_class,
  ].join('|');
}

export function extractL11DriftReportReplayMaterial(
  r: Omit<L11ScoreDriftReport, 'replay_hash'> | L11ScoreDriftReport,
): L11DriftReportReplayMaterial {
  return {
    drift_report_id: r.drift_report_id,
    score_family: r.score_family,
    score_version: r.score_version,
    formula_id: r.formula_id,
    formula_version: r.formula_version,
    drift_type: r.drift_type,
    drift_severity: r.drift_severity,
    cohort_ref: r.cohort_ref,
    calibration_target_ref: r.calibration_target_ref,
    baseline_window: `${r.baseline_window_start}..${r.baseline_window_end}`,
    observation_window: `${r.observation_window_start}..${r.observation_window_end}`,
    affected_components: r.affected_components,
    affected_score_bands: r.affected_score_bands,
    affected_regime_refs: r.affected_regime_refs,
    affected_sequence_refs: r.affected_sequence_refs,
    affected_hypothesis_refs: r.affected_hypothesis_refs,
    observed_value: r.observed_change.observed_value,
    baseline_value: r.expected_baseline.baseline_value,
    baseline_version: r.expected_baseline.baseline_version,
    statistic_keys: r.drift_statistics.map(statKey),
    recommended_action: r.recommended_action,
    formula_change_classification: r.formula_change_classification,
    threshold_change_classification: r.threshold_change_classification,
    policy_version: r.policy_version,
  };
}

export function canonicalDriftReportReplayHash(
  m: L11DriftReportReplayMaterial,
): string {
  const parts: string[] = [];
  parts.push(`drid:${m.drift_report_id}`);
  parts.push(`fam:${m.score_family}`);
  parts.push(`sv:${m.score_version}`);
  parts.push(`fid:${m.formula_id}`);
  parts.push(`fv:${m.formula_version}`);
  parts.push(`dt:${m.drift_type}`);
  parts.push(`ds:${m.drift_severity}`);
  parts.push(`coh:${m.cohort_ref}`);
  parts.push(`ct:${m.calibration_target_ref ?? ''}`);
  parts.push(`bw:${m.baseline_window}`);
  parts.push(`ow:${m.observation_window}`);
  parts.push(`ac:${[...m.affected_components].sort().join('|')}`);
  parts.push(`abnd:${[...m.affected_score_bands].sort().join('|')}`);
  parts.push(`areg:${[...m.affected_regime_refs].sort().join('|')}`);
  parts.push(`aseq:${[...m.affected_sequence_refs].sort().join('|')}`);
  parts.push(`ahyp:${[...m.affected_hypothesis_refs].sort().join('|')}`);
  parts.push(`ov:${normalizeNum(m.observed_value)}`);
  parts.push(`bv:${normalizeNum(m.baseline_value)}`);
  parts.push(`bvr:${m.baseline_version}`);
  parts.push(`stk:${[...m.statistic_keys].sort().join('||')}`);
  parts.push(`act:${m.recommended_action}`);
  parts.push(`fcc:${m.formula_change_classification ?? ''}`);
  parts.push(`tcc:${m.threshold_change_classification ?? ''}`);
  parts.push(`pv:${m.policy_version}`);
  return fnv1a32('l11g.drift::' + parts.join('::'));
}

function normalizeNum(n: number): string {
  if (!Number.isFinite(n)) return 'NaN';
  if (Number.isInteger(n)) return `${n}.000000`;
  return n.toFixed(6);
}

function fnv1a32(s: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `l11g.h.${hash.toString(16).padStart(8, '0')}`;
}

void ALL_L11_SCORE_BANDS;
