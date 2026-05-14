/**
 * L13.3 — Shared output validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13OutputViolationCode } from './l13-output-violation-codes';

export interface L13OutputIssue {
  readonly code: L13OutputViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13OutputValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13OutputIssue[];
}

export function l13OutputResult(
  issues: readonly L13OutputIssue[],
): L13OutputValidationResult {
  return { clean: issues.length === 0, issues };
}
