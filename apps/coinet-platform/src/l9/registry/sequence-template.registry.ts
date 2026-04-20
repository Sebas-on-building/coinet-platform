/**
 * L9.6 — Sequence Template Registry
 *
 * §9.6.11.2 — Runtime registry for all production sequence templates.
 * Every later L9.6 consumer (runtime, validator, audit) resolves
 * templates through this registry.
 *
 * §9.6.11.3 — Registry law: reject duplicate template ids, template-
 * family mismatch, templates missing challenge domains, templates
 * missing contradiction/decay posture, templates that bind to states
 * not owned by their family.
 */

import {
  L9SequenceTemplateDefinition,
  buildL9SequenceTemplateKey,
  hasAllRequiredL9TemplateSurfaces,
} from '../contracts/sequence-template-definition';
import {
  L9ProductionFamilyId,
  L9SequenceRolloutPhase,
  L9SequenceTemplateId,
  L9TemplateChallengeDomain,
  L9TemplateSupportDomain,
} from '../contracts/sequence-template-policy';
import { L9SequenceScopeType } from '../contracts/sequence-family';
import { L9SequenceFamilyDefinitionRegistry } from './sequence-family-definition.registry';

export class L9SequenceTemplateRegistry {
  private readonly byId: Map<L9SequenceTemplateId, L9SequenceTemplateDefinition>;
  private readonly byKey: Map<string, L9SequenceTemplateDefinition>;

  constructor(
    templates: readonly L9SequenceTemplateDefinition[],
    families: L9SequenceFamilyDefinitionRegistry,
  ) {
    this.byId = new Map();
    this.byKey = new Map();
    for (const tpl of templates) {
      if (!hasAllRequiredL9TemplateSurfaces(tpl)) {
        throw new Error(
          `L9.6: template ${tpl.template_id} omits required surface fields (§9.6.4.4).`,
        );
      }
      if (this.byId.has(tpl.template_id)) {
        throw new Error(
          `L9.6: duplicate template id ${tpl.template_id} (§9.6.11.3).`,
        );
      }
      const owningFamily = families.familyForTemplate(tpl.template_id);
      if (owningFamily === undefined) {
        throw new Error(
          `L9.6: template ${tpl.template_id} is not declared by any ` +
            `production family (INV-9.6-A).`,
        );
      }
      if (owningFamily !== tpl.production_family) {
        throw new Error(
          `L9.6: template ${tpl.template_id} claims family ` +
            `${tpl.production_family} but family registry binds it to ` +
            `${owningFamily} (§9.6.11.3).`,
        );
      }
      if (
        !families.stateIsLegalForFamily(
          tpl.primary_sequence_state,
          tpl.production_family,
        )
      ) {
        throw new Error(
          `L9.6: template ${tpl.template_id} primary state ` +
            `${tpl.primary_sequence_state} not owned by family ` +
            `${tpl.production_family} (INV-9.6-B).`,
        );
      }
      if (tpl.challenge_domains.length === 0) {
        throw new Error(
          `L9.6: template ${tpl.template_id} declares no challenge ` +
            `domains — templates must remain narrowable (§9.6.4.4, INV-9.6-C).`,
        );
      }
      if (tpl.support_domains.length === 0) {
        throw new Error(
          `L9.6: template ${tpl.template_id} declares no support ` +
            `domains (INV-9.6-C).`,
        );
      }
      const key = buildL9SequenceTemplateKey(
        tpl.production_family,
        tpl.template_id,
        tpl.template_version,
      );
      if (this.byKey.has(key)) {
        throw new Error(`L9.6: duplicate template key ${key}.`);
      }
      this.byId.set(tpl.template_id, tpl);
      this.byKey.set(key, tpl);
    }
  }

  list(): readonly L9SequenceTemplateDefinition[] {
    return Array.from(this.byId.values());
  }

  get(id: L9SequenceTemplateId): L9SequenceTemplateDefinition | undefined {
    return this.byId.get(id);
  }

  getByKey(key: string): L9SequenceTemplateDefinition | undefined {
    return this.byKey.get(key);
  }

  has(id: string): boolean {
    return this.byId.has(id as L9SequenceTemplateId);
  }

  listForFamily(
    family: L9ProductionFamilyId,
  ): readonly L9SequenceTemplateDefinition[] {
    return this.list().filter(t => t.production_family === family);
  }

  applicableScopes(
    id: L9SequenceTemplateId,
  ): readonly L9SequenceScopeType[] {
    return this.byId.get(id)?.applicable_scope_types ?? [];
  }

  supportDomains(id: L9SequenceTemplateId): readonly L9TemplateSupportDomain[] {
    return this.byId.get(id)?.support_domains ?? [];
  }

  challengeDomains(
    id: L9SequenceTemplateId,
  ): readonly L9TemplateChallengeDomain[] {
    return this.byId.get(id)?.challenge_domains ?? [];
  }

  rolloutPriority(
    id: L9SequenceTemplateId,
  ): L9SequenceRolloutPhase | undefined {
    return this.byId.get(id)?.rollout_priority;
  }

  /**
   * §9.6.11.3 — Template-to-key canonicalization.
   */
  keyFor(id: L9SequenceTemplateId): string | undefined {
    const t = this.byId.get(id);
    if (!t) return undefined;
    return buildL9SequenceTemplateKey(
      t.production_family,
      t.template_id,
      t.template_version,
    );
  }
}
