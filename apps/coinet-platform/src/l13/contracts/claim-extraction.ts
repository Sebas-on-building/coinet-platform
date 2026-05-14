/**
 * L13.4 — Claim Extraction Contracts
 *
 * §13.4.8 — The claim extractor decomposes every textual surface of
 * the AI output (headline, summary, sections) into typed claim
 * candidates. The extractor does NOT decide truth; it only proposes
 * claim candidates. Grounding is decided later.
 */

import type { L13DependencyLayer } from './l13-constitutional-types';
import type { L13ClaimType } from './grounded-claim';

/**
 * §13.4.8.2 — Extraction completeness class.
 */
export enum L13ClaimExtractionCompletenessClass {
  COMPLETE_EXTRACTION = 'COMPLETE_EXTRACTION',
  COMPLETE_WITH_WARNINGS = 'COMPLETE_WITH_WARNINGS',
  PARTIAL_EXTRACTION = 'PARTIAL_EXTRACTION',
  BLOCKED_EXTRACTION_FAILURE = 'BLOCKED_EXTRACTION_FAILURE',
}

export const ALL_L13_CLAIM_EXTRACTION_COMPLETENESS_CLASSES:
  readonly L13ClaimExtractionCompletenessClass[] =
  Object.values(L13ClaimExtractionCompletenessClass);

/**
 * §13.4.8.3 — Extracted claim candidate.
 */
export interface L13ExtractedClaim {
  readonly extracted_claim_id: string;

  readonly output_id: string;
  readonly section_ref: string;

  readonly raw_text: string;
  readonly normalized_text: string;

  readonly detected_claim_type: L13ClaimType;
  readonly detected_semantic_markers: readonly string[];

  readonly candidate_source_layers: readonly L13DependencyLayer[];

  readonly requires_evidence: boolean;
  readonly requires_contradiction_check: boolean;
  readonly requires_uncertainty_check: boolean;

  readonly policy_version: string;
}

/**
 * §13.4.8.2 — Extraction result.
 */
export interface L13ClaimExtractionResult {
  readonly extraction_result_id: string;

  readonly output_id: string;

  readonly extracted_claims: readonly L13ExtractedClaim[];

  readonly extraction_warnings: readonly string[];

  readonly extraction_completeness_class:
    L13ClaimExtractionCompletenessClass;

  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
