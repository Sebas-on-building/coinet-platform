/**
 * L13.7 — Shared mode validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13ModeViolationCode } from './l13-mode-violation-codes';

export interface L13ModeIssue {
  readonly code: L13ModeViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13ModeValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13ModeIssue[];
}

export function l13ModeResult(
  issues: readonly L13ModeIssue[],
): L13ModeValidationResult {
  return { clean: issues.length === 0, issues };
}
