/**
 * L7.2 — Validation Subject Contract Validator
 *
 * §7.2.4.5 — Checks completeness, field compatibility, class-specific
 * legality, scope legality, support/challenge declaration completeness,
 * lineage sufficiency, and no scenario/judgment leakage.
 */

import { L7ValidationSubject } from '../contracts/validation-subject';
import { L7ObjectViolationCode } from '../contracts/validation-output-class';
import { validateValidationWindow } from '../contracts/validation-window';
import {
  ALL_MATERIALITY_CLASSES,
} from '../contracts/validation-materiality';
import {
  validateSubjectKind,
  ValidationSubjectKindIssue,
} from './validation-subject-kind.validator';

export interface ValidationSubjectContractIssue {
  readonly code: L7ObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationSubjectContractReport {
  readonly valid: boolean;
  readonly issues: readonly ValidationSubjectContractIssue[];
}

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

export function validateValidationSubjectContract(
  subject: L7ValidationSubject,
): ValidationSubjectContractReport {
  const issues: ValidationSubjectContractIssue[] = [];

  if (!subject.validation_subject_id) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, message: 'missing validation_subject_id' });
  }
  if (!subject.claim_family) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, message: 'missing claim_family' });
  }
  if (!subject.claim_name) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, message: 'missing claim_name' });
  }
  if (!subject.claim_version) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_VERSION, message: 'missing claim_version' });
  }
  if (!subject.subject_template_id) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_IDENTITY, message: 'missing subject_template_id' });
  }

  if (!subject.scope_type || !subject.scope_id) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_SCOPE, message: 'missing scope_type or scope_id' });
  }

  if (!subject.as_of) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_TIME_ANCHOR, message: 'missing as_of' });
  } else if (!ISO_TS.test(subject.as_of)) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_TIME_ANCHOR, message: `as_of is not ISO-8601: ${subject.as_of}` });
  }

  if (!subject.validation_window) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_WINDOW, message: 'missing validation_window' });
  } else {
    const w = validateValidationWindow(subject.validation_window);
    if (!w.valid) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_INVALID_WINDOW,
        message: 'invalid validation_window',
        details: { reasons: w.reasons },
      });
    }
  }

  if (!ALL_MATERIALITY_CLASSES.includes(subject.materiality_class)) {
    issues.push({
      code: L7ObjectViolationCode.SUBJECT_MISSING_MATERIALITY,
      message: `invalid or missing materiality_class: ${subject.materiality_class}`,
    });
  }

  if (!subject.evidence_requirements) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_EVIDENCE_REQUIREMENTS, message: 'missing evidence_requirements' });
  } else {
    const er = subject.evidence_requirements;
    if (er.min_support_surfaces <= 0) {
      issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_EVIDENCE_REQUIREMENTS, message: 'evidence_requirements.min_support_surfaces must be > 0' });
    }
    if (er.min_challenge_surfaces < 0) {
      issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_EVIDENCE_REQUIREMENTS, message: 'evidence_requirements.min_challenge_surfaces must be >= 0' });
    }
    if (!er.evidence_pack_policy) {
      issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_EVIDENCE_REQUIREMENTS, message: 'evidence_requirements.evidence_pack_policy missing' });
    }
  }

  if (!subject.lineage_refs) {
    issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_LINEAGE, message: 'missing lineage_refs' });
  } else {
    if (!subject.lineage_refs.trace_id) {
      issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_LINEAGE, message: 'missing lineage_refs.trace_id' });
    }
    if (!subject.lineage_refs.manifest_id) {
      issues.push({ code: L7ObjectViolationCode.SUBJECT_MISSING_LINEAGE, message: 'missing lineage_refs.manifest_id' });
    }
  }

  if (subject.regime_assumption_profile?.compatibility_mode === 'REQUIRED') {
    if (!subject.regime_assumption_profile.declared) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_REGIME_UNDECLARED,
        message: 'regime compatibility is REQUIRED but profile is not declared',
      });
    } else if (subject.regime_assumption_profile.regime_tags.length === 0) {
      issues.push({
        code: L7ObjectViolationCode.SUBJECT_REGIME_UNDECLARED,
        message: 'regime compatibility REQUIRED but regime_tags is empty',
      });
    }
  }

  const kindReport = validateSubjectKind(subject);
  for (const k of kindReport.issues) {
    issues.push(kindIssueToContractIssue(k));
  }

  return { valid: issues.length === 0, issues };
}

function kindIssueToContractIssue(
  k: ValidationSubjectKindIssue,
): ValidationSubjectContractIssue {
  return { code: k.code, message: k.message, details: k.details };
}
