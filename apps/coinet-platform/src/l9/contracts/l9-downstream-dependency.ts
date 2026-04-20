/**
 * L9.9 — Downstream Dependency Contract
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-C — What later layers (L10+) may rely on,
 * what they may not assume, and which handoff surfaces are stable.
 * Enforced at runtime by the `Layer9HandoffValidator` (§9.9.1.5) and by
 * §9.9.4.1 INV-9.9-C.
 */

export enum L9DependencyAllowance {
  ALLOWED = 'ALLOWED',
  CONDITIONALLY_ALLOWED = 'CONDITIONALLY_ALLOWED',
  DENIED = 'DENIED',
}

export const ALL_L9_DEPENDENCY_ALLOWANCES:
  readonly L9DependencyAllowance[] =
  Object.values(L9DependencyAllowance);

/**
 * §9.9.1.4 — Canonical downstream access intents. Allowed stable
 * handoff surfaces are defined first, followed by governed-only and
 * forbidden kinds. Order is significant for deterministic audit
 * records.
 */
export enum L9DownstreamAccessKind {
  // stable handoff surfaces (§9.9.1.4)
  CURRENT_SEQUENCE_SNAPSHOT = 'CURRENT_SEQUENCE_SNAPSHOT',
  CURRENT_LEAD_LAG_PROFILE = 'CURRENT_LEAD_LAG_PROFILE',
  CURRENT_PHASE_PROFILE = 'CURRENT_PHASE_PROFILE',
  CURRENT_DECAY_PROFILE = 'CURRENT_DECAY_PROFILE',
  CURRENT_POST_EVENT_WINDOW_PROFILE = 'CURRENT_POST_EVENT_WINDOW_PROFILE',
  CURRENT_SEQUENCE_CONFIDENCE_PROFILE =
    'CURRENT_SEQUENCE_CONFIDENCE_PROFILE',
  CURRENT_SEQUENCE_RESTRICTION_PROFILE =
    'CURRENT_SEQUENCE_RESTRICTION_PROFILE',
  CURRENT_CAUSAL_RESTRAINT_PROFILE = 'CURRENT_CAUSAL_RESTRAINT_PROFILE',
  HISTORICAL_SEQUENCE_WINDOW = 'HISTORICAL_SEQUENCE_WINDOW',
  HISTORICAL_LEAD_LAG_WINDOW = 'HISTORICAL_LEAD_LAG_WINDOW',
  HISTORICAL_PHASE_WINDOW = 'HISTORICAL_PHASE_WINDOW',
  HISTORICAL_CONFIDENCE_WINDOW = 'HISTORICAL_CONFIDENCE_WINDOW',
  SEQUENCE_EVIDENCE_BACKED_READ = 'SEQUENCE_EVIDENCE_BACKED_READ',
  SEQUENCE_RUN_LINEAGE = 'SEQUENCE_RUN_LINEAGE',

  // governed-only
  AD_HOC_SEQUENCE_RECLASSIFICATION = 'AD_HOC_SEQUENCE_RECLASSIFICATION',

  // forbidden
  INTERNAL_RUNTIME_DAG_NODE = 'INTERNAL_RUNTIME_DAG_NODE',
  INTERNAL_CANDIDATE_SET = 'INTERNAL_CANDIDATE_SET',
  INTERNAL_AMBIGUITY_ENGINE_STATE = 'INTERNAL_AMBIGUITY_ENGINE_STATE',
  INTERNAL_TEMPLATE_STATE = 'INTERNAL_TEMPLATE_STATE',
  INTERNAL_ROLLOUT_STATE = 'INTERNAL_ROLLOUT_STATE',
  RAW_PERSISTENCE_TABLE = 'RAW_PERSISTENCE_TABLE',
  CACHE_ONLY_SURFACE = 'CACHE_ONLY_SURFACE',
  LIVE_RAW_LOWER_LAYER_RECONSTRUCTION =
    'LIVE_RAW_LOWER_LAYER_RECONSTRUCTION',
  BYPASS_L9 = 'BYPASS_L9',
  JUDGMENT_FROM_L9 = 'JUDGMENT_FROM_L9',
  SCORE_FROM_L9 = 'SCORE_FROM_L9',
  RECOMMENDATION_FROM_L9 = 'RECOMMENDATION_FROM_L9',
  CAUSAL_CERTAINTY_FROM_L9 = 'CAUSAL_CERTAINTY_FROM_L9',
}

export const ALL_L9_DOWNSTREAM_ACCESS_KINDS:
  readonly L9DownstreamAccessKind[] =
  Object.values(L9DownstreamAccessKind);

/**
 * §9.9.1.4 — Stable handoff surfaces Layer 9 exposes to later layers.
 * These are the ONLY surfaces later layers may rely on after
 * ratification.
 */
export const L9_STABLE_HANDOFF_SURFACES:
  readonly L9DownstreamAccessKind[] =
  Object.freeze([
    L9DownstreamAccessKind.CURRENT_SEQUENCE_SNAPSHOT,
    L9DownstreamAccessKind.CURRENT_LEAD_LAG_PROFILE,
    L9DownstreamAccessKind.CURRENT_PHASE_PROFILE,
    L9DownstreamAccessKind.CURRENT_DECAY_PROFILE,
    L9DownstreamAccessKind.CURRENT_POST_EVENT_WINDOW_PROFILE,
    L9DownstreamAccessKind.CURRENT_SEQUENCE_CONFIDENCE_PROFILE,
    L9DownstreamAccessKind.CURRENT_SEQUENCE_RESTRICTION_PROFILE,
    L9DownstreamAccessKind.CURRENT_CAUSAL_RESTRAINT_PROFILE,
    L9DownstreamAccessKind.HISTORICAL_SEQUENCE_WINDOW,
    L9DownstreamAccessKind.HISTORICAL_LEAD_LAG_WINDOW,
    L9DownstreamAccessKind.HISTORICAL_PHASE_WINDOW,
    L9DownstreamAccessKind.HISTORICAL_CONFIDENCE_WINDOW,
    L9DownstreamAccessKind.SEQUENCE_EVIDENCE_BACKED_READ,
    L9DownstreamAccessKind.SEQUENCE_RUN_LINEAGE,
  ]);

/**
 * §9.9.1.4 — Forbidden downstream surfaces. Later layers must never
 * depend on these.
 */
export const L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS:
  readonly L9DownstreamAccessKind[] =
  Object.freeze([
    L9DownstreamAccessKind.INTERNAL_RUNTIME_DAG_NODE,
    L9DownstreamAccessKind.INTERNAL_CANDIDATE_SET,
    L9DownstreamAccessKind.INTERNAL_AMBIGUITY_ENGINE_STATE,
    L9DownstreamAccessKind.INTERNAL_TEMPLATE_STATE,
    L9DownstreamAccessKind.INTERNAL_ROLLOUT_STATE,
    L9DownstreamAccessKind.RAW_PERSISTENCE_TABLE,
    L9DownstreamAccessKind.CACHE_ONLY_SURFACE,
    L9DownstreamAccessKind.LIVE_RAW_LOWER_LAYER_RECONSTRUCTION,
    L9DownstreamAccessKind.BYPASS_L9,
    L9DownstreamAccessKind.JUDGMENT_FROM_L9,
    L9DownstreamAccessKind.SCORE_FROM_L9,
    L9DownstreamAccessKind.RECOMMENDATION_FROM_L9,
    L9DownstreamAccessKind.CAUSAL_CERTAINTY_FROM_L9,
  ]);

/**
 * §9.9.1.4 — Ad-hoc sequence reclassification is allowed only under
 * governed REPLAY/REPAIR modes.
 */
export const L9_GOVERNED_ONLY_ACCESS_KINDS:
  readonly L9DownstreamAccessKind[] =
  Object.freeze([
    L9DownstreamAccessKind.AD_HOC_SEQUENCE_RECLASSIFICATION,
  ]);

export enum L9DownstreamConsumerMode {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  GOVERNED_REPLAY = 'GOVERNED_REPLAY',
  GOVERNED_REPAIR = 'GOVERNED_REPAIR',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
}

export interface L9DownstreamDependencyRequest {
  readonly request_id: string;
  readonly consumer_layer: string;
  readonly access_kind: L9DownstreamAccessKind;
  readonly consumer_mode: L9DownstreamConsumerMode;
  readonly notes: string;
}

export interface L9DownstreamDependencyDecision {
  readonly request_id: string;
  readonly allowance: L9DependencyAllowance;
  readonly rationale: string;
}
