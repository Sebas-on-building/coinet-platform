/**
 * L9.6 — Sequence Family Definition Registry
 *
 * §9.6.11.1 — Runtime registry for production family definitions.
 *
 * Distinct from the L9.2 `L9SequenceFamilyRegistry` which wraps the
 * taxonomy descriptor set. This registry wraps the *production*
 * family doctrine (owning states, templates, rollout phase,
 * contradiction consumption, regime posture, decay tolerance). Every
 * later L9.6 artefact reaches family-production law through this
 * registry, never by inlining definitions.
 */

import {
  L9FamilyStateOwnership,
  L9SequenceFamilyDefinition,
  L9StateOwnershipPosture,
  findL9FamiliesReferencingState,
  findL9FamilyOwningState,
  findL9FamilyStateRecord,
} from '../contracts/sequence-family-definition';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
} from '../contracts/sequence-template-policy';
import { L9SequenceScopeType } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';

export class L9SequenceFamilyDefinitionRegistry {
  private readonly byFamily: Map<L9ProductionFamilyId, L9SequenceFamilyDefinition>;
  private readonly byTemplate: Map<L9SequenceTemplateId, L9ProductionFamilyId>;

  constructor(definitions: readonly L9SequenceFamilyDefinition[]) {
    this.byFamily = new Map();
    this.byTemplate = new Map();
    for (const def of definitions) {
      if (this.byFamily.has(def.family_id)) {
        throw new Error(
          `L9.6: duplicate production family definition ${def.family_id}`,
        );
      }
      this.byFamily.set(def.family_id, def);
      for (const templateId of def.template_ids) {
        const prior = this.byTemplate.get(templateId);
        if (prior !== undefined && prior !== def.family_id) {
          throw new Error(
            `L9.6: template ${templateId} bound to multiple families ` +
              `${prior} and ${def.family_id} (INV-9.6-A).`,
          );
        }
        this.byTemplate.set(templateId, def.family_id);
      }
    }
  }

  list(): readonly L9SequenceFamilyDefinition[] {
    return Array.from(this.byFamily.values());
  }

  get(family: L9ProductionFamilyId): L9SequenceFamilyDefinition | undefined {
    return this.byFamily.get(family);
  }

  has(family: string): boolean {
    return this.byFamily.has(family as L9ProductionFamilyId);
  }

  /**
   * §9.6.3.3 — Legal scope types declared by `family`.
   */
  legalScopeTypes(
    family: L9ProductionFamilyId,
  ): readonly L9SequenceScopeType[] {
    return this.byFamily.get(family)?.legal_scope_types ?? [];
  }

  /**
   * §9.6.3.4 — Coexistence check between two production families.
   */
  coexists(
    a: L9ProductionFamilyId,
    b: L9ProductionFamilyId,
  ): boolean {
    if (a === b) return true;
    const def = this.byFamily.get(a);
    if (!def) return false;
    return def.coexists_with.includes(b);
  }

  /**
   * §9.6.3.3 — Which templates belong to `family`.
   */
  templatesFor(
    family: L9ProductionFamilyId,
  ): readonly L9SequenceTemplateId[] {
    return this.byFamily.get(family)?.template_ids ?? [];
  }

  /**
   * §9.6.11.3 — INV-9.6-A lookup: which family owns a given template.
   * A template bound to no family (or multiple families) is illegal.
   */
  familyForTemplate(
    template_id: L9SequenceTemplateId,
  ): L9ProductionFamilyId | undefined {
    return this.byTemplate.get(template_id);
  }

  /**
   * §9.6.3.3 — State ownership record for `(family, state)`.
   */
  stateRecord(
    family: L9ProductionFamilyId,
    state: L9SequenceState,
  ): L9FamilyStateOwnership | undefined {
    const def = this.byFamily.get(family);
    if (!def) return undefined;
    return findL9FamilyStateRecord(def, state);
  }

  /**
   * §9.6.2.4 — INV-9.6-B: a state is only legal for emission inside a
   * family that declares it in its ownership set.
   */
  stateIsLegalForFamily(
    state: L9SequenceState,
    family: L9ProductionFamilyId,
  ): boolean {
    return this.stateRecord(family, state) !== undefined;
  }

  /**
   * §9.6.3.3 — List every production family that references `state`
   * irrespective of ownership posture.
   */
  familiesReferencingState(
    state: L9SequenceState,
  ): readonly L9SequenceFamilyDefinition[] {
    return findL9FamiliesReferencingState(this.list(), state);
  }

  /**
   * §9.6.3.3 — Exclusive owner of a state, if any.
   */
  exclusiveOwnerOfState(
    state: L9SequenceState,
  ): L9SequenceFamilyDefinition | undefined {
    return findL9FamilyOwningState(
      this.list(),
      state,
      L9StateOwnershipPosture.EXCLUSIVE,
    );
  }

  /**
   * §9.6.10.1 — Rollout phase declared by a family.
   */
  rolloutPhase(
    family: L9ProductionFamilyId,
  ): L9SequenceRolloutPhase | undefined {
    return this.byFamily.get(family)?.rollout_phase;
  }
}
