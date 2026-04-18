/**
 * L6.9 — Downstream Dependency Contract
 *
 * §6.9.7.3–§6.9.7.5 — What later layers may rely on, may not assume,
 * and what handoff surfaces are stable. Enforced at runtime by the
 * `Layer6DownstreamDependencyValidator` (§6.9.8.3).
 */

export enum L6DependencyAllowance {
  ALLOWED = 'ALLOWED',
  REQUIRES_GOVERNED_MODE = 'REQUIRES_GOVERNED_MODE',
  FORBIDDEN = 'FORBIDDEN',
}

export const ALL_DEPENDENCY_ALLOWANCES: readonly L6DependencyAllowance[] =
  Object.values(L6DependencyAllowance);

/**
 * Canonical downstream access intents. Mapped to `L6DependencyAllowance`
 * by the validator. Order is significant for deterministic audit records.
 */
export enum L6DownstreamAccessKind {
  CURRENT_FEATURE_SNAPSHOT = 'CURRENT_FEATURE_SNAPSHOT',
  ACTIVE_EVENTS = 'ACTIVE_EVENTS',
  FEATURE_HISTORY = 'FEATURE_HISTORY',
  EVENT_HISTORY = 'EVENT_HISTORY',
  EVIDENCE_PACK = 'EVIDENCE_PACK',
  RECOMPUTE_LINEAGE = 'RECOMPUTE_LINEAGE',
  QUALITY_CONFIDENCE_METADATA = 'QUALITY_CONFIDENCE_METADATA',
  CONTRACT_VERSION_IDENTITY = 'CONTRACT_VERSION_IDENTITY',

  AD_HOC_RECOMPUTE = 'AD_HOC_RECOMPUTE',
  RAW_L5_HISTORY_READ = 'RAW_L5_HISTORY_READ',
  REDIS_CACHE_AS_SOURCE_OF_TRUTH = 'REDIS_CACHE_AS_SOURCE_OF_TRUTH',
  BYPASS_L6 = 'BYPASS_L6',
  JUDGMENT_FROM_L6 = 'JUDGMENT_FROM_L6',
  FINAL_SCORE_FROM_L6 = 'FINAL_SCORE_FROM_L6',
  SCENARIO_CONCLUSIONS_FROM_L6 = 'SCENARIO_CONCLUSIONS_FROM_L6',
}

export const ALL_DOWNSTREAM_ACCESS_KINDS: readonly L6DownstreamAccessKind[] =
  Object.values(L6DownstreamAccessKind);

/**
 * §6.9.7.3 — Stable handoff surfaces Layer 6 exposes to later layers.
 */
export const L6_STABLE_HANDOFF_SURFACES: readonly L6DownstreamAccessKind[] = Object.freeze([
  L6DownstreamAccessKind.CURRENT_FEATURE_SNAPSHOT,
  L6DownstreamAccessKind.ACTIVE_EVENTS,
  L6DownstreamAccessKind.FEATURE_HISTORY,
  L6DownstreamAccessKind.EVENT_HISTORY,
  L6DownstreamAccessKind.EVIDENCE_PACK,
  L6DownstreamAccessKind.RECOMPUTE_LINEAGE,
  L6DownstreamAccessKind.QUALITY_CONFIDENCE_METADATA,
  L6DownstreamAccessKind.CONTRACT_VERSION_IDENTITY,
]);

/**
 * §6.9.7.5 — Access kinds later layers may NEVER assume.
 */
export const L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS: readonly L6DownstreamAccessKind[] = Object.freeze([
  L6DownstreamAccessKind.RAW_L5_HISTORY_READ,
  L6DownstreamAccessKind.REDIS_CACHE_AS_SOURCE_OF_TRUTH,
  L6DownstreamAccessKind.BYPASS_L6,
  L6DownstreamAccessKind.JUDGMENT_FROM_L6,
  L6DownstreamAccessKind.FINAL_SCORE_FROM_L6,
  L6DownstreamAccessKind.SCENARIO_CONCLUSIONS_FROM_L6,
]);

/**
 * Ad hoc recompute is allowed only under governed REPLAY / REPAIR modes.
 */
export const L6_GOVERNED_ONLY_ACCESS_KINDS: readonly L6DownstreamAccessKind[] = Object.freeze([
  L6DownstreamAccessKind.AD_HOC_RECOMPUTE,
]);

export enum L6DownstreamConsumerMode {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  GOVERNED_REPLAY = 'GOVERNED_REPLAY',
  GOVERNED_REPAIR = 'GOVERNED_REPAIR',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
}

export interface L6DownstreamDependencyRequest {
  readonly request_id: string;
  readonly consumer_layer: string;
  readonly access_kind: L6DownstreamAccessKind;
  readonly consumer_mode: L6DownstreamConsumerMode;
  readonly notes: string;
}

export interface L6DownstreamDependencyDecision {
  readonly request_id: string;
  readonly allowance: L6DependencyAllowance;
  readonly rationale: string;
}
