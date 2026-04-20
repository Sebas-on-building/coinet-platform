/**
 * L9.5 — Phase Progression Policy
 *
 * §9.5.6 — The legal phase-progression graph. Phase progression is
 * distinct from sequence state (§9.5.6.3) and must follow the frozen
 * transition law (§9.5.6.4) or carry an explicit change-point
 * justification (§9.5.6.6).
 */

import { L9PhaseClass } from './phase-state';

/**
 * §9.5.6.4 — Declared legality of a phase transition.
 *
 *   LEGAL_DIRECT                    — normal progression, no anchor needed
 *   LEGAL_WITH_CHANGE_POINT         — jump allowed only with a typed
 *                                      change point (§9.5.6.6)
 *   LEGAL_WITH_SHOCK_ANCHOR         — jump allowed only with a shock
 *                                      anchor (§9.5.7)
 *   LEGAL_WITH_RECOVERY_POSTURE     — allowed only on explicit recovery
 *   ILLEGAL                         — blocked unless an explicit
 *                                      template override exists
 */
export enum L9PhaseTransitionLegality {
  LEGAL_DIRECT = 'LEGAL_DIRECT',
  LEGAL_WITH_CHANGE_POINT = 'LEGAL_WITH_CHANGE_POINT',
  LEGAL_WITH_SHOCK_ANCHOR = 'LEGAL_WITH_SHOCK_ANCHOR',
  LEGAL_WITH_RECOVERY_POSTURE = 'LEGAL_WITH_RECOVERY_POSTURE',
  ILLEGAL = 'ILLEGAL',
}

export const ALL_L9_PHASE_TRANSITION_LEGALITIES:
  readonly L9PhaseTransitionLegality[] =
    Object.values(L9PhaseTransitionLegality);

export interface L9PhaseTransition {
  readonly from: L9PhaseClass;
  readonly to: L9PhaseClass;
  readonly legality: L9PhaseTransitionLegality;
  readonly description: string;
}

/**
 * §9.5.6.4 — Frozen phase progression law. Each entry is a directed
 * edge in the phase graph plus its legality class. Missing (from, to)
 * pairs default to ILLEGAL.
 *
 * Phase vocabulary mapping to spec:
 *   SEEDING       ≈ DISCOVERY
 *   IGNITION      ≈ EARLY
 *   VALIDATION    ≈ CONFIRMING / VALIDATED
 *   EXPANSION     ≈ EXPANSION
 *   CROWDING      ≈ CROWDING
 *   REFLEXIVITY   ≈ REFLEXIVE_LATE
 *   DECAY         ≈ DECAYING
 *   DIGESTION     ≈ DIGESTION
 *   REDISTRIBUTION≈ ROTATION  (ecosystem / asset redistribution)
 *
 * (L9.3 already froze `L9PhaseClass`; this sublayer encodes the law on
 * top of that vocabulary rather than inventing a second one.)
 */
export const L9_PHASE_TRANSITIONS: readonly L9PhaseTransition[] = [
  // Default progression
  T(L9PhaseClass.DISCOVERY, L9PhaseClass.EARLY, 'LEGAL_DIRECT',
    'seeding → ignition'),
  T(L9PhaseClass.EARLY, L9PhaseClass.CONFIRMING, 'LEGAL_DIRECT',
    'ignition → validation (confirming)'),
  T(L9PhaseClass.CONFIRMING, L9PhaseClass.VALIDATED, 'LEGAL_DIRECT',
    'confirming → validated'),
  T(L9PhaseClass.VALIDATED, L9PhaseClass.EXPANSION, 'LEGAL_DIRECT',
    'validation → expansion'),
  T(L9PhaseClass.EXPANSION, L9PhaseClass.CROWDING, 'LEGAL_DIRECT',
    'expansion → crowding'),
  T(L9PhaseClass.CROWDING, L9PhaseClass.REFLEXIVE_LATE, 'LEGAL_DIRECT',
    'crowding → reflexivity'),
  T(L9PhaseClass.REFLEXIVE_LATE, L9PhaseClass.DECAYING, 'LEGAL_DIRECT',
    'reflexivity → decay'),
  T(L9PhaseClass.DECAYING, L9PhaseClass.DIGESTION, 'LEGAL_DIRECT',
    'decay → digestion'),
  T(L9PhaseClass.DIGESTION, L9PhaseClass.ROTATION, 'LEGAL_DIRECT',
    'digestion → redistribution (rotation)'),

  // Failure / shock paths
  T(L9PhaseClass.EARLY, L9PhaseClass.DECAYING, 'LEGAL_WITH_CHANGE_POINT',
    'failed ignition — requires change point'),
  T(L9PhaseClass.EXPANSION, L9PhaseClass.DECAYING, 'LEGAL_WITH_CHANGE_POINT',
    'interrupted expansion — requires change point'),
  T(L9PhaseClass.CONFIRMING, L9PhaseClass.DECAYING, 'LEGAL_WITH_CHANGE_POINT',
    'failed confirmation — requires change point'),
  T(L9PhaseClass.VALIDATED, L9PhaseClass.DECAYING, 'LEGAL_WITH_CHANGE_POINT',
    'validated setup broken — requires change point'),
  T(L9PhaseClass.CROWDING, L9PhaseClass.DECAYING, 'LEGAL_WITH_CHANGE_POINT',
    'crowded unwind — requires change point'),
  T(L9PhaseClass.EXPANSION, L9PhaseClass.SHOCK_RESPONSE,
    'LEGAL_WITH_SHOCK_ANCHOR',
    'expansion → shock response — requires shock anchor'),
  T(L9PhaseClass.VALIDATED, L9PhaseClass.SHOCK_RESPONSE,
    'LEGAL_WITH_SHOCK_ANCHOR',
    'validation → shock response — requires shock anchor'),
  T(L9PhaseClass.CROWDING, L9PhaseClass.SHOCK_RESPONSE,
    'LEGAL_WITH_SHOCK_ANCHOR',
    'crowding → shock response — requires shock anchor'),
  T(L9PhaseClass.REFLEXIVE_LATE, L9PhaseClass.SHOCK_RESPONSE,
    'LEGAL_WITH_SHOCK_ANCHOR',
    'reflexivity → shock response — requires shock anchor'),

  // Recovery / reaccumulation
  T(L9PhaseClass.DIGESTION, L9PhaseClass.RECOVERY,
    'LEGAL_WITH_RECOVERY_POSTURE',
    'digestion → recovery — requires explicit recovery posture'),
  T(L9PhaseClass.RECOVERY, L9PhaseClass.CONFIRMING,
    'LEGAL_WITH_RECOVERY_POSTURE',
    'recovery → confirming — requires explicit recovery posture'),
  T(L9PhaseClass.SHOCK_RESPONSE, L9PhaseClass.DIGESTION, 'LEGAL_DIRECT',
    'shock response → digestion'),

  // Explicitly illegal shortcuts (documented so the audit can name them)
  T(L9PhaseClass.DISCOVERY, L9PhaseClass.REFLEXIVE_LATE, 'ILLEGAL',
    'seeding → reflexivity is illegal (§9.5.6.5)'),
  T(L9PhaseClass.EARLY, L9PhaseClass.CROWDING, 'ILLEGAL',
    'ignition → crowding without intermediate support is illegal'),
  T(L9PhaseClass.DECAYING, L9PhaseClass.EXPANSION, 'ILLEGAL',
    'decay → expansion without recovery posture is illegal'),
  T(L9PhaseClass.DIGESTION, L9PhaseClass.EARLY, 'ILLEGAL',
    'digestion → ignition without reset/reactivation is illegal'),
];

function T(
  from: L9PhaseClass, to: L9PhaseClass,
  legality: keyof typeof L9PhaseTransitionLegality, description: string,
): L9PhaseTransition {
  return { from, to, legality: L9PhaseTransitionLegality[legality], description };
}

/**
 * §9.5.6.4 — Look up the legality class of a transition. Returns
 * `ILLEGAL` if no explicit entry exists.
 */
export function getL9PhaseTransitionLegality(
  from: L9PhaseClass,
  to: L9PhaseClass,
): L9PhaseTransitionLegality {
  if (from === to) return L9PhaseTransitionLegality.LEGAL_DIRECT;
  const entry = L9_PHASE_TRANSITIONS.find(
    t => t.from === from && t.to === to,
  );
  return entry?.legality ?? L9PhaseTransitionLegality.ILLEGAL;
}

/** §9.5.6.4 — Direct legal transition (no anchor/CP required)? */
export function isL9DirectLegalPhaseTransition(
  from: L9PhaseClass,
  to: L9PhaseClass,
): boolean {
  return getL9PhaseTransitionLegality(from, to) ===
    L9PhaseTransitionLegality.LEGAL_DIRECT;
}

/** §9.5.6.6 — Does this transition require a typed change point? */
export function l9PhaseTransitionRequiresChangePoint(
  from: L9PhaseClass,
  to: L9PhaseClass,
): boolean {
  return getL9PhaseTransitionLegality(from, to) ===
    L9PhaseTransitionLegality.LEGAL_WITH_CHANGE_POINT;
}

/** §9.5.6.6 — Does this transition require a shock anchor? */
export function l9PhaseTransitionRequiresShockAnchor(
  from: L9PhaseClass,
  to: L9PhaseClass,
): boolean {
  return getL9PhaseTransitionLegality(from, to) ===
    L9PhaseTransitionLegality.LEGAL_WITH_SHOCK_ANCHOR;
}

/** §9.5.6.6 — Does this transition require an explicit recovery posture? */
export function l9PhaseTransitionRequiresRecoveryPosture(
  from: L9PhaseClass,
  to: L9PhaseClass,
): boolean {
  return getL9PhaseTransitionLegality(from, to) ===
    L9PhaseTransitionLegality.LEGAL_WITH_RECOVERY_POSTURE;
}

/**
 * §9.5.6.7 — Phases that are plausibly simultaneous. When two candidate
 * phases are both plausible for the same subject, the engine must
 * preserve explicit ambiguity rather than collapsing to one.
 */
export const L9_ADJACENT_PHASE_PAIRS: readonly (readonly [
  L9PhaseClass, L9PhaseClass,
])[] = [
  [L9PhaseClass.CONFIRMING, L9PhaseClass.VALIDATED],
  [L9PhaseClass.VALIDATED, L9PhaseClass.EXPANSION],
  [L9PhaseClass.EXPANSION, L9PhaseClass.CROWDING],
  [L9PhaseClass.CROWDING, L9PhaseClass.REFLEXIVE_LATE],
  [L9PhaseClass.REFLEXIVE_LATE, L9PhaseClass.DECAYING],
  [L9PhaseClass.DECAYING, L9PhaseClass.DIGESTION],
  [L9PhaseClass.DIGESTION, L9PhaseClass.RECOVERY],
];

/** §9.5.6.7 — Are `a` and `b` legally adjacent phases? */
export function areL9PhasesAdjacent(
  a: L9PhaseClass, b: L9PhaseClass,
): boolean {
  if (a === b) return true;
  return L9_ADJACENT_PHASE_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}
