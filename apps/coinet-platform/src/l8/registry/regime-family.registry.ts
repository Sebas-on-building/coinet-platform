/**
 * L8.2 — Regime Family Registry
 *
 * §8.2.3.6 — Canonical registry of the four regime families. Wraps the
 * descriptor table and provides runtime predicates used by validators
 * and coexistence enforcement.
 */

import {
  L8RegimeFamily,
  L8RegimeScopeType,
  L8RegimeFamilyDescriptor,
  L8_REGIME_FAMILY_DESCRIPTORS,
  getL8RegimeFamilyDescriptor,
  isL8RegisteredRegimeFamily,
  familyAllowsScope,
  familiesMayCoexist,
} from '../contracts/regime-family';

export class L8RegimeFamilyRegistry {
  private readonly byFamily: Map<L8RegimeFamily, L8RegimeFamilyDescriptor>;

  constructor(
    descriptors: readonly L8RegimeFamilyDescriptor[] = L8_REGIME_FAMILY_DESCRIPTORS,
  ) {
    this.byFamily = new Map(descriptors.map(d => [d.family, d]));
  }

  list(): readonly L8RegimeFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }

  get(family: L8RegimeFamily): L8RegimeFamilyDescriptor | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(value: string): boolean {
    return this.byFamily.has(value as L8RegimeFamily);
  }

  allowsScope(family: L8RegimeFamily, scope: L8RegimeScopeType): boolean {
    return this.byFamily.get(family)?.legalScopeTypes.includes(scope) ?? false;
  }

  coexistsWith(a: L8RegimeFamily, b: L8RegimeFamily): boolean {
    return familiesMayCoexist(a, b);
  }

  isLifecycleAware(family: L8RegimeFamily): boolean {
    return this.byFamily.get(family)?.lifecycleIntegrity ?? false;
  }

  isEnvironmentalConditioningOnly(family: L8RegimeFamily): boolean {
    return this.byFamily.get(family)?.environmentalConditioningOnly ?? false;
  }
}

const defaultRegimeFamilyRegistry = new L8RegimeFamilyRegistry();

export function getDefaultL8RegimeFamilyRegistry(): L8RegimeFamilyRegistry {
  return defaultRegimeFamilyRegistry;
}

export {
  getL8RegimeFamilyDescriptor,
  isL8RegisteredRegimeFamily,
  familyAllowsScope,
  familiesMayCoexist,
};
