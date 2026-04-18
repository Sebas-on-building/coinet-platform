/**
 * L7.8 — Operational Metrics
 *
 * §7.8.6.2 — Required operational metrics for Layer 7, organized into
 * four categories:
 *
 *   RUNTIME_INTEGRITY         — validation/contradiction/confidence
 *                               runtime health
 *   PERSISTENCE_INTEGRITY     — current/historical alignment, evidence
 *                               pointer integrity, replay-hash identity
 *   SEMANTIC_INTEGRITY        — contradiction bundle presence,
 *                               restriction-profile consistency, family
 *                               rollout legality
 *   OPERATIONAL_BACKLOG       — replay/repair/recompute queue depth
 */

export enum L7MetricCategory {
  RUNTIME_INTEGRITY = 'RUNTIME_INTEGRITY',
  PERSISTENCE_INTEGRITY = 'PERSISTENCE_INTEGRITY',
  SEMANTIC_INTEGRITY = 'SEMANTIC_INTEGRITY',
  OPERATIONAL_BACKLOG = 'OPERATIONAL_BACKLOG',
}

export const ALL_L7_METRIC_CATEGORIES: readonly L7MetricCategory[] =
  Object.values(L7MetricCategory);

export enum L7MetricId {
  // runtime integrity
  VALIDATION_RUN_SUCCESS_RATE = 'l7.runtime.validation_run_success_rate',
  CLASSIFICATION_LATENCY_P95_MS = 'l7.runtime.classification_latency_p95_ms',
  CONTRADICTION_CLUSTERING_LATENCY_P95_MS = 'l7.runtime.contradiction_clustering_latency_p95_ms',
  CONFIDENCE_DERIVATION_LATENCY_P95_MS = 'l7.runtime.confidence_derivation_latency_p95_ms',
  VALIDATION_RUN_FAILURE_RATE = 'l7.runtime.validation_run_failure_rate',

  // persistence integrity
  CURRENT_HISTORICAL_DIVERGENCE_COUNT = 'l7.persistence.current_historical_divergence_count',
  MISSING_EVIDENCE_POINTER_RATE = 'l7.persistence.missing_evidence_pointer_rate',
  REPLAY_HASH_MISMATCH_COUNT = 'l7.persistence.replay_hash_mismatch_count',
  PERSISTENCE_FAILURE_RATE = 'l7.persistence.persistence_failure_rate',
  SHADOW_AUTHORITY_ATTEMPT_COUNT = 'l7.persistence.shadow_authority_attempt_count',

  // semantic integrity
  CONTRADICTION_BUNDLE_MISSING_WHEN_REQUIRED = 'l7.semantic.contradiction_bundle_missing',
  CLEAN_CONFIDENCE_BLOCKED_COUNT = 'l7.semantic.clean_confidence_blocked_count',
  RESTRICTION_PROFILE_INCONSISTENCY_COUNT = 'l7.semantic.restriction_profile_inconsistency_count',
  FAMILY_ROLLOUT_ILLEGALITY_COUNT = 'l7.semantic.family_rollout_illegality_count',
  DOWNSTREAM_RAW_REBUILD_ATTEMPT_COUNT = 'l7.semantic.downstream_raw_rebuild_count',

  // operational backlog
  REPLAY_BACKLOG_SIZE = 'l7.backlog.replay_backlog_size',
  REPAIR_BACKLOG_SIZE = 'l7.backlog.repair_backlog_size',
  RECOMPUTE_BACKLOG_SIZE = 'l7.backlog.recompute_backlog_size',
  DELAYED_MATERIALIZATION_QUEUE_DEPTH = 'l7.backlog.delayed_materialization_queue_depth',
}

export interface L7MetricSpec {
  readonly id: L7MetricId;
  readonly category: L7MetricCategory;
  readonly description: string;
  readonly unit: 'count' | 'rate' | 'ratio' | 'ms' | 's' | 'depth' | 'histogram';
  readonly labels: readonly string[];
  readonly alert_budget: 'STRICT' | 'MODERATE' | 'ADVISORY';
}

export const L7_METRIC_REGISTRY: Readonly<Record<L7MetricId, L7MetricSpec>> =
  Object.freeze({
    [L7MetricId.VALIDATION_RUN_SUCCESS_RATE]: { id: L7MetricId.VALIDATION_RUN_SUCCESS_RATE, category: L7MetricCategory.RUNTIME_INTEGRITY, description: 'Validation run success rate', unit: 'ratio', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.CLASSIFICATION_LATENCY_P95_MS]: { id: L7MetricId.CLASSIFICATION_LATENCY_P95_MS, category: L7MetricCategory.RUNTIME_INTEGRITY, description: 'Classification p95 latency', unit: 'histogram', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.CONTRADICTION_CLUSTERING_LATENCY_P95_MS]: { id: L7MetricId.CONTRADICTION_CLUSTERING_LATENCY_P95_MS, category: L7MetricCategory.RUNTIME_INTEGRITY, description: 'Contradiction clustering p95 latency', unit: 'histogram', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.CONFIDENCE_DERIVATION_LATENCY_P95_MS]: { id: L7MetricId.CONFIDENCE_DERIVATION_LATENCY_P95_MS, category: L7MetricCategory.RUNTIME_INTEGRITY, description: 'Confidence derivation p95 latency', unit: 'histogram', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.VALIDATION_RUN_FAILURE_RATE]: { id: L7MetricId.VALIDATION_RUN_FAILURE_RATE, category: L7MetricCategory.RUNTIME_INTEGRITY, description: 'Validation run failure rate', unit: 'rate', labels: ['family'], alert_budget: 'STRICT' },

    [L7MetricId.CURRENT_HISTORICAL_DIVERGENCE_COUNT]: { id: L7MetricId.CURRENT_HISTORICAL_DIVERGENCE_COUNT, category: L7MetricCategory.PERSISTENCE_INTEGRITY, description: 'Current vs historical divergence count', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.MISSING_EVIDENCE_POINTER_RATE]: { id: L7MetricId.MISSING_EVIDENCE_POINTER_RATE, category: L7MetricCategory.PERSISTENCE_INTEGRITY, description: 'Missing evidence pointer rate where policy requires evidence', unit: 'rate', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.REPLAY_HASH_MISMATCH_COUNT]: { id: L7MetricId.REPLAY_HASH_MISMATCH_COUNT, category: L7MetricCategory.PERSISTENCE_INTEGRITY, description: 'Replay-hash mismatch count', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.PERSISTENCE_FAILURE_RATE]: { id: L7MetricId.PERSISTENCE_FAILURE_RATE, category: L7MetricCategory.PERSISTENCE_INTEGRITY, description: 'Persistence failure rate', unit: 'rate', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.SHADOW_AUTHORITY_ATTEMPT_COUNT]: { id: L7MetricId.SHADOW_AUTHORITY_ATTEMPT_COUNT, category: L7MetricCategory.PERSISTENCE_INTEGRITY, description: 'Redis-as-authority attempts blocked', unit: 'count', labels: ['source'], alert_budget: 'STRICT' },

    [L7MetricId.CONTRADICTION_BUNDLE_MISSING_WHEN_REQUIRED]: { id: L7MetricId.CONTRADICTION_BUNDLE_MISSING_WHEN_REQUIRED, category: L7MetricCategory.SEMANTIC_INTEGRITY, description: 'Contradiction bundle missing when policy requires', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.CLEAN_CONFIDENCE_BLOCKED_COUNT]: { id: L7MetricId.CLEAN_CONFIDENCE_BLOCKED_COUNT, category: L7MetricCategory.SEMANTIC_INTEGRITY, description: 'Clean-confidence-despite-blocking-contradiction attempts blocked', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.RESTRICTION_PROFILE_INCONSISTENCY_COUNT]: { id: L7MetricId.RESTRICTION_PROFILE_INCONSISTENCY_COUNT, category: L7MetricCategory.SEMANTIC_INTEGRITY, description: 'Restriction profile inconsistency count', unit: 'count', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.FAMILY_ROLLOUT_ILLEGALITY_COUNT]: { id: L7MetricId.FAMILY_ROLLOUT_ILLEGALITY_COUNT, category: L7MetricCategory.SEMANTIC_INTEGRITY, description: 'Illegal family rollout attempts blocked', unit: 'count', labels: ['family'], alert_budget: 'STRICT' },
    [L7MetricId.DOWNSTREAM_RAW_REBUILD_ATTEMPT_COUNT]: { id: L7MetricId.DOWNSTREAM_RAW_REBUILD_ATTEMPT_COUNT, category: L7MetricCategory.SEMANTIC_INTEGRITY, description: 'Downstream raw-L6 rebuild attempts blocked', unit: 'count', labels: ['consumer'], alert_budget: 'STRICT' },

    [L7MetricId.REPLAY_BACKLOG_SIZE]: { id: L7MetricId.REPLAY_BACKLOG_SIZE, category: L7MetricCategory.OPERATIONAL_BACKLOG, description: 'Replay backlog size', unit: 'depth', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.REPAIR_BACKLOG_SIZE]: { id: L7MetricId.REPAIR_BACKLOG_SIZE, category: L7MetricCategory.OPERATIONAL_BACKLOG, description: 'Repair backlog size', unit: 'depth', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.RECOMPUTE_BACKLOG_SIZE]: { id: L7MetricId.RECOMPUTE_BACKLOG_SIZE, category: L7MetricCategory.OPERATIONAL_BACKLOG, description: 'Recompute backlog size', unit: 'depth', labels: ['family'], alert_budget: 'MODERATE' },
    [L7MetricId.DELAYED_MATERIALIZATION_QUEUE_DEPTH]: { id: L7MetricId.DELAYED_MATERIALIZATION_QUEUE_DEPTH, category: L7MetricCategory.OPERATIONAL_BACKLOG, description: 'Delayed materialization queue depth', unit: 'depth', labels: ['family'], alert_budget: 'MODERATE' },
  });

export const ALL_L7_METRIC_IDS: readonly L7MetricId[] =
  Object.values(L7MetricId);

export function getL7MetricSpec(id: L7MetricId): L7MetricSpec {
  return L7_METRIC_REGISTRY[id];
}

export function l7MetricsByCategory(
  category: L7MetricCategory,
): readonly L7MetricSpec[] {
  return Object.values(L7_METRIC_REGISTRY).filter(s => s.category === category);
}
