/**
 * L7.3 — Validation Contract Compatibility Validator
 *
 * §7.3.7.1 – §7.3.7.3 — Wraps the contract-versioning enums and the
 * delta classifier with a validator that emits typed contract violations.
 */

import {
  L7ContractDelta,
  L7ContractCompatibilityClass,
  classifyValidationContractDelta,
  compareValidationContractVersions,
} from '../contracts/validation-contract-versioning';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface CompatibilityValidationResult {
  readonly valid: boolean;
  readonly compatibility_class: L7ContractCompatibilityClass;
  readonly violations: readonly L7ContractViolation[];
}

/**
 * §7.3.7.7 — Compatibility validator wrapper.
 *
 * `allowMigrationRequired` — caller must explicitly opt in for changes
 * that need a migration discipline.
 *
 * `allowBreaking` — caller must explicitly opt in for breaking semantic
 * changes (rare; typically only during major version cuts).
 */
export function validateValidationContractCompatibility(
  delta: L7ContractDelta,
  opts: { allowMigrationRequired?: boolean; allowBreaking?: boolean } = {},
): CompatibilityValidationResult {
  const violations: L7ContractViolation[] = [];
  const cls = classifyValidationContractDelta(delta);
  const path = `${delta.surface}:${delta.from}->${delta.to}`;

  const cmp = compareValidationContractVersions(delta.to, delta.from);
  if (cmp < 0) {
    violations.push({
      code: L7ContractViolationCode.COMPATIBILITY_VERSION_REGRESSION,
      message: `Contract version regression: ${delta.from} -> ${delta.to}`,
      path,
    });
  }

  switch (cls) {
    case L7ContractCompatibilityClass.PROHIBITED:
      violations.push({
        code: L7ContractViolationCode.COMPATIBILITY_PROHIBITED_CHANGE,
        message: 'Delta classified as PROHIBITED.',
        path,
      });
      break;
    case L7ContractCompatibilityClass.BREAKING_SEMANTIC:
      if (!opts.allowBreaking) {
        violations.push({
          code: L7ContractViolationCode.COMPATIBILITY_BREAKING_SEMANTIC,
          message: `Breaking semantic delta on fields: ${delta.semantically_changed_fields.join(', ')}`,
          path,
          details: { fields: delta.semantically_changed_fields },
        });
      }
      break;
    case L7ContractCompatibilityClass.MIGRATION_REQUIRED:
      if (!opts.allowMigrationRequired) {
        violations.push({
          code: L7ContractViolationCode.COMPATIBILITY_MIGRATION_REQUIRED_NOT_FLAGGED,
          message: `Migration required (removed fields or enum changes): ${[
            ...delta.removed_fields,
            ...delta.changed_enum_vocabularies,
          ].join(', ')}`,
          path,
        });
      }
      break;
    case L7ContractCompatibilityClass.BACKWARD_COMPATIBLE_STRUCTURAL:
    case L7ContractCompatibilityClass.ADDITIVE_SAFE:
      break;
  }

  return {
    valid: violations.length === 0,
    compatibility_class: cls,
    violations,
  };
}
