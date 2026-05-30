/**
 * L13.10 — Shared persistence/feedback validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13PersistenceFeedbackViolationCode } from './l13-persistence-feedback-violation-codes';

export interface L13PersistenceFeedbackIssue {
  readonly code: L13PersistenceFeedbackViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
}

export interface L13PersistenceFeedbackValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13PersistenceFeedbackIssue[];
}

export function l13PersistenceResult(
  issues: readonly L13PersistenceFeedbackIssue[],
): L13PersistenceFeedbackValidationResult {
  return { clean: issues.length === 0, issues };
}
