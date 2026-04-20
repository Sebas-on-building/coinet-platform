/**
 * L9.5 — Temporal Semantics Shared Types
 *
 * §9.5.3.6 — Canonical temporal modes and shared semantic-tier types
 * used across every L9.5 policy, registry, validator, audit, and
 * invariant. Every later L9 runtime call that takes a temporal
 * interpretation must declare one of these modes.
 */

/**
 * §9.5.3.6 — Canonical temporal modes. The engine must remain mode-safe
 * — a semantic rule that holds under `LIVE_CURRENT` must also hold
 * under `REPLAY_HISTORICAL` given the same governed inputs.
 */
export enum L9TemporalMode {
  /** Current live clock against current inputs. */
  LIVE_CURRENT = 'LIVE_CURRENT',
  /** Live engine answering for a past `as_of`. */
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  /** Deterministic replay against a frozen snapshot. */
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  /** Repair rebuild (late data, corrected upstream, etc.). */
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  /** Reinterpretation triggered by late-arriving evidence. */
  LATE_DATA_REINTERPRETATION = 'LATE_DATA_REINTERPRETATION',
}

export const ALL_L9_TEMPORAL_MODES: readonly L9TemporalMode[] =
  Object.values(L9TemporalMode);

/**
 * §9.5 — Semantic-tier label. Every L9.5 violation carries its tier so
 * the runtime audit can report which semantic chapter rejected the
 * interpretation without decoding the code string.
 */
export enum L9TemporalSemanticTier {
  TIME_SURFACE = 'TIME_SURFACE',
  WINDOW = 'WINDOW',
  LEAD_LAG = 'LEAD_LAG',
  PHASE_PROGRESSION = 'PHASE_PROGRESSION',
  CHANGE_POINT = 'CHANGE_POINT',
  DECAY = 'DECAY',
  POST_EVENT = 'POST_EVENT',
  INTERACTION = 'INTERACTION',
}

export const ALL_L9_TEMPORAL_SEMANTIC_TIERS:
  readonly L9TemporalSemanticTier[] =
    Object.values(L9TemporalSemanticTier);

/**
 * §9.5 — Ambiguity posture. Used by the semantic layer to declare that
 * a temporal interpretation cannot narrow to a single clean reading.
 * Ambiguity is explicit in L9 (§9.1.6.3) and may not be hidden.
 */
export enum L9SemanticAmbiguityPosture {
  NONE = 'NONE',
  DUAL_PHASE = 'DUAL_PHASE',
  DUAL_STATE = 'DUAL_STATE',
  DECAY_CONTESTED = 'DECAY_CONTESTED',
  LATE_VS_CONFIRMATION = 'LATE_VS_CONFIRMATION',
  POST_EVENT_CONTESTED = 'POST_EVENT_CONTESTED',
}

export const ALL_L9_SEMANTIC_AMBIGUITY_POSTURES:
  readonly L9SemanticAmbiguityPosture[] =
    Object.values(L9SemanticAmbiguityPosture);

/**
 * §9.5 — Common result shape used across L9.5 validators.
 *
 *   ok:         the interpretation is legal under L9.5 law
 *   narrowed:   legal but must narrow (e.g. drop to evidence-only)
 *   blocked:    illegal, must not be emitted
 */
export type L9TemporalSemanticLegality = 'OK' | 'NARROWED' | 'BLOCKED';

/**
 * §9.5 — Reason a validator returned NARROWED/BLOCKED. Free-form detail
 * is allowed but the `tier` and `code` must always be typed.
 */
export interface L9TemporalSemanticReason {
  readonly tier: L9TemporalSemanticTier;
  readonly code: string;
  readonly detail: string;
  readonly offending_refs?: readonly string[];
}
