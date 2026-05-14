/**
 * L11.6 — Outcome Metric Registry (§11.6.13)
 *
 * Wraps the static metric catalogue with structural validation
 * and family/horizon coverage diagnostics.
 */

import {
  L11OutcomeMetric,
  L11OutcomeMetricDefinition,
  L11_OUTCOME_METRIC_DEFINITIONS,
  ALL_L11_OUTCOME_METRICS,
  getL11OutcomeMetricDefinition,
} from '../contracts/outcome-metric';
import {
  L11ScoreFamily,
  L11_PRODUCTION_SCORE_FAMILIES,
} from '../contracts/score-family';

export interface L11OutcomeMetricRegistryIssue {
  readonly metric: L11OutcomeMetric | null;
  readonly score_family: L11ScoreFamily | null;
  readonly reason: string;
}

export interface L11OutcomeMetricRegistryReport {
  readonly ok: boolean;
  readonly count: number;
  readonly metrics_by_family: Readonly<Record<string, readonly L11OutcomeMetric[]>>;
  readonly issues: readonly L11OutcomeMetricRegistryIssue[];
}

export function buildL11OutcomeMetricRegistryReport(
  defs: readonly L11OutcomeMetricDefinition[] = L11_OUTCOME_METRIC_DEFINITIONS,
): L11OutcomeMetricRegistryReport {
  const issues: L11OutcomeMetricRegistryIssue[] = [];
  const seen = new Set<L11OutcomeMetric>();
  const byFamily: Record<string, L11OutcomeMetric[]> = {};

  for (const d of defs) {
    if (seen.has(d.metric)) {
      issues.push({ metric: d.metric, score_family: null,
        reason: 'duplicate outcome metric' });
      continue;
    }
    seen.add(d.metric);

    if (d.allowed_score_families.length === 0) {
      issues.push({ metric: d.metric, score_family: null,
        reason: 'metric has no allowed_score_families' });
    }
    if (d.allowed_horizons.length === 0) {
      issues.push({ metric: d.metric, score_family: null,
        reason: 'metric has no allowed_horizons' });
    }
    if (d.required_future_data_surface_refs.length === 0) {
      issues.push({ metric: d.metric, score_family: null,
        reason: 'metric has no required_future_data_surface_refs' });
    }

    for (const f of d.allowed_score_families) {
      byFamily[f] ??= [];
      byFamily[f].push(d.metric);
    }
  }

  for (const m of ALL_L11_OUTCOME_METRICS) {
    if (!seen.has(m)) {
      issues.push({ metric: m, score_family: null,
        reason: `metric ${m} listed in enum but missing definition` });
    }
  }

  for (const f of L11_PRODUCTION_SCORE_FAMILIES) {
    const list = byFamily[f] ?? [];
    if (list.length === 0) {
      issues.push({ metric: null, score_family: f,
        reason: `production family ${f} has no outcome metric registered` });
    }
  }

  return {
    ok: issues.length === 0,
    count: defs.length,
    metrics_by_family: byFamily,
    issues,
  };
}

export { getL11OutcomeMetricDefinition };
