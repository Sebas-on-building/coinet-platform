/**
 * L13.4 — Evidence Match Contract
 *
 * §13.4.9 — The evidence matcher maps every extracted claim to
 * evidence refs that already exist inside the L13.2 input package.
 * Semantic matching may not override contradiction; weak matches
 * may not support strong claims; no match blocks the claim.
 */

import type { L13DependencyLayer } from './l13-constitutional-types';

/**
 * §13.4.9.3 — Match strength classes.
 */
export enum L13EvidenceMatchStrength {
  DIRECT_MATCH = 'DIRECT_MATCH',
  STRONG_SEMANTIC_MATCH = 'STRONG_SEMANTIC_MATCH',
  WEAK_SEMANTIC_MATCH = 'WEAK_SEMANTIC_MATCH',
  NO_MATCH = 'NO_MATCH',
}

export const ALL_L13_EVIDENCE_MATCH_STRENGTHS:
  readonly L13EvidenceMatchStrength[] =
  Object.values(L13EvidenceMatchStrength);

/**
 * §13.4.9 — Reason codes attached to an evidence match decision.
 */
export enum L13EvidenceMatchReasonCode {
  DIRECT_REF_FOUND = 'DIRECT_REF_FOUND',
  SCENARIO_REF_FOUND = 'SCENARIO_REF_FOUND',
  SCORE_REF_FOUND = 'SCORE_REF_FOUND',
  HYPOTHESIS_REF_FOUND = 'HYPOTHESIS_REF_FOUND',
  REGIME_REF_FOUND = 'REGIME_REF_FOUND',
  SEQUENCE_REF_FOUND = 'SEQUENCE_REF_FOUND',
  VALIDATION_REF_FOUND = 'VALIDATION_REF_FOUND',
  EVIDENCE_DIGEST_FOUND = 'EVIDENCE_DIGEST_FOUND',
  SEMANTIC_KEYWORD_MATCH = 'SEMANTIC_KEYWORD_MATCH',
  NO_REF_IN_PACKAGE = 'NO_REF_IN_PACKAGE',
  REF_NOT_GOVERNED = 'REF_NOT_GOVERNED',
  REQUIRED_REF_MISSING = 'REQUIRED_REF_MISSING',
}

/**
 * §13.4.9.2 — Evidence match decision for a single claim.
 */
export interface L13EvidenceMatch {
  readonly evidence_match_id: string;

  readonly claim_ref: string;

  readonly matched_evidence_refs: readonly string[];
  readonly matched_source_layer_refs: readonly L13DependencyLayer[];
  readonly matched_surface_refs: readonly string[];

  readonly match_strength: L13EvidenceMatchStrength;
  readonly match_reason_codes: readonly L13EvidenceMatchReasonCode[];

  readonly missing_required_evidence: boolean;

  readonly policy_version: string;
}
