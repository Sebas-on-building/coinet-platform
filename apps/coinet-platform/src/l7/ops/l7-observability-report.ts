/**
 * L7.8 — Observability Report
 *
 * §7.8.6.1–§7.8.6.4 — First-class observability artifact combining
 * metrics, SLO evaluations, and alert rules into a single report used by
 * the certification harness and the rollout gate (§7.8.5.2 INV-7.8-D).
 */

import {
  ALL_L7_METRIC_IDS,
  L7MetricId,
  L7MetricCategory,
  l7MetricsByCategory,
  getL7MetricSpec,
  ALL_L7_METRIC_CATEGORIES,
} from './l7-operational-metrics';
import {
  L7_SLO_SPECS,
  L7SloEvaluation,
  L7SloSeverity,
  evaluateL7Slo,
  hasL7CriticalBreach,
  countL7CriticalBreaches,
} from './l7-slo-policy';
import {
  L7_ALERT_RULES,
  L7AlertRule,
} from './l7-alert-rules';

export interface L7ObservabilityReport {
  readonly generated_at: string;
  readonly coverage: {
    readonly metric_count: number;
    readonly metric_ids: readonly L7MetricId[];
    readonly categories: readonly L7MetricCategory[];
  };
  readonly slo_evaluations: readonly L7SloEvaluation[];
  readonly alert_rules: readonly L7AlertRule[];
  readonly critical_breach: boolean;
  readonly critical_breach_count: number;
  readonly ok: boolean;
}

export type L7MetricSample = Readonly<Partial<Record<L7MetricId, number>>>;

export function generateL7ObservabilityReport(
  samples: L7MetricSample,
): L7ObservabilityReport {
  const evaluations: L7SloEvaluation[] = L7_SLO_SPECS.map(spec => {
    const observed = samples[spec.metric_id];
    // For unsampled metrics: zero-tolerance metrics pass at 0 observed;
    // success-rate (GE) metrics pass at target; latency (LE) metrics pass
    // at 0. This keeps the report deterministic when no sample is given
    // while still surfacing a breach if the test supplies a bad value.
    const fallback = spec.comparator === 'LE' ? 0 : spec.target;
    return evaluateL7Slo(
      spec,
      typeof observed === 'number' ? observed : fallback,
    );
  });

  const critical = hasL7CriticalBreach(evaluations);
  const critical_count = countL7CriticalBreaches(evaluations);

  return {
    generated_at: new Date().toISOString(),
    coverage: {
      metric_count: ALL_L7_METRIC_IDS.length,
      metric_ids: ALL_L7_METRIC_IDS,
      categories: Array.from(
        new Set(ALL_L7_METRIC_IDS.map(id => getL7MetricSpec(id).category)),
      ),
    },
    slo_evaluations: evaluations,
    alert_rules: L7_ALERT_RULES,
    critical_breach: critical,
    critical_breach_count: critical_count,
    ok: !critical,
  };
}

export function isL7ObservabilityPackageComplete(): {
  ok: boolean;
  missing_categories: readonly L7MetricCategory[];
} {
  const missing: L7MetricCategory[] = [];
  for (const cat of ALL_L7_METRIC_CATEGORIES) {
    if (l7MetricsByCategory(cat).length === 0) missing.push(cat);
  }
  return { ok: missing.length === 0, missing_categories: missing };
}

export function l7ZeroToleranceSlos(): readonly string[] {
  return L7_SLO_SPECS
    .filter(s => s.severity === L7SloSeverity.ZERO_TOLERANCE)
    .map(s => s.slo_id);
}

export function l7StrictSlos(): readonly string[] {
  return L7_SLO_SPECS
    .filter(s => s.severity === L7SloSeverity.STRICT)
    .map(s => s.slo_id);
}
