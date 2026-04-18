/**
 * L7.5 — Validation Class Registry
 *
 * §7.5.2.6 — Registers every legal primary validation class with the
 * semantic description, support/contradiction posture requirements,
 * staleness/incompleteness/degradation behaviors, and the downstream
 * default restriction baseline.
 *
 * §7.5.2.7 — Class semantics may NOT be locally reinterpreted by
 * family-specific validators. This registry is the single source of
 * truth for what each class means.
 */

import {
  L7PrimaryValidationClass,
  ALL_L7_PRIMARY_VALIDATION_CLASSES,
  L7PrimaryValidationClassDescriptor,
  L7_PRIMARY_VALIDATION_CLASS_DESCRIPTORS,
  L7_PRIMARY_CLASS_PRECEDENCE,
  resolvePrimaryClassByPrecedence,
} from '../contracts/validation-class.policy';

export class L7ValidationClassRegistry {
  private readonly byClass: Map<L7PrimaryValidationClass, L7PrimaryValidationClassDescriptor>;

  constructor(
    descriptors: readonly L7PrimaryValidationClassDescriptor[] = L7_PRIMARY_VALIDATION_CLASS_DESCRIPTORS,
  ) {
    this.byClass = new Map(descriptors.map(d => [d.class, d]));
  }

  list(): readonly L7PrimaryValidationClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(cls: L7PrimaryValidationClass): L7PrimaryValidationClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(cls: string): cls is L7PrimaryValidationClass {
    return (ALL_L7_PRIMARY_VALIDATION_CLASSES as readonly string[]).includes(cls);
  }

  precedence(): readonly L7PrimaryValidationClass[] {
    return L7_PRIMARY_CLASS_PRECEDENCE;
  }

  resolveByPrecedence(
    candidates: readonly L7PrimaryValidationClass[],
  ): L7PrimaryValidationClass | undefined {
    return resolvePrimaryClassByPrecedence(candidates);
  }
}

const defaultValidationClassRegistry = new L7ValidationClassRegistry();

export function getDefaultValidationClassRegistry(): L7ValidationClassRegistry {
  return defaultValidationClassRegistry;
}
