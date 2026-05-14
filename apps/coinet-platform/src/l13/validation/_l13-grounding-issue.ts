/**
 * L13.4 — Shared grounding validator issue shape.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13GroundingViolationCode } from './l13-grounding-violation-codes';

export interface L13GroundingIssue {
  readonly code: L13GroundingViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13GroundingValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13GroundingIssue[];
}

export function l13GroundingResult(
  issues: readonly L13GroundingIssue[],
): L13GroundingValidationResult {
  return { clean: issues.length === 0, issues };
}
