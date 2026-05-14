/**
 * L13.4 — Contradiction Match Contract
 *
 * §13.4.10 — Every claim must be checked against the input package's
 * contradiction summary, hypothesis contradictions, score
 * contradictions/missing-data/drift, scenario invalidations,
 * confidence caps, and unresolved triggers. Contradiction dominates
 * semantic evidence match.
 */

/**
 * §13.4.10.3 — Effect of contradiction on the claim.
 */
export enum L13ClaimContradictionEffect {
  NO_CONTRADICTION = 'NO_CONTRADICTION',
  DISCLOSURE_REQUIRED = 'DISCLOSURE_REQUIRED',
  NARROWS_CLAIM = 'NARROWS_CLAIM',
  BLOCKS_CLAIM = 'BLOCKS_CLAIM',
}

export const ALL_L13_CLAIM_CONTRADICTION_EFFECTS:
  readonly L13ClaimContradictionEffect[] =
  Object.values(L13ClaimContradictionEffect);

/**
 * Reason codes attached to a contradiction match decision.
 */
export enum L13ContradictionMatchReasonCode {
  ACTIVE_CONTRADICTION_PRESENT = 'ACTIVE_CONTRADICTION_PRESENT',
  ACTIVE_INVALIDATION_PRESENT = 'ACTIVE_INVALIDATION_PRESENT',
  CONFIDENCE_CAP_PRESENT = 'CONFIDENCE_CAP_PRESENT',
  HYPOTHESIS_CONTRADICTION_PRESENT = 'HYPOTHESIS_CONTRADICTION_PRESENT',
  SCORE_DRIFT_PRESENT = 'SCORE_DRIFT_PRESENT',
  UNRESOLVED_TRIGGER_PRESENT = 'UNRESOLVED_TRIGGER_PRESENT',
  MISSING_DATA_PRESENT = 'MISSING_DATA_PRESENT',
  NO_CONTRADICTION_PRESENT = 'NO_CONTRADICTION_PRESENT',
  CLAIM_REJECTED_BY_INVALIDATION = 'CLAIM_REJECTED_BY_INVALIDATION',
  CLAIM_REJECTED_BY_CONTRADICTION_PRESSURE = 'CLAIM_REJECTED_BY_CONTRADICTION_PRESSURE',
}

/**
 * §13.4.10.2 — Contradiction match decision for a single claim.
 */
export interface L13ContradictionMatch {
  readonly contradiction_match_id: string;

  readonly claim_ref: string;

  readonly matched_contradiction_refs: readonly string[];

  readonly contradiction_effect: L13ClaimContradictionEffect;

  readonly contradiction_reason_codes:
    readonly L13ContradictionMatchReasonCode[];

  readonly blocks_claim: boolean;
  readonly requires_uncertainty: boolean;
  readonly requires_rewrite: boolean;

  readonly policy_version: string;
}
