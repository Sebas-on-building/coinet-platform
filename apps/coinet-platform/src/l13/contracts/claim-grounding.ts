/**
 * L13.4 — Claim Grounding Result Contract
 *
 * §13.4.11 — The grounding engine consolidates extraction, evidence
 * match, contradiction match, and no-invention gate into a single
 * deterministic grounding result.
 */

import type { L13AIExplanationOutput } from './ai-output';
import type { L13AIInputPackage } from './ai-input-package';
import type {
  L13ClaimExtractionResult,
} from './claim-extraction';
import type { L13ContradictionMatch } from './contradiction-match';
import type { L13EvidenceMatch } from './evidence-match';
import type { L13GroundedClaim } from './grounded-claim';

/**
 * §13.4.11.3 — Grounding readiness classes.
 */
export enum L13GroundingReadinessClass {
  GROUNDING_CLEAN = 'GROUNDING_CLEAN',
  GROUNDING_CLEAN_WITH_DISCLOSURE = 'GROUNDING_CLEAN_WITH_DISCLOSURE',
  GROUNDING_REWRITE_REQUIRED = 'GROUNDING_REWRITE_REQUIRED',
  GROUNDING_REFUSAL_REQUIRED = 'GROUNDING_REFUSAL_REQUIRED',
  GROUNDING_BLOCKED_UNSUPPORTED = 'GROUNDING_BLOCKED_UNSUPPORTED',
  GROUNDING_BLOCKED_CONTRADICTED = 'GROUNDING_BLOCKED_CONTRADICTED',
}

export const ALL_L13_GROUNDING_READINESS_CLASSES:
  readonly L13GroundingReadinessClass[] =
  Object.values(L13GroundingReadinessClass);

/**
 * Readiness classes that block the output from emitting.
 */
export const L13_BLOCKED_GROUNDING_READINESS_CLASSES:
  readonly L13GroundingReadinessClass[] = [
  L13GroundingReadinessClass.GROUNDING_BLOCKED_UNSUPPORTED,
  L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED,
];

export function isL13BlockedGroundingReadiness(
  cls: L13GroundingReadinessClass,
): boolean {
  return L13_BLOCKED_GROUNDING_READINESS_CLASSES.includes(cls);
}

/**
 * §13.4.11.1 — Inputs to the grounding engine.
 */
export interface L13ClaimGroundingInput {
  readonly output: L13AIExplanationOutput;
  readonly input_package: L13AIInputPackage;
  readonly extraction_result: L13ClaimExtractionResult;
  readonly evidence_matches: readonly L13EvidenceMatch[];
  readonly contradiction_matches: readonly L13ContradictionMatch[];
  readonly policy_version: string;
}

/**
 * §13.4.11.2 — Grounding result.
 */
export interface L13ClaimGroundingResult {
  readonly grounding_result_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly grounded_claims: readonly L13GroundedClaim[];

  readonly blocked_claim_refs: readonly string[];
  readonly rewrite_required_claim_refs: readonly string[];

  readonly all_emitted_claims_grounded: boolean;
  readonly any_contradicted_claim_emitted: boolean;
  readonly any_unsupported_claim_emitted: boolean;

  readonly grounding_readiness_class: L13GroundingReadinessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
