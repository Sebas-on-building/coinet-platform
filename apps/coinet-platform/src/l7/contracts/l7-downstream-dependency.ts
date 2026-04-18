/**
 * L7.9 — Downstream Dependency Contract
 *
 * §7.9.7 — What later layers may rely on, what they may not assume,
 * and what handoff surfaces are stable. Enforced at runtime by the
 * `Layer7DownstreamDependencyValidator` (§7.9.8.3) and by §7.9.9.1
 * INV-7.9-E.
 */

export enum L7DependencyAllowance {
  ALLOWED = 'ALLOWED',
  CONDITIONALLY_ALLOWED = 'CONDITIONALLY_ALLOWED',
  DENIED = 'DENIED',
}

export const ALL_L7_DEPENDENCY_ALLOWANCES: readonly L7DependencyAllowance[] =
  Object.values(L7DependencyAllowance);

/**
 * §7.9.7.2 / §7.9.7.3 — Canonical downstream access intents. Allowed
 * surfaces are defined first, followed by governed-only and forbidden
 * kinds. Order is significant for deterministic audit records.
 */
export enum L7DownstreamAccessKind {
  // stable handoff surfaces (§7.9.7.2)
  CURRENT_VALIDATION_ASSESSMENT = 'CURRENT_VALIDATION_ASSESSMENT',
  CURRENT_CONTRADICTION_BUNDLE = 'CURRENT_CONTRADICTION_BUNDLE',
  CURRENT_CONFIDENCE_PROFILE = 'CURRENT_CONFIDENCE_PROFILE',
  CURRENT_RESTRICTION_PROFILE = 'CURRENT_RESTRICTION_PROFILE',
  HISTORICAL_VALIDATION_WINDOW = 'HISTORICAL_VALIDATION_WINDOW',
  HISTORICAL_CONTRADICTION_WINDOW = 'HISTORICAL_CONTRADICTION_WINDOW',
  HISTORICAL_CONFIDENCE_WINDOW = 'HISTORICAL_CONFIDENCE_WINDOW',
  EVIDENCE_BACKED_READ = 'EVIDENCE_BACKED_READ',
  VALIDATION_LINEAGE = 'VALIDATION_LINEAGE',

  // governed-only (§7.9.7.2 replay/repair mode)
  AD_HOC_REVALIDATION = 'AD_HOC_REVALIDATION',

  // forbidden (§7.9.7.3)
  INTERNAL_CONTRADICTION_CANDIDATES = 'INTERNAL_CONTRADICTION_CANDIDATES',
  INTERMEDIATE_ENGINE_OUTPUT = 'INTERMEDIATE_ENGINE_OUTPUT',
  INTERNAL_CAP_RESOLUTION_HELPERS = 'INTERNAL_CAP_RESOLUTION_HELPERS',
  INTERNAL_ROLLOUT_STATE = 'INTERNAL_ROLLOUT_STATE',
  RAW_PERSISTENCE_TABLES = 'RAW_PERSISTENCE_TABLES',
  CACHE_ONLY_SURFACE = 'CACHE_ONLY_SURFACE',
  LIVE_RAW_L6_REVALIDATION = 'LIVE_RAW_L6_REVALIDATION',
  BYPASS_L7 = 'BYPASS_L7',
  JUDGMENT_FROM_L7 = 'JUDGMENT_FROM_L7',
  FINAL_SCORE_FROM_L7 = 'FINAL_SCORE_FROM_L7',
}

export const ALL_L7_DOWNSTREAM_ACCESS_KINDS: readonly L7DownstreamAccessKind[] =
  Object.values(L7DownstreamAccessKind);

/**
 * §7.9.7.2 — Stable handoff surfaces Layer 7 exposes to later layers.
 * These are the ONLY surfaces later layers may rely on after
 * ratification.
 */
export const L7_STABLE_HANDOFF_SURFACES: readonly L7DownstreamAccessKind[] =
  Object.freeze([
    L7DownstreamAccessKind.CURRENT_VALIDATION_ASSESSMENT,
    L7DownstreamAccessKind.CURRENT_CONTRADICTION_BUNDLE,
    L7DownstreamAccessKind.CURRENT_CONFIDENCE_PROFILE,
    L7DownstreamAccessKind.CURRENT_RESTRICTION_PROFILE,
    L7DownstreamAccessKind.HISTORICAL_VALIDATION_WINDOW,
    L7DownstreamAccessKind.HISTORICAL_CONTRADICTION_WINDOW,
    L7DownstreamAccessKind.HISTORICAL_CONFIDENCE_WINDOW,
    L7DownstreamAccessKind.EVIDENCE_BACKED_READ,
    L7DownstreamAccessKind.VALIDATION_LINEAGE,
  ]);

/**
 * §7.9.7.3 — Forbidden downstream surfaces. Later layers must never
 * depend on these.
 */
export const L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS:
  readonly L7DownstreamAccessKind[] =
  Object.freeze([
    L7DownstreamAccessKind.INTERNAL_CONTRADICTION_CANDIDATES,
    L7DownstreamAccessKind.INTERMEDIATE_ENGINE_OUTPUT,
    L7DownstreamAccessKind.INTERNAL_CAP_RESOLUTION_HELPERS,
    L7DownstreamAccessKind.INTERNAL_ROLLOUT_STATE,
    L7DownstreamAccessKind.RAW_PERSISTENCE_TABLES,
    L7DownstreamAccessKind.CACHE_ONLY_SURFACE,
    L7DownstreamAccessKind.LIVE_RAW_L6_REVALIDATION,
    L7DownstreamAccessKind.BYPASS_L7,
    L7DownstreamAccessKind.JUDGMENT_FROM_L7,
    L7DownstreamAccessKind.FINAL_SCORE_FROM_L7,
  ]);

/**
 * §7.9.7.2 — Ad-hoc revalidation is allowed only under governed
 * REPLAY/REPAIR modes.
 */
export const L7_GOVERNED_ONLY_ACCESS_KINDS: readonly L7DownstreamAccessKind[] =
  Object.freeze([
    L7DownstreamAccessKind.AD_HOC_REVALIDATION,
  ]);

export enum L7DownstreamConsumerMode {
  NORMAL_CONSUMPTION = 'NORMAL_CONSUMPTION',
  GOVERNED_REPLAY = 'GOVERNED_REPLAY',
  GOVERNED_REPAIR = 'GOVERNED_REPAIR',
  GOVERNED_AUDIT = 'GOVERNED_AUDIT',
}

export interface L7DownstreamDependencyRequest {
  readonly request_id: string;
  readonly consumer_layer: string;
  readonly access_kind: L7DownstreamAccessKind;
  readonly consumer_mode: L7DownstreamConsumerMode;
  readonly notes: string;
}

export interface L7DownstreamDependencyDecision {
  readonly request_id: string;
  readonly allowance: L7DependencyAllowance;
  readonly rationale: string;
}
