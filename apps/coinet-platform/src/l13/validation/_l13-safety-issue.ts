/**
 * L13.9 — Shared safety validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13SafetyViolationCode } from './l13-safety-violation-codes';

export interface L13SafetyIssue {
  readonly code: L13SafetyViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13SafetyValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13SafetyIssue[];
}

export function l13SafetyResult(
  issues: readonly L13SafetyIssue[],
): L13SafetyValidationResult {
  return { clean: issues.length === 0, issues };
}
