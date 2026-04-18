/**
 * L7.5 — Validation Family Registry
 *
 * §7.5.6.9 — Registers every validation family with subject classes,
 * scopes, support/challenge domains, contradiction families, template
 * ids, confidence posture, restriction posture, and rollout priority.
 */

import {
  L7ValidationFamilyDefinition,
  L7ValidationFamilyId,
} from '../contracts/validation-family-definition';
import { L7_FIRST_PRODUCTION_VALIDATION_FAMILIES } from '../families';
import { L7ValidationSubjectClass } from '../contracts/validation-subject-class';
import { L7ContradictionFamilyClass } from '../contracts/contradiction-family';
import { L7ValidationRolloutPhase } from '../contracts/validation-family-rollout';

export class L7ValidationFamilyRegistry {
  private readonly byId: Map<L7ValidationFamilyId, L7ValidationFamilyDefinition>;

  constructor(
    families: readonly L7ValidationFamilyDefinition[] = L7_FIRST_PRODUCTION_VALIDATION_FAMILIES,
  ) {
    this.byId = new Map(families.map(f => [f.family_id, f]));
  }

  list(): readonly L7ValidationFamilyDefinition[] {
    return Array.from(this.byId.values());
  }

  listProductionEnabled(): readonly L7ValidationFamilyDefinition[] {
    return this.list().filter(f => f.production_enabled);
  }

  get(id: L7ValidationFamilyId): L7ValidationFamilyDefinition | undefined {
    return this.byId.get(id);
  }

  isRegistered(id: string): id is L7ValidationFamilyId {
    return this.byId.has(id as L7ValidationFamilyId);
  }

  /**
   * §7.5.6 — Return families that own the given subject class.
   */
  listForSubjectClass(
    subjectClass: L7ValidationSubjectClass,
  ): readonly L7ValidationFamilyDefinition[] {
    return this.list().filter(f => f.legal_subject_classes.includes(subjectClass));
  }

  /**
   * §7.5.6 — Return families that may emit the given contradiction family.
   */
  listForContradictionFamily(
    family: L7ContradictionFamilyClass,
  ): readonly L7ValidationFamilyDefinition[] {
    return this.list().filter(f => f.allowed_contradiction_families.includes(family));
  }

  listForRolloutPhase(
    phase: L7ValidationRolloutPhase,
  ): readonly L7ValidationFamilyDefinition[] {
    return this.list().filter(f => f.rollout_phase === phase);
  }

  /**
   * §7.5.7.1 — Families sorted by rollout priority (ascending).
   * Stable sort: ties fall back to rollout phase order.
   */
  listByRolloutPriority(): readonly L7ValidationFamilyDefinition[] {
    return [...this.list()].sort((a, b) => a.rollout_priority - b.rollout_priority);
  }
}

const defaultValidationFamilyRegistry = new L7ValidationFamilyRegistry();

export function getDefaultValidationFamilyRegistry(): L7ValidationFamilyRegistry {
  return defaultValidationFamilyRegistry;
}
