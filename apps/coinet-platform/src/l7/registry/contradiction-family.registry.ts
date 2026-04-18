/**
 * L7.2 — Contradiction Family Registry
 *
 * §7.2.7.4 — Even though the full contradiction ontology lives later, L7.2
 * already registers contradiction families so contradiction bundles are
 * typed object references (not arbitrary text arrays).
 */

import {
  L7ContradictionFamily,
  L7ContradictionSeverity,
  ALL_CONTRADICTION_FAMILIES,
} from '../contracts/contradiction-bundle';

export interface ContradictionFamilyDescriptor {
  readonly family: L7ContradictionFamily;
  readonly description: string;
  readonly defaultSeverity: L7ContradictionSeverity;
  readonly blockingAllowed: boolean;
  readonly requiresSupportRef: boolean;
  readonly requiresChallengeRef: boolean;
}

export const CONTRADICTION_FAMILY_DESCRIPTORS: readonly ContradictionFamilyDescriptor[] = [
  {
    family: L7ContradictionFamily.SUPPORT_CHALLENGE_DISAGREEMENT,
    description: 'Registered support surfaces disagree with challenge surfaces on the claim',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: true,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.PRIMITIVE_INCONSISTENCY,
    description: 'Governed primitives disagree on the underlying state',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: true,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.SENTIMENT_FUNDAMENTAL_DIVERGENCE,
    description: 'Sentiment indicates one direction, fundamentals the other',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: false,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.PRICE_FLOW_DIVERGENCE,
    description: 'Price action diverges from flow primitives',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: false,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.SIGNAL_STALENESS,
    description: 'Required confirmation surfaces are stale beyond tolerance',
    defaultSeverity: L7ContradictionSeverity.SEVERE,
    blockingAllowed: true,
    requiresSupportRef: false,
    requiresChallengeRef: false,
  },
  {
    family: L7ContradictionFamily.REGIME_MISMATCH,
    description: 'Claim requires a regime posture incompatible with the current regime',
    defaultSeverity: L7ContradictionSeverity.SEVERE,
    blockingAllowed: true,
    requiresSupportRef: false,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.MATERIAL_RISK_OVERHANG,
    description: 'A declared risk overhang is materially active',
    defaultSeverity: L7ContradictionSeverity.SEVERE,
    blockingAllowed: true,
    requiresSupportRef: false,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.STRUCTURAL_WEAKNESS,
    description: 'Structural context weakens the local claim',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: false,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.REVENUE_ACTIVITY_DIVERGENCE,
    description: 'Revenue/activity surfaces contradict TVL/price primitives',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: false,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
  {
    family: L7ContradictionFamily.CROSS_SOURCE_DISAGREEMENT,
    description: 'Multiple governed sources disagree on the same measurement',
    defaultSeverity: L7ContradictionSeverity.MATERIAL,
    blockingAllowed: true,
    requiresSupportRef: true,
    requiresChallengeRef: true,
  },
];

export class ContradictionFamilyRegistry {
  private readonly byFamily: Map<L7ContradictionFamily, ContradictionFamilyDescriptor>;

  constructor(descriptors: readonly ContradictionFamilyDescriptor[] = CONTRADICTION_FAMILY_DESCRIPTORS) {
    this.byFamily = new Map(descriptors.map(d => [d.family, d]));
  }

  list(): readonly ContradictionFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }

  get(family: L7ContradictionFamily): ContradictionFamilyDescriptor | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(family: string): boolean {
    return ALL_CONTRADICTION_FAMILIES.includes(family as L7ContradictionFamily);
  }

  defaultSeverity(family: L7ContradictionFamily): L7ContradictionSeverity | undefined {
    return this.byFamily.get(family)?.defaultSeverity;
  }

  blockingAllowed(family: L7ContradictionFamily): boolean {
    return this.byFamily.get(family)?.blockingAllowed ?? false;
  }
}

const defaultContradictionFamilyRegistry = new ContradictionFamilyRegistry();

export function getDefaultContradictionFamilyRegistry(): ContradictionFamilyRegistry {
  return defaultContradictionFamilyRegistry;
}
