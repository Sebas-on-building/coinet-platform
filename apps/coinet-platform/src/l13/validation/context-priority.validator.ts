/**
 * L13.2 — Context Priority Validator
 *
 * §13.2.12 — Validates that priority decisions follow the canonical
 * ordering and that must-preserve classes are flagged
 * preserve_required.
 */

import {
  getL13ContextPriorityRank,
  isL13MustPreserveContextClass,
  type L13ContextPriorityDecision,
} from '../contracts/context-priority';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13ContextPriorityDecisions(
  decisions: readonly L13ContextPriorityDecision[],
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const d of decisions) {
    const expectedRank = getL13ContextPriorityRank(d.context_class);
    if (d.priority_rank !== expectedRank) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_CONTEXT_PRIORITY_VIOLATED,
        severity: L13ViolationSeverity.ERROR,
        subject_ref: d.context_ref,
        message: `priority rank ${d.priority_rank} does not match canonical rank ${expectedRank} for ${d.context_class}`,
      });
    }
    if (isL13MustPreserveContextClass(d.context_class) && !d.preserve_required) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_REQUIRED_CONTEXT_DROPPED,
        severity: L13ViolationSeverity.CRITICAL,
        subject_ref: d.context_ref,
        message: `must-preserve class ${d.context_class} flagged dropping_allowed`,
      });
    }
    if (
      isL13MustPreserveContextClass(d.context_class) &&
      d.dropping_allowed
    ) {
      issues.push({
        code: L13InputPackageViolationCode.L13P_REQUIRED_CONTEXT_DROPPED,
        severity: L13ViolationSeverity.CRITICAL,
        subject_ref: d.context_ref,
        message: `must-preserve class ${d.context_class} flagged dropping_allowed`,
      });
    }
  }

  return l13PackageResult(issues);
}
