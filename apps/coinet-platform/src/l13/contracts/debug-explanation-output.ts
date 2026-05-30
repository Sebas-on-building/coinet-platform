/**
 * L13.7 — Debug Explanation Output Contract
 *
 * §13.7.4 / §13.7.8 — Internal-only mode. Exposes governance
 * state, blocked claims, grounding/classification outcomes, and
 * readiness results. May never be emitted to the end-user product
 * surface; the final gate rejects user emission of this payload.
 */

export interface L13DebugExplanationOutput {
  readonly debug_explanation_id: string;
  readonly output_id: string;
  readonly input_package_id: string;
  readonly runtime_run_id: string;

  /**
   * Internal narrative. Free-form developer-facing prose; not
   * subject to L13.5 expression governance because it is not a
   * user surface. The validator still requires lineage refs.
   */
  readonly developer_narrative: string;

  /** Refs to the L13.6 stage artifacts. */
  readonly intent_classification_ref?: string;
  readonly scope_resolution_ref?: string;
  readonly read_plan_ref?: string;
  readonly prompt_template_ref?: string;
  readonly prompt_assembly_ref?: string;
  readonly model_gateway_request_ref?: string;
  readonly model_gateway_response_ref?: string;
  readonly grounding_result_ref?: string;
  readonly expression_governance_envelope_ref?: string;
  readonly final_gate_result_ref?: string;

  readonly blocked_claim_refs: readonly string[];
  readonly critical_violation_refs: readonly string[];

  /**
   * Explicit, audited "internal only" flag. The output mode
   * envelope validator refuses to emit this payload to the user
   * surface when this is true (the only legal value).
   */
  readonly internal_only: true;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
