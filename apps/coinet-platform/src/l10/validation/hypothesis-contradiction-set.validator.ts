/**
 * L10.2 — HypothesisContradictionSet Validator §10.2.9.4
 */

import { L10HypothesisContradictionSet } from '../contracts/hypothesis-contradiction-set';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export function validateL10HypothesisContradictionSet(
  c: L10HypothesisContradictionSet,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!c.contradiction_set_id) {
    issues.push({ code: L10ObjectViolationCode.CONTRADICTION_MISSING_ID, message: 'contradiction_set_id required' });
  }
  if (!c.hypothesis_candidate_id) {
    issues.push({ code: L10ObjectViolationCode.CONTRADICTION_MISSING_CANDIDATE, message: 'hypothesis_candidate_id required' });
  }
  if (c.contradiction_pressure_score > 0 && c.contradiction_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONTRADICTION_CLAIMED_WITHOUT_REFS,
      message: 'contradiction pressure > 0 but contradiction_refs empty',
    });
  }
  if (c.contradiction_refs.length > 0 && c.contradiction_domains.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONTRADICTION_MISSING_DOMAINS,
      message: 'contradiction_refs present but contradiction_domains missing',
    });
  }
  if (!inRange01(c.contradiction_pressure_score)) {
    issues.push({
      code: L10ObjectViolationCode.CONTRADICTION_PRESSURE_OUT_OF_RANGE,
      message: `contradiction_pressure_score=${c.contradiction_pressure_score} out of [0,1]`,
    });
  }
  if (
    c.contradiction_refs.length > 0 &&
    c.blocking_contradiction_refs.length === 0 &&
    c.narrowing_contradiction_refs.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.CONTRADICTION_BLOCKING_NOT_SEPARATED,
      message: 'contradiction present but neither blocking nor narrowing is classified',
    });
  }
  if (!c.lineage_refs || c.lineage_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.CONTRADICTION_MISSING_LINEAGE,
      message: 'lineage_refs must not be empty',
    });
  }

  return { valid: issues.length === 0, issues };
}
