/**
 * L13.2 — Contradiction Preservation Validator
 *
 * §13.2.14 — Material contradictions must survive every package
 * stage. Dropped material contradictions are CRITICAL.
 */

import type { L13ContradictionPreservationResult } from '../context/contradiction-preservation-engine';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13ContradictionPreservation(
  result: L13ContradictionPreservationResult,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const ref of result.dropped_contradiction_refs) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_CONTRADICTION_DROPPED_BEFORE_POSITIVE,
      severity: L13ViolationSeverity.CRITICAL,
      subject_ref: ref,
      message: `material contradiction "${ref}" dropped during compression`,
    });
  }

  if (
    !result.all_material_contradictions_preserved &&
    result.preservation_failures.length === 0
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_ACTIVE_CONTRADICTION_OMITTED,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'preservation flag is false but no failure reasons emitted',
    });
  }

  return l13PackageResult(issues);
}
