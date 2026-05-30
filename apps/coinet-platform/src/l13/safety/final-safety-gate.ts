/**
 * L13.9 — Final Safety Gate
 *
 * §13.9.18 / §13.9.20 — Last compliance gate before L13.6 final
 * output emission. Consumes the L13.8 styled envelope ref, the
 * L13.9 output safety classification, the non-recommendation
 * assessment, and (optionally) the advice-adjacent rewrite result.
 * Emits an `L13FinalSafetyGateResult` whose
 * `may_continue_to_l13_6_final_gate` is the single boolean L13.6
 * keys off.
 */

import {
  L13SafetyAction,
  L13SafetyEmissionDecision,
  l13ActionToEmissionDecision,
  l13IsUserEmittingSafetyDecision,
  l13StrengthenSafetyAction,
} from '../contracts/safety-action';
import { L13SafetyReasonCode } from '../contracts/safety-reason-code';
import type {
  L13FinalSafetyGateResult,
} from '../contracts/final-safety-gate-result';
import type { L13OutputSafetyClassification } from '../contracts/output-safety-classification';
import type { L13NonRecommendationAssessment } from '../contracts/non-recommendation-assessment';
import type { L13AdviceAdjacentRewriteResult } from '../contracts/advice-adjacent-rewrite-result';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

export interface L13FinalSafetyGateInput {
  readonly output_id: string;
  readonly styled_response_ref: string;
  readonly safety_classification: L13OutputSafetyClassification;
  readonly non_recommendation: L13NonRecommendationAssessment;
  readonly rewrite_result?: L13AdviceAdjacentRewriteResult;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

function pickBlockedReasons(
  reasons: readonly L13SafetyReasonCode[],
): readonly L13SafetyReasonCode[] {
  const blocking = new Set<L13SafetyReasonCode>([
    L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
    L13SafetyReasonCode.REASON_DIRECT_HOLD_AVOID_INSTRUCTION,
    L13SafetyReasonCode.REASON_LONG_SHORT_INSTRUCTION,
    L13SafetyReasonCode.REASON_ENTRY_EXIT_INSTRUCTION,
    L13SafetyReasonCode.REASON_LEVERAGE_RECOMMENDATION,
    L13SafetyReasonCode.REASON_POSITION_SIZING_INSTRUCTION,
    L13SafetyReasonCode.REASON_STOP_LOSS_TAKE_PROFIT_INSTRUCTION,
    L13SafetyReasonCode.REASON_LIQUIDATION_TARGET_ADVICE,
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_COORDINATED_PUSH,
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_LOW_LIQUIDITY,
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_NARRATIVE_ENGINEERING,
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_LIQUIDATION_HUNT,
    L13SafetyReasonCode.REASON_MARKET_MANIPULATION_DECEPTIVE_SIGNALING,
  ]);
  return reasons.filter(r => blocking.has(r));
}

function pickRefusalReasons(
  reasons: readonly L13SafetyReasonCode[],
): readonly L13SafetyReasonCode[] {
  const refusal = new Set<L13SafetyReasonCode>([
    L13SafetyReasonCode.REASON_TAX_ADVICE,
    L13SafetyReasonCode.REASON_LEGAL_ADVICE,
    L13SafetyReasonCode.REASON_OUT_OF_SCOPE_REQUEST,
    L13SafetyReasonCode.REASON_DIRECT_BUY_SELL_INSTRUCTION,
    L13SafetyReasonCode.REASON_DIRECT_HOLD_AVOID_INSTRUCTION,
    L13SafetyReasonCode.REASON_LONG_SHORT_INSTRUCTION,
    L13SafetyReasonCode.REASON_ENTRY_EXIT_INSTRUCTION,
    L13SafetyReasonCode.REASON_LEVERAGE_RECOMMENDATION,
    L13SafetyReasonCode.REASON_POSITION_SIZING_INSTRUCTION,
    L13SafetyReasonCode.REASON_STOP_LOSS_TAKE_PROFIT_INSTRUCTION,
    L13SafetyReasonCode.REASON_LIQUIDATION_TARGET_ADVICE,
  ]);
  return reasons.filter(r => refusal.has(r));
}

/**
 * §13.9.18 — Run the final safety gate. Pure function.
 *
 * Precedence (§13.9.21.1):
 *   BLOCK > REFUSAL > REWRITE > ALLOW_WITH_DISCLOSURE > ALLOW
 */
export function runL13FinalSafetyGate(
  input: L13FinalSafetyGateInput,
): L13FinalSafetyGateResult {
  const action = l13StrengthenSafetyAction(
    input.safety_classification.required_action,
    input.non_recommendation.required_action,
  );
  const decision = l13ActionToEmissionDecision(action);

  // If a rewrite has been attempted and failed, escalate to refusal.
  let finalDecision = decision;
  if (input.rewrite_result) {
    if (
      action === L13SafetyAction.REWRITE_REQUIRED &&
      !input.rewrite_result.rewrite_successful
    ) {
      finalDecision = L13SafetyEmissionDecision.SAFETY_REFUSAL_REQUIRED;
    }
    if (
      action === L13SafetyAction.REWRITE_REQUIRED &&
      input.rewrite_result.rewrite_successful
    ) {
      // Successful rewrite still requires revalidation through
      // L13.3..L13.8 — the gate does NOT mark the output as ready
      // to emit; the runtime must re-enter governance.
      finalDecision = L13SafetyEmissionDecision.SAFETY_REWRITE_REQUIRED;
    }
  }

  const mayContinue = l13IsUserEmittingSafetyDecision(finalDecision);

  const refusal_required =
    finalDecision === L13SafetyEmissionDecision.SAFETY_REFUSAL_REQUIRED;
  const block_required =
    finalDecision === L13SafetyEmissionDecision.SAFETY_BLOCK_OUTPUT;
  const rewrite_required =
    finalDecision === L13SafetyEmissionDecision.SAFETY_REWRITE_REQUIRED;

  const blocked_reason_codes = block_required
    ? pickBlockedReasons(input.safety_classification.reason_codes)
    : [];
  const refusal_reason_codes = refusal_required
    ? pickRefusalReasons(input.safety_classification.reason_codes)
    : [];

  const replayHash = fnv1a(
    [
      input.output_id,
      input.styled_response_ref,
      input.safety_classification.safety_classification_id,
      input.non_recommendation.non_recommendation_assessment_id,
      input.rewrite_result?.rewrite_result_id ?? '',
      action,
      finalDecision,
      String(mayContinue),
      String(rewrite_required),
      String(refusal_required),
      String(block_required),
      blocked_reason_codes.slice().sort().join(','),
      refusal_reason_codes.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    safety_gate_result_id: `l13.safety.gate.${replayHash}`,
    output_id: input.output_id,
    styled_response_ref: input.styled_response_ref,
    safety_classification_ref:
      input.safety_classification.safety_classification_id,
    non_recommendation_assessment_ref:
      input.non_recommendation.non_recommendation_assessment_id,
    rewrite_result_ref: input.rewrite_result?.rewrite_result_id,
    safety_emission_decision: finalDecision,
    may_continue_to_l13_6_final_gate: mayContinue,
    refusal_required,
    block_required,
    rewrite_required,
    blocked_reason_codes,
    refusal_reason_codes,
    policy_version: POLICY_V,
    lineage_refs: input.lineage_refs ?? ['l13.safety.lineage'],
    replay_hash: replayHash,
  };
}
