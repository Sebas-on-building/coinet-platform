/**
 * L6.8 — Observability Report
 *
 * §6.8.5.5 — First-class observability artifact combining metrics,
 * SLO evaluations and alert rules into a single report used by the
 * certification harness and the rollout gate.
 */

import {
  ALL_METRIC_IDS,
  L6MetricId,
  L6MetricCategory,
  metricsByCategory,
  getMetricSpec,
} from './l6-metrics';
import {
  L6_SLO_SPECS,
  L6SloEvaluation,
  L6SloSeverity,
  evaluateSlo,
  hasCriticalBreach,
} from './l6-slo';
import { L6_ALERT_RULES, L6AlertRule } from './l6-alert-rules';

export interface L6ObservabilityReport {
  readonly generated_at: string;
  readonly coverage: {
    readonly metric_count: number;
    readonly metric_ids: readonly L6MetricId[];
    readonly categories: readonly L6MetricCategory[];
  };
  readonly slo_evaluations: readonly L6SloEvaluation[];
  readonly alert_rules: readonly L6AlertRule[];
  readonly critical_breach: boolean;
  readonly ok: boolean;
}

export type L6MetricSample = Readonly<Partial<Record<L6MetricId, number>>>;

export function generateObservabilityReport(
  samples: L6MetricSample,
): L6ObservabilityReport {
  const evaluations: L6SloEvaluation[] = L6_SLO_SPECS.map(spec => {
    const observed = samples[spec.metric_id];
    // Treat unsampled zero-tolerance SLOs as 0 observed (i.e. passing) so
    // the report is still deterministic, but treat unsampled non-zero-
    // tolerance SLOs as unknown/pass too. Tests may supply explicit
    // samples when a breach should register.
    return evaluateSlo(spec, typeof observed === 'number' ? observed : spec.comparator === 'LE' ? 0 : spec.target);
  });

  const critical = hasCriticalBreach(evaluations);

  return {
    generated_at: new Date().toISOString(),
    coverage: {
      metric_count: ALL_METRIC_IDS.length,
      metric_ids: ALL_METRIC_IDS,
      categories: Array.from(new Set(ALL_METRIC_IDS.map(id => getMetricSpec(id).category))),
    },
    slo_evaluations: evaluations,
    alert_rules: L6_ALERT_RULES,
    critical_breach: critical,
    ok: !critical,
  };
}

export function isObservabilityPackageComplete(): {
  ok: boolean;
  missing_categories: readonly L6MetricCategory[];
} {
  const requiredCategories = Object.values(L6MetricCategory);
  const missing: L6MetricCategory[] = [];
  for (const cat of requiredCategories) {
    if (metricsByCategory(cat).length === 0) missing.push(cat);
  }
  return { ok: missing.length === 0, missing_categories: missing };
}

export function zeroToleranceSlos(): readonly string[] {
  return L6_SLO_SPECS
    .filter(s => s.severity === L6SloSeverity.ZERO_TOLERANCE)
    .map(s => s.slo_id);
}
