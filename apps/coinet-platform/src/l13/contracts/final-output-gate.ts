/**
 * L13.6 — Final Output Gate Contract
 *
 * §13.6.21 — The final output gate is the only legal emitter. It
 * decides EMIT_CLEAN, EMIT_WITH_DISCLOSURE, EMIT_REFUSAL, or
 * BLOCK_OUTPUT based on the L13.3 output, the L13.4 grounding
 * envelope, and the L13.5 expression governance envelope.
 *
 * §13.6.27 — Decision precedence:
 *   BLOCK_OUTPUT > EMIT_REFUSAL > REWRITE > EMIT_WITH_DISCLOSURE
 *   > EMIT_CLEAN
 * (Rewrite happens upstream, not at the gate; the gate sees only
 * the post-rewrite candidate.)
 */

/**
 * §13.6.21.3 — Final emission decisions.
 */
export enum L13FinalEmissionDecision {
  EMIT_CLEAN = 'EMIT_CLEAN',
  EMIT_WITH_DISCLOSURE = 'EMIT_WITH_DISCLOSURE',
  EMIT_REFUSAL = 'EMIT_REFUSAL',
  BLOCK_OUTPUT = 'BLOCK_OUTPUT',
}

export const ALL_L13_FINAL_EMISSION_DECISIONS:
  readonly L13FinalEmissionDecision[] =
  Object.values(L13FinalEmissionDecision);

export interface L13FinalOutputGateResult {
  readonly final_gate_result_id: string;
  readonly request_id: string;

  readonly output_candidate_ref?: string;
  readonly grounded_output_envelope_ref?: string;
  readonly expression_governance_envelope_ref?: string;
  readonly refusal_envelope_ref?: string;

  readonly final_emission_decision: L13FinalEmissionDecision;
  readonly user_emittable_output_ref?: string;

  readonly blocked_reason_codes: readonly string[];
  readonly refusal_reason_codes: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

export function isL13UserEmittingDecision(
  d: L13FinalEmissionDecision,
): boolean {
  return (
    d === L13FinalEmissionDecision.EMIT_CLEAN ||
    d === L13FinalEmissionDecision.EMIT_WITH_DISCLOSURE ||
    d === L13FinalEmissionDecision.EMIT_REFUSAL
  );
}
