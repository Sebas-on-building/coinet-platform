/**
 * L6.6 §6.6.5.5 — EventFamilyDefinitionValidator
 *
 * Validates event family definitions against trigger linkage, confirmation,
 * suppression, evidence, and resolution requirements.
 */

import {
  L6EventFamilyDefinition,
  REQUIRED_EVENT_FAMILY_FIELDS,
} from '../contracts/event-family-definition';
import { FeatureFamilyRegistry } from '../registry/feature-family.registry';
import { L6FamilyViolationCode } from './legal-input.validator';

export interface L6EventFamilyViolation {
  readonly code: L6FamilyViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6EventFamilyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6EventFamilyViolation[];
}

export class EventFamilyDefinitionValidator {
  constructor(private readonly featureRegistry: FeatureFamilyRegistry) {}

  validate(def: L6EventFamilyDefinition): L6EventFamilyValidationResult {
    const v: L6EventFamilyViolation[] = [];

    for (const f of REQUIRED_EVENT_FAMILY_FIELDS) {
      const val = def[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6FamilyViolationCode.FAMILY_FIELD_MISSING,
          field: String(f),
          detail: 'required field missing',
        });
      }
    }

    if (def.triggering_feature_families.length === 0) {
      v.push({
        code: L6FamilyViolationCode.EVENT_TRIGGER_MISSING,
        field: 'triggering_feature_families',
        detail: 'no triggering feature families declared',
      });
    }
    for (const ff of def.triggering_feature_families) {
      if (!this.featureRegistry.get(ff)) {
        v.push({
          code: L6FamilyViolationCode.EVENT_TRIGGER_MISSING,
          field: `triggering_feature_families.${ff}`,
          detail: `feature family ${ff} not registered`,
        });
      }
    }

    if (def.confirmation_window_durations_ms.length === 0) {
      v.push({
        code: L6FamilyViolationCode.EVENT_CONFIRMATION_MISSING,
        field: 'confirmation_window_durations_ms',
        detail: 'no confirmation windows',
      });
    }

    if (!def.suppression_family_id) {
      v.push({
        code: L6FamilyViolationCode.EVENT_SUPPRESSION_MISSING,
        field: 'suppression_family_id',
        detail: 'no suppression family declared',
      });
    }

    if (def.evidence_requirements.length === 0) {
      v.push({
        code: L6FamilyViolationCode.EVENT_EVIDENCE_MISSING,
        field: 'evidence_requirements',
        detail: 'no evidence requirements',
      });
    }

    if (def.resolution_classes.length === 0) {
      v.push({
        code: L6FamilyViolationCode.EVENT_RESOLUTION_MISSING,
        field: 'resolution_classes',
        detail: 'no resolution classes',
      });
    }

    return { ok: v.length === 0, violations: v };
  }
}
