/**
 * L13.4 — Evidence Match Validator
 *
 * §13.4.16 — Verifies evidence match decisions are well-formed and
 * stay within the input package.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import {
  L13EvidenceMatchStrength,
  type L13EvidenceMatch,
} from '../contracts/evidence-match';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { buildL13PackageRefIndex } from '../grounding/_package-refs';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

export function validateL13EvidenceMatch(
  match: L13EvidenceMatch,
  pkg: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (!match.evidence_match_id || !match.claim_ref) {
    issues.push({
      code: L13GroundingViolationCode.L13G_EVIDENCE_MATCH_INVALID,
      severity: SEV.ERROR,
      message: 'evidence match missing id or claim_ref',
      subject_ref: match.evidence_match_id,
    });
  }

  const index = buildL13PackageRefIndex(pkg);
  for (const r of match.matched_evidence_refs) {
    if (!index.all_refs.has(r)) {
      issues.push({
        code: L13GroundingViolationCode.L13G_EVIDENCE_REF_NOT_IN_PACKAGE,
        severity: SEV.ERROR,
        message: `evidence ref "${r}" not in input package`,
        subject_ref: match.evidence_match_id,
      });
    }
  }

  if (
    match.match_strength === L13EvidenceMatchStrength.NO_MATCH &&
    match.matched_evidence_refs.length > 0
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_EVIDENCE_MATCH_INVALID,
      severity: SEV.ERROR,
      message: 'NO_MATCH strength but matched_evidence_refs is non-empty',
      subject_ref: match.evidence_match_id,
    });
  }

  return l13GroundingResult(issues);
}

export function validateL13EvidenceMatches(
  matches: readonly L13EvidenceMatch[],
  pkg: L13AIInputPackage,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];
  for (const m of matches) {
    issues.push(...validateL13EvidenceMatch(m, pkg).issues);
  }
  return l13GroundingResult(issues);
}
