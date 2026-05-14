/**
 * L13.3 — Blocked Claim Contract
 *
 * §13.3.8 — Any illegal AI claim that was removed or rewritten must
 * be recorded so invisible rewrites are auditable.
 *
 * Note: this enum is distinct from the L13.2
 * `L13BlockedClaimType` (which classifies *categories the AI may
 * never claim*). The L13.3 type classifies *the reason an actual
 * claim was blocked or rewritten*. The two namespaces are
 * intentionally separate.
 */

/**
 * §13.3.8 — Reason classifications for a blocked-claim record.
 */
export enum L13OutputBlockedClaimType {
  UNSUPPORTED_CLAIM = 'UNSUPPORTED_CLAIM',
  CONTRADICTED_CLAIM = 'CONTRADICTED_CLAIM',
  RECOMMENDATION_LEAK = 'RECOMMENDATION_LEAK',
  PREDICTION_THEATER = 'PREDICTION_THEATER',
  FINAL_JUDGMENT_LEAK = 'FINAL_JUDGMENT_LEAK',
  SCORE_AS_ADVICE = 'SCORE_AS_ADVICE',
  SCENARIO_AS_CERTAINTY = 'SCENARIO_AS_CERTAINTY',
  CONFIDENCE_AS_PROBABILITY = 'CONFIDENCE_AS_PROBABILITY',
  OBSERVATION_INFERENCE_MIX = 'OBSERVATION_INFERENCE_MIX',
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  USER_INTENT_MISMATCH = 'USER_INTENT_MISMATCH',
}

export const ALL_L13_OUTPUT_BLOCKED_CLAIM_TYPES:
  readonly L13OutputBlockedClaimType[] =
  Object.values(L13OutputBlockedClaimType);

/**
 * §13.3.13 — Validator that emitted a block decision. Used as the
 * `source_validator` of every blocked-claim record.
 */
export enum L13OutputValidatorClass {
  AI_OUTPUT_VALIDATOR = 'AI_OUTPUT_VALIDATOR',
  OUTPUT_SECTION_VALIDATOR = 'OUTPUT_SECTION_VALIDATOR',
  CONFIDENCE_DISCLOSURE_VALIDATOR = 'CONFIDENCE_DISCLOSURE_VALIDATOR',
  RESTRICTION_DISCLOSURE_VALIDATOR = 'RESTRICTION_DISCLOSURE_VALIDATOR',
  SEMANTIC_LEAKAGE_VALIDATOR = 'SEMANTIC_LEAKAGE_VALIDATOR',
  OUTPUT_READINESS_VALIDATOR = 'OUTPUT_READINESS_VALIDATOR',
  MODEL_METADATA_VALIDATOR = 'MODEL_METADATA_VALIDATOR',
  BLOCKED_CLAIM_VALIDATOR = 'BLOCKED_CLAIM_VALIDATOR',
}

export const ALL_L13_OUTPUT_VALIDATOR_CLASSES:
  readonly L13OutputValidatorClass[] =
  Object.values(L13OutputValidatorClass);

export interface L13BlockedClaim {
  readonly blocked_claim_id: string;

  readonly output_id: string;

  readonly proposed_claim_text: string;
  readonly blocked_claim_type: L13OutputBlockedClaimType;

  readonly block_reason_code: string;

  readonly source_validator: L13OutputValidatorClass;

  readonly replacement_text?: string;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
