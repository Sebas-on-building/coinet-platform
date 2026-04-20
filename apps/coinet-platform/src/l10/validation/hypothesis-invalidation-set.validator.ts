/**
 * L10.2 — HypothesisInvalidationSet Validator §10.2.11.4
 */

import { L10HypothesisInvalidationSet } from '../contracts/hypothesis-invalidation-set';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export function validateL10HypothesisInvalidationSet(
  v: L10HypothesisInvalidationSet,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!v.invalidation_set_id) {
    issues.push({ code: L10ObjectViolationCode.INVALIDATION_MISSING_ID, message: 'invalidation_set_id required' });
  }
  if (!v.hypothesis_candidate_id) {
    issues.push({ code: L10ObjectViolationCode.INVALIDATION_MISSING_CANDIDATE, message: 'hypothesis_candidate_id required' });
  }
  if (v.invalidation_risk_score > 0 && v.invalidation_signal_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.INVALIDATION_RISK_CLAIMED_WITHOUT_REFS,
      message: 'invalidation risk > 0 but invalidation_signal_refs empty',
    });
  }
  if (
    v.invalidation_signal_refs.length > 0 &&
    v.active_invalidation_refs.length === 0 &&
    v.potential_invalidation_refs.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.INVALIDATION_ACTIVE_POTENTIAL_NOT_SEPARATED,
      message: 'invalidation signals present but neither active nor potential is classified',
    });
  }
  if (!inRange01(v.invalidation_risk_score)) {
    issues.push({
      code: L10ObjectViolationCode.INVALIDATION_RISK_OUT_OF_RANGE,
      message: `invalidation_risk_score=${v.invalidation_risk_score} out of [0,1]`,
    });
  }
  if (!v.lineage_refs || v.lineage_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.INVALIDATION_MISSING_LINEAGE,
      message: 'lineage_refs must not be empty',
    });
  }

  return { valid: issues.length === 0, issues };
}
