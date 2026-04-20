/**
 * L10.6 — Hypothesis Template Registry
 *
 * §10.6.12.1 / §10.6.12.3 — Production template registry. Keys every
 * template by `L10HypothesisTemplateId` and rejects:
 *   - duplicate template ids
 *   - unknown template ids
 *   - template-family mismatch (INV-10.6-A)
 *   - missing required surfaces
 *
 * Semantic validation (domain completeness, state legality, etc.) is
 * performed by `hypothesis-template-definition.validator.ts`.
 */

import {
  L10HypothesisTemplateDefinition,
  hasAllRequiredL10TemplateSurfaces,
} from '../contracts/hypothesis-template-definition';
import {
  L10HypothesisFamilyId,
  L10HypothesisTemplateId,
  L10_TEMPLATE_TO_FAMILY,
  isL10RegisteredProductionTemplate,
} from '../contracts/hypothesis-template-policy';

export class L10HypothesisTemplateRegistry {
  private readonly byId = new Map<L10HypothesisTemplateId, L10HypothesisTemplateDefinition>();
  private readonly byFamily = new Map<
    L10HypothesisFamilyId,
    L10HypothesisTemplateDefinition[]
  >();

  register(def: L10HypothesisTemplateDefinition): void {
    if (!isL10RegisteredProductionTemplate(def.template_id)) {
      throw new Error(
        `L10.6 template registry: unknown template '${def.template_id}'`,
      );
    }
    if (!hasAllRequiredL10TemplateSurfaces(def)) {
      throw new Error(
        `L10.6 template registry: incomplete template '${def.template_id}'`,
      );
    }
    const expectedFamily = L10_TEMPLATE_TO_FAMILY[def.template_id];
    if (expectedFamily !== def.hypothesis_family) {
      throw new Error(
        `L10.6 template registry: template '${def.template_id}' claims family ` +
          `'${def.hypothesis_family}' but canonical mapping is '${expectedFamily}'`,
      );
    }
    if (this.byId.has(def.template_id)) {
      throw new Error(
        `L10.6 template registry: duplicate template '${def.template_id}'`,
      );
    }
    this.byId.set(def.template_id, def);
    const bucket = this.byFamily.get(def.hypothesis_family) ?? [];
    bucket.push(def);
    this.byFamily.set(def.hypothesis_family, bucket);
  }

  has(id: L10HypothesisTemplateId): boolean {
    return this.byId.has(id);
  }

  get(id: L10HypothesisTemplateId): L10HypothesisTemplateDefinition | undefined {
    return this.byId.get(id);
  }

  getByFamily(
    family: L10HypothesisFamilyId,
  ): readonly L10HypothesisTemplateDefinition[] {
    return this.byFamily.get(family) ?? [];
  }

  size(): number {
    return this.byId.size;
  }

  list(): readonly L10HypothesisTemplateDefinition[] {
    return Array.from(this.byId.values());
  }

  clear(): void {
    this.byId.clear();
    this.byFamily.clear();
  }
}

let _defaultReg: L10HypothesisTemplateRegistry | null = null;
export function getDefaultL10TemplateRegistry():
  L10HypothesisTemplateRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisTemplateRegistry();
  }
  return _defaultReg;
}

export function resetDefaultL10TemplateRegistry(): void {
  _defaultReg = null;
}
