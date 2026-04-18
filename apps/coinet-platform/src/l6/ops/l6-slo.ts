/**
 * L6.8 — SLO Package
 *
 * §6.8.5.3 — Required SLOs, including zero-tolerance SLOs
 * (no silent current-state mutation, no direct-store bypass).
 */

import { L6MetricId } from './l6-metrics';

export enum L6SloSeverity {
  ZERO_TOLERANCE = 'ZERO_TOLERANCE',
  STRICT = 'STRICT',
  MODERATE = 'MODERATE',
  ADVISORY = 'ADVISORY',
}

export interface L6SloSpec {
  readonly slo_id: string;
  readonly metric_id: L6MetricId;
  readonly target: number;
  readonly comparator: 'LE' | 'GE';
  readonly window: '5m' | '1h' | '1d' | '7d';
  readonly severity: L6SloSeverity;
  readonly description: string;
}

export const L6_SLO_SPECS: readonly L6SloSpec[] = Object.freeze([
  {
    slo_id: 'slo.compute.run_success_rate',
    metric_id: L6MetricId.COMPUTE_RUN_SUCCESS_RATE,
    target: 0.995, comparator: 'GE', window: '1h', severity: L6SloSeverity.STRICT,
    description: 'Compute run success rate ≥ 99.5% over 1h',
  },
  {
    slo_id: 'slo.compute.p95_duration',
    metric_id: L6MetricId.COMPUTE_RUN_DURATION_MS,
    target: 5000, comparator: 'LE', window: '1h', severity: L6SloSeverity.MODERATE,
    description: 'Compute run p95 duration ≤ 5s per family class',
  },
  {
    slo_id: 'slo.compute.backlog',
    metric_id: L6MetricId.RECOMPUTE_BACKLOG_DEPTH,
    target: 10_000, comparator: 'LE', window: '1h', severity: L6SloSeverity.MODERATE,
    description: 'Recompute backlog depth ≤ 10k',
  },
  {
    slo_id: 'slo.event.storm_rate',
    metric_id: L6MetricId.EVENT_STORM_RATE,
    target: 0.001, comparator: 'LE', window: '1h', severity: L6SloSeverity.STRICT,
    description: 'Event storm rate ≤ 0.1% of detections',
  },
  {
    slo_id: 'slo.replay.mismatch',
    metric_id: L6MetricId.REPLAY_MISMATCH_COUNT,
    target: 0, comparator: 'LE', window: '1d', severity: L6SloSeverity.ZERO_TOLERANCE,
    description: 'Zero replay mismatches under equivalent semantics',
  },
  {
    slo_id: 'slo.repair.drift',
    metric_id: L6MetricId.REPAIR_DRIFT_COUNT,
    target: 0, comparator: 'LE', window: '1d', severity: L6SloSeverity.ZERO_TOLERANCE,
    description: 'Zero unexplained repair-induced semantic drift',
  },
  {
    slo_id: 'slo.evidence.gen_failures',
    metric_id: L6MetricId.EVIDENCE_PACK_GEN_FAILURES,
    target: 0, comparator: 'LE', window: '1h', severity: L6SloSeverity.ZERO_TOLERANCE,
    description: 'Zero evidence-pack generation failures where policy requires evidence',
  },
  {
    slo_id: 'slo.archive.linkage_failures',
    metric_id: L6MetricId.ARCHIVE_LINKAGE_FAILURES,
    target: 0, comparator: 'LE', window: '1h', severity: L6SloSeverity.ZERO_TOLERANCE,
    description: 'Zero archive linkage failures',
  },
  {
    slo_id: 'slo.materialization.failures',
    metric_id: L6MetricId.MATERIALIZATION_FAILURES,
    target: 5, comparator: 'LE', window: '1h', severity: L6SloSeverity.STRICT,
    description: 'Materialization failures ≤ 5 / hour / family',
  },
  {
    slo_id: 'slo.read_surface.error_rate',
    metric_id: L6MetricId.READ_SURFACE_ERROR_RATE,
    target: 0.005, comparator: 'LE', window: '1h', severity: L6SloSeverity.MODERATE,
    description: 'Read-surface error rate ≤ 0.5%',
  },
]);

export interface L6SloEvaluation {
  readonly slo_id: string;
  readonly observed_value: number;
  readonly target: number;
  readonly comparator: 'LE' | 'GE';
  readonly breached: boolean;
  readonly severity: L6SloSeverity;
}

export function evaluateSlo(spec: L6SloSpec, observed_value: number): L6SloEvaluation {
  const breached = spec.comparator === 'LE' ? observed_value > spec.target : observed_value < spec.target;
  return {
    slo_id: spec.slo_id,
    observed_value,
    target: spec.target,
    comparator: spec.comparator,
    breached,
    severity: spec.severity,
  };
}

export function hasCriticalBreach(
  evaluations: readonly L6SloEvaluation[],
): boolean {
  return evaluations.some(e =>
    e.breached &&
    (e.severity === L6SloSeverity.ZERO_TOLERANCE || e.severity === L6SloSeverity.STRICT));
}
