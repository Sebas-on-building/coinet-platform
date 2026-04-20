/**
 * L9.5 — Change Point Registry
 *
 * §9.5.7 / §9.5.11.2 — Runtime registry wrapping change-point policy.
 * Materiality thresholds, legal trigger families, required anchors,
 * and required phase bounds are all reached through this registry.
 */

import {
  L9ChangePointClass,
  L9ChangePointSeverity,
} from '../contracts/change-point';
import {
  L9ChangePointMateriality,
  L9ChangePointTriggerFamily,
  L9_CP_CLASSES_REQUIRING_EVENT_ANCHOR,
  L9_CP_CLASSES_REQUIRING_PHASE_BOUNDS,
  L9_CP_MATERIALITY_MINIMUM_SEVERITY,
  L9_LEGAL_TRIGGER_FAMILIES_PER_CP,
  classifyL9ChangePointMateriality,
  isL9ChangePointMaterial,
  isL9LegalChangePointTrigger,
  l9ChangePointRequiresEventAnchor,
  l9ChangePointRequiresPhaseBounds,
  materialityToSeverity,
} from '../contracts/l9-change-point-policy';

export class L9ChangePointRegistry {
  private readonly triggerTable = L9_LEGAL_TRIGGER_FAMILIES_PER_CP;
  private readonly minSeverityTable = L9_CP_MATERIALITY_MINIMUM_SEVERITY;

  minSeverityFor(cls: L9ChangePointClass): number {
    return this.minSeverityTable[cls];
  }

  legalTriggersFor(
    cls: L9ChangePointClass,
  ): readonly L9ChangePointTriggerFamily[] {
    return this.triggerTable[cls];
  }

  isLegalTrigger(
    cls: L9ChangePointClass, trigger: L9ChangePointTriggerFamily,
  ): boolean {
    return isL9LegalChangePointTrigger(cls, trigger);
  }

  classifyMateriality(severity_score: number): L9ChangePointMateriality {
    return classifyL9ChangePointMateriality(severity_score);
  }

  isMaterial(cls: L9ChangePointClass, severity_score: number): boolean {
    return isL9ChangePointMaterial(cls, severity_score);
  }

  requiresEventAnchor(cls: L9ChangePointClass): boolean {
    return l9ChangePointRequiresEventAnchor(cls);
  }

  requiresPhaseBounds(cls: L9ChangePointClass): boolean {
    return l9ChangePointRequiresPhaseBounds(cls);
  }

  materialityToSeverityBand(
    m: L9ChangePointMateriality,
  ): L9ChangePointSeverity {
    return materialityToSeverity(m);
  }
}

const defaultChangePointRegistry = new L9ChangePointRegistry();

export function getDefaultL9ChangePointRegistry(): L9ChangePointRegistry {
  return defaultChangePointRegistry;
}

export {
  L9_CP_CLASSES_REQUIRING_EVENT_ANCHOR,
  L9_CP_CLASSES_REQUIRING_PHASE_BOUNDS,
  classifyL9ChangePointMateriality,
  isL9ChangePointMaterial,
  isL9LegalChangePointTrigger,
  l9ChangePointRequiresEventAnchor,
  l9ChangePointRequiresPhaseBounds,
  materialityToSeverity,
};
