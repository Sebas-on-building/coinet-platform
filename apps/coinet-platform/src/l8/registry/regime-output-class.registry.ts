/**
 * L8.2 — Regime Output Class Registry
 *
 * §8.2.10.2 / §8.2.10.3 — Registry for the four L8.2 object-model
 * output classes. Keeps a separate tier from the L8.1 output-surface
 * registry so object-model audit and boundary audit stay disjoint.
 */

import {
  L8RegimeOutputClass,
  ALL_L8_REGIME_OUTPUT_CLASSES,
} from '../contracts/regime-output-class';

export interface L8RegimeOutputClassDescriptor {
  readonly outputClass: L8RegimeOutputClass;
  readonly semantic: string;
  /** §8.2.8 — Every output must be anchored to a regime_state_id. */
  readonly regimeAnchored: true;
  readonly requiresEvidence: boolean;
  readonly requiresContradictionPosture: boolean;
  readonly requiresRestrictionPosture: boolean;
  readonly requiresAmbiguityPosture: boolean;
}

export const L8_REGIME_OUTPUT_CLASS_DESCRIPTORS:
  readonly L8RegimeOutputClassDescriptor[] = [
    {
      outputClass: L8RegimeOutputClass.REGIME_STATE,
      semantic:
        'Primary governed regime classification anchor — family, primary/secondary regime, scope, time',
      regimeAnchored: true,
      requiresEvidence: true,
      requiresContradictionPosture: true,
      requiresRestrictionPosture: true,
      requiresAmbiguityPosture: true,
    },
    {
      outputClass: L8RegimeOutputClass.REGIME_CONFIDENCE_PROFILE,
      semantic:
        'Justified regime-call confidence — distinct from L7 confidence and from judgment confidence',
      regimeAnchored: true,
      requiresEvidence: true,
      requiresContradictionPosture: true,
      requiresRestrictionPosture: true,
      requiresAmbiguityPosture: false,
    },
    {
      outputClass: L8RegimeOutputClass.REGIME_TRANSITION_PROFILE,
      semantic:
        'Transition candidates, direction, maturity, and risk posture — preserves coexistence',
      regimeAnchored: true,
      requiresEvidence: true,
      requiresContradictionPosture: false,
      requiresRestrictionPosture: true,
      requiresAmbiguityPosture: true,
    },
    {
      outputClass: L8RegimeOutputClass.REGIME_MULTIPLIER_PROFILE,
      semantic:
        'Regime-specific interpretation multipliers — interpretive modifiers only, never final scores',
      regimeAnchored: true,
      requiresEvidence: true,
      requiresContradictionPosture: true,
      requiresRestrictionPosture: true,
      requiresAmbiguityPosture: false,
    },
  ];

export class L8RegimeOutputClassRegistry {
  private readonly byClass: Map<L8RegimeOutputClass, L8RegimeOutputClassDescriptor>;

  constructor(
    descriptors: readonly L8RegimeOutputClassDescriptor[] =
      L8_REGIME_OUTPUT_CLASS_DESCRIPTORS,
  ) {
    this.byClass = new Map(descriptors.map(d => [d.outputClass, d]));
  }

  list(): readonly L8RegimeOutputClassDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(cls: L8RegimeOutputClass): L8RegimeOutputClassDescriptor | undefined {
    return this.byClass.get(cls);
  }

  isRegistered(value: string): boolean {
    return this.byClass.has(value as L8RegimeOutputClass);
  }

  requiresContradictionPosture(cls: L8RegimeOutputClass): boolean {
    return this.byClass.get(cls)?.requiresContradictionPosture ?? false;
  }

  requiresRestrictionPosture(cls: L8RegimeOutputClass): boolean {
    return this.byClass.get(cls)?.requiresRestrictionPosture ?? false;
  }

  requiresAmbiguityPosture(cls: L8RegimeOutputClass): boolean {
    return this.byClass.get(cls)?.requiresAmbiguityPosture ?? false;
  }

  requiresEvidence(cls: L8RegimeOutputClass): boolean {
    return this.byClass.get(cls)?.requiresEvidence ?? false;
  }
}

const defaultRegimeOutputClassRegistry = new L8RegimeOutputClassRegistry();

export function getDefaultL8RegimeOutputClassRegistry(): L8RegimeOutputClassRegistry {
  return defaultRegimeOutputClassRegistry;
}

// Stable reference to keep ALL_L8_REGIME_OUTPUT_CLASSES reachable from this module.
void ALL_L8_REGIME_OUTPUT_CLASSES;
