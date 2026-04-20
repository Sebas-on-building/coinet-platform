/**
 * L10.2 — HypothesisConfirmationSet Validator §10.2.10.4
 */

import { L10HypothesisConfirmationSet } from '../contracts/hypothesis-confirmation-set';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export function validateL10HypothesisConfirmationSet(
  c: L10HypothesisConfirmationSet,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!c.confirmation_set_id) {
    issues.push({ code: L10ObjectViolationCode.CONFIRMATION_MISSING_ID, message: 'confirmation_set_id required' });
  }
  if (!c.hypothesis_candidate_id) {
    issues.push({ code: L10ObjectViolationCode.CONFIRMATION_MISSING_CANDIDATE, message: 'hypothesis_candidate_id required' });
  }
  if (c.required_confirmation_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONFIRMATION_REQUIRED_NOT_SURFACED,
      message: 'required_confirmation_refs must be explicitly surfaced',
    });
  }
  const sumCovered = c.present_confirmation_refs.length + c.missing_confirmation_refs.length;
  if (c.required_confirmation_refs.length > 0 && sumCovered === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONFIRMATION_PRESENT_MISSING_NOT_SEPARATED,
      message: 'required confirmations exist but present/missing not classified',
    });
  }
  if (!inRange01(c.confirmation_gap_score)) {
    issues.push({
      code: L10ObjectViolationCode.CONFIRMATION_GAP_OUT_OF_RANGE,
      message: `confirmation_gap_score=${c.confirmation_gap_score} out of [0,1]`,
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONFIRMATION_MISSING_LINEAGE,
      message: 'lineage_refs must not be empty',
    });
  }

  return { valid: issues.length === 0, issues };
}
