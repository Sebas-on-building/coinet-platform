/**
 * L6.6 §6.6.4 — FeatureFamilyDefinitionValidator
 *
 * Validates a feature family definition against structural, scope, and input
 * legality requirements before it may be registered.
 */

import {
  L6FeatureFamilyDefinition,
  REQUIRED_FEATURE_FAMILY_FIELDS,
} from '../contracts/feature-family-definition';
import { LegalInputSurfaceRegistry } from '../registry/legal-input-surface.registry';
import { L6FamilyViolationCode } from './legal-input.validator';

export interface L6FeatureFamilyViolation {
  readonly code: L6FamilyViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6FeatureFamilyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6FeatureFamilyViolation[];
}

export class FeatureFamilyDefinitionValidator {
  constructor(private readonly inputRegistry: LegalInputSurfaceRegistry) {}

  validate(def: L6FeatureFamilyDefinition): L6FeatureFamilyValidationResult {
    const v: L6FeatureFamilyViolation[] = [];

    for (const f of REQUIRED_FEATURE_FAMILY_FIELDS) {
      const val = def[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6FamilyViolationCode.FAMILY_FIELD_MISSING,
          field: String(f),
          detail: 'required field missing',
        });
      }
    }

    if (def.allowed_scopes.length === 0) {
      v.push({
        code: L6FamilyViolationCode.SCOPE_NOT_ALLOWED,
        field: 'allowed_scopes',
        detail: 'at least one scope required',
      });
    }

    if (def.legal_input_surface_classes.length === 0) {
      v.push({
        code: L6FamilyViolationCode.FAMILY_FIELD_MISSING,
        field: 'legal_input_surface_classes',
        detail: 'must declare at least one legal input class',
      });
    }

    if (def.baseline_classes_allowed.length === 0) {
      v.push({
        code: L6FamilyViolationCode.FAMILY_FIELD_MISSING,
        field: 'baseline_classes_allowed',
        detail: 'must declare at least one baseline class',
      });
    }

    if (def.output_kinds_allowed.length === 0) {
      v.push({
        code: L6FamilyViolationCode.FAMILY_FIELD_MISSING,
        field: 'output_kinds_allowed',
        detail: 'must declare at least one output kind',
      });
    }

    // Dependency template bindings must all reference registered surfaces
    for (const b of def.dependency_template.bindings) {
      if (!this.inputRegistry.isRegistered(b.surface_id)) {
        v.push({
          code: L6FamilyViolationCode.UNREGISTERED_INPUT_SURFACE,
          field: `dependency_template.${b.surface_id}`,
          detail: `surface ${b.surface_id} not in LegalInputSurfaceRegistry`,
        });
      }
    }

    return { ok: v.length === 0, violations: v };
  }
}
