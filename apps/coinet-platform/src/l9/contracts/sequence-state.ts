/**
 * L9.2 — Canonical Sequence State Vocabulary
 *
 * §9.2.6 — Governed sequence states, each belonging to a registered
 * family. A sequence state is interpretive temporal meaning; it is not
 * the same as a phase class (§9.2.6.4) and may never carry judgment,
 * scenario, recommendation, or action-bias semantics (§9.2.6.5).
 *
 * §9.2.6.1 / §9.2.6.2 — Canonical + production-ready extension states.
 */

import { L9SequenceFamily, L9SequenceScopeType } from './sequence-family';

/**
 * §9.2.6.1 + §9.2.6.2 — Frozen canonical set. Every governed sequence
 * label at runtime must come from this enum.
 */
export enum L9SequenceState {
  // Canonical (§9.2.6.1)
  PRE_NARRATIVE_ACCUMULATION = 'PRE_NARRATIVE_ACCUMULATION',
  EARLY_NARRATIVE_IGNITION = 'EARLY_NARRATIVE_IGNITION',
  VALIDATED_EXPANSION = 'VALIDATED_EXPANSION',
  LEVERAGE_CROWDING_PHASE = 'LEVERAGE_CROWDING_PHASE',
  LATE_STAGE_REFLEXIVITY = 'LATE_STAGE_REFLEXIVITY',
  POST_SHOCK_DIGESTION = 'POST_SHOCK_DIGESTION',
  DISTRIBUTION_UNDER_HYPE = 'DISTRIBUTION_UNDER_HYPE',

  // Production-ready extensions (§9.2.6.2)
  REACCUMULATION_ATTEMPT = 'REACCUMULATION_ATTEMPT',
  FAILED_CONTINUATION = 'FAILED_CONTINUATION',
  STRUCTURAL_CONFIRMATION_GAP = 'STRUCTURAL_CONFIRMATION_GAP',
  CROWDING_WITHOUT_CONFIRMATION = 'CROWDING_WITHOUT_CONFIRMATION',
  RECOVERY_UNDER_DAMAGE = 'RECOVERY_UNDER_DAMAGE',
  ROTATION_EARLY = 'ROTATION_EARLY',
  ROTATION_VALIDATED = 'ROTATION_VALIDATED',
}

export const ALL_L9_SEQUENCE_STATES: readonly L9SequenceState[] =
  Object.values(L9SequenceState);

/**
 * §9.2.6.3 — Temporal dominance: which part of the chain the state is
 * about. Used by the coexistence rulebook (§9.2.7.5) to classify
 * transitional overlaps and illegal early/late collisions.
 */
export type L9SequenceDominance =
  | 'EARLY'
  | 'CONFIRMATORY'
  | 'MIDDLE'
  | 'LATE'
  | 'POST_EVENT'
  | 'RECOVERY'
  | 'STRUCTURAL_GAP';

/**
 * §9.2.6.5 — Cleanliness posture. A sequence state may not emit as
 * clean if ordering ambiguity is material, contradiction is unresolved,
 * or decay burden is high. The descriptor flags whether the state is
 * allowed to emit with a CLEAN_SINGLE coexistence class at all.
 */
export interface L9SequenceStateDescriptor {
  readonly state: L9SequenceState;
  readonly family: L9SequenceFamily;
  readonly dominance: L9SequenceDominance;
  readonly semantic: string;
  readonly legalScopeTypes: readonly L9SequenceScopeType[];
  /**
   * §9.2.4.9 / §9.2.5.2 — Post-event anchor requirement: emitting this
   * state without an anchored `PostEventWindow` is illegal.
   */
  readonly requiresPostEventAnchor: boolean;
  /**
   * §9.2.6.5 — States that are inherently ambiguous or damage-bearing
   * may not be emitted under coexistence_class = CLEAN_SINGLE.
   */
  readonly cleanSingleAllowed: boolean;
  /**
   * Direction the state's temporal meaning trends in. Used only for
   * registry inspection — never used to decide trading semantics.
   */
  readonly directionalPosture: 'EXPANSIVE' | 'CONTRACTIVE' | 'FRAGILE' | 'NEUTRAL';
}

export const L9_SEQUENCE_STATE_DESCRIPTORS: readonly L9SequenceStateDescriptor[] = [
  // ── ACCUMULATION_TO_EXPANSION ──
  {
    state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    dominance: 'EARLY',
    semantic:
      'Accumulation and quiet support are building before broader narrative ' +
      'visibility or participation surge.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'EXPANSIVE',
  },
  {
    state: L9SequenceState.EARLY_NARRATIVE_IGNITION,
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    dominance: 'CONFIRMATORY',
    semantic:
      'Narrative ignition follows earlier accumulation with still-early ' +
      'participation breadth.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'EXPANSIVE',
  },
  {
    state: L9SequenceState.VALIDATED_EXPANSION,
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    dominance: 'MIDDLE',
    semantic:
      'Expansion is confirmed by broad participation, liquidity support, and ' +
      'structural validation.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'EXPANSIVE',
  },
  {
    state: L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    dominance: 'STRUCTURAL_GAP',
    semantic:
      'Participation appears but earlier structural confirmation is missing ' +
      'or weak — continuation is not yet supported.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: false,
    directionalPosture: 'FRAGILE',
  },

  // ── NARRATIVE_LED ──
  {
    state: L9SequenceState.DISTRIBUTION_UNDER_HYPE,
    family: L9SequenceFamily.NARRATIVE_LED,
    dominance: 'LATE',
    semantic:
      'Narrative intensity and visible participation rise while on-chain or ' +
      'structural behaviour reflects distribution, not accumulation.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: false,
    directionalPosture: 'CONTRACTIVE',
  },
  {
    state: L9SequenceState.FAILED_CONTINUATION,
    family: L9SequenceFamily.NARRATIVE_LED,
    dominance: 'LATE',
    semantic:
      'The narrative-led progression failed to convert into validated ' +
      'continuation — expansion did not follow ignition.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: false,
    directionalPosture: 'CONTRACTIVE',
  },

  // ── LEVERAGE_AND_REFLEXIVITY ──
  {
    state: L9SequenceState.LEVERAGE_CROWDING_PHASE,
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    dominance: 'LATE',
    semantic:
      'Derivatives, funding, and OI dominate expansion; crowding is material ' +
      'and late-participation risk is elevated.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'MARKET', 'CHAIN', 'ECOSYSTEM'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'FRAGILE',
  },
  {
    state: L9SequenceState.LATE_STAGE_REFLEXIVITY,
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    dominance: 'LATE',
    semantic:
      'Reflexive late-stage dynamics dominate — price creates narrative which ' +
      'creates more price, unsupported by earlier structural progression.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'MARKET', 'CHAIN', 'ECOSYSTEM'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: false,
    directionalPosture: 'FRAGILE',
  },
  {
    state: L9SequenceState.CROWDING_WITHOUT_CONFIRMATION,
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    dominance: 'STRUCTURAL_GAP',
    semantic:
      'Crowding is present but the earlier validated expansion or structural ' +
      'support is absent — participation is ahead of foundation.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'MARKET', 'CHAIN', 'ECOSYSTEM'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: false,
    directionalPosture: 'FRAGILE',
  },

  // ── OVERHANG_AND_DIGESTION ──
  {
    state: L9SequenceState.POST_SHOCK_DIGESTION,
    family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
    dominance: 'POST_EVENT',
    semantic:
      'Unlock, liquidation, or narrative shock has hit and the system is ' +
      'processing that new state rather than cleanly resuming prior regime.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'ECOSYSTEM'],
    requiresPostEventAnchor: true,
    cleanSingleAllowed: true,
    directionalPosture: 'NEUTRAL',
  },
  {
    state: L9SequenceState.REACCUMULATION_ATTEMPT,
    family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
    dominance: 'RECOVERY',
    semantic:
      'Post-event digestion is being followed by an early reaccumulation ' +
      'attempt that has not yet been validated.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'ECOSYSTEM'],
    requiresPostEventAnchor: true,
    cleanSingleAllowed: false,
    directionalPosture: 'NEUTRAL',
  },

  // ── ECOSYSTEM_ROTATION ──
  {
    state: L9SequenceState.ROTATION_EARLY,
    family: L9SequenceFamily.ECOSYSTEM_ROTATION,
    dominance: 'EARLY',
    semantic:
      'Attention / capital / narrative energy is beginning to rotate toward ' +
      'a new chain / sector / cluster — participation is still thin.',
    legalScopeTypes: ['CHAIN', 'SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'EXPANSIVE',
  },
  {
    state: L9SequenceState.ROTATION_VALIDATED,
    family: L9SequenceFamily.ECOSYSTEM_ROTATION,
    dominance: 'CONFIRMATORY',
    semantic:
      'Rotation has been validated by broad participation, liquidity movement, ' +
      'and cross-surface confirmation.',
    legalScopeTypes: ['CHAIN', 'SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
    requiresPostEventAnchor: false,
    cleanSingleAllowed: true,
    directionalPosture: 'EXPANSIVE',
  },

  // ── SHOCK_AND_RECOVERY ──
  {
    state: L9SequenceState.RECOVERY_UNDER_DAMAGE,
    family: L9SequenceFamily.SHOCK_AND_RECOVERY,
    dominance: 'RECOVERY',
    semantic:
      'Recovery behaviour is observed but structural damage from the shock ' +
      'has not been fully repaired.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'ECOSYSTEM'],
    requiresPostEventAnchor: true,
    cleanSingleAllowed: false,
    directionalPosture: 'FRAGILE',
  },
];

export function getL9SequenceStateDescriptor(
  state: L9SequenceState,
): L9SequenceStateDescriptor | undefined {
  return L9_SEQUENCE_STATE_DESCRIPTORS.find(d => d.state === state);
}

export function isL9RegisteredSequenceState(value: string): boolean {
  return L9_SEQUENCE_STATE_DESCRIPTORS.some(d => d.state === value);
}

export function getL9SequenceStatesForFamily(
  family: L9SequenceFamily,
): readonly L9SequenceStateDescriptor[] {
  return L9_SEQUENCE_STATE_DESCRIPTORS.filter(d => d.family === family);
}

export function l9StateBelongsToFamily(
  state: L9SequenceState,
  family: L9SequenceFamily,
): boolean {
  const d = getL9SequenceStateDescriptor(state);
  if (!d) return false;
  return d.family === family;
}

export function l9StateAllowsScope(
  state: L9SequenceState,
  scope: L9SequenceScopeType,
): boolean {
  const d = getL9SequenceStateDescriptor(state);
  if (!d) return false;
  return d.legalScopeTypes.includes(scope);
}

export function l9StateRequiresPostEventAnchor(state: L9SequenceState): boolean {
  return getL9SequenceStateDescriptor(state)?.requiresPostEventAnchor ?? false;
}

export function l9StateAllowsCleanSingle(state: L9SequenceState): boolean {
  return getL9SequenceStateDescriptor(state)?.cleanSingleAllowed ?? false;
}

export function getL9SequenceDominance(
  state: L9SequenceState,
): L9SequenceDominance | null {
  return getL9SequenceStateDescriptor(state)?.dominance ?? null;
}
