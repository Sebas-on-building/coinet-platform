/**
 * L8.6 — Regime Template Consistency Validator
 *
 * §8.6.7.6 — Family registry and template registry must remain mutually
 * consistent. This validator runs across the entire registered set and
 * surfaces any cross-entity drift.
 */

import {
  L8RegimeTemplate,
} from '../contracts/regime-template';
import {
  L8RegimeTemplateViolation,
  L8RegimeTemplateViolationCode,
} from './l8-template-violation-codes';
import {
  getDefaultL8RegimeTemplateRegistry,
  L8RegimeTemplateRegistry,
} from '../registry/regime-template.registry';
import {
  getDefaultL8RegimeFamilyDefinitionRegistry,
  L8RegimeFamilyDefinitionRegistry,
} from '../registry/regime-family-definition.registry';
import {
  getDefaultL8RegimeClassRegistry,
  L8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import {
  getDefaultL8RegimeInputFamilyRegistry,
  L8RegimeInputFamilyRegistry,
} from '../registry/regime-input-family.registry';

export interface L8ConsistencyReport {
  readonly valid: boolean;
  readonly violations: readonly L8RegimeTemplateViolation[];
}

function v(
  code: L8RegimeTemplateViolationCode,
  t: L8RegimeTemplate | null,
  detail: string,
  context: Record<string, unknown> = {},
): L8RegimeTemplateViolation {
  return {
    code,
    source: 'regime-template-consistency-validator',
    templateId: t?.template_id ?? null,
    family: t?.regime_family ?? null,
    detail,
    context,
  };
}

/**
 * §8.6.7.6 — Cross-registry consistency scan. Surfaces:
 *   - templates whose family is not registered
 *   - templates whose class is not in family
 *   - templates whose legal_input_families are not in family's allowed set
 *   - templates whose scopes are not legal for the family
 *   - templates whose rollout_phase disagrees with family definition
 *   - duplicate template ids
 *   - families with no templates
 *   - families whose member regime classes have no template
 */
export function validateRegimeTemplateConsistency(
  templateRegistry: L8RegimeTemplateRegistry =
    getDefaultL8RegimeTemplateRegistry(),
  familyDefinitionRegistry: L8RegimeFamilyDefinitionRegistry =
    getDefaultL8RegimeFamilyDefinitionRegistry(),
  classRegistry: L8RegimeClassRegistry =
    getDefaultL8RegimeClassRegistry(),
  inputFamilyRegistry: L8RegimeInputFamilyRegistry =
    getDefaultL8RegimeInputFamilyRegistry(),
): L8ConsistencyReport {
  const violations: L8RegimeTemplateViolation[] = [];
  const templates = templateRegistry.list();

  // Duplicate template ids
  const seen = new Set<string>();
  for (const t of templates) {
    if (seen.has(t.template_id)) {
      violations.push(v(
        L8RegimeTemplateViolationCode.TEMPLATE_ID_MISMATCH, t,
        `duplicate template id ${t.template_id}`,
      ));
    }
    seen.add(t.template_id);
  }

  // Per-template consistency
  for (const t of templates) {
    const familyDef = familyDefinitionRegistry.get(t.regime_family);
    if (!familyDef) {
      violations.push(v(
        L8RegimeTemplateViolationCode.TEMPLATE_UNKNOWN_FAMILY, t,
        `family ${t.regime_family} not registered in definition registry`,
      ));
      continue;
    }

    if (!classRegistry.belongsToFamily(t.regime_class, t.regime_family)) {
      violations.push(v(
        L8RegimeTemplateViolationCode.TEMPLATE_CLASS_NOT_IN_FAMILY, t,
        `class ${t.regime_class} not in family ${t.regime_family}`,
      ));
    }

    for (const f of t.legal_input_families) {
      if (!inputFamilyRegistry.isRegistered(f)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_INPUT_FAMILY_NOT_ALLOWED, t,
          `input family ${f} not registered`,
        ));
      } else if (!familyDef.legal_input_families.includes(f)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_INPUT_FAMILY_NOT_ALLOWED, t,
          `input family ${f} not allowed for family ${t.regime_family}`,
        ));
      }
    }

    for (const sc of t.applicable_scope_types) {
      if (!familyDef.legal_scope_types.includes(sc)) {
        violations.push(v(
          L8RegimeTemplateViolationCode.TEMPLATE_SCOPE_NOT_IN_FAMILY, t,
          `scope ${sc} not in family ${t.regime_family}'s legal scopes`,
        ));
      }
    }

    if (t.rollout_phase !== familyDef.rollout_phase) {
      violations.push(v(
        L8RegimeTemplateViolationCode.FAMILY_ROLLOUT_PHASE_MISMATCH, t,
        `template phase ${t.rollout_phase} != family phase ${familyDef.rollout_phase}`,
      ));
    }

    for (const pat of t.required_validation_patterns) {
      if (!familyDef.legal_validation_patterns.includes(pat)) {
        violations.push(v(
          L8RegimeTemplateViolationCode
            .TEMPLATE_VALIDATION_PATTERN_NOT_ALLOWED, t,
          `validation pattern ${pat} not in family ${t.regime_family}`,
        ));
      }
    }
  }

  // Families with no templates, or members with no template
  for (const def of familyDefinitionRegistry.list()) {
    const familyTemplates = templateRegistry.listForFamily(def.family);
    if (familyTemplates.length === 0) {
      violations.push({
        code: L8RegimeTemplateViolationCode
          .FAMILY_PRODUCTION_ENABLED_WITHOUT_TEMPLATES,
        source: 'regime-template-consistency-validator',
        templateId: null,
        family: def.family,
        detail: `family ${def.family} has no registered templates`,
        context: {},
      });
    }
    for (const cls of def.member_regime_classes) {
      const exists = familyTemplates.some(t => t.regime_class === cls);
      if (!exists) {
        violations.push({
          code: L8RegimeTemplateViolationCode.TEMPLATE_UNREGISTERED,
          source: 'regime-template-consistency-validator',
          templateId: null,
          family: def.family,
          detail: `regime class ${cls} in family ${def.family} has no template`,
          context: {},
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
}
