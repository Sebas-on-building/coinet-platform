/**
 * L13.4 — Claim Grounding Result Validator
 *
 * §13.4.16 — Validates the consolidated grounding result.
 */

import {
  isL13BlockedGroundingReadiness,
  L13GroundingReadinessClass,
  type L13ClaimGroundingResult,
} from '../contracts/claim-grounding';
import { L13ClaimGroundingClass } from '../contracts/grounded-claim';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

export function validateL13ClaimGroundingResult(
  result: L13ClaimGroundingResult,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (!result.grounding_result_id || !result.replay_hash) {
    issues.push({
      code: L13GroundingViolationCode.L13G_GROUNDING_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      message: 'grounding result missing id or replay_hash',
    });
  }
  if (!result.output_id) {
    issues.push({
      code: L13GroundingViolationCode.L13G_OUTPUT_REF_MISSING,
      severity: SEV.CRITICAL,
      message: 'grounding result missing output_id',
    });
  }
  if (!result.input_package_id) {
    issues.push({
      code: L13GroundingViolationCode.L13G_INPUT_PACKAGE_REF_MISSING,
      severity: SEV.CRITICAL,
      message: 'grounding result missing input_package_id',
    });
  }

  // Any allowed claim that is in a blocked grounding class is illegal.
  for (const c of result.grounded_claims) {
    if (
      c.allowed_to_emit &&
      (c.grounding_class === L13ClaimGroundingClass.UNSUPPORTED_BLOCKED ||
        c.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED)
    ) {
      const code =
        c.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED
          ? L13GroundingViolationCode.L13G_CONTRADICTED_CLAIM_EMITTED
          : L13GroundingViolationCode.L13G_UNSUPPORTED_CLAIM_EMITTED;
      issues.push({
        code,
        severity: SEV.CRITICAL,
        subject_ref: result.grounding_result_id,
        message: `claim ${c.claim_id} emitted while grounding_class=${c.grounding_class}`,
      });
    }
  }

  // Readiness must match issue state.
  const hasBlockedUnsupported = result.grounded_claims.some(
    c => c.grounding_class === L13ClaimGroundingClass.UNSUPPORTED_BLOCKED,
  );
  const hasBlockedContradicted = result.grounded_claims.some(
    c => c.grounding_class === L13ClaimGroundingClass.CONTRADICTED_BLOCKED,
  );

  if (
    hasBlockedContradicted &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_REWRITE_REQUIRED
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_GROUNDING_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      subject_ref: result.grounding_result_id,
      message:
        'readiness class does not reflect presence of contradicted claims',
    });
  }
  if (
    hasBlockedUnsupported &&
    !isL13BlockedGroundingReadiness(result.grounding_readiness_class) &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_REWRITE_REQUIRED &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_REFUSAL_REQUIRED
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_GROUNDING_READINESS_ILLEGAL,
      severity: SEV.CRITICAL,
      subject_ref: result.grounding_result_id,
      message:
        'readiness class does not reflect presence of unsupported claims',
    });
  }

  if (
    result.all_emitted_claims_grounded === false &&
    !isL13BlockedGroundingReadiness(result.grounding_readiness_class) &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_REWRITE_REQUIRED &&
    result.grounding_readiness_class !==
      L13GroundingReadinessClass.GROUNDING_REFUSAL_REQUIRED
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
      severity: SEV.CRITICAL,
      subject_ref: result.grounding_result_id,
      message:
        'all_emitted_claims_grounded=false but readiness allows emission',
    });
  }

  // Rewrite refs marked but claims do not carry rewrite_required.
  const rewriteSet = new Set(result.rewrite_required_claim_refs);
  for (const c of result.grounded_claims) {
    if (rewriteSet.has(c.claim_id) && !c.rewrite_required) {
      issues.push({
        code: L13GroundingViolationCode.L13G_REWRITE_REQUIRED_BUT_NOT_MARKED,
        severity: SEV.ERROR,
        subject_ref: c.claim_id,
        message:
          'claim listed in rewrite_required_claim_refs but rewrite_required=false',
      });
    }
  }

  return l13GroundingResult(issues);
}
