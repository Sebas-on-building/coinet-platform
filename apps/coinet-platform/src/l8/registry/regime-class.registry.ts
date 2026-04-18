/**
 * L8.2 — Regime Class Registry
 *
 * §8.2.3.7 / §8.2.4 / §8.2.5 / §8.2.6 / §8.2.7 — Canonical registry of
 * every regime class across the four families. No regime class may
 * exist outside a registered family (§8.2.3.7).
 */

import { L8RegimeFamily, L8RegimeScopeType } from '../contracts/regime-family';
import {
  L8RegimeClass,
  L8RegimeClassDescriptor,
  L8_REGIME_CLASS_DESCRIPTORS,
  getL8RegimeClassDescriptor,
  isL8RegisteredRegimeClass,
  getL8RegimeClassesForFamily,
  regimeClassBelongsToFamily,
  regimeClassAllowsScope,
  getLifecyclePosture,
} from '../contracts/regime-class';

export class L8RegimeClassRegistry {
  private readonly byClass: Map<L8RegimeClass, L8RegimeClassDescriptor>;
  private readonly byFamily: Map<L8RegimeFamily, L8RegimeClassDescriptor[]>;

  constructor(
    descriptors: readonly L8RegimeClassDescriptor[] = L8_REGIME_CLASS_DESCRIPTORS,
  ) {
    this.byClass = new Map();
    this.byFamily = new Map();
    for (const d of descriptors) {
      this.byClass.set(d.regimeClass, d);
      const bucket = this.byFamily.get(d.family);
      if (bucket) bucket.push(d);
      else this.byFamily.set(d.family, [d]);
    }
  }

  list(): readonly L8RegimeClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  listForFamily(family: L8RegimeFamily): readonly L8RegimeClassDescriptor[] {
    return this.byFamily.get(family) ?? [];
  }

  get(cls: L8RegimeClass): L8RegimeClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(cls: string): boolean {
    return this.byClass.has(cls as L8RegimeClass);
  }

  belongsToFamily(cls: L8RegimeClass, family: L8RegimeFamily): boolean {
    return regimeClassBelongsToFamily(cls, family);
  }

  allowsScope(cls: L8RegimeClass, scope: L8RegimeScopeType): boolean {
    return regimeClassAllowsScope(cls, scope);
  }

  familyOf(cls: L8RegimeClass): L8RegimeFamily | undefined {
    return this.byClass.get(cls)?.family;
  }
}

const defaultRegimeClassRegistry = new L8RegimeClassRegistry();

export function getDefaultL8RegimeClassRegistry(): L8RegimeClassRegistry {
  return defaultRegimeClassRegistry;
}

export {
  getL8RegimeClassDescriptor,
  isL8RegisteredRegimeClass,
  getL8RegimeClassesForFamily,
  regimeClassBelongsToFamily,
  regimeClassAllowsScope,
  getLifecyclePosture,
};
