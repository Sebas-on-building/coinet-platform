/**
 * L8.2 — Regime Family Taxonomy
 *
 * §8.2.3 — Canonical regime families. Each family has its own class
 * vocabulary, scope legality, coexistence rules, and interpretation
 * role. Families may not be collapsed into each other (§8.2.3.5).
 *
 * §8.2.1.5 — A regime is not a mood label. A regime is a governed
 * environment state that conditions how already-validated truths should
 * be interpreted.
 */

/**
 * §8.2.3.1 — Canonical regime families. Exactly four for L8.2.
 *
 *   MACRO             — broad market environment (§8.2.4)
 *   CRYPTO_STRUCTURE  — spot/leverage/deleveraging/liquidity posture (§8.2.5)
 *   TOKEN_SPECIFIC    — lifecycle / token-local environment (§8.2.6)
 *   ECOSYSTEM         — chain/sector/ecosystem posture (§8.2.7)
 */
export enum L8RegimeFamily {
  MACRO = 'MACRO',
  CRYPTO_STRUCTURE = 'CRYPTO_STRUCTURE',
  TOKEN_SPECIFIC = 'TOKEN_SPECIFIC',
  ECOSYSTEM = 'ECOSYSTEM',
}

export const ALL_L8_REGIME_FAMILIES: readonly L8RegimeFamily[] =
  Object.values(L8RegimeFamily);

/**
 * §8.2.3 / §8.2.4.3 etc. — Scope types a regime may operate at. Mirrors
 * the vocabulary already used by L3/L4/L6/L7.
 */
export type L8RegimeScopeType =
  | 'MARKET'
  | 'CHAIN'
  | 'SECTOR'
  | 'ECOSYSTEM'
  | 'PROTOCOL'
  | 'ASSET'
  | 'TOKEN'
  | 'PORTFOLIO'
  | 'NARRATIVE_CLUSTER';

export const ALL_L8_REGIME_SCOPE_TYPES: readonly L8RegimeScopeType[] = [
  'MARKET',
  'CHAIN',
  'SECTOR',
  'ECOSYSTEM',
  'PROTOCOL',
  'ASSET',
  'TOKEN',
  'PORTFOLIO',
  'NARRATIVE_CLUSTER',
];

/**
 * §8.2.3.4 / §8.2.3.6 — Family descriptor.
 *
 * Each family owns its class vocabulary, scope legality, and the flags
 * that later validators use to enforce coexistence and interaction law.
 */
export interface L8RegimeFamilyDescriptor {
  readonly family: L8RegimeFamily;
  readonly description: string;
  readonly legalScopeTypes: readonly L8RegimeScopeType[];
  /**
   * §8.2.3.5 — Families may condition one another but must not collapse
   * into one another. This flag captures the design invariant.
   */
  readonly conditioningOnly: true;
  /**
   * §8.2.3.3 — Multiple families may coexist for the same scope and time.
   * This is a core design requirement, not an exception.
   */
  readonly coexistsWith: readonly L8RegimeFamily[];
  /**
   * §8.2.6.5 — Lifecycle integrity applies to families whose classes imply
   * a lifecycle posture (currently only TOKEN_SPECIFIC). Lifecycle families
   * must not emit two incompatible lifecycle classes as clean single-regime.
   */
  readonly lifecycleIntegrity: boolean;
  /**
   * §8.2.7.5 — Ecosystem-family caution law: ecosystem regime must not be
   * used as direct token validation truth. Only ECOSYSTEM is flagged.
   */
  readonly environmentalConditioningOnly: boolean;
}

export const L8_REGIME_FAMILY_DESCRIPTORS: readonly L8RegimeFamilyDescriptor[] = [
  {
    family: L8RegimeFamily.MACRO,
    description:
      'Broadest environmental conditioning family — risk-on, risk-off, ' +
      'transitional, and choppy macro states (§8.2.4).',
    legalScopeTypes: ['MARKET', 'SECTOR', 'ASSET'],
    conditioningOnly: true,
    coexistsWith: [
      L8RegimeFamily.CRYPTO_STRUCTURE,
      L8RegimeFamily.TOKEN_SPECIFIC,
      L8RegimeFamily.ECOSYSTEM,
    ],
    lifecycleIntegrity: false,
    environmentalConditioningOnly: false,
  },
  {
    family: L8RegimeFamily.CRYPTO_STRUCTURE,
    description:
      'Spot-led, leverage-led, deleveraging, and thin-liquidity fragility ' +
      'postures that distinguish healthy from euphoric structure (§8.2.5).',
    legalScopeTypes: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
    conditioningOnly: true,
    coexistsWith: [
      L8RegimeFamily.MACRO,
      L8RegimeFamily.TOKEN_SPECIFIC,
      L8RegimeFamily.ECOSYSTEM,
    ],
    lifecycleIntegrity: false,
    environmentalConditioningOnly: false,
  },
  {
    family: L8RegimeFamily.TOKEN_SPECIFIC,
    description:
      'Token-local lifecycle and structural environment — launch, ' +
      'accumulation, narrative breakout, mature trend, blowoff, ' +
      'distribution, post-unlock digestion (§8.2.6).',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL'],
    conditioningOnly: true,
    coexistsWith: [
      L8RegimeFamily.MACRO,
      L8RegimeFamily.CRYPTO_STRUCTURE,
      L8RegimeFamily.ECOSYSTEM,
    ],
    lifecycleIntegrity: true,
    environmentalConditioningOnly: false,
  },
  {
    family: L8RegimeFamily.ECOSYSTEM,
    description:
      'Chain / sector / ecosystem posture — expansion, contraction, ' +
      'rotation, meme-mania, DeFi rerating, L2 attention shift (§8.2.7).',
    legalScopeTypes: ['CHAIN', 'ECOSYSTEM', 'SECTOR', 'NARRATIVE_CLUSTER', 'TOKEN'],
    conditioningOnly: true,
    coexistsWith: [
      L8RegimeFamily.MACRO,
      L8RegimeFamily.CRYPTO_STRUCTURE,
      L8RegimeFamily.TOKEN_SPECIFIC,
    ],
    lifecycleIntegrity: false,
    environmentalConditioningOnly: true,
  },
];

export function getL8RegimeFamilyDescriptor(
  family: L8RegimeFamily,
): L8RegimeFamilyDescriptor | undefined {
  return L8_REGIME_FAMILY_DESCRIPTORS.find(d => d.family === family);
}

export function isL8RegisteredRegimeFamily(family: string): boolean {
  return L8_REGIME_FAMILY_DESCRIPTORS.some(d => d.family === family);
}

export function familyAllowsScope(
  family: L8RegimeFamily,
  scope: L8RegimeScopeType,
): boolean {
  const d = getL8RegimeFamilyDescriptor(family);
  if (!d) return false;
  return d.legalScopeTypes.includes(scope);
}

export function familiesMayCoexist(
  a: L8RegimeFamily,
  b: L8RegimeFamily,
): boolean {
  if (a === b) return true; // intra-family handled by coexistence law
  const da = getL8RegimeFamilyDescriptor(a);
  if (!da) return false;
  return da.coexistsWith.includes(b);
}
