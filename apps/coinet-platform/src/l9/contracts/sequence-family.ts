/**
 * L9.2 — Sequence Family Taxonomy
 *
 * §9.2.5 — The canonical sequence families for the Sequence & Temporal
 * Engine. Each family has its own state vocabulary, scope legality,
 * semantic role, and coexistence posture. Families may not be collapsed
 * into each other (§9.2.5.4).
 *
 * §9.2.1.5 — A sequence is not a story about events. It is a governed
 * temporal structure over validated and contextualized lower-layer
 * truth. The family declares *what kind* of temporal structure is being
 * governed.
 */

/**
 * §9.2.5.1 — The six canonical sequence families. Nothing else may be
 * used as the `sequence_family` of a first-class L9 temporal object.
 *
 *   ACCUMULATION_TO_EXPANSION  — accumulation → liquidity → participation → crowding
 *   NARRATIVE_LED              — narrative emergence → breadth → substance/hype progression
 *   LEVERAGE_AND_REFLEXIVITY   — crowding / basis / funding stress / unwind
 *   OVERHANG_AND_DIGESTION     — unlocks / shocks / digestion / reaccumulation attempts
 *   ECOSYSTEM_ROTATION         — chain / sector / attention rotation
 *   SHOCK_AND_RECOVERY         — security / liquidation / contradiction shocks and repair
 */
export enum L9SequenceFamily {
  ACCUMULATION_TO_EXPANSION = 'ACCUMULATION_TO_EXPANSION',
  NARRATIVE_LED = 'NARRATIVE_LED',
  LEVERAGE_AND_REFLEXIVITY = 'LEVERAGE_AND_REFLEXIVITY',
  OVERHANG_AND_DIGESTION = 'OVERHANG_AND_DIGESTION',
  ECOSYSTEM_ROTATION = 'ECOSYSTEM_ROTATION',
  SHOCK_AND_RECOVERY = 'SHOCK_AND_RECOVERY',
}

export const ALL_L9_SEQUENCE_FAMILIES: readonly L9SequenceFamily[] =
  Object.values(L9SequenceFamily);

/**
 * §9.2.4.2 — Scope types a sequence subject may operate at. Mirrors the
 * scope vocabulary used by L6/L7/L8 so lower-layer surface refs remain
 * compatible.
 */
export type L9SequenceScopeType =
  | 'MARKET'
  | 'CHAIN'
  | 'SECTOR'
  | 'ECOSYSTEM'
  | 'PROTOCOL'
  | 'ASSET'
  | 'TOKEN'
  | 'NARRATIVE_CLUSTER';

export const ALL_L9_SEQUENCE_SCOPE_TYPES: readonly L9SequenceScopeType[] = [
  'MARKET',
  'CHAIN',
  'SECTOR',
  'ECOSYSTEM',
  'PROTOCOL',
  'ASSET',
  'TOKEN',
  'NARRATIVE_CLUSTER',
];

/**
 * §9.2.5.2 — Family descriptor. Every family declares:
 *   - legal scope types
 *   - whether a post-event window anchor is required for this family
 *   - whether the family requires an L8 regime reference in cleanliness
 *   - which other families it may coexist with cleanly (§9.2.5.4)
 */
export interface L9SequenceFamilyDescriptor {
  readonly family: L9SequenceFamily;
  readonly description: string;
  readonly legalScopeTypes: readonly L9SequenceScopeType[];
  /**
   * §9.2.4.9 — Families built around post-event behaviour (shocks,
   * unlocks, digestion) require an anchored `PostEventWindow` for
   * post-event sequence states to emit as clean.
   */
  readonly requiresPostEventAnchor: boolean;
  /**
   * §9.2.5.2 — Families whose temporal meaning materially depends on
   * environmental conditioning must reference an L8 regime state in
   * their evidence surface.
   */
  readonly requiresRegimeConditioning: boolean;
  /**
   * §9.2.5.4 — Cross-family coexistence posture. Families may coexist
   * but never collapse into one another.
   */
  readonly coexistsWith: readonly L9SequenceFamily[];
}

export const L9_SEQUENCE_FAMILY_DESCRIPTORS: readonly L9SequenceFamilyDescriptor[] = [
  {
    family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    description:
      'Tracks accumulation, liquidity strengthening, narrative ignition, ' +
      'participation broadening, and later crowding (§9.2.5.1.A).',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'SECTOR'],
    requiresPostEventAnchor: false,
    requiresRegimeConditioning: true,
    coexistsWith: [
      L9SequenceFamily.NARRATIVE_LED,
      L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
      L9SequenceFamily.ECOSYSTEM_ROTATION,
    ],
  },
  {
    family: L9SequenceFamily.NARRATIVE_LED,
    description:
      'Tracks narrative emergence, breadth growth, structural confirmation or ' +
      'lack of it, and hype-vs-substance progression (§9.2.5.1.B).',
    legalScopeTypes: ['ASSET', 'TOKEN', 'SECTOR', 'NARRATIVE_CLUSTER', 'ECOSYSTEM'],
    requiresPostEventAnchor: false,
    requiresRegimeConditioning: true,
    coexistsWith: [
      L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
      L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
      L9SequenceFamily.ECOSYSTEM_ROTATION,
    ],
  },
  {
    family: L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    description:
      'Tracks crowding, basis/funding stress, leverage expansion, late ' +
      'reflexivity, and unwind risk (§9.2.5.1.C).',
    legalScopeTypes: ['MARKET', 'ASSET', 'TOKEN', 'CHAIN', 'ECOSYSTEM'],
    requiresPostEventAnchor: false,
    requiresRegimeConditioning: true,
    coexistsWith: [
      L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
      L9SequenceFamily.NARRATIVE_LED,
      L9SequenceFamily.OVERHANG_AND_DIGESTION,
      L9SequenceFamily.SHOCK_AND_RECOVERY,
    ],
  },
  {
    family: L9SequenceFamily.OVERHANG_AND_DIGESTION,
    description:
      'Tracks unlock realization, shock response, digestion, stabilization, ' +
      'and reaccumulation or failure (§9.2.5.1.D).',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'ECOSYSTEM'],
    requiresPostEventAnchor: true,
    requiresRegimeConditioning: false,
    coexistsWith: [
      L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
      L9SequenceFamily.SHOCK_AND_RECOVERY,
      L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    ],
  },
  {
    family: L9SequenceFamily.ECOSYSTEM_ROTATION,
    description:
      'Tracks chain/sector rotation, attention shifts, relational spillover, ' +
      'and ecosystem phase progression (§9.2.5.1.E).',
    legalScopeTypes: ['CHAIN', 'SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER', 'TOKEN'],
    requiresPostEventAnchor: false,
    requiresRegimeConditioning: true,
    coexistsWith: [
      L9SequenceFamily.NARRATIVE_LED,
      L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    ],
  },
  {
    family: L9SequenceFamily.SHOCK_AND_RECOVERY,
    description:
      'Tracks security events, liquidation shocks, major contradiction shocks, ' +
      'and post-shock digestion or repair (§9.2.5.1.F).',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'CHAIN', 'ECOSYSTEM', 'MARKET'],
    requiresPostEventAnchor: true,
    requiresRegimeConditioning: false,
    coexistsWith: [
      L9SequenceFamily.OVERHANG_AND_DIGESTION,
      L9SequenceFamily.LEVERAGE_AND_REFLEXIVITY,
    ],
  },
];

export function getL9SequenceFamilyDescriptor(
  family: L9SequenceFamily,
): L9SequenceFamilyDescriptor | undefined {
  return L9_SEQUENCE_FAMILY_DESCRIPTORS.find(d => d.family === family);
}

export function isL9RegisteredSequenceFamily(family: string): boolean {
  return L9_SEQUENCE_FAMILY_DESCRIPTORS.some(d => d.family === family);
}

export function l9FamilyAllowsScope(
  family: L9SequenceFamily,
  scope: L9SequenceScopeType,
): boolean {
  const d = getL9SequenceFamilyDescriptor(family);
  if (!d) return false;
  return d.legalScopeTypes.includes(scope);
}

export function l9FamiliesMayCoexist(
  a: L9SequenceFamily,
  b: L9SequenceFamily,
): boolean {
  if (a === b) return true;
  const da = getL9SequenceFamilyDescriptor(a);
  if (!da) return false;
  return da.coexistsWith.includes(b);
}

export function l9FamilyRequiresPostEventAnchor(family: L9SequenceFamily): boolean {
  return getL9SequenceFamilyDescriptor(family)?.requiresPostEventAnchor ?? false;
}

export function l9FamilyRequiresRegimeConditioning(family: L9SequenceFamily): boolean {
  return getL9SequenceFamilyDescriptor(family)?.requiresRegimeConditioning ?? false;
}
