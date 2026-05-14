/**
 * L13.4 — Claim Extraction Validator
 *
 * §13.4.16 — Validates the extraction result: replay hash present,
 * extracted claims well-formed, no silent drops.
 */

import {
  L13ClaimExtractionCompletenessClass,
  type L13ClaimExtractionResult,
  type L13ExtractedClaim,
} from '../contracts/claim-extraction';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13GroundingViolationCode } from './l13-grounding-violation-codes';
import {
  l13GroundingResult,
  type L13GroundingIssue,
  type L13GroundingValidationResult,
} from './_l13-grounding-issue';

const SEV = L13ViolationSeverity;

function missing(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '')
  );
}

function validateExtractedClaim(
  c: L13ExtractedClaim,
): readonly L13GroundingIssue[] {
  const issues: L13GroundingIssue[] = [];
  if (missing(c.extracted_claim_id))
    issues.push({
      code: L13GroundingViolationCode.L13G_CLAIM_ID_MISSING,
      severity: SEV.CRITICAL,
      message: 'extracted_claim_id missing',
    });
  if (missing(c.output_id))
    issues.push({
      code: L13GroundingViolationCode.L13G_OUTPUT_REF_MISSING,
      severity: SEV.CRITICAL,
      message: 'output_id missing',
      subject_ref: c.extracted_claim_id,
    });
  if (missing(c.section_ref))
    issues.push({
      code: L13GroundingViolationCode.L13G_SECTION_REF_MISSING,
      severity: SEV.ERROR,
      message: 'section_ref missing',
      subject_ref: c.extracted_claim_id,
    });
  if (missing(c.raw_text))
    issues.push({
      code: L13GroundingViolationCode.L13G_CLAIM_TEXT_MISSING,
      severity: SEV.CRITICAL,
      message: 'raw_text missing',
      subject_ref: c.extracted_claim_id,
    });
  if (missing(c.detected_claim_type))
    issues.push({
      code: L13GroundingViolationCode.L13G_CLAIM_TYPE_MISSING,
      severity: SEV.CRITICAL,
      message: 'detected_claim_type missing',
      subject_ref: c.extracted_claim_id,
    });
  return issues;
}

export function validateL13ClaimExtractionResult(
  result: L13ClaimExtractionResult,
): L13GroundingValidationResult {
  const issues: L13GroundingIssue[] = [];

  if (missing(result.extraction_result_id))
    issues.push({
      code: L13GroundingViolationCode.L13G_CLAIM_ID_MISSING,
      severity: SEV.CRITICAL,
      message: 'extraction_result_id missing',
    });
  if (missing(result.output_id))
    issues.push({
      code: L13GroundingViolationCode.L13G_OUTPUT_REF_MISSING,
      severity: SEV.CRITICAL,
      message: 'output_id missing',
    });
  if (missing(result.replay_hash))
    issues.push({
      code: L13GroundingViolationCode.L13G_EXTRACTION_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'extraction replay_hash missing',
    });

  if (
    result.extraction_completeness_class ===
    L13ClaimExtractionCompletenessClass.BLOCKED_EXTRACTION_FAILURE
  ) {
    issues.push({
      code: L13GroundingViolationCode.L13G_EXTRACTION_DROPPED_MATERIAL_CLAIM,
      severity: SEV.CRITICAL,
      message: 'extractor returned zero claims (extraction failure)',
    });
  }

  for (const c of result.extracted_claims) {
    issues.push(...validateExtractedClaim(c));
  }

  return l13GroundingResult(issues);
}
