/**
 * L10.2 — HypothesisSupportSet Validator §10.2.8.4
 */

import { L10HypothesisSupportSet } from '../contracts/hypothesis-support-set';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export function validateL10HypothesisSupportSet(
  s: L10HypothesisSupportSet,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!s.support_set_id) {
    issues.push({ code: L10ObjectViolationCode.SUPPORT_MISSING_ID, message: 'support_set_id required' });
  }
  if (!s.hypothesis_candidate_id) {
    issues.push({ code: L10ObjectViolationCode.SUPPORT_MISSING_CANDIDATE, message: 'hypothesis_candidate_id required' });
  }
  if (
    (s.support_strength_score > 0 || s.support_coverage_score > 0) &&
    s.supporting_refs.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_CLAIMED_WITHOUT_REFS,
      message: 'support claimed but supporting_refs is empty',
    });
  }
  if (s.support_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_MISSING_DOMAINS,
      message: 'support_domains must not be empty',
    });
  }
  if (!inRange01(s.support_strength_score)) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_STRENGTH_OUT_OF_RANGE,
      message: `support_strength_score=${s.support_strength_score} out of [0,1]`,
    });
  }
  if (!inRange01(s.support_coverage_score)) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_COVERAGE_OUT_OF_RANGE,
      message: `support_coverage_score=${s.support_coverage_score} out of [0,1]`,
    });
  }
  if (!s.lineage_refs || s.lineage_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_MISSING_LINEAGE,
      message: 'lineage_refs must not be empty',
    });
  }
  // Hidden staleness: supporting_refs but nothing flagged stale/degraded
  // AND coverage < 0.5, meaning something is missing but the object is
  // silent about it.
  if (
    s.supporting_refs.length > 0 &&
    s.support_coverage_score < 0.5 &&
    s.stale_support_refs.length === 0 &&
    s.degraded_support_refs.length === 0 &&
    s.missing_expected_support_refs.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.SUPPORT_HIDDEN_STALENESS,
      message:
        'low coverage with no stale/degraded/missing support declared — hidden staleness',
    });
  }

  return { valid: issues.length === 0, issues };
}
