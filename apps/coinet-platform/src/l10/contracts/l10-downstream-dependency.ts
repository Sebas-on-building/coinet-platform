/**
 * L10.9 — Downstream Dependency Contract
 *
 * §10.9.7 / §10.9.13 INV-10.9-C — What later layers (L11+) may rely
 * on, what they may not assume, and which handoff surfaces are
 * stable. Enforced at runtime by the `Layer10HandoffValidator` and
 * by §10.9.13 INV-10.9-C.
 */

export enum L10DependencyAllowance {
  ALLOWED = 'ALLOWED',
  CONDITIONALLY_ALLOWED = 'CONDITIONALLY_ALLOWED',
  DENIED = 'DENIED',
}

export const ALL_L10_DEPENDENCY_ALLOWANCES:
  readonly L10DependencyAllowance[] =
  Object.values(L10DependencyAllowance);

/**
 * §10.9.7.5 — Canonical downstream access intents. Allowed stable
 * handoff surfaces are defined first, followed by governed-only and
 * forbidden kinds. Order is significant for deterministic audit
 * records.
 */
export enum L10DownstreamAccessKind {
  // stable handoff surfaces (§10.9.7.3)
  CURRENT_HYPOTHESIS_SNAPSHOT = 'CURRENT_HYPOTHESIS_SNAPSHOT',
  CURRENT_HYPOTHESIS_RANKING = 'CURRENT_HYPOTHESIS_RANKING',
  CURRENT_SPREAD_PROFILE = 'CURRENT_SPREAD_PROFILE',
  CURRENT_RELIANCE_PROFILE = 'CURRENT_RELIANCE_PROFILE',
  CURRENT_CONFIRMATION_POSTURE = 'CURRENT_CONFIRMATION_POSTURE',
  CURRENT_INVALIDATION_POSTURE = 'CURRENT_INVALIDATION_POSTURE',
  CURRENT_SHIFT_CONDITION_SET = 'CURRENT_SHIFT_CONDITION_SET',
  HYPOTHESIS_HISTORY_WINDOW = 'HYPOTHESIS_HISTORY_WINDOW',
  HYPOTHESIS_RANKING_HISTORY_WINDOW = 'HYPOTHESIS_RANKING_HISTORY_WINDOW',
  HYPOTHESIS_SPREAD_HISTORY_WINDOW = 'HYPOTHESIS_SPREAD_HISTORY_WINDOW',
  HYPOTHESIS_EVIDENCE_BUNDLE = 'HYPOTHESIS_EVIDENCE_BUNDLE',
  HYPOTHESIS_LINEAGE_VIEW = 'HYPOTHESIS_LINEAGE_VIEW',

  // governed-only
  AD_HOC_HYPOTHESIS_REPLAY = 'AD_HOC_HYPOTHESIS_REPLAY',
  AD_HOC_HYPOTHESIS_REPAIR = 'AD_HOC_HYPOTHESIS_REPAIR',

  // forbidden
  INTERNAL_RUNTIME_DAG_NODE = 'INTERNAL_RUNTIME_DAG_NODE',
  INTERNAL_CANDIDATE_GENERATION_STATE =
    'INTERNAL_CANDIDATE_GENERATION_STATE',
  INTERNAL_SUPPORT_RESOLVER_STATE = 'INTERNAL_SUPPORT_RESOLVER_STATE',
  INTERNAL_CONTRADICTION_RESOLVER_STATE =
    'INTERNAL_CONTRADICTION_RESOLVER_STATE',
  INTERNAL_CAP_CHAIN_EDGE_DETAILS = 'INTERNAL_CAP_CHAIN_EDGE_DETAILS',
  INTERNAL_TEMPLATE_STATE = 'INTERNAL_TEMPLATE_STATE',
  INTERNAL_ROLLOUT_STATE = 'INTERNAL_ROLLOUT_STATE',
  INTERNAL_REGISTRY_MUTATION_API = 'INTERNAL_REGISTRY_MUTATION_API',
  RAW_PERSISTENCE_TABLE = 'RAW_PERSISTENCE_TABLE',
  CACHE_ONLY_SURFACE = 'CACHE_ONLY_SURFACE',
  LIVE_RAW_LOWER_LAYER_REBUILD = 'LIVE_RAW_LOWER_LAYER_REBUILD',
  BYPASS_L10 = 'BYPASS_L10',
  JUDGMENT_FROM_L10 = 'JUDGMENT_FROM_L10',
  SCENARIO_FROM_L10 = 'SCENARIO_FROM_L10',
  SCORE_FROM_L10 = 'SCORE_FROM_L10',
  RECOMMENDATION_FROM_L10 = 'RECOMMENDATION_FROM_L10',
  PRIMARY_AS_FINAL_JUDGMENT = 'PRIMARY_AS_FINAL_JUDGMENT',
  CONFIDENCE_WITHOUT_SPREAD_OR_RELIANCE =
    'CONFIDENCE_WITHOUT_SPREAD_OR_RELIANCE',
  IGNORES_SHIFT_CONDITIONS_UNDER_LIVE_COMPETITION =
    'IGNORES_SHIFT_CONDITIONS_UNDER_LIVE_COMPETITION',
}

export const ALL_L10_DOWNSTREAM_ACCESS_KINDS:
  readonly L10DownstreamAccessKind[] =
  Object.values(L10DownstreamAccessKind);

/**
 * §10.9.7.3 — Stable handoff surfaces Layer 10 exposes to later
 * layers. These are the ONLY surfaces later layers may rely on after
 * ratification.
 */
export const L10_STABLE_HANDOFF_SURFACES:
  readonly L10DownstreamAccessKind[] =
  Object.freeze([
    L10DownstreamAccessKind.CURRENT_HYPOTHESIS_SNAPSHOT,
    L10DownstreamAccessKind.CURRENT_HYPOTHESIS_RANKING,
    L10DownstreamAccessKind.CURRENT_SPREAD_PROFILE,
    L10DownstreamAccessKind.CURRENT_RELIANCE_PROFILE,
    L10DownstreamAccessKind.CURRENT_CONFIRMATION_POSTURE,
    L10DownstreamAccessKind.CURRENT_INVALIDATION_POSTURE,
    L10DownstreamAccessKind.CURRENT_SHIFT_CONDITION_SET,
    L10DownstreamAccessKind.HYPOTHESIS_HISTORY_WINDOW,
    L10DownstreamAccessKind.HYPOTHESIS_RANKING_HISTORY_WINDOW,
    L10DownstreamAccessKind.HYPOTHESIS_SPREAD_HISTORY_WINDOW,
    L10DownstreamAccessKind.HYPOTHESIS_EVIDENCE_BUNDLE,
    L10DownstreamAccessKind.HYPOTHESIS_LINEAGE_VIEW,
  ]);

/**
 * §10.9.7.4 — Forbidden downstream surfaces. Later layers must never
 * depend on these.
 */
export const L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS:
  readonly L10DownstreamAccessKind[] =
  Object.freeze([
    L10DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    L10DownstreamAccessKind.INTERNAL_CANDIDATE_GENERATION_STATE,
    L10DownstreamAccessKind.INTERNAL_SUPPORT_RESOLVER_STATE,
    L10DownstreamAccessKind.INTERNAL_CONTRADICTION_RESOLVER_STATE,
    L10DownstreamAccessKind.INTERNAL_CAP_CHAIN_EDGE_DETAILS,
    L10DownstreamAccessKind.INTERNAL_TEMPLATE_STATE,
    L10DownstreamAccessKind.INTERNAL_ROLLOUT_STATE,
    L10DownstreamAccessKind.INTERNAL_REGISTRY_MUTATION_API,
    L10DownstreamAccessKind.RAW_PERSISTENCE_TABLE,
    L10DownstreamAccessKind.CACHE_ONLY_SURFACE,
    L10DownstreamAccessKind.LIVE_RAW_LOWER_LAYER_REBUILD,
    L10DownstreamAccessKind.BYPASS_L10,
    L10DownstreamAccessKind.JUDGMENT_FROM_L10,
    L10DownstreamAccessKind.SCENARIO_FROM_L10,
    L10DownstreamAccessKind.SCORE_FROM_L10,
    L10DownstreamAccessKind.RECOMMENDATION_FROM_L10,
    L10DownstreamAccessKind.PRIMARY_AS_FINAL_JUDGMENT,
    L10DownstreamAccessKind.CONFIDENCE_WITHOUT_SPREAD_OR_RELIANCE,
    L10DownstreamAccessKind.IGNORES_SHIFT_CONDITIONS_UNDER_LIVE_COMPETITION,
  ]);

/**
 * §10.9.9.4 — Ad-hoc reclassification is allowed only under governed
 * REPLAY/REPAIR/AUDIT modes.
 */
export const L10_GOVERNED_ONLY_ACCESS_KINDS:
  readonly L10DownstreamAccessKind[] =
  Object.freeze([
    L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPLAY,
    L10DownstreamAccessKind.AD_HOC_HYPOTHESIS_REPAIR,
  ]);

export enum L10DownstreamConsumerMode {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  GOVERNED_REPLAY = 'GOVERNED_REPLAY',
  GOVERNED_REPAIR = 'GOVERNED_REPAIR',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
}

export interface L10DownstreamDependencyRequest {
  readonly request_id: string;
  readonly consumer_layer: string;
  readonly access_kind: L10DownstreamAccessKind;
  readonly consumer_mode: L10DownstreamConsumerMode;
  readonly notes: string;
}

export interface L10DownstreamDependencyDecision {
  readonly request_id: string;
  readonly allowance: L10DependencyAllowance;
  readonly rationale: string;
}
