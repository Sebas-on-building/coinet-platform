/**
 * L6.1 — Boundary Validator
 *
 * §6.1.8.3 — Validates primitive definitions, dependency legality,
 * output legality, forbidden language, raw-input violations,
 * and later-layer semantic leakage.
 */

import type { L6OutputSurfaceClass, L6DependencyUsability } from '../contracts/l6-constitutional-types';
import { isRegisteredDependency, isUsableFor } from '../contracts/l6-dependency-surfaces';
import { isRegisteredOutput } from '../contracts/l6-output-surfaces';
import { isLegalOutputClass, isForbiddenOutputClass } from '../contracts/l6-mission';
import { containsForbiddenNaming, isValidPrimitiveName } from '../contracts/l6-boundary';
import { L6BoundaryViolationCode } from '../contracts/l6-violation-codes';

export interface PrimitiveDefinition {
  readonly name: string;
  readonly outputSurfaceId: string;
  readonly outputClass: L6OutputSurfaceClass;
  readonly dependencySurfaceIds: readonly string[];
  readonly dependencyUsage: L6DependencyUsability;
  readonly description: string;
}

export interface BoundaryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly BoundaryViolation[];
}

export interface BoundaryViolation {
  readonly code: L6BoundaryViolationCode;
  readonly field: string;
  readonly detail: string;
}

export function validatePrimitiveDefinition(def: PrimitiveDefinition): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];

  if (!isValidPrimitiveName(def.name)) {
    violations.push({
      code: containsForbiddenNaming(def.name)
        ? L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS
        : L6BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'name',
      detail: containsForbiddenNaming(def.name)
        ? `Name "${def.name}" contains forbidden judgment semantics`
        : `Name "${def.name}" is not valid snake_case`,
    });
  }

  if (!isRegisteredOutput(def.outputSurfaceId)) {
    violations.push({
      code: L6BoundaryViolationCode.UNREGISTERED_OUTPUT,
      field: 'outputSurfaceId',
      detail: `Output surface "${def.outputSurfaceId}" is not registered`,
    });
  }

  if (!isLegalOutputClass(def.outputClass)) {
    violations.push({
      code: L6BoundaryViolationCode.ILLEGAL_OUTPUT_CLASS,
      field: 'outputClass',
      detail: `Output class "${def.outputClass}" is not legal`,
    });
  }

  for (const depId of def.dependencySurfaceIds) {
    if (!isRegisteredDependency(depId)) {
      violations.push({
        code: L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not registered`,
      });
    } else if (!isUsableFor(depId, def.dependencyUsage)) {
      violations.push({
        code: L6BoundaryViolationCode.ILLEGAL_DEPENDENCY_USAGE,
        field: 'dependencySurfaceIds',
        detail: `Dependency "${depId}" is not usable for ${def.dependencyUsage}`,
      });
    }
  }

  if (containsForbiddenNaming(def.description)) {
    violations.push({
      code: L6BoundaryViolationCode.FORBIDDEN_JUDGMENT_SEMANTICS,
      field: 'description',
      detail: 'Description contains forbidden judgment language',
    });
  }

  return { valid: violations.length === 0, violations };
}

export function validateRawInputAbsence(inputSources: readonly string[]): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const rawPatterns = [/raw[_:]provider/i, /raw[_:]json/i, /cache[_:]blob/i, /ui[_:]aggregate/i, /provider[_:]native/i];

  for (const src of inputSources) {
    if (rawPatterns.some(p => p.test(src))) {
      violations.push({
        code: L6BoundaryViolationCode.RAW_PROVIDER_INPUT,
        field: 'inputSources',
        detail: `Input source "${src}" appears to be a raw provider-native payload`,
      });
    }
    if (!isRegisteredDependency(src)) {
      violations.push({
        code: L6BoundaryViolationCode.UNREGISTERED_DEPENDENCY,
        field: 'inputSources',
        detail: `Input source "${src}" is not a registered dependency surface`,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}

export function validateNeutralFillAbsence(
  missingInputHandlers: readonly { field: string; handler: string }[],
): BoundaryValidationResult {
  const violations: BoundaryViolation[] = [];
  const neutralPatterns = [/default.*0/i, /fallback.*neutral/i, /fill.*normal/i, /assume.*current/i, /implicit.*fallback/i];

  for (const h of missingInputHandlers) {
    if (neutralPatterns.some(p => p.test(h.handler))) {
      violations.push({
        code: L6BoundaryViolationCode.SILENT_NEUTRAL_FILL,
        field: h.field,
        detail: `Handler "${h.handler}" for missing "${h.field}" appears to silently neutralize`,
      });
    }
  }

  return { valid: violations.length === 0, violations };
}
