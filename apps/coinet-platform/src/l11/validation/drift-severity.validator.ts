/**
 * L11.7 — Drift severity validator (§11.7.6)
 */

import {
  L11DriftSeverity,
  ALL_L11_DRIFT_SEVERITIES,
} from '../contracts/drift-severity';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export function validateL11DriftSeverity(
  severity: L11DriftSeverity | undefined,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  if (!severity) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_SEVERITY_MISSING,
      'drift_severity missing'));
    return issues;
  }
  if (!ALL_L11_DRIFT_SEVERITIES.includes(severity)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_DRIFT_SEVERITY_UNKNOWN,
      `drift_severity ${severity} is not a registered enum value`));
  }
  return issues;
}
