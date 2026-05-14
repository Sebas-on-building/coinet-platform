/**
 * L13.2 — Context Compression Validator
 *
 * §13.2.13 — Validates a compression result. Any illegal pattern
 * detected by the compression engine emits a CRITICAL violation;
 * dropping required context is also CRITICAL.
 */

import type { L13ContextCompressionResult } from '../contracts/context-compression';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

export function validateL13ContextCompression(
  result: L13ContextCompressionResult,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  for (const pat of result.illegal_patterns_detected) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_ILLEGAL_COMPRESSION,
      severity: L13ViolationSeverity.CRITICAL,
      message: `illegal compression pattern detected: ${pat}`,
      details: { pattern: pat },
    });
  }

  if (
    result.tokens_after > 0 &&
    result.tokens_after > result.tokens_before
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_ILLEGAL_COMPRESSION,
      severity: L13ViolationSeverity.ERROR,
      message: 'compression resulted in MORE tokens than before',
    });
  }

  return l13PackageResult(issues);
}
