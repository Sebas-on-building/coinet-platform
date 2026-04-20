/**
 * L9.2 — PhaseState Contract
 *
 * §9.2.4.6 — Governed phase-progression position of a setup. Phase is
 * not the same as sequence state (§9.2.6.4): phase is *where in the
 * progression*, the state is *interpretive temporal meaning*. Both are
 * first-class and must remain separate.
 */

/**
 * §9.2.4.6 — Canonical phase classes. Frozen and family-agnostic; the
 * family determines which phases are legal (handled by the coexistence
 * rulebook, not here).
 */
export enum L9PhaseClass {
  DISCOVERY = 'DISCOVERY',
  EARLY = 'EARLY',
  CONFIRMING = 'CONFIRMING',
  VALIDATED = 'VALIDATED',
  EXPANSION = 'EXPANSION',
  CROWDING = 'CROWDING',
  LATE = 'LATE',
  REFLEXIVE_LATE = 'REFLEXIVE_LATE',
  DIGESTION = 'DIGESTION',
  RECOVERY = 'RECOVERY',
  ROTATION = 'ROTATION',
  SHOCK_RESPONSE = 'SHOCK_RESPONSE',
  DECAYING = 'DECAYING',
}

export const ALL_L9_PHASE_CLASSES: readonly L9PhaseClass[] =
  Object.values(L9PhaseClass);

/**
 * §9.2.4.6 — Banded phase progression score so downstream consumers
 * never derive bands themselves. Kept alongside the raw 0..1 score.
 */
export enum L9PhaseProgressionClass {
  INITIATING = 'INITIATING',
  DEVELOPING = 'DEVELOPING',
  CONFIRMED = 'CONFIRMED',
  MATURING = 'MATURING',
  TERMINAL = 'TERMINAL',
}

export const ALL_L9_PHASE_PROGRESSION_CLASSES: readonly L9PhaseProgressionClass[] =
  Object.values(L9PhaseProgressionClass);

/**
 * §9.2.4.6 — The full PhaseState object. Phase must remain separate from
 * family and sequence state; a family can contain multiple possible
 * phases.
 */
export interface L9PhaseState {
  readonly phase_state_id: string;
  readonly sequence_subject_id: string;
  readonly phase_class: L9PhaseClass;
  /** 0..1, banded into `phase_progression_class`. */
  readonly phase_progression_score: number;
  readonly phase_progression_class: L9PhaseProgressionClass;
  readonly phase_support_refs: readonly string[];
  readonly phase_challenge_refs: readonly string[];
  readonly phase_started_at: string;
  readonly phase_last_confirmed_at: string;
  readonly lineage_refs: readonly string[];
}
