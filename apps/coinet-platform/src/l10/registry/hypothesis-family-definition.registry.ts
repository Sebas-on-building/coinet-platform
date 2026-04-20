/**
 * L10.6 — Hypothesis Family Definition Registry
 *
 * §10.6.12.1 / §10.6.12.2 — Production family registry. Keys every
 * family by `L10HypothesisFamilyId` and rejects duplicate registration,
 * unknown family ids, and incomplete definitions.
 *
 * Distinct from the L10.2 `L10HypothesisFamilyRegistry`
 * (`hypothesis-family.registry.ts`), which indexes L10.2 candidate
 * archetypes. This L10.6 registry indexes the seven production
 * launch families (§10.6.2.1). Both may coexist.
 */

import {
  L10HypothesisFamilyDefinition,
  hasAllRequiredL10FamilySurfaces,
} from '../contracts/hypothesis-family-definition';
import {
  L10HypothesisFamilyId,
  L10HypothesisTemplateId,
  L10_TEMPLATE_TO_FAMILY,
  isL10RegisteredProductionFamily,
} from '../contracts/hypothesis-template-policy';

export class L10HypothesisFamilyDefinitionRegistry {
  private readonly byId = new Map<L10HypothesisFamilyId, L10HypothesisFamilyDefinition>();

  register(def: L10HypothesisFamilyDefinition): void {
    if (!isL10RegisteredProductionFamily(def.family_id)) {
      throw new Error(
        `L10.6 family registry: unknown family '${def.family_id}'`,
      );
    }
    if (!hasAllRequiredL10FamilySurfaces(def)) {
      throw new Error(
        `L10.6 family registry: incomplete definition for '${def.family_id}'`,
      );
    }
    if (this.byId.has(def.family_id)) {
      throw new Error(
        `L10.6 family registry: duplicate family '${def.family_id}'`,
      );
    }
    // §10.6.3.5 — reject templates that drift away from this family.
    for (const t of def.legal_templates) {
      const expected = L10_TEMPLATE_TO_FAMILY[t];
      if (expected !== def.family_id) {
        throw new Error(
          `L10.6 family registry: template '${t}' belongs to '${expected}', ` +
            `not '${def.family_id}'`,
        );
      }
    }
    this.byId.set(def.family_id, def);
  }

  has(id: L10HypothesisFamilyId): boolean {
    return this.byId.has(id);
  }

  get(id: L10HypothesisFamilyId): L10HypothesisFamilyDefinition | undefined {
    return this.byId.get(id);
  }

  getOwningFamily(
    template: L10HypothesisTemplateId,
  ): L10HypothesisFamilyDefinition | undefined {
    const fid = L10_TEMPLATE_TO_FAMILY[template];
    return this.byId.get(fid);
  }

  size(): number {
    return this.byId.size;
  }

  list(): readonly L10HypothesisFamilyDefinition[] {
    return Array.from(this.byId.values());
  }

  clear(): void {
    this.byId.clear();
  }
}

let _defaultReg: L10HypothesisFamilyDefinitionRegistry | null = null;
export function getDefaultL10FamilyDefinitionRegistry():
  L10HypothesisFamilyDefinitionRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisFamilyDefinitionRegistry();
  }
  return _defaultReg;
}

export function resetDefaultL10FamilyDefinitionRegistry(): void {
  _defaultReg = null;
}
