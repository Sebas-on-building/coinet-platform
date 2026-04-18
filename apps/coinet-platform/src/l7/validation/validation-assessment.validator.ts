/**
 * L7.2 — Validation Assessment Validator
 *
 * §7.2.6.5 — Rejects incomplete outputs, missing subject linkage,
 * missing lineage, missing replay identity, contradiction claims
 * without contradiction bundles, and inconsistent flags/modifiers.
 */

import {
  L7ValidationAssessment,
  checkFlagConsistency,
  classRequiresContradictionBundle,
  modifiersRequireContradictionBundle,
} from '../contracts/validation-assessment';
import {
  ALL_VALIDATION_CLASSES,
  ALL_VALIDATION_MODIFIERS,
  L7ObjectViolationCode,
  L7ValidationOutputClass,
  REQUIRED_FIELDS_BY_OUTPUT,
} from '../contracts/validation-output-class';

export interface ValidationAssessmentIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationAssessmentReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationAssessmentIssue[];
}

export function validateValidationAssessment(
  a: L7ValidationAssessment,
): ValidationAssessmentReport {
  const issues: ValidationAssessmentIssue[] = [];

  for (const field of REQUIRED_FIELDS_BY_OUTPUT[L7ValidationOutputClass.VALIDATION_ASSESSMENT]) {
    const v = (a as unknown as Record<string, unknown>)[field];
    if (v === undefined || v === null || v === '') {
      issues.push({
        code: L7ObjectViolationCode.ASSESSMENT_MISSING_IDENTITY,
        message: `missing required field: ${field}`,
      });
    }
  }

  if (!a.validation_subject_id) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_MISSING_SUBJECT_LINK,
      message: 'missing validation_subject_id',
    });
  }

  if (!ALL_VALIDATION_CLASSES.includes(a.validation_class)) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS,
      message: `illegal validation_class: ${a.validation_class}`,
    });
  }

  for (const m of a.validation_modifiers) {
    if (!ALL_VALIDATION_MODIFIERS.includes(m)) {
      issues.push({
        code: L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS,
        message: `illegal validation_modifier: ${m}`,
      });
    }
  }

  if (!a.lineage_refs || !a.lineage_refs.trace_id || !a.lineage_refs.manifest_id) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_MISSING_LINEAGE,
      message: 'missing lineage_refs',
    });
  }

  if (!a.replay_hash) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH,
      message: 'missing replay_hash',
    });
  }

  if (typeof a.support_strength_score !== 'number' || Number.isNaN(a.support_strength_score)) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS,
      message: 'support_strength_score must be a finite number',
    });
  } else if (a.support_strength_score < 0 || a.support_strength_score > 1) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_ILLEGAL_CLASS,
      message: 'support_strength_score must be in [0, 1]',
    });
  }

  if (
    (classRequiresContradictionBundle(a.validation_class) ||
      modifiersRequireContradictionBundle(a.validation_modifiers)) &&
    !a.contradiction_bundle_ref
  ) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_CONTRADICTION_MISSING,
      message: 'validation_class/modifiers require contradiction_bundle_ref',
    });
  }

  const flags = checkFlagConsistency(a);
  if (!flags.consistent) {
    issues.push({
      code: L7ObjectViolationCode.ASSESSMENT_FLAG_INCONSISTENCY,
      message: 'flag/modifier mismatch',
      details: { reasons: flags.reasons },
    });
  }

  return { valid: issues.length === 0, issues };
}
