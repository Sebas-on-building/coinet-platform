/**
 * L13.6 — Final Output Gate
 *
 * §13.6.21 — The only legal emitter. Consumes the L13.3 output
 * candidate, the L13.4 grounded-output envelope (or grounding
 * result), the L13.5 expression-governance envelope, and any
 * refusal envelope, and emits an `L13FinalOutputGateResult` with
 * one of EMIT_CLEAN / EMIT_WITH_DISCLOSURE / EMIT_REFUSAL /
 * BLOCK_OUTPUT (§13.6.21.3).
 *
 * Decision precedence (§13.6.27):
 *   BLOCK_OUTPUT > EMIT_REFUSAL > REWRITE > EMIT_WITH_DISCLOSURE
 *   > EMIT_CLEAN
 * (REWRITE is decided upstream; the gate sees only post-rewrite
 * candidates.)
 */

import type { L13AIExplanationOutput } from '../contracts/ai-output';
import type { L13ClaimGroundingResult } from '../contracts/claim-grounding';
import { L13GroundingReadinessClass } from '../contracts/claim-grounding';
import type { L13ExpressionGovernanceEnvelope } from '../contracts/expression-governance-envelope';
import { L13ExpressionReadinessClass } from '../contracts/expression-governance-envelope';
import type { L13RuntimeRefusalEnvelope } from '../contracts/runtime-refusal-envelope';
import {
  L13FinalEmissionDecision,
  isL13UserEmittingDecision,
  type L13FinalOutputGateResult,
} from '../contracts/final-output-gate';
import { L13OutputReadinessClass } from '../contracts/output-readiness';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

export interface L13FinalGateInput {
  readonly request_id: string;
  readonly output_candidate?: L13AIExplanationOutput;
  readonly grounding_result?: L13ClaimGroundingResult;
  readonly expression_envelope?: L13ExpressionGovernanceEnvelope;
  readonly refusal_envelope?: L13RuntimeRefusalEnvelope;
  readonly refusal_output?: L13AIExplanationOutput;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

function emitDecisionFromExpression(
  readiness: L13ExpressionReadinessClass,
): L13FinalEmissionDecision {
  switch (readiness) {
    case L13ExpressionReadinessClass.EXPRESSION_CLEAN:
      return L13FinalEmissionDecision.EMIT_CLEAN;
    case L13ExpressionReadinessClass.EXPRESSION_CLEAN_WITH_DISCLOSURE:
    case L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_UNCERTAINTY:
    case L13ExpressionReadinessClass.EXPRESSION_NARROWED_BY_RESTRICTION:
      return L13FinalEmissionDecision.EMIT_WITH_DISCLOSURE;
    case L13ExpressionReadinessClass.EXPRESSION_REFUSAL_REQUIRED:
      return L13FinalEmissionDecision.EMIT_REFUSAL;
    case L13ExpressionReadinessClass.EXPRESSION_REWRITE_REQUIRED:
    case L13ExpressionReadinessClass.EXPRESSION_BLOCKED:
    default:
      return L13FinalEmissionDecision.BLOCK_OUTPUT;
  }
}

function isOutputReadinessEmittable(
  readiness: L13OutputReadinessClass,
): boolean {
  return (
    readiness !== L13OutputReadinessClass.BLOCKED_UNGROUNDED &&
    readiness !== L13OutputReadinessClass.REFUSAL_REQUIRED
  );
}

/**
 * §13.6.21 — Run the final gate. Pure function over candidates +
 * envelopes; the runtime orchestrator hands the result to the
 * audit hook before emission.
 */
export function runL13FinalOutputGate(
  input: L13FinalGateInput,
): L13FinalOutputGateResult {
  const blockedReasons: string[] = [];
  const refusalReasons: string[] = [];
  let decision: L13FinalEmissionDecision;
  let userEmittableRef: string | undefined;

  // Refusal route — explicit refusal envelope short-circuits.
  if (input.refusal_envelope) {
    decision = L13FinalEmissionDecision.EMIT_REFUSAL;
    userEmittableRef = input.refusal_output?.output_id;
    for (const c of input.refusal_envelope.refusal_reason_codes) {
      refusalReasons.push(c);
    }
  } else if (
    !input.output_candidate ||
    !input.grounding_result ||
    !input.expression_envelope
  ) {
    decision = L13FinalEmissionDecision.BLOCK_OUTPUT;
    blockedReasons.push('MISSING_REQUIRED_INPUTS');
  } else {
    // Block precedence — grounding readiness blocks first.
    if (
      input.grounding_result.grounding_readiness_class ===
        L13GroundingReadinessClass.GROUNDING_BLOCKED_UNSUPPORTED ||
      input.grounding_result.grounding_readiness_class ===
        L13GroundingReadinessClass.GROUNDING_BLOCKED_CONTRADICTED
    ) {
      decision = L13FinalEmissionDecision.BLOCK_OUTPUT;
      blockedReasons.push('GROUNDING_BLOCKED');
    } else if (!input.expression_envelope.output_allowed) {
      decision = L13FinalEmissionDecision.BLOCK_OUTPUT;
      blockedReasons.push('EXPRESSION_BLOCKED_OR_REWRITE_REQUIRED');
    } else if (
      !isOutputReadinessEmittable(
        input.output_candidate.output_readiness,
      )
    ) {
      decision = L13FinalEmissionDecision.BLOCK_OUTPUT;
      blockedReasons.push('OUTPUT_READINESS_NOT_EMITTABLE');
    } else {
      decision = emitDecisionFromExpression(
        input.expression_envelope.final_expression_readiness,
      );
      if (
        decision === L13FinalEmissionDecision.EMIT_CLEAN ||
        decision === L13FinalEmissionDecision.EMIT_WITH_DISCLOSURE
      ) {
        userEmittableRef = input.output_candidate.output_id;
      } else if (
        decision === L13FinalEmissionDecision.EMIT_REFUSAL
      ) {
        userEmittableRef = input.refusal_output?.output_id;
      }
    }
  }

  const replayHash = fnv1a(
    [
      input.request_id,
      input.output_candidate?.output_id ?? '',
      input.grounding_result?.grounding_result_id ?? '',
      input.expression_envelope?.expression_governance_id ?? '',
      input.refusal_envelope?.refusal_envelope_id ?? '',
      decision,
      userEmittableRef ?? '',
      blockedReasons.sort().join(','),
      refusalReasons.sort().join(','),
      POLICY_V,
    ].join('|'),
  );

  return {
    final_gate_result_id: `l13.gate.${replayHash}`,
    request_id: input.request_id,
    output_candidate_ref: input.output_candidate?.output_id,
    grounded_output_envelope_ref:
      input.grounding_result?.grounding_result_id,
    expression_governance_envelope_ref:
      input.expression_envelope?.expression_governance_id,
    refusal_envelope_ref: input.refusal_envelope?.refusal_envelope_id,
    final_emission_decision: decision,
    user_emittable_output_ref: userEmittableRef,
    blocked_reason_codes: blockedReasons,
    refusal_reason_codes: refusalReasons,
    evidence_refs: input.evidence_refs ?? [],
    lineage_refs: input.lineage_refs ?? ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

export {
  L13FinalEmissionDecision,
  isL13UserEmittingDecision,
};
