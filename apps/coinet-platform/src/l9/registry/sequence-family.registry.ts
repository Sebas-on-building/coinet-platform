/**
 * L9.2 — Sequence Family Registry
 *
 * §9.2.5 — Runtime registry wrapping the frozen family-descriptor
 * table. Every later L9 sublayer reaches family/scope/coexistence law
 * through this registry, never by inlining the descriptor set.
 */

import {
  L9SequenceFamily,
  L9SequenceFamilyDescriptor,
  L9SequenceScopeType,
  L9_SEQUENCE_FAMILY_DESCRIPTORS,
  isL9RegisteredSequenceFamily,
  l9FamilyAllowsScope,
  l9FamiliesMayCoexist,
  l9FamilyRequiresPostEventAnchor,
  l9FamilyRequiresRegimeConditioning,
} from '../contracts/sequence-family';

export class L9SequenceFamilyRegistry {
  private readonly byFamily: Map<L9SequenceFamily, L9SequenceFamilyDescriptor>;

  constructor(
    descriptors: readonly L9SequenceFamilyDescriptor[] = L9_SEQUENCE_FAMILY_DESCRIPTORS,
  ) {
    this.byFamily = new Map(descriptors.map(d => [d.family, d]));
  }

  list(): readonly L9SequenceFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }

  get(family: L9SequenceFamily): L9SequenceFamilyDescriptor | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(value: string): boolean {
    return this.byFamily.has(value as L9SequenceFamily);
  }

  allowsScope(family: L9SequenceFamily, scope: L9SequenceScopeType): boolean {
    return this.byFamily.get(family)?.legalScopeTypes.includes(scope) ?? false;
  }

  coexistsWith(a: L9SequenceFamily, b: L9SequenceFamily): boolean {
    return l9FamiliesMayCoexist(a, b);
  }

  requiresPostEventAnchor(family: L9SequenceFamily): boolean {
    return l9FamilyRequiresPostEventAnchor(family);
  }

  requiresRegimeConditioning(family: L9SequenceFamily): boolean {
    return l9FamilyRequiresRegimeConditioning(family);
  }
}

const defaultSequenceFamilyRegistry = new L9SequenceFamilyRegistry();

export function getDefaultL9SequenceFamilyRegistry(): L9SequenceFamilyRegistry {
  return defaultSequenceFamilyRegistry;
}

export {
  isL9RegisteredSequenceFamily,
  l9FamilyAllowsScope,
  l9FamiliesMayCoexist,
  l9FamilyRequiresPostEventAnchor,
  l9FamilyRequiresRegimeConditioning,
};
