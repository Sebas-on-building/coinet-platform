/**
 * L7.5 — Validation Modifier Registry
 *
 * §7.5.3.6 — Registers every legal modifier with id, semantic
 * description, legal primary classes, confidence effect, restriction
 * effect, and explanation visibility. §7.5.3.7 — no engine downstream
 * may introduce unregistered modifiers ad hoc.
 */

import {
  L7ValidationModifierCode,
  ALL_L7_VALIDATION_MODIFIERS,
  L7ValidationModifierDescriptor,
  L7_VALIDATION_MODIFIER_DESCRIPTORS,
  classifyClassModifierPair,
  L7ClassModifierCompatibility,
} from '../contracts/validation-modifier.policy';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';

export class L7ValidationModifierRegistry {
  private readonly byModifier: Map<L7ValidationModifierCode, L7ValidationModifierDescriptor>;

  constructor(
    descriptors: readonly L7ValidationModifierDescriptor[] = L7_VALIDATION_MODIFIER_DESCRIPTORS,
  ) {
    this.byModifier = new Map(descriptors.map(d => [d.modifier, d]));
  }

  list(): readonly L7ValidationModifierDescriptor[] {
    return Array.from(this.byModifier.values());
  }

  get(code: L7ValidationModifierCode): L7ValidationModifierDescriptor | undefined {
    return this.byModifier.get(code);
  }

  isRegistered(code: string): code is L7ValidationModifierCode {
    return (ALL_L7_VALIDATION_MODIFIERS as readonly string[]).includes(code);
  }

  classify(
    primary: L7PrimaryValidationClass,
    modifier: L7ValidationModifierCode,
  ): L7ClassModifierCompatibility {
    return classifyClassModifierPair(primary, modifier);
  }
}

const defaultValidationModifierRegistry = new L7ValidationModifierRegistry();

export function getDefaultValidationModifierRegistry(): L7ValidationModifierRegistry {
  return defaultValidationModifierRegistry;
}
