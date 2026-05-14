/**
 * L13.3 — Blocked Claim Validator
 *
 * §13.3.8 — Every blocked-claim record must be well-formed: proposed
 * text, blocked type, reason code, source validator, lineage.
 * Recommendation/prediction/trade-action leaks are CRITICAL.
 */

import type { L13BlockedClaim } from '../contracts/blocked-claim';
import {
  ALL_L13_OUTPUT_VALIDATOR_CLASSES,
  L13OutputBlockedClaimType,
} from '../contracts/blocked-claim';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';

const SEV = L13ViolationSeverity;

const CRITICAL_BLOCKED_TYPES: readonly L13OutputBlockedClaimType[] = [
  L13OutputBlockedClaimType.RECOMMENDATION_LEAK,
  L13OutputBlockedClaimType.PREDICTION_THEATER,
  L13OutputBlockedClaimType.FINAL_JUDGMENT_LEAK,
  L13OutputBlockedClaimType.RESTRICTION_BYPASS,
  L13OutputBlockedClaimType.OBSERVATION_INFERENCE_MIX,
];

export function validateL13BlockedClaim(
  claim: L13BlockedClaim,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  if (
    !claim.blocked_claim_id ||
    !claim.output_id ||
    !claim.proposed_claim_text ||
    !claim.block_reason_code
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
      severity: SEV.ERROR,
      message:
        'blocked claim missing id, output_id, proposed text, or reason code',
      subject_ref: claim.blocked_claim_id,
    });
  }

  if (!ALL_L13_OUTPUT_VALIDATOR_CLASSES.includes(claim.source_validator)) {
    issues.push({
      code: L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
      severity: SEV.ERROR,
      message: `source_validator "${claim.source_validator}" not registered`,
      subject_ref: claim.blocked_claim_id,
    });
  }

  if (claim.lineage_refs.length === 0) {
    issues.push({
      code: L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
      severity: SEV.ERROR,
      message: 'blocked claim missing lineage_refs',
      subject_ref: claim.blocked_claim_id,
    });
  }

  if (CRITICAL_BLOCKED_TYPES.includes(claim.blocked_claim_type)) {
    // A critical block must have a replacement OR be a hard refusal.
    if (
      !claim.replacement_text &&
      claim.blocked_claim_type !==
        L13OutputBlockedClaimType.RESTRICTION_BYPASS
    ) {
      issues.push({
        code: L13OutputViolationCode.L13O_BLOCKED_CLAIM_INVALID,
        severity: SEV.WARNING,
        message: `critical blocked claim (${claim.blocked_claim_type}) lacks replacement_text`,
        subject_ref: claim.blocked_claim_id,
      });
    }
  }

  return l13OutputResult(issues);
}

export function validateL13BlockedClaims(
  claims: readonly L13BlockedClaim[],
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];
  for (const c of claims) {
    issues.push(...validateL13BlockedClaim(c).issues);
  }
  return l13OutputResult(issues);
}
