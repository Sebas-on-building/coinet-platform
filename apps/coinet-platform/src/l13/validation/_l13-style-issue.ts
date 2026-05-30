/**
 * L13.8 — Shared style validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13StyleViolationCode } from './l13-style-violation-codes';

export interface L13StyleIssue {
  readonly code: L13StyleViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13StyleValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13StyleIssue[];
}

export function l13StyleResult(
  issues: readonly L13StyleIssue[],
): L13StyleValidationResult {
  return { clean: issues.length === 0, issues };
}
