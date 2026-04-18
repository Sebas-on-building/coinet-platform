/**
 * L8.2 — Regime Family Validator
 *
 * §8.2.3.7 — No regime class may exist outside a registered family, and
 * a family may not consume classes from another family. This validator
 * enforces those rules for a declared (family, class, scope).
 */

import { L8RegimeFamily, L8RegimeScopeType } from '../contracts/regime-family';
import { L8RegimeClass } from '../contracts/regime-class';
import { L8RegimeObjectViolationCode } from '../contracts/regime-output-class';
import {
  L8RegimeFamilyRegistry,
  getDefaultL8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  L8RegimeClassRegistry,
  getDefaultL8RegimeClassRegistry,
} from '../registry/regime-class.registry';

export interface L8RegimeFamilyIssue {
  readonly code: L8RegimeObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8RegimeFamilyReport {
  readonly valid: boolean;
  readonly issues: readonly L8RegimeFamilyIssue[];
}

export interface L8RegimeFamilyCheckInput {
  readonly family: L8RegimeFamily;
  readonly regimeClass: L8RegimeClass;
  readonly scope_type: L8RegimeScopeType;
}

export function validateRegimeFamily(
  input: L8RegimeFamilyCheckInput,
  familyRegistry: L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
  classRegistry: L8RegimeClassRegistry = getDefaultL8RegimeClassRegistry(),
): L8RegimeFamilyReport {
  const issues: L8RegimeFamilyIssue[] = [];

  if (!familyRegistry.isRegistered(input.family)) {
    issues.push({
      code: L8RegimeObjectViolationCode.FAMILY_UNREGISTERED,
      message: `Family ${input.family} is not registered`,
      details: { family: input.family },
    });
    return { valid: false, issues };
  }

  if (!classRegistry.isRegistered(input.regimeClass)) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_UNREGISTERED,
      message: `Regime class ${input.regimeClass} is not registered`,
      details: { regimeClass: input.regimeClass },
    });
    return { valid: false, issues };
  }

  if (!classRegistry.belongsToFamily(input.regimeClass, input.family)) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_NOT_IN_FAMILY,
      message:
        `Regime class ${input.regimeClass} does not belong to family ${input.family}`,
      details: { regimeClass: input.regimeClass, family: input.family },
    });
  }

  if (!familyRegistry.allowsScope(input.family, input.scope_type)) {
    issues.push({
      code: L8RegimeObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY,
      message:
        `Scope ${input.scope_type} is not legal for family ${input.family}`,
      details: { scope_type: input.scope_type, family: input.family },
    });
  }

  if (!classRegistry.allowsScope(input.regimeClass, input.scope_type)) {
    issues.push({
      code: L8RegimeObjectViolationCode.CLASS_SCOPE_ILLEGAL,
      message:
        `Scope ${input.scope_type} is not legal for class ${input.regimeClass}`,
      details: { scope_type: input.scope_type, regimeClass: input.regimeClass },
    });
  }

  return { valid: issues.length === 0, issues };
}
