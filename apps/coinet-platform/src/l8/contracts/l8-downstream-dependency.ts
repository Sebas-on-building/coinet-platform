/**
 * L8.9 — Downstream Dependency Contract
 *
 * §8.9.8 — What later layers (L9+) may rely on, what they may not
 * assume, and which handoff surfaces are stable. Enforced at runtime by
 * the `Layer8DownstreamDependencyValidator` (§8.9.8.5) and by
 * §8.9.9 INV-8.9-D / INV-8.9-E.
 */

export enum L8DependencyAllowance {
  ALLOWED = 'ALLOWED',
  CONDITIONALLY_ALLOWED = 'CONDITIONALLY_ALLOWED',
  DENIED = 'DENIED',
}

export const ALL_L8_DEPENDENCY_ALLOWANCES:
  readonly L8DependencyAllowance[] =
  Object.values(L8DependencyAllowance);

/**
 * §8.9.8.2 / §8.9.8.4 — Canonical downstream access intents. Allowed
 * stable handoff surfaces are defined first, followed by
 * governed-only and forbidden kinds. Order is significant for
 * deterministic audit records.
 */
export enum L8DownstreamAccessKind {
  // stable handoff surfaces (§8.9.8.2)
  CURRENT_REGIME_SNAPSHOT = 'CURRENT_REGIME_SNAPSHOT',
  CURRENT_TRANSITION_PROFILE = 'CURRENT_TRANSITION_PROFILE',
  CURRENT_CONFIDENCE_PROFILE = 'CURRENT_CONFIDENCE_PROFILE',
  CURRENT_MULTIPLIER_PROFILE = 'CURRENT_MULTIPLIER_PROFILE',
  HISTORICAL_REGIME_WINDOW = 'HISTORICAL_REGIME_WINDOW',
  HISTORICAL_TRANSITION_WINDOW = 'HISTORICAL_TRANSITION_WINDOW',
  HISTORICAL_CONFIDENCE_WINDOW = 'HISTORICAL_CONFIDENCE_WINDOW',
  HISTORICAL_MULTIPLIER_WINDOW = 'HISTORICAL_MULTIPLIER_WINDOW',
  REGIME_EVIDENCE_BACKED_READ = 'REGIME_EVIDENCE_BACKED_READ',
  REGIME_RUN_LINEAGE = 'REGIME_RUN_LINEAGE',

  // governed-only (§8.9.8.2 / §8.9.8.4 replay/repair mode)
  AD_HOC_REGIME_RECLASSIFICATION = 'AD_HOC_REGIME_RECLASSIFICATION',

  // forbidden (§8.9.8.3)
  INTERNAL_RUNTIME_DAG_NODE = 'INTERNAL_RUNTIME_DAG_NODE',
  INTERNAL_CANDIDATE_SET = 'INTERNAL_CANDIDATE_SET',
  INTERNAL_AMBIGUITY_ENGINE_STATE = 'INTERNAL_AMBIGUITY_ENGINE_STATE',
  INTERNAL_TEMPLATE_STATE = 'INTERNAL_TEMPLATE_STATE',
  INTERNAL_ROLLOUT_STATE = 'INTERNAL_ROLLOUT_STATE',
  RAW_PERSISTENCE_TABLE = 'RAW_PERSISTENCE_TABLE',
  CACHE_ONLY_SURFACE = 'CACHE_ONLY_SURFACE',
  LIVE_RAW_L6_L7_RECLASSIFICATION = 'LIVE_RAW_L6_L7_RECLASSIFICATION',
  BYPASS_L8 = 'BYPASS_L8',
  JUDGMENT_FROM_L8 = 'JUDGMENT_FROM_L8',
  SCORE_FROM_L8 = 'SCORE_FROM_L8',
  RECOMMENDATION_FROM_L8 = 'RECOMMENDATION_FROM_L8',
}

export const ALL_L8_DOWNSTREAM_ACCESS_KINDS:
  readonly L8DownstreamAccessKind[] =
  Object.values(L8DownstreamAccessKind);

/**
 * §8.9.8.2 — Stable handoff surfaces Layer 8 exposes to later layers.
 * These are the ONLY surfaces later layers may rely on after
 * ratification.
 */
export const L8_STABLE_HANDOFF_SURFACES:
  readonly L8DownstreamAccessKind[] =
  Object.freeze([
    L8DownstreamAccessKind.CURRENT_REGIME_SNAPSHOT,
    L8DownstreamAccessKind.CURRENT_TRANSITION_PROFILE,
    L8DownstreamAccessKind.CURRENT_CONFIDENCE_PROFILE,
    L8DownstreamAccessKind.CURRENT_MULTIPLIER_PROFILE,
    L8DownstreamAccessKind.HISTORICAL_REGIME_WINDOW,
    L8DownstreamAccessKind.HISTORICAL_TRANSITION_WINDOW,
    L8DownstreamAccessKind.HISTORICAL_CONFIDENCE_WINDOW,
    L8DownstreamAccessKind.HISTORICAL_MULTIPLIER_WINDOW,
    L8DownstreamAccessKind.REGIME_EVIDENCE_BACKED_READ,
    L8DownstreamAccessKind.REGIME_RUN_LINEAGE,
  ]);

/**
 * §8.9.8.3 — Forbidden downstream surfaces. Later layers must never
 * depend on these.
 */
export const L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS:
  readonly L8DownstreamAccessKind[] =
  Object.freeze([
    L8DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    L8DownstreamAccessKind.INTERNAL_CANDIDATE_SET,
    L8DownstreamAccessKind.INTERNAL_AMBIGUITY_ENGINE_STATE,
    L8DownstreamAccessKind.INTERNAL_TEMPLATE_STATE,
    L8DownstreamAccessKind.INTERNAL_ROLLOUT_STATE,
    L8DownstreamAccessKind.RAW_PERSISTENCE_TABLE,
    L8DownstreamAccessKind.CACHE_ONLY_SURFACE,
    L8DownstreamAccessKind.LIVE_RAW_L6_L7_RECLASSIFICATION,
    L8DownstreamAccessKind.BYPASS_L8,
    L8DownstreamAccessKind.JUDGMENT_FROM_L8,
    L8DownstreamAccessKind.SCORE_FROM_L8,
    L8DownstreamAccessKind.RECOMMENDATION_FROM_L8,
  ]);

/**
 * §8.9.8.2 — Ad-hoc regime reclassification is allowed only under
 * governed REPLAY/REPAIR modes.
 */
export const L8_GOVERNED_ONLY_ACCESS_KINDS:
  readonly L8DownstreamAccessKind[] =
  Object.freeze([
    L8DownstreamAccessKind.AD_HOC_REGIME_RECLASSIFICATION,
  ]);

export enum L8DownstreamConsumerMode {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  GOVERNED_REPLAY = 'GOVERNED_REPLAY',
  GOVERNED_REPAIR = 'GOVERNED_REPAIR',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
}

export interface L8DownstreamDependencyRequest {
  readonly request_id: string;
  readonly consumer_layer: string;
  readonly access_kind: L8DownstreamAccessKind;
  readonly consumer_mode: L8DownstreamConsumerMode;
  readonly notes: string;
}

export interface L8DownstreamDependencyDecision {
  readonly request_id: string;
  readonly allowance: L8DependencyAllowance;
  readonly rationale: string;
}
