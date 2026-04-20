/**
 * L10.2 — HypothesisOutputClass Registry
 *
 * §10.2.17 — Responsible for legal output-class registration and lookup.
 * Rejects duplicate ids and unregistered classes.
 */

import {
  L10HypothesisOutputClass,
  L10HypothesisOutputClassDescriptor,
  L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS,
  isL10RegisteredHypothesisOutputClass,
} from '../contracts/hypothesis-output-class';

export class L10HypothesisOutputClassRegistry {
  private readonly byClass = new Map<L10HypothesisOutputClass, L10HypothesisOutputClassDescriptor>();

  register(desc: L10HypothesisOutputClassDescriptor): void {
    if (!isL10RegisteredHypothesisOutputClass(desc.outputClass)) {
      throw new Error(`L10.2 output registry: unknown class '${desc.outputClass}'`);
    }
    if (this.byClass.has(desc.outputClass)) {
      throw new Error(`L10.2 output registry: duplicate class '${desc.outputClass}'`);
    }
    this.byClass.set(desc.outputClass, desc);
  }

  has(cls: L10HypothesisOutputClass): boolean {
    return this.byClass.has(cls);
  }

  get(cls: L10HypothesisOutputClass): L10HypothesisOutputClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  size(): number {
    return this.byClass.size;
  }

  list(): readonly L10HypothesisOutputClassDescriptor[] {
    return Array.from(this.byClass.values());
  }
}

let _defaultReg: L10HypothesisOutputClassRegistry | null = null;
export function getDefaultL10HypothesisOutputClassRegistry(): L10HypothesisOutputClassRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisOutputClassRegistry();
    for (const d of L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS) _defaultReg.register(d);
  }
  return _defaultReg;
}
