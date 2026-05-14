/**
 * L13.4 — Contradiction Match Validator
 *
 * §13.4.16 — Verifies contradiction match decisions are well-formed
 * and that contradiction refs come from the input package.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13ClaimContradictionEffect,
  type L13ContradictionMatch,
} from '../contracts/contradiction-match';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { buildL13PackageRefIndex } from '../grounding/_package-refs';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

export function validateL13ContradictionMatch(
  match: L13ContradictionMatch,
  pkg: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (!match.contradiction_match_id || !match.claim_ref) {
    issues.push({
      code: L13GroundingViolationCode.L13G_CONTRADICTION_MATCH_INVALID,
      severity: SEV.ERROR,
      message: 'contradiction match missing id or claim_ref',
    });
  }

  const index = buildL13PackageRefIndex(pkg);
  for (const r of match.matched_contradiction_refs) {
    if (!index.all_refs.has(r)) {
      issues.push({
        code: L13GroundingViolationCode.L13G_CONTRADICTION_REF_NOT_IN_PACKAGE,
        severity: SEV.ERROR,
        message: `contradiction ref "${r}" not in input package`,
        subject_ref: match.contradiction_match_id,
      });
    }
  }

  // blocks_claim → effect BLOCKS_CLAIM consistency.
  if (
    match.blocks_claim &&
    match.contradiction_effect !==
      L13ClaimContradictionEffect.BLOCKS_CLAIM
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_CONTRADICTION_MATCH_INVALID,
      severity: SEV.ERROR,
      message: 'blocks_claim=true but effect is not BLOCKS_CLAIM',
      subject_ref: match.contradiction_match_id,
    });
  }
  if (
    match.contradiction_effect ===
      L13ClaimContradictionEffect.BLOCKS_CLAIM &&
    !match.blocks_claim
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_CONTRADICTION_MATCH_INVALID,
      severity: SEV.ERROR,
      message: 'effect BLOCKS_CLAIM requires blocks_claim=true',
      subject_ref: match.contradiction_match_id,
    });
  }

  return l13GroundingResult(issues);
}

export function validateL13ContradictionMatches(
  matches: readonly L13ContradictionMatch[],
  pkg: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];
  for (const m of matches) {
    issues.push(...validateL13ContradictionMatch(m, pkg).issues);
  }
  return l13GroundingResult(issues);
}
