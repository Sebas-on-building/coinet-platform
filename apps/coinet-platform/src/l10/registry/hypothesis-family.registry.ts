/**
 * L10.2 — HypothesisFamily Registry
 *
 * §10.2.17 — Canonical hypothesis-family registry for template and
 * candidate-class lookups. Rejects duplicate family registration and
 * illegal family/scope combinations.
 */

import {
  L10HypothesisFamilyClass,
  L10HypothesisFamilyDescriptor,
  L10_HYPOTHESIS_FAMILY_DESCRIPTORS,
  L10ScopeType,
  isL10RegisteredHypothesisFamily,
} from '../contracts/hypothesis-subject-class';

export class L10HypothesisFamilyRegistry {
  private readonly byFamily = new Map<L10HypothesisFamilyClass, L10HypothesisFamilyDescriptor>();

  register(desc: L10HypothesisFamilyDescriptor): void {
    if (!isL10RegisteredHypothesisFamily(desc.family)) {
      throw new Error(`L10.2 family registry: unknown family '${desc.family}'`);
    }
    if (this.byFamily.has(desc.family)) {
      throw new Error(`L10.2 family registry: duplicate family '${desc.family}'`);
    }
    this.byFamily.set(desc.family, desc);
  }

  has(f: L10HypothesisFamilyClass): boolean {
    return this.byFamily.has(f);
  }

  get(f: L10HypothesisFamilyClass): L10HypothesisFamilyDescriptor | undefined {
    return this.byFamily.get(f);
  }

  allowsScope(f: L10HypothesisFamilyClass, scope: L10ScopeType): boolean {
    const d = this.byFamily.get(f);
    return !!d && d.legalScopeTypes.includes(scope);
  }

  requiresRegimeConditioning(f: L10HypothesisFamilyClass): boolean {
    return this.byFamily.get(f)?.requiresRegimeConditioning ?? false;
  }

  requiresSequenceConditioning(f: L10HypothesisFamilyClass): boolean {
    return this.byFamily.get(f)?.requiresSequenceConditioning ?? false;
  }

  requiresPostEventAnchor(f: L10HypothesisFamilyClass): boolean {
    return this.byFamily.get(f)?.requiresPostEventAnchor ?? false;
  }

  requiresRestrictionConsumption(f: L10HypothesisFamilyClass): boolean {
    return this.byFamily.get(f)?.requiresRestrictionConsumption ?? true;
  }

  size(): number {
    return this.byFamily.size;
  }

  list(): readonly L10HypothesisFamilyDescriptor[] {
    return Array.from(this.byFamily.values());
  }
}

let _defaultReg: L10HypothesisFamilyRegistry | null = null;
export function getDefaultL10HypothesisFamilyRegistry(): L10HypothesisFamilyRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisFamilyRegistry();
    for (const d of L10_HYPOTHESIS_FAMILY_DESCRIPTORS) _defaultReg.register(d);
  }
  return _defaultReg;
}
