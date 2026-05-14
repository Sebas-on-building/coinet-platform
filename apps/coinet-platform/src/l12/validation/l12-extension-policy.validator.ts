/**
 * L12.7 — Extension Policy Validator (§12.7.10, §12.7.15)
 *
 * Validates `L12ExtensionAssessment` objects produced by the
 * extension classifier. Never grants admission to PROHIBITED, never
 * weakens trigger / invalidation / no-rebuild law.
 */

import {
  L12ExtensionAssessment,
  L12ExtensionClassification,
} from '../contracts/l12-extension-policy';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12ExtensionAssessment(
  a: L12ExtensionAssessment,
): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const ref = a?.extension_request_id;
  if (!a) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_EXTENSION_UNCLASSIFIED,
      'extension assessment null'));
    return issues;
  }
  if (!a.final_classification) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_EXTENSION_UNCLASSIFIED,
      'final_classification missing', ref));
  }
  if (a.final_classification === L12ExtensionClassification.PROHIBITED) {
    if (a.admitted) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_PROHIBITED_EXTENSION,
        'PROHIBITED extension cannot be admitted', ref));
    } else {
      // Always emit an audit trail for prohibited rejections.
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_PROHIBITED_EXTENSION,
        'PROHIBITED extension correctly rejected', ref));
    }
  }
  if (a.final_classification === L12ExtensionClassification.MIGRATION_REQUIRED
      && !a.migration_required) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_EXTENSION_REQUIRES_RECERT,
      'MIGRATION_REQUIRED but migration_required=false', ref));
  }
  if (a.final_classification === L12ExtensionClassification.BREAKING_SEMANTIC
      && !a.replay_backfill_required) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_EXTENSION_REQUIRES_RECERT,
      'BREAKING_SEMANTIC but replay_backfill_required=false', ref));
  }
  if ((a.final_classification === L12ExtensionClassification.RECERTIFICATION_REQUIRED
       || a.final_classification === L12ExtensionClassification.MIGRATION_REQUIRED
       || a.final_classification === L12ExtensionClassification.BREAKING_SEMANTIC)
      && !a.recertification_required) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_EXTENSION_REQUIRES_RECERT,
      `${a.final_classification} but recertification_required=false`, ref));
  }
  // If the request reached the violation list, surface them as issues.
  for (const v of a.violation_codes ?? []) {
    if (v === 'L12F_WEAKENS_TRIGGER_REQUIREMENT') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_WEAKENS_TRIGGER_REQUIREMENT,
        'extension weakens trigger requirement', ref));
    } else if (v === 'L12F_WEAKENS_INVALIDATION_REQUIREMENT') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_WEAKENS_INVALIDATION_REQUIREMENT,
        'extension weakens invalidation requirement', ref));
    } else if (v === 'L12F_WEAKENS_NO_REBUILD_LAW') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_WEAKENS_NO_REBUILD_LAW,
        'extension weakens no-rebuild law', ref));
    } else if (v === 'L12F_PREDICTION_THEATER_BREACH') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
        'extension enables prediction output', ref));
    } else if (v === 'L12F_RECOMMENDATION_LEAK') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_RECOMMENDATION_LEAK,
        'extension enables recommendation output', ref));
    } else if (v === 'L12F_FINAL_JUDGMENT_LEAK') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_FINAL_JUDGMENT_LEAK,
        'extension enables final judgment output', ref));
    } else if (v === 'L12F_L11_SCORE_CONTEXT_LAW_NOT_CERTIFIED') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_L11_SCORE_CONTEXT_LAW_NOT_CERTIFIED,
        'extension removes L11 score context requirement', ref));
    } else if (v === 'L12F_L5_PERSISTENCE_LAW_NOT_CERTIFIED') {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_L5_PERSISTENCE_LAW_NOT_CERTIFIED,
        'extension bypasses L5 persistence', ref));
    }
  }
  return issues;
}
