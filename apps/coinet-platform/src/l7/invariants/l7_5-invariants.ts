/**
 * L7.5 — Constitutional Invariants
 *
 * §7.5.9.1 — These invariants must be executable and test-covered.
 *
 *   INV-7.5-A  every validation result has exactly one primary class
 *   INV-7.5-B  modifiers remain separate from primary class
 *   INV-7.5-C  only registered contradiction families/templates power production detection
 *   INV-7.5-D  contradiction examples are encoded as governed templates, not informal rules
 *   INV-7.5-E  every production validation family is registered, scope-legal, and contradiction-coverage-complete
 *   INV-7.5-F  production family rollout order is explicit, comparable, and enforceable
 *   INV-7.5-G  no validation family drifts into regime/scenario/judgment/recommendation semantics
 */

import {
  ALL_L7_PRIMARY_VALIDATION_CLASSES,
  L7PrimaryValidationClass,
} from '../contracts/validation-class.policy';
import { ALL_L7_VALIDATION_MODIFIERS } from '../contracts/validation-modifier.policy';
import {
  ALL_L7_CONTRADICTION_FAMILIES,
  L7ContradictionFamilyClass,
} from '../contracts/contradiction-family';
import {
  L7_CONTRADICTION_TEMPLATES,
  L7ContradictionTemplate,
} from '../contracts/contradiction-template';
import { L7ValidationFamilyDefinition } from '../contracts/validation-family-definition';
import { L7_FIRST_PRODUCTION_VALIDATION_FAMILIES } from '../families';
import { getDefaultContradictionTemplateRegistry } from '../registry/contradiction-template.registry';
import { getDefaultValidationFamilyRegistry } from '../registry/validation-family.registry';
import { L7ContradictionTemplateValidator } from '../validation/contradiction-template.validator';
import { L7ValidationFamilyDefinitionValidator } from '../validation/validation-family-definition.validator';
import { L7ValidationFamilyRolloutValidator } from '../validation/validation-family-rollout.validator';
import { L7SemanticViolationCode } from '../validation/l7-semantic-violation-codes';

export interface L7_5InvariantResult {
  readonly invariant:
    | 'INV-7.5-A'
    | 'INV-7.5-B'
    | 'INV-7.5-C'
    | 'INV-7.5-D'
    | 'INV-7.5-E'
    | 'INV-7.5-F'
    | 'INV-7.5-G';
  readonly satisfied: boolean;
  readonly evidence: readonly string[];
}

export interface L7_5ValidationResultView {
  readonly subject_id: string;
  readonly primary_class: string;
  readonly modifiers: readonly string[];
  readonly contradiction_family?: string;
  readonly template_id?: string;
  readonly validation_family_id?: string;
}

/**
 * INV-7.5-A — Every validation result has exactly one primary validation class.
 */
export function checkInvariantA_singlePrimaryClass(
  results: readonly L7_5ValidationResultView[],
): L7_5InvariantResult {
  const evidence: string[] = [];
  const primarySet = new Set(ALL_L7_PRIMARY_VALIDATION_CLASSES as readonly string[]);
  for (const r of results) {
    if (!r.primary_class) {
      evidence.push(`result ${r.subject_id} has no primary class`);
      continue;
    }
    if (!primarySet.has(r.primary_class)) {
      evidence.push(`result ${r.subject_id} has unregistered primary class ${r.primary_class}`);
    }
    // Primary class must not appear inside modifiers.
    for (const m of r.modifiers) {
      if (primarySet.has(m)) {
        evidence.push(
          `result ${r.subject_id} has primary class ${m} smuggled inside modifiers`,
        );
      }
    }
  }
  return {
    invariant: 'INV-7.5-A',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-B — Modifiers remain separate from primary class; every modifier
 * is a registered modifier and never a primary class.
 */
export function checkInvariantB_modifierSeparation(
  results: readonly L7_5ValidationResultView[],
): L7_5InvariantResult {
  const evidence: string[] = [];
  const modifierSet = new Set(ALL_L7_VALIDATION_MODIFIERS as readonly string[]);
  const primarySet = new Set(ALL_L7_PRIMARY_VALIDATION_CLASSES as readonly string[]);
  for (const r of results) {
    const seen = new Set<string>();
    for (const m of r.modifiers) {
      if (primarySet.has(m)) {
        evidence.push(`result ${r.subject_id}: primary class ${m} used as modifier`);
      } else if (!modifierSet.has(m)) {
        evidence.push(`result ${r.subject_id}: unknown modifier ${m}`);
      }
      if (seen.has(m)) evidence.push(`result ${r.subject_id}: duplicate modifier ${m}`);
      seen.add(m);
    }
  }
  return {
    invariant: 'INV-7.5-B',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-C — Only registered contradiction families and templates may
 * power production contradiction detection.
 */
export function checkInvariantC_registeredContradictionPrimitives(
  results: readonly L7_5ValidationResultView[],
): L7_5InvariantResult {
  const evidence: string[] = [];
  const familySet = new Set(ALL_L7_CONTRADICTION_FAMILIES as readonly string[]);
  const registry = getDefaultContradictionTemplateRegistry();
  for (const r of results) {
    if (r.contradiction_family && !familySet.has(r.contradiction_family)) {
      evidence.push(
        `result ${r.subject_id}: unregistered contradiction family ${r.contradiction_family}`,
      );
    }
    if (r.template_id) {
      const t = registry.get(r.template_id);
      if (!t) {
        evidence.push(`result ${r.subject_id}: unregistered template ${r.template_id}`);
      } else if (t.status !== 'PRODUCTION') {
        evidence.push(
          `result ${r.subject_id}: non-production template ${r.template_id} used in production`,
        );
      }
    }
  }
  return {
    invariant: 'INV-7.5-C',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-D — Contradiction examples are encoded as governed templates,
 * not as informal rules. Every production template must pass full
 * structure + cross-legality validation.
 */
export function checkInvariantD_governedTemplates(
  templates: readonly L7ContradictionTemplate[] = L7_CONTRADICTION_TEMPLATES,
): L7_5InvariantResult {
  const evidence: string[] = [];
  const validator = new L7ContradictionTemplateValidator();
  for (const t of templates.filter(t => t.status === 'PRODUCTION')) {
    const v = validator.validate(t);
    for (const viol of v) {
      evidence.push(`template ${t.template_id}: ${viol.code} ${viol.detail}`);
    }
  }
  return {
    invariant: 'INV-7.5-D',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-E — Every production validation family is registered, scope-legal,
 * subject-class-legal, and contradiction-coverage-complete.
 */
export function checkInvariantE_familyCompleteness(
  families: readonly L7ValidationFamilyDefinition[] = L7_FIRST_PRODUCTION_VALIDATION_FAMILIES,
): L7_5InvariantResult {
  const evidence: string[] = [];
  const reg = getDefaultValidationFamilyRegistry();
  const validator = new L7ValidationFamilyDefinitionValidator();
  for (const f of families.filter(f => f.production_enabled)) {
    if (!reg.isRegistered(f.family_id)) {
      evidence.push(`family ${f.family_id} not registered`);
    }
    const v = validator.validate(f);
    for (const viol of v) {
      evidence.push(`family ${f.family_id}: ${viol.code} ${viol.detail}`);
    }
  }
  return {
    invariant: 'INV-7.5-E',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-F — Production family rollout order is explicit, comparable,
 * and enforceable.
 */
export function checkInvariantF_rolloutLegality(
  families: readonly L7ValidationFamilyDefinition[] = L7_FIRST_PRODUCTION_VALIDATION_FAMILIES,
): L7_5InvariantResult {
  const evidence: string[] = [];
  const validator = new L7ValidationFamilyRolloutValidator();
  const result = validator.validate({ families });
  for (const v of result.violations) {
    evidence.push(`rollout ${v.code}: ${v.detail}`);
  }
  return {
    invariant: 'INV-7.5-F',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * INV-7.5-G — No validation family may drift into regime/scenario/
 * judgment/recommendation semantics.
 */
export function checkInvariantG_noSemanticDrift(
  families: readonly L7ValidationFamilyDefinition[] = L7_FIRST_PRODUCTION_VALIDATION_FAMILIES,
): L7_5InvariantResult {
  const evidence: string[] = [];
  const validator = new L7ValidationFamilyDefinitionValidator();
  for (const f of families) {
    const v = validator.validate(f);
    for (const viol of v) {
      if (viol.code === L7SemanticViolationCode.FAMILY_SEMANTIC_DRIFT) {
        evidence.push(`family ${f.family_id}: drift — ${viol.detail}`);
      }
    }
  }
  return {
    invariant: 'INV-7.5-G',
    satisfied: evidence.length === 0,
    evidence,
  };
}

/**
 * Utility: whether a candidate primary class is registered.
 */
export function isPrimaryClassRegistered(cls: string): cls is L7PrimaryValidationClass {
  return (ALL_L7_PRIMARY_VALIDATION_CLASSES as readonly string[]).includes(cls);
}

/**
 * Utility: whether a contradiction family is registered.
 */
export function isContradictionFamilyRegistered(
  cls: string,
): cls is L7ContradictionFamilyClass {
  return (ALL_L7_CONTRADICTION_FAMILIES as readonly string[]).includes(cls);
}
