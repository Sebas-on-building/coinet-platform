/**
 * L7.6 — Confidence Cap Registry
 *
 * §7.6.4.5 — Single source of truth for legal cap classes. The
 * cap-chain validator uses this registry to:
 *
 *   - reject unknown cap classes
 *   - resolve ceiling values
 *   - report which trigger conditions force a cap to be applied
 */

import {
  L7ConfidenceCapClass,
  L7ConfidenceCapDescriptor,
  L7ConfidenceCapTrigger,
  L7_CONFIDENCE_CAP_DESCRIPTORS,
  ALL_L7_CONFIDENCE_CAP_CLASSES,
  isL7ConfidenceCapClass,
} from '../contracts/confidence-cap';

export class L7ConfidenceCapRegistry {
  private readonly byClass: Map<L7ConfidenceCapClass, L7ConfidenceCapDescriptor>;

  constructor(
    descriptors: readonly L7ConfidenceCapDescriptor[] = L7_CONFIDENCE_CAP_DESCRIPTORS,
  ) {
    this.byClass = new Map(descriptors.map(d => [d.capClass, d]));
  }

  list(): readonly L7ConfidenceCapDescriptor[] {
    return Array.from(this.byClass.values());
  }

  get(capClass: L7ConfidenceCapClass): L7ConfidenceCapDescriptor | undefined {
    return this.byClass.get(capClass);
  }

  isRegistered(raw: string): boolean {
    return isL7ConfidenceCapClass(raw) && this.byClass.has(raw);
  }

  ceiling(capClass: L7ConfidenceCapClass): number {
    return this.byClass.get(capClass)?.ceilingScore100 ?? 100;
  }

  mandatoryWhen(capClass: L7ConfidenceCapClass): readonly L7ConfidenceCapTrigger[] {
    return this.byClass.get(capClass)?.mandatoryWhen ?? [];
  }

  /** Cap classes (in order) that must be applied for any trigger in the active set. */
  capsRequiredFor(
    triggers: readonly L7ConfidenceCapTrigger[],
  ): readonly L7ConfidenceCapClass[] {
    const required: L7ConfidenceCapClass[] = [];
    for (const c of ALL_L7_CONFIDENCE_CAP_CLASSES) {
      const d = this.byClass.get(c);
      if (!d) continue;
      if (d.mandatoryWhen.some(t => triggers.includes(t))) required.push(c);
    }
    return required;
  }
}

const defaultConfidenceCapRegistry = new L7ConfidenceCapRegistry();

export function getDefaultConfidenceCapRegistry(): L7ConfidenceCapRegistry {
  return defaultConfidenceCapRegistry;
}
