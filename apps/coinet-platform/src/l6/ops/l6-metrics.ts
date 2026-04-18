/**
 * L6.8 — Operational Metrics
 *
 * §6.8.5.2 — Required metrics categories: compute health, primitive quality,
 * event health, temporal health, persistence/evidence, replay/repair.
 */

export enum L6MetricCategory {
  COMPUTE_HEALTH = 'COMPUTE_HEALTH',
  PRIMITIVE_QUALITY = 'PRIMITIVE_QUALITY',
  EVENT_HEALTH = 'EVENT_HEALTH',
  TEMPORAL_HEALTH = 'TEMPORAL_HEALTH',
  PERSISTENCE_EVIDENCE = 'PERSISTENCE_EVIDENCE',
  REPLAY_REPAIR = 'REPLAY_REPAIR',
}

export enum L6MetricId {
  COMPUTE_RUN_SUCCESS_RATE = 'l6.compute.run_success_rate',
  COMPUTE_RUN_DURATION_MS = 'l6.compute.run_duration_ms',
  NODE_FAILURE_RATE = 'l6.compute.node_failure_rate',
  RECOMPUTE_BACKLOG_DEPTH = 'l6.compute.recompute_backlog_depth',

  DEGRADED_FEATURE_RATE = 'l6.primitive.degraded_rate',
  PROVISIONAL_FEATURE_RATE = 'l6.primitive.provisional_rate',
  BLOCKED_FEATURE_RATE = 'l6.primitive.blocked_rate',
  CONFIDENCE_DISTRIBUTION = 'l6.primitive.confidence_distribution',

  EVENT_CANDIDATE_VOLUME = 'l6.event.candidate_volume',
  EVENT_CONFIRMATION_RATE = 'l6.event.confirmation_rate',
  EVENT_SUPPRESSION_RATE = 'l6.event.suppression_rate',
  EVENT_DEDUPE_COLLISION_RATE = 'l6.event.dedupe_collision_rate',
  EVENT_ACTIVE_COUNT = 'l6.event.active_count',
  EVENT_STORM_RATE = 'l6.event.storm_rate',

  WARMUP_BLOCKED_OUTPUTS = 'l6.temporal.warmup_blocked',
  STALE_DEGRADED_OUTPUTS = 'l6.temporal.stale_degraded',
  LATE_DATA_CLASSIFICATION_COUNTS = 'l6.temporal.late_data_counts',
  REMATERIALIZATION_COUNTS = 'l6.temporal.rematerialization_counts',

  EVIDENCE_PACK_GEN_FAILURES = 'l6.persistence.evidence_gen_failures',
  ARCHIVE_LINKAGE_FAILURES = 'l6.persistence.archive_linkage_failures',
  MATERIALIZATION_FAILURES = 'l6.persistence.materialization_failures',
  READ_SURFACE_ERROR_RATE = 'l6.persistence.read_surface_error_rate',

  REPLAY_MISMATCH_COUNT = 'l6.replay.mismatch_count',
  REPAIR_DRIFT_COUNT = 'l6.repair.drift_count',
  LATE_DATA_RECOMPUTE_VOLUME = 'l6.repair.late_data_recompute_volume',
  REPAIR_BACKLOG_AGE_S = 'l6.repair.backlog_age_s',
}

export interface L6MetricSpec {
  readonly id: L6MetricId;
  readonly category: L6MetricCategory;
  readonly description: string;
  readonly unit: 'count' | 'rate' | 'ratio' | 'ms' | 's' | 'depth' | 'histogram';
  readonly labels: readonly string[];
  readonly alert_budget: 'STRICT' | 'MODERATE' | 'ADVISORY';
}

export const L6_METRIC_REGISTRY: Readonly<Record<L6MetricId, L6MetricSpec>> = Object.freeze({
  [L6MetricId.COMPUTE_RUN_SUCCESS_RATE]: { id: L6MetricId.COMPUTE_RUN_SUCCESS_RATE, category: L6MetricCategory.COMPUTE_HEALTH, description: 'Compute run success rate', unit: 'ratio', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.COMPUTE_RUN_DURATION_MS]: { id: L6MetricId.COMPUTE_RUN_DURATION_MS, category: L6MetricCategory.COMPUTE_HEALTH, description: 'Compute run wall duration', unit: 'histogram', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.NODE_FAILURE_RATE]: { id: L6MetricId.NODE_FAILURE_RATE, category: L6MetricCategory.COMPUTE_HEALTH, description: 'Per-node execution failure rate', unit: 'rate', labels: ['family', 'node'], alert_budget: 'STRICT' },
  [L6MetricId.RECOMPUTE_BACKLOG_DEPTH]: { id: L6MetricId.RECOMPUTE_BACKLOG_DEPTH, category: L6MetricCategory.COMPUTE_HEALTH, description: 'Recompute backlog depth', unit: 'depth', labels: ['family'], alert_budget: 'MODERATE' },

  [L6MetricId.DEGRADED_FEATURE_RATE]: { id: L6MetricId.DEGRADED_FEATURE_RATE, category: L6MetricCategory.PRIMITIVE_QUALITY, description: 'Degraded feature rate', unit: 'rate', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.PROVISIONAL_FEATURE_RATE]: { id: L6MetricId.PROVISIONAL_FEATURE_RATE, category: L6MetricCategory.PRIMITIVE_QUALITY, description: 'Provisional feature rate', unit: 'rate', labels: ['family'], alert_budget: 'ADVISORY' },
  [L6MetricId.BLOCKED_FEATURE_RATE]: { id: L6MetricId.BLOCKED_FEATURE_RATE, category: L6MetricCategory.PRIMITIVE_QUALITY, description: 'Blocked feature rate', unit: 'rate', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.CONFIDENCE_DISTRIBUTION]: { id: L6MetricId.CONFIDENCE_DISTRIBUTION, category: L6MetricCategory.PRIMITIVE_QUALITY, description: 'Confidence band distribution', unit: 'histogram', labels: ['family'], alert_budget: 'ADVISORY' },

  [L6MetricId.EVENT_CANDIDATE_VOLUME]: { id: L6MetricId.EVENT_CANDIDATE_VOLUME, category: L6MetricCategory.EVENT_HEALTH, description: 'Event candidate volume', unit: 'count', labels: ['family'], alert_budget: 'ADVISORY' },
  [L6MetricId.EVENT_CONFIRMATION_RATE]: { id: L6MetricId.EVENT_CONFIRMATION_RATE, category: L6MetricCategory.EVENT_HEALTH, description: 'Candidate→confirmation rate', unit: 'ratio', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.EVENT_SUPPRESSION_RATE]: { id: L6MetricId.EVENT_SUPPRESSION_RATE, category: L6MetricCategory.EVENT_HEALTH, description: 'Suppression rate', unit: 'ratio', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.EVENT_DEDUPE_COLLISION_RATE]: { id: L6MetricId.EVENT_DEDUPE_COLLISION_RATE, category: L6MetricCategory.EVENT_HEALTH, description: 'Dedupe key collision rate', unit: 'ratio', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.EVENT_ACTIVE_COUNT]: { id: L6MetricId.EVENT_ACTIVE_COUNT, category: L6MetricCategory.EVENT_HEALTH, description: 'Active event instance count', unit: 'count', labels: ['family'], alert_budget: 'ADVISORY' },
  [L6MetricId.EVENT_STORM_RATE]: { id: L6MetricId.EVENT_STORM_RATE, category: L6MetricCategory.EVENT_HEALTH, description: 'Event storm rate', unit: 'rate', labels: ['family'], alert_budget: 'STRICT' },

  [L6MetricId.WARMUP_BLOCKED_OUTPUTS]: { id: L6MetricId.WARMUP_BLOCKED_OUTPUTS, category: L6MetricCategory.TEMPORAL_HEALTH, description: 'Warmup-blocked outputs', unit: 'count', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.STALE_DEGRADED_OUTPUTS]: { id: L6MetricId.STALE_DEGRADED_OUTPUTS, category: L6MetricCategory.TEMPORAL_HEALTH, description: 'Stale/degraded outputs', unit: 'count', labels: ['family'], alert_budget: 'MODERATE' },
  [L6MetricId.LATE_DATA_CLASSIFICATION_COUNTS]: { id: L6MetricId.LATE_DATA_CLASSIFICATION_COUNTS, category: L6MetricCategory.TEMPORAL_HEALTH, description: 'Late-data classification counts', unit: 'count', labels: ['family', 'class'], alert_budget: 'ADVISORY' },
  [L6MetricId.REMATERIALIZATION_COUNTS]: { id: L6MetricId.REMATERIALIZATION_COUNTS, category: L6MetricCategory.TEMPORAL_HEALTH, description: 'Governed rematerialization counts', unit: 'count', labels: ['family', 'mode'], alert_budget: 'MODERATE' },

  [L6MetricId.EVIDENCE_PACK_GEN_FAILURES]: { id: L6MetricId.EVIDENCE_PACK_GEN_FAILURES, category: L6MetricCategory.PERSISTENCE_EVIDENCE, description: 'Evidence-pack generation failures', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.ARCHIVE_LINKAGE_FAILURES]: { id: L6MetricId.ARCHIVE_LINKAGE_FAILURES, category: L6MetricCategory.PERSISTENCE_EVIDENCE, description: 'Evidence archive linkage failures', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.MATERIALIZATION_FAILURES]: { id: L6MetricId.MATERIALIZATION_FAILURES, category: L6MetricCategory.PERSISTENCE_EVIDENCE, description: 'Materialization failures', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.READ_SURFACE_ERROR_RATE]: { id: L6MetricId.READ_SURFACE_ERROR_RATE, category: L6MetricCategory.PERSISTENCE_EVIDENCE, description: 'Read-surface error rate', unit: 'rate', labels: ['surface'], alert_budget: 'MODERATE' },

  [L6MetricId.REPLAY_MISMATCH_COUNT]: { id: L6MetricId.REPLAY_MISMATCH_COUNT, category: L6MetricCategory.REPLAY_REPAIR, description: 'Replay mismatch count', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.REPAIR_DRIFT_COUNT]: { id: L6MetricId.REPAIR_DRIFT_COUNT, category: L6MetricCategory.REPLAY_REPAIR, description: 'Repair-induced semantic drift count', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
  [L6MetricId.LATE_DATA_RECOMPUTE_VOLUME]: { id: L6MetricId.LATE_DATA_RECOMPUTE_VOLUME, category: L6MetricCategory.REPLAY_REPAIR, description: 'Late-data recompute volume', unit: 'count', labels: ['family'], alert_budget: 'ADVISORY' },
  [L6MetricId.REPAIR_BACKLOG_AGE_S]: { id: L6MetricId.REPAIR_BACKLOG_AGE_S, category: L6MetricCategory.REPLAY_REPAIR, description: 'Oldest pending repair age (seconds)', unit: 's', labels: ['family'], alert_budget: 'MODERATE' },
});

export const ALL_METRIC_IDS: readonly L6MetricId[] = Object.values(L6MetricId);

export function getMetricSpec(id: L6MetricId): L6MetricSpec {
  return L6_METRIC_REGISTRY[id];
}

export function metricsByCategory(category: L6MetricCategory): readonly L6MetricSpec[] {
  return Object.values(L6_METRIC_REGISTRY).filter(s => s.category === category);
}
