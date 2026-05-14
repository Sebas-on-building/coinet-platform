/**
 * L13.2 — Shared validator issue shape.
 *
 * All input-package validators return arrays of these issues; nothing
 * mutates the inputs. Severity mirrors §13.2.19.
 */

import type { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import type { L13InputPackageViolationCode } from './l13-input-package-violation-codes';

export interface L13InputPackageIssue {
  readonly code: L13InputPackageViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly subject_ref?: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L13InputPackageValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L13InputPackageIssue[];
}

export function l13PackageResult(
  issues: readonly L13InputPackageIssue[],
): L13InputPackageValidationResult {
  return { clean: issues.length === 0, issues };
}
