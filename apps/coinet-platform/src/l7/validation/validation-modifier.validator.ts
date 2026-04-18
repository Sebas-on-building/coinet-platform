/**
 * L7.5 — Validation Modifier Validator
 *
 * §7.5.3 — Enforces modifier law: only registered modifiers, no
 * modifier-as-primary-class, class/modifier compatibility, no
 * duplicates, and no modifier that contradicts the chosen primary class.
 */

import {
  L7ValidationModifierCode,
  isL7ValidationModifierCode,
  classifyClassModifierPair,
  L7ClassModifierCompatibility,
} from '../contracts/validation-modifier.policy';
import { L7PrimaryValidationClass } from '../contracts/validation-class.policy';
import {
  L7SemanticViolation,
  L7SemanticViolationCode,
} from './l7-semantic-violation-codes';

export interface L7ModifierValidationInput {
  readonly primary: L7PrimaryValidationClass;
  readonly modifiers: readonly string[];
}

export interface L7ModifierValidationResult {
  readonly legalModifiers: readonly L7ValidationModifierCode[];
  readonly tightlyGatedModifiers: readonly L7ValidationModifierCode[];
  readonly violations: readonly L7SemanticViolation[];
}

function v(
  code: L7SemanticViolationCode,
  detail: string,
  extra: Partial<L7SemanticViolation> = {},
): L7SemanticViolation {
  return { code, detail, ...extra };
}

export class L7ValidationModifierValidator {
  validate(input: L7ModifierValidationInput): L7ModifierValidationResult {
    const violations: L7SemanticViolation[] = [];
    const legalModifiers: L7ValidationModifierCode[] = [];
    const tightlyGated: L7ValidationModifierCode[] = [];
    const seen = new Set<string>();

    for (const raw of input.modifiers) {
      if (seen.has(raw)) {
        violations.push(
          v(L7SemanticViolationCode.MODIFIER_DUPLICATE, `duplicate modifier ${raw}`, {
            modifier: raw,
            primaryClass: input.primary,
          }),
        );
        continue;
      }
      seen.add(raw);

      // §7.5.2.7 / §7.5.3.4 — A registered primary class must not be
      // smuggled in as a modifier. Check this BEFORE the generic
      // "unknown modifier" rule so the audit trail names the precise law.
      if (isPrimaryClassValue(raw)) {
        violations.push(
          v(
            L7SemanticViolationCode.CLASS_MISUSED_AS_MODIFIER,
            `primary class ${raw} used as modifier`,
            { modifier: raw, primaryClass: input.primary },
          ),
        );
        continue;
      }

      // §7.5.3.1 — Every modifier must be registered.
      if (!isL7ValidationModifierCode(raw)) {
        violations.push(
          v(L7SemanticViolationCode.UNKNOWN_MODIFIER, `unknown modifier ${raw}`, {
            modifier: raw,
            primaryClass: input.primary,
          }),
        );
        continue;
      }

      const compat: L7ClassModifierCompatibility = classifyClassModifierPair(
        input.primary,
        raw as L7ValidationModifierCode,
      );

      if (compat === 'ILLEGAL') {
        violations.push(
          v(
            L7SemanticViolationCode.MODIFIER_ILLEGAL_FOR_PRIMARY_CLASS,
            `modifier ${raw} illegal for primary class ${input.primary}`,
            { modifier: raw, primaryClass: input.primary },
          ),
        );
        continue;
      }

      if (compat === 'TIGHTLY_GATED') {
        tightlyGated.push(raw as L7ValidationModifierCode);
      }
      legalModifiers.push(raw as L7ValidationModifierCode);
    }

    return {
      legalModifiers,
      tightlyGatedModifiers: tightlyGated,
      violations,
    };
  }
}

function isPrimaryClassValue(raw: string): boolean {
  return (
    raw === 'CONFIRMED' ||
    raw === 'WEAKLY_CONFIRMED' ||
    raw === 'CONFLICTING' ||
    raw === 'INSUFFICIENT_EVIDENCE' ||
    raw === 'STALE' ||
    raw === 'DEGRADED_DUE_TO_MISSING_SOURCE'
  );
}

const defaultValidationModifierValidator = new L7ValidationModifierValidator();

export function getDefaultValidationModifierValidator(): L7ValidationModifierValidator {
  return defaultValidationModifierValidator;
}
