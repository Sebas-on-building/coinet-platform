/**
 * L13.9 — Final Safety Gate Result Contract
 *
 * §13.9.18 / §13.9.20 — The compliance gate output that the L13.6
 * final output gate must consume before authorizing user emission.
 */

import type {
  L13SafetyEmissionDecision,
} from './safety-action';
import type { L13SafetyReasonCode } from './safety-reason-code';

export interface L13FinalSafetyGateResult {
  readonly safety_gate_result_id: string;

  readonly output_id: string;
  readonly styled_response_ref: string;
  readonly safety_classification_ref: string;
  readonly non_recommendation_assessment_ref: string;
  readonly rewrite_result_ref?: string;

  readonly safety_emission_decision: L13SafetyEmissionDecision;
  readonly may_continue_to_l13_6_final_gate: boolean;

  readonly refusal_required: boolean;
  readonly block_required: boolean;
  readonly rewrite_required: boolean;

  readonly blocked_reason_codes: readonly L13SafetyReasonCode[];
  readonly refusal_reason_codes: readonly L13SafetyReasonCode[];

  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
