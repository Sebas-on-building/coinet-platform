/**
 * L13.5 — Shared expression-governance validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13ExpressionViolationCode } from './l13-expression-violation-codes';

export interface L13ExpressionIssue {
  readonly code: L13ExpressionViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13ExpressionValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13ExpressionIssue[];
}

export function l13ExpressionResult(
  issues: readonly L13ExpressionIssue[],
): L13ExpressionValidationResult {
  return { clean: issues.length === 0, issues };
}
