/**
 * L10.2 — Hypothesis Subject Classes and Family Taxonomy
 *
 * §10.2.3 — The canonical first-production explanatory families plus
 * the scope taxonomy that a HypothesisSubject may operate at. Families
 * are governed — explanations outside this vocabulary are illegal.
 */

/**
 * §10.2.3.1 — Canonical first-production hypothesis families. L10.2
 * freezes this vocabulary; later sublayers may extend via registries
 * but may not bypass the family taxonomy.
 */
export enum L10HypothesisFamilyClass {
  GENUINE_EARLY_ACCUMULATION = 'GENUINE_EARLY_ACCUMULATION',
  LEVERAGE_DRIVEN_SQUEEZE = 'LEVERAGE_DRIVEN_SQUEEZE',
  NARRATIVE_ONLY_REFLEXIVE_PUMP = 'NARRATIVE_ONLY_REFLEXIVE_PUMP',
  FUNDAMENTALLY_IMPROVING_RERATING = 'FUNDAMENTALLY_IMPROVING_RERATING',
  LOW_QUALITY_MANIPULATED_LAUNCH = 'LOW_QUALITY_MANIPULATED_LAUNCH',
  POST_UNLOCK_REDISTRIBUTION = 'POST_UNLOCK_REDISTRIBUTION',
  TREASURY_LED_DISTRIBUTION = 'TREASURY_LED_DISTRIBUTION',
  SECTOR_SPILLOVER_REPRICING = 'SECTOR_SPILLOVER_REPRICING',
}

export const ALL_L10_HYPOTHESIS_FAMILY_CLASSES:
  readonly L10HypothesisFamilyClass[] = Object.values(L10HypothesisFamilyClass);

/**
 * §10.2.6 — A hypothesis-subject class coarsely labels the kind of
 * explanatory problem being solved (e.g. single-asset, sector rotation,
 * protocol event). Distinct from the family taxonomy, which labels the
 * explanatory *archetype* of individual candidates.
 */
export enum L10HypothesisSubjectClass {
  ASSET_EXPLANATION = 'ASSET_EXPLANATION',
  TOKEN_EXPLANATION = 'TOKEN_EXPLANATION',
  PROTOCOL_EXPLANATION = 'PROTOCOL_EXPLANATION',
  SECTOR_EXPLANATION = 'SECTOR_EXPLANATION',
  CHAIN_EXPLANATION = 'CHAIN_EXPLANATION',
  ECOSYSTEM_EXPLANATION = 'ECOSYSTEM_EXPLANATION',
  NARRATIVE_CLUSTER_EXPLANATION = 'NARRATIVE_CLUSTER_EXPLANATION',
  MARKET_EXPLANATION = 'MARKET_EXPLANATION',
}

export const ALL_L10_HYPOTHESIS_SUBJECT_CLASSES:
  readonly L10HypothesisSubjectClass[] = Object.values(L10HypothesisSubjectClass);

export type L10ScopeType =
  | 'MARKET'
  | 'CHAIN'
  | 'SECTOR'
  | 'ECOSYSTEM'
  | 'PROTOCOL'
  | 'ASSET'
  | 'TOKEN'
  | 'NARRATIVE_CLUSTER';

export const ALL_L10_SCOPE_TYPES: readonly L10ScopeType[] = [
  'MARKET', 'CHAIN', 'SECTOR', 'ECOSYSTEM',
  'PROTOCOL', 'ASSET', 'TOKEN', 'NARRATIVE_CLUSTER',
];

export interface L10HypothesisFamilyDescriptor {
  readonly family: L10HypothesisFamilyClass;
  readonly description: string;
  readonly legalScopeTypes: readonly L10ScopeType[];
  readonly requiresRegimeConditioning: boolean;
  readonly requiresSequenceConditioning: boolean;
  readonly requiresPostEventAnchor: boolean;
  readonly requiresRestrictionConsumption: boolean;
  readonly defaultSubjectClass: L10HypothesisSubjectClass;
}

export const L10_HYPOTHESIS_FAMILY_DESCRIPTORS:
  readonly L10HypothesisFamilyDescriptor[] = [
  {
    family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    description: 'Constructive demand-led accumulation with broadening structure.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'PROTOCOL', 'SECTOR'],
    requiresRegimeConditioning: true,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.LEVERAGE_DRIVEN_SQUEEZE,
    description: 'Leverage-driven crowding and basis/funding stress explanation.',
    legalScopeTypes: ['ASSET', 'TOKEN', 'CHAIN', 'MARKET'],
    requiresRegimeConditioning: true,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.ASSET_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.NARRATIVE_ONLY_REFLEXIVE_PUMP,
    description: 'Reflexive narrative-led demand without structural substance.',
    legalScopeTypes: ['TOKEN', 'NARRATIVE_CLUSTER', 'SECTOR'],
    requiresRegimeConditioning: true,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.NARRATIVE_CLUSTER_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.FUNDAMENTALLY_IMPROVING_RERATING,
    description: 'Rerating driven by improving protocol/business-quality fundamentals.',
    legalScopeTypes: ['PROTOCOL', 'TOKEN', 'ASSET'],
    requiresRegimeConditioning: false,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.PROTOCOL_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.LOW_QUALITY_MANIPULATED_LAUNCH,
    description: 'Manipulated / low-quality launch behaviour driving price action.',
    legalScopeTypes: ['TOKEN', 'PROTOCOL'],
    requiresRegimeConditioning: false,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.POST_UNLOCK_REDISTRIBUTION,
    description: 'Post-unlock supply overhang and redistribution dynamics.',
    legalScopeTypes: ['TOKEN', 'PROTOCOL'],
    requiresRegimeConditioning: false,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: true,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.TREASURY_LED_DISTRIBUTION,
    description: 'Treasury / insider-led distribution explaining downward pressure.',
    legalScopeTypes: ['TOKEN', 'PROTOCOL'],
    requiresRegimeConditioning: false,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.PROTOCOL_EXPLANATION,
  },
  {
    family: L10HypothesisFamilyClass.SECTOR_SPILLOVER_REPRICING,
    description: 'Sector / ecosystem spillover repricing explaining moves.',
    legalScopeTypes: ['SECTOR', 'ECOSYSTEM', 'CHAIN', 'TOKEN', 'NARRATIVE_CLUSTER'],
    requiresRegimeConditioning: true,
    requiresSequenceConditioning: true,
    requiresPostEventAnchor: false,
    requiresRestrictionConsumption: true,
    defaultSubjectClass: L10HypothesisSubjectClass.SECTOR_EXPLANATION,
  },
];

export function getL10HypothesisFamilyDescriptor(
  f: L10HypothesisFamilyClass,
): L10HypothesisFamilyDescriptor | undefined {
  return L10_HYPOTHESIS_FAMILY_DESCRIPTORS.find(d => d.family === f);
}

export function isL10RegisteredHypothesisFamily(value: string): boolean {
  return L10_HYPOTHESIS_FAMILY_DESCRIPTORS.some(d => d.family === value);
}

export function isL10RegisteredSubjectClass(value: string): boolean {
  return ALL_L10_HYPOTHESIS_SUBJECT_CLASSES.some(c => c === value);
}

export function l10FamilyAllowsScope(
  f: L10HypothesisFamilyClass,
  scope: L10ScopeType,
): boolean {
  const d = getL10HypothesisFamilyDescriptor(f);
  return !!d && d.legalScopeTypes.includes(scope);
}
