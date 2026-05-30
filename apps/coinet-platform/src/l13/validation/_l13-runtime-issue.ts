/**
 * L13.6 — Shared runtime validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13RuntimeViolationCode } from './l13-runtime-violation-codes';

export interface L13RuntimeIssue {
  readonly code: L13RuntimeViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13RuntimeValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13RuntimeIssue[];
}

export function l13RuntimeResult(
  issues: readonly L13RuntimeIssue[],
): L13RuntimeValidationResult {
  return { clean: issues.length === 0, issues };
}
