/**
 * L7.8 — SLO Policy
 *
 * §7.8.6.3 — Required SLO tiers:
 *
 *   ZERO_TOLERANCE — replay-hash mismatch, missing evidence pointer,
 *                    contradiction bundle missing when required,
 *                    shadow-authority write, downstream raw rebuild
 *   STRICT         — validation run failure rate, persistence failure
 *                    rate, family-rollout illegality
 *   MODERATE       — p95 latencies, backlog depths
 *   ADVISORY       — informational only
 */

import { L7MetricId } from './l7-operational-metrics';

export enum L7SloSeverity {
  ZERO_TOLERANCE = 'ZERO_TOLERANCE',
  STRICT = 'STRICT',
  MODERATE = 'MODERATE',
  ADVISORY = 'ADVISORY',
}

export const ALL_L7_SLO_SEVERITIES: readonly L7SloSeverity[] =
  Object.values(L7SloSeverity);

export interface L7SloSpec {
  readonly slo_id: string;
  readonly metric_id: L7MetricId;
  readonly target: number;
  readonly comparator: 'LE' | 'GE';
  readonly window: '5m' | '1h' | '1d' | '7d';
  readonly severity: L7SloSeverity;
  readonly description: string;
}

export const L7_SLO_SPECS: readonly L7SloSpec[] = Object.freeze([
  // Zero-tolerance
  {
    slo_id: 'slo.l7.replay_mismatch',
    metric_id: L7MetricId.REPLAY_HASH_MISMATCH_COUNT,
    target: 0, comparator: 'LE', window: '1d', severity: L7SloSeverity.ZERO_TOLERANCE,
    description: 'Zero replay-hash mismatches under equivalent semantics',
  },
  {
    slo_id: 'slo.l7.evidence_missing',
    metric_id: L7MetricId.MISSING_EVIDENCE_POINTER_RATE,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.ZERO_TOLERANCE,
    description: 'Zero missing evidence pointers where policy requires evidence',
  },
  {
    slo_id: 'slo.l7.contradiction_bundle_missing',
    metric_id: L7MetricId.CONTRADICTION_BUNDLE_MISSING_WHEN_REQUIRED,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.ZERO_TOLERANCE,
    description: 'Zero contradiction bundles missing when required',
  },
  {
    slo_id: 'slo.l7.shadow_authority_attempt',
    metric_id: L7MetricId.SHADOW_AUTHORITY_ATTEMPT_COUNT,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.ZERO_TOLERANCE,
    description: 'Zero Redis-as-authority attempts (must be blocked at validator)',
  },
  {
    slo_id: 'slo.l7.downstream_raw_rebuild',
    metric_id: L7MetricId.DOWNSTREAM_RAW_REBUILD_ATTEMPT_COUNT,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.ZERO_TOLERANCE,
    description: 'Zero downstream raw-L6 rebuild attempts (must be blocked at validator)',
  },

  // Strict
  {
    slo_id: 'slo.l7.validation_run_success_rate',
    metric_id: L7MetricId.VALIDATION_RUN_SUCCESS_RATE,
    target: 0.995, comparator: 'GE', window: '1h', severity: L7SloSeverity.STRICT,
    description: 'Validation run success rate ≥ 99.5%',
  },
  {
    slo_id: 'slo.l7.persistence_failure_rate',
    metric_id: L7MetricId.PERSISTENCE_FAILURE_RATE,
    target: 0.005, comparator: 'LE', window: '1h', severity: L7SloSeverity.STRICT,
    description: 'Persistence failure rate ≤ 0.5%',
  },
  {
    slo_id: 'slo.l7.family_rollout_illegality',
    metric_id: L7MetricId.FAMILY_ROLLOUT_ILLEGALITY_COUNT,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.STRICT,
    description: 'Zero illegal family rollout attempts admitted (may be non-zero as "blocked")',
  },
  {
    slo_id: 'slo.l7.clean_confidence_blocked',
    metric_id: L7MetricId.CLEAN_CONFIDENCE_BLOCKED_COUNT,
    target: 0, comparator: 'LE', window: '1h', severity: L7SloSeverity.STRICT,
    description: 'Zero clean-confidence admissions where blocking contradiction exists',
  },

  // Moderate
  {
    slo_id: 'slo.l7.classification_p95',
    metric_id: L7MetricId.CLASSIFICATION_LATENCY_P95_MS,
    target: 1500, comparator: 'LE', window: '1h', severity: L7SloSeverity.MODERATE,
    description: 'Classification p95 latency ≤ 1.5s',
  },
  {
    slo_id: 'slo.l7.contradiction_cluster_p95',
    metric_id: L7MetricId.CONTRADICTION_CLUSTERING_LATENCY_P95_MS,
    target: 2500, comparator: 'LE', window: '1h', severity: L7SloSeverity.MODERATE,
    description: 'Contradiction clustering p95 ≤ 2.5s',
  },
  {
    slo_id: 'slo.l7.confidence_p95',
    metric_id: L7MetricId.CONFIDENCE_DERIVATION_LATENCY_P95_MS,
    target: 1000, comparator: 'LE', window: '1h', severity: L7SloSeverity.MODERATE,
    description: 'Confidence derivation p95 ≤ 1s',
  },
  {
    slo_id: 'slo.l7.replay_backlog',
    metric_id: L7MetricId.REPLAY_BACKLOG_SIZE,
    target: 10_000, comparator: 'LE', window: '1h', severity: L7SloSeverity.MODERATE,
    description: 'Replay backlog ≤ 10k entries',
  },
  {
    slo_id: 'slo.l7.repair_backlog',
    metric_id: L7MetricId.REPAIR_BACKLOG_SIZE,
    target: 5_000, comparator: 'LE', window: '1h', severity: L7SloSeverity.MODERATE,
    description: 'Repair backlog ≤ 5k entries',
  },
]);

export interface L7SloEvaluation {
  readonly slo_id: string;
  readonly observed_value: number;
  readonly target: number;
  readonly comparator: 'LE' | 'GE';
  readonly breached: boolean;
  readonly severity: L7SloSeverity;
}

export function evaluateL7Slo(
  spec: L7SloSpec,
  observed_value: number,
): L7SloEvaluation {
  const breached = spec.comparator === 'LE'
    ? observed_value > spec.target
    : observed_value < spec.target;
  return {
    slo_id: spec.slo_id,
    observed_value,
    target: spec.target,
    comparator: spec.comparator,
    breached,
    severity: spec.severity,
  };
}

/**
 * §7.8.6.3 / §7.8.5.2 INV-7.8-D — A critical breach is any breached
 * evaluation with severity `ZERO_TOLERANCE` or `STRICT`.
 */
export function hasL7CriticalBreach(
  evaluations: readonly L7SloEvaluation[],
): boolean {
  return evaluations.some(e =>
    e.breached &&
    (e.severity === L7SloSeverity.ZERO_TOLERANCE ||
     e.severity === L7SloSeverity.STRICT));
}

export function countL7CriticalBreaches(
  evaluations: readonly L7SloEvaluation[],
): number {
  return evaluations.filter(e =>
    e.breached &&
    (e.severity === L7SloSeverity.ZERO_TOLERANCE ||
     e.severity === L7SloSeverity.STRICT)).length;
}
