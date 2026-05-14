/**
 * L13.4 — Grounded Output Envelope Contract
 *
 * §13.4.15 — Optional but recommended bridge between L13.4 and the
 * L13.6 runtime. Carries refs to every grounding artifact and the
 * final emit/rewrite/block decision.
 */

import type { L13GroundingReadinessClass } from './claim-grounding';

export interface L13GroundedOutputEnvelope {
  readonly grounded_output_id: string;

  readonly output_id: string;
  readonly input_package_id: string;

  readonly claim_extraction_result_ref: string;
  readonly claim_grounding_result_ref: string;
  readonly no_invention_gate_result_ref: string;
  readonly citation_pack_ref: string;

  readonly grounding_readiness_class: L13GroundingReadinessClass;

  readonly allowed_to_emit: boolean;
  readonly rewrite_required: boolean;
  readonly block_required: boolean;

  readonly final_output_ref?: string;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
