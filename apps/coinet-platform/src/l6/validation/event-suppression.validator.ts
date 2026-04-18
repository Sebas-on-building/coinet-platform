/**
 * L6.6 §6.6.6.7 — EventSuppressionPolicyValidator
 *
 * Rejects missing cooldown, impossible escalation thresholds, and
 * suppression configs that conflict with event family semantics.
 */

import {
  L6EventSuppressionSpec,
  L6EventSuppressionMode,
  REQUIRED_SUPPRESSION_FIELDS,
} from '../contracts/event-suppression-spec';
import { L6FamilyViolationCode } from './legal-input.validator';

export interface L6SuppressionViolation {
  readonly code: L6FamilyViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6SuppressionValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6SuppressionViolation[];
}

export class EventSuppressionPolicyValidator {
  validate(spec: L6EventSuppressionSpec): L6SuppressionValidationResult {
    const v: L6SuppressionViolation[] = [];

    for (const f of REQUIRED_SUPPRESSION_FIELDS) {
      const val = spec[f];
      if (val === undefined || val === null || (typeof val === 'string' && val === '')) {
        v.push({
          code: L6FamilyViolationCode.SUPPRESSION_SPEC_INCOMPLETE,
          field: String(f),
          detail: 'required suppression field missing',
        });
      }
    }

    if (spec.cooldown_duration_ms <= 0) {
      v.push({
        code: L6FamilyViolationCode.SUPPRESSION_SPEC_INCOMPLETE,
        field: 'cooldown_duration_ms',
        detail: 'cooldown must be > 0',
      });
    }

    if (
      spec.mode === L6EventSuppressionMode.RETRIGGER_AFTER_MATERIAL_DELTA &&
      (spec.retrigger_threshold === null || spec.retrigger_threshold <= 0)
    ) {
      v.push({
        code: L6FamilyViolationCode.SUPPRESSION_SPEC_INCOMPLETE,
        field: 'retrigger_threshold',
        detail: 'RETRIGGER_AFTER_MATERIAL_DELTA requires retrigger_threshold > 0',
      });
    }

    if (
      spec.mode === L6EventSuppressionMode.SEVERITY_ESCALATION_ONLY &&
      (spec.escalation_threshold === null || spec.escalation_threshold <= 0)
    ) {
      v.push({
        code: L6FamilyViolationCode.SUPPRESSION_SPEC_INCOMPLETE,
        field: 'escalation_threshold',
        detail: 'SEVERITY_ESCALATION_ONLY requires escalation_threshold > 0',
      });
    }

    if (
      spec.mode === L6EventSuppressionMode.QUARANTINE_ON_INSTABILITY &&
      (spec.quarantine_after_instability_count === null || spec.quarantine_after_instability_count < 1)
    ) {
      v.push({
        code: L6FamilyViolationCode.SUPPRESSION_SPEC_INCOMPLETE,
        field: 'quarantine_after_instability_count',
        detail: 'QUARANTINE_ON_INSTABILITY requires count >= 1',
      });
    }

    return { ok: v.length === 0, violations: v };
  }
}
