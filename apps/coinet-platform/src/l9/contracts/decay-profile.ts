/**
 * L9.2 — DecayProfile Contract
 *
 * §9.2.4.8 — Models the loss of meaning of prior signals. Decay must
 * remain explicit (§9.2.4.8 law) — it may not be hidden inside
 * confidence alone.
 */

/**
 * §9.2.4.8 — Decay class: banded form of `decay_score`.
 */
export enum L9DecayClass {
  FRESH = 'FRESH',
  AGING = 'AGING',
  DECAYING = 'DECAYING',
  DEPRECATED = 'DEPRECATED',
}

export const ALL_L9_DECAY_CLASSES: readonly L9DecayClass[] =
  Object.values(L9DecayClass);

/**
 * §9.2.4.8 — Canonical reasons why a signal has decayed. Typed so audit
 * and regression can reason about why earlier evidence lost weight.
 */
export enum L9DecayReasonCode {
  TIME_BURDEN = 'TIME_BURDEN',
  LATER_CONTRADICTION = 'LATER_CONTRADICTION',
  REGIME_CHANGE = 'REGIME_CHANGE',
  PHASE_SHIFT = 'PHASE_SHIFT',
  STRUCTURAL_OVERRIDE = 'STRUCTURAL_OVERRIDE',
  SHOCK_EVENT = 'SHOCK_EVENT',
  UNLOCK_EVENT = 'UNLOCK_EVENT',
}

export const ALL_L9_DECAY_REASON_CODES: readonly L9DecayReasonCode[] =
  Object.values(L9DecayReasonCode);

/**
 * §9.2.4.8 — The DecayProfile object.
 */
export interface L9DecayProfile {
  readonly decay_profile_id: string;
  readonly sequence_subject_id: string;
  readonly decay_score: number; // 0..1 — higher = more decayed
  readonly decay_class: L9DecayClass;
  readonly decaying_signal_refs: readonly string[];
  readonly surviving_signal_refs: readonly string[];
  readonly decay_reason_codes: readonly L9DecayReasonCode[];
  readonly time_burden_ms: number;
  readonly lineage_refs: readonly string[];
}
