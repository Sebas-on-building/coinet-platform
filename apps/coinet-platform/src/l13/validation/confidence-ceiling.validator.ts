/**
 * L13.5 — Confidence Ceiling Validator
 *
 * §13.5.23 — Validates the ceiling result emitted by the ceiling
 * engine. The primary law (§13.5.21): L13 may never raise the
 * inherited confidence band.
 */

import type { L13ConfidenceCeilingResult } from '../restrictions/confidence-ceiling-engine';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { rankL13ExplanationConfidenceBand } from '../contracts/confidence-breakdown';
import { L13ExpressionViolationCode } from './l13-expression-violation-codes';
import {
  l13ExpressionResult,
  type L13ExpressionIssue,
  type L13ExpressionValidationResult,
} from './_l13-expression-issue';

const SEV = L13ViolationSeverity;

export function validateL13ConfidenceCeilingResult(
  result: L13ConfidenceCeilingResult,
): L13ExpressionValidationResult {
  const issues: L13ExpressionIssue[] = [];

  if (
    rankL13ExplanationConfidenceBand(result.confidence_ceiling) >
    rankL13ExplanationConfidenceBand(result.inherited_band)
  ) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_RAISED_ABOVE_INHERITED,
      severity: SEV.CRITICAL,
      message: `confidence_ceiling=${result.confidence_ceiling} exceeds inherited_band=${result.inherited_band}`,
    });
  }

  if (result.reason_codes.length === 0) {
    issues.push({
      code: L13ExpressionViolationCode.L13U_CONFIDENCE_CEILING_MISSING,
      severity: SEV.ERROR,
      message: 'reason_codes empty',
    });
  }

  return l13ExpressionResult(issues);
}
